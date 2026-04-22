"""
DRF Views for the fraud detection pipeline API.

Endpoints:
  POST /api/ingestion/upload           — Upload dataset file
  GET  /api/ingestion/<id>/status      — Poll dataset processing status

  GET  /api/reviews/queue              — Paginated pending reviews
  POST /api/reviews/<id>/claim         — Claim a review
  GET  /api/reviews/<id>/detail        — Full review details
  POST /api/reviews/<id>/submit        — Submit verdict + feedback

  GET  /api/settings/thresholds        — Current thresholds
  GET  /api/settings/rules             — Fraud rules table
  GET  /api/settings/audit-logs        — Paginated audit logs
"""

import hashlib
import io
import collections

from django.db import transaction
from django.db.models import Count, Sum, Avg, F, Q
import math
import logging

import pandas as pd
from django.conf import settings as django_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from pipeline.models import (
    Dataset, Transaction, RejectedTransaction, RiskAssessment, Decision,
    ReviewQueue, HumanFeedback, FraudRule, RuleVersion, AppSetting, AuditLog,
    ReviewStatus, DatasetStatus, DecisionType, Verdict,
)
from pipeline.serializers import (
    DatasetSerializer, UploadResponseSerializer,
    ReviewQueueListSerializer, ReviewDetailSerializer,
    FeedbackSubmitSerializer, FraudRuleSerializer,
    AppSettingSerializer, AuditLogSerializer,
)
from pipeline.services.encryption import encrypt_notes
from pipeline.services.audit_service import write_audit_log

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# STAGE 1 — DATA INGESTION
# ═══════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@parser_classes([MultiPartParser])
def upload_dataset(request):
    """
    POST /api/ingestion/upload

    Accept multipart file upload (CSV, JSON, or Excel).
    Parse into row dicts, split into batches, dispatch to Celery.
    """
    file = request.FILES.get('file')
    if not file:
        return Response(
            {'error': 'No file provided. Use multipart form with key "file".'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    filename = file.name.lower()

    try:
        # ── Parse file into list of row dicts ──
        if filename.endswith('.csv'):
            content = file.read().decode('utf-8')
            df = pd.read_csv(io.StringIO(content))
        elif filename.endswith('.json'):
            content = file.read().decode('utf-8')
            df = pd.read_json(io.StringIO(content))
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file.read()))
        else:
            return Response(
                {'error': 'Unsupported file format. Use CSV, JSON, or Excel.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rows = df.to_dict(orient='records')
        if not rows:
            return Response(
                {'error': 'File is empty or contains no valid rows.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    except Exception as e:
        return Response(
            {'error': f'Failed to parse file: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Create Dataset record ──
    batch_size = getattr(django_settings, 'BATCH_SIZE', 1000)
    total_batches = math.ceil(len(rows) / batch_size)

    dataset = Dataset.objects.create(
        filename=file.name,
        status=DatasetStatus.PENDING,
        total_batches=total_batches,
    )

    # ── Split rows into batches and dispatch to Celery ──
    from pipeline.tasks.cleaning import process_cleaning_batch

    for i in range(total_batches):
        start = i * batch_size
        end = start + batch_size
        batch_rows = rows[start:end]

        # Ensure all values are JSON-serializable
        serializable_rows = _make_serializable(batch_rows)

        process_cleaning_batch.delay(
            dataset_id=dataset.id,
            batch_index=i,
            rows=serializable_rows,
        )

    logger.info(f"Dataset {dataset.id}: uploaded {len(rows)} rows in {total_batches} batches")

    return Response(
        UploadResponseSerializer({
            'dataset_id': dataset.id,
            'total_batches': total_batches,
        }).data,
        status=status.HTTP_201_CREATED,
    )


def _make_serializable(rows: list[dict]) -> list[dict]:
    """Ensure all values in row dicts are JSON-serializable."""
    import numpy as np
    clean = []
    for row in rows:
        clean_row = {}
        for k, v in row.items():
            if isinstance(v, (np.integer,)):
                clean_row[k] = int(v)
            elif isinstance(v, (np.floating,)):
                clean_row[k] = float(v)
            elif isinstance(v, (np.bool_,)):
                clean_row[k] = bool(v)
            elif pd.isna(v):
                clean_row[k] = None
            else:
                clean_row[k] = v
        clean.append(clean_row)
    return clean


@api_view(['GET'])
@permission_classes([AllowAny])
def dataset_status(request, dataset_id):
    """
    GET /api/ingestion/<dataset_id>/status

    Returns processing progress for a dataset.
    """
    try:
        dataset = Dataset.objects.get(id=dataset_id)
    except Dataset.DoesNotExist:
        return Response(
            {'error': f'Dataset {dataset_id} not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(DatasetSerializer(dataset).data)


# ═══════════════════════════════════════════════════════════════════════════
# STAGE 6 — HUMAN REVIEW
# ═══════════════════════════════════════════════════════════════════════════

class ReviewPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET'])
def review_queue_list(request):
    """
    GET /api/reviews/queue

    Paginated list of PENDING reviews, ordered by priority DESC.
    """
    status_filter = request.query_params.get('status', 'PENDING')
    queryset = ReviewQueue.objects.filter(
        status=status_filter
    ).select_related(
        'transaction', 'decision'
    ).order_by('-priority', 'created_at')

    paginator = ReviewPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = ReviewQueueListSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['POST'])
def claim_review(request, review_id):
    """
    POST /api/reviews/<review_id>/claim

    Claim a pending review. Returns 409 if already claimed.
    """
    with transaction.atomic():
        try:
            review = ReviewQueue.objects.select_for_update().get(id=review_id)
        except ReviewQueue.DoesNotExist:
            return Response(
                {'error': f'Review {review_id} not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if review.status != ReviewStatus.PENDING:
            return Response(
                {'error': f'Review is already {review.status}',
                 'claimed_by': review.claimed_by},
                status=status.HTTP_409_CONFLICT,
            )

        # Get current user — fallback to header or default
        current_user = request.headers.get('X-User', 'analyst')

        review.status = ReviewStatus.CLAIMED
        review.claimed_by = current_user
        review.claimed_at = timezone.now()
        review.save(update_fields=['status', 'claimed_by', 'claimed_at'])

    return Response({
        'review_id': review.id,
        'status': review.status,
        'claimed_by': review.claimed_by,
        'claimed_at': review.claimed_at.isoformat(),
    })


@api_view(['GET'])
def review_detail(request, review_id):
    """
    GET /api/reviews/<review_id>/detail

    Full transaction + features + risk assessment + triggered rules.
    """
    try:
        review = ReviewQueue.objects.select_related(
            'transaction', 'decision'
        ).get(id=review_id)
    except ReviewQueue.DoesNotExist:
        return Response(
            {'error': f'Review {review_id} not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = ReviewDetailSerializer(review)
    return Response(serializer.data)


@api_view(['POST'])
def submit_feedback(request, review_id):
    """
    POST /api/reviews/<review_id>/submit

    Submit verdict, confidence score, and encrypted notes.
    """
    try:
        review = ReviewQueue.objects.select_related('transaction').get(id=review_id)
    except ReviewQueue.DoesNotExist:
        return Response(
            {'error': f'Review {review_id} not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if review.status == ReviewStatus.RESOLVED:
        return Response(
            {'error': 'Review is already resolved'},
            status=status.HTTP_409_CONFLICT,
        )

    # ── Validate input ──
    serializer = FeedbackSubmitSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    # ── Encrypt notes ──
    encrypted = encrypt_notes(data.get('notes', '')) if data.get('notes') else b''

    # ── Compute feedback hash ──
    now = timezone.now()
    hash_input = f"{review.transaction_id}{data['verdict']}{data['confidence_score']}{now.isoformat()}"
    feedback_hash = hashlib.sha256(hash_input.encode()).hexdigest()

    # ── Create HumanFeedback ──
    feedback = HumanFeedback.objects.create(
        review_queue=review,
        transaction=review.transaction,
        verdict=data['verdict'],
        confidence_score=data['confidence_score'],
        notes_encrypted=encrypted,
        feedback_hash=feedback_hash,
    )

    # ── Resolve the review ──
    review.status = ReviewStatus.RESOLVED
    review.resolved_at = now
    review.save(update_fields=['status', 'resolved_at'])

    # ── Audit log ──
    write_audit_log(
        event_type='FEEDBACK_SUBMITTED',
        entity_id=str(review.transaction_id),
        entity_type='Transaction',
        description=f"Verdict: {data['verdict']}, Confidence: {data['confidence_score']}",
    )

    # ── Trigger adaptive engine (non-blocking) ──
    from pipeline.tasks.adaptive import run_adaptive_engine
    run_adaptive_engine.delay()

    return Response({
        'feedback_id': feedback.id,
        'review_id': review.id,
        'verdict': data['verdict'],
        'status': 'RESOLVED',
    }, status=status.HTTP_201_CREATED)


# ═══════════════════════════════════════════════════════════════════════════
# SETTINGS (READ-ONLY)
# ═══════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def get_thresholds(request):
    """GET /api/settings/thresholds"""
    thresholds = AppSetting.objects.filter(
        key__in=['ALLOW_THRESHOLD', 'BLOCK_THRESHOLD']
    )
    return Response(AppSettingSerializer(thresholds, many=True).data)


@api_view(['GET'])
def get_rules(request):
    """GET /api/settings/rules"""
    rules = FraudRule.objects.all()
    return Response(FraudRuleSerializer(rules, many=True).data)


@api_view(['GET'])
def get_audit_logs(request):
    """GET /api/settings/audit-logs"""
    queryset = AuditLog.objects.all().order_by('-created_at')
    paginator = ReviewPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = AuditLogSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


# ═══════════════════════════════════════════════════════════════════════════
# ANALYTICS DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
def analytics_dashboard(request):
    """
    GET /api/analytics/dashboard

    Returns aggregated analytics data for the dashboard:
      - KPI summary (total transactions, decisions breakdown, value protected)
      - Risk score distribution (histogram buckets)
      - Top triggered rules
      - Review queue efficiency metrics
      - Transaction type distribution
      - Threshold change history
    """
    # ── KPI Summary ──
    total_transactions = Transaction.objects.count()
    total_rejected = RejectedTransaction.objects.count()
    total_datasets = Dataset.objects.count()

    # Decision breakdown
    decision_counts = dict(
        Decision.objects.values_list('decision_type')
        .annotate(count=Count('id'))
        .values_list('decision_type', 'count')
    )
    allowed_count = decision_counts.get('ALLOWED', 0)
    blocked_count = decision_counts.get('BLOCKED', 0)
    review_count = decision_counts.get('REVIEW', 0)
    total_decisions = allowed_count + blocked_count + review_count

    # Value protected (sum of amounts of BLOCKED transactions)
    value_protected = Transaction.objects.filter(
        decision__decision_type='BLOCKED'
    ).aggregate(total=Sum('amount'))['total'] or 0

    # Average risk score
    avg_risk = RiskAssessment.objects.aggregate(
        avg=Avg('risk_score')
    )['avg'] or 0

    # ── Risk Score Distribution (10 buckets: 0-0.1, 0.1-0.2, ..., 0.9-1.0) ──
    risk_buckets = [0] * 10
    risk_scores = RiskAssessment.objects.values_list('risk_score', flat=True)
    for score in risk_scores:
        bucket = min(int(score * 10), 9)
        risk_buckets[bucket] += 1

    risk_distribution = []
    for i in range(10):
        low = i * 0.1
        high = (i + 1) * 0.1
        risk_distribution.append({
            'range': f'{low:.1f}-{high:.1f}',
            'count': risk_buckets[i],
        })

    # ── Top Triggered Rules ──
    rule_counter = collections.Counter()
    assessments_with_rules = RiskAssessment.objects.exclude(
        triggered_rules=[]
    ).values_list('triggered_rules', flat=True)[:500]
    for rules_list in assessments_with_rules:
        if isinstance(rules_list, list):
            for rule in rules_list:
                name = rule.get('rule_name', 'unknown') if isinstance(rule, dict) else str(rule)
                rule_counter[name] += 1
    top_rules = [
        {'name': name, 'count': count}
        for name, count in rule_counter.most_common(10)
    ]

    # ── Review Queue Efficiency ──
    review_pending = ReviewQueue.objects.filter(status='PENDING').count()
    review_claimed = ReviewQueue.objects.filter(status='CLAIMED').count()
    review_resolved = ReviewQueue.objects.filter(status='RESOLVED').count()

    # Average resolution time (for resolved reviews)
    resolved_reviews = ReviewQueue.objects.filter(
        status='RESOLVED',
        resolved_at__isnull=False,
    )
    avg_resolution_minutes = None
    if resolved_reviews.exists():
        from django.db.models import ExpressionWrapper, DurationField
        durations = resolved_reviews.annotate(
            duration=ExpressionWrapper(
                F('resolved_at') - F('created_at'),
                output_field=DurationField()
            )
        )
        total_seconds = sum(
            d.duration.total_seconds() for d in durations if d.duration
        )
        count = durations.count()
        if count > 0:
            avg_resolution_minutes = round(total_seconds / count / 60, 1)

    # Human feedback verdict breakdown
    verdict_counts = dict(
        HumanFeedback.objects.values_list('verdict')
        .annotate(count=Count('id'))
        .values_list('verdict', 'count')
    )

    # ── Transaction Type Distribution ──
    type_distribution = list(
        Transaction.objects.values('transaction_type')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # ── Model Accuracy (compare ML decision vs human feedback) ──
    # Where humans reviewed and the ML had scored
    feedback_records = HumanFeedback.objects.select_related(
        'transaction__decision', 'transaction__risk_assessment'
    ).all()[:200]

    model_agreement = 0
    model_disagreement = 0
    for fb in feedback_records:
        try:
            decision = fb.transaction.decision
            if fb.verdict == 'FRAUD' and decision.decision_type == 'BLOCKED':
                model_agreement += 1
            elif fb.verdict == 'LEGITIMATE' and decision.decision_type == 'ALLOWED':
                model_agreement += 1
            elif fb.verdict in ('FRAUD', 'LEGITIMATE'):
                model_disagreement += 1
        except Exception:
            pass

    total_compared = model_agreement + model_disagreement
    model_accuracy = round(model_agreement / total_compared * 100, 1) if total_compared > 0 else None

    # ── Threshold History (from RuleVersion) ──
    threshold_changes = list(
        RuleVersion.objects.filter(
            threshold_before__isnull=False
        ).order_by('-changed_at').values(
            'threshold_before', 'threshold_after', 'changed_at', 'reason'
        )[:20]
    )
    # Also include weight changes
    weight_changes = list(
        RuleVersion.objects.filter(
            weight_before__isnull=False
        ).order_by('-changed_at').values(
            'rule__name', 'weight_before', 'weight_after', 'changed_at', 'reason'
        )[:20]
    )

    # ── Recent Activity (last 10 audit events) ──
    recent_events = list(
        AuditLog.objects.order_by('-created_at').values(
            'event_type', 'entity_type', 'entity_id', 'description', 'created_at'
        )[:10]
    )

    return Response({
        'kpi': {
            'total_transactions': total_transactions,
            'total_rejected': total_rejected,
            'total_datasets': total_datasets,
            'total_decisions': total_decisions,
            'allowed_count': allowed_count,
            'blocked_count': blocked_count,
            'review_count': review_count,
            'value_protected': round(value_protected, 2),
            'avg_risk_score': round(avg_risk, 4),
            'approval_rate': round(allowed_count / total_decisions * 100, 1) if total_decisions else 0,
            'block_rate': round(blocked_count / total_decisions * 100, 1) if total_decisions else 0,
            'review_rate': round(review_count / total_decisions * 100, 1) if total_decisions else 0,
        },
        'risk_distribution': risk_distribution,
        'top_triggered_rules': top_rules,
        'review_efficiency': {
            'pending': review_pending,
            'claimed': review_claimed,
            'resolved': review_resolved,
            'avg_resolution_minutes': avg_resolution_minutes,
            'verdicts': verdict_counts,
        },
        'model_performance': {
            'accuracy': model_accuracy,
            'agreements': model_agreement,
            'disagreements': model_disagreement,
            'total_compared': total_compared,
        },
        'transaction_types': type_distribution,
        'threshold_history': threshold_changes,
        'weight_changes': weight_changes,
        'recent_events': recent_events,
    })


# ═══════════════════════════════════════════════════════════════════════════
# RISK CLASSIFICATION
# ═══════════════════════════════════════════════════════════════════════════

class ClassificationPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET'])
def classified_transactions(request):
    """
    GET /api/transactions/classified

    Returns transactions categorized by risk level (Low / Medium / High).
    Query params:
      - risk_level: low | medium | high | all (default: all)
      - sort: risk_score | amount | timestamp (default: risk_score)
      - order: asc | desc (default: desc)
      - type: transaction type filter (e.g., TRANSFER)
      - page: page number
    """
    # Read thresholds from app_settings
    allow_threshold = float(AppSetting.get('ALLOW_THRESHOLD', '0.30'))
    block_threshold = float(AppSetting.get('BLOCK_THRESHOLD', '0.65'))

    risk_level = request.query_params.get('risk_level', 'all').lower()
    sort_by = request.query_params.get('sort', 'risk_score')
    order = request.query_params.get('order', 'desc')
    txn_type = request.query_params.get('type', '')

    # Base queryset: transactions that have risk assessments
    queryset = Transaction.objects.filter(
        risk_assessment__isnull=False
    ).select_related('risk_assessment', 'decision')

    # Filter by transaction type
    if txn_type:
        queryset = queryset.filter(transaction_type=txn_type)

    # Filter by risk level
    if risk_level == 'low':
        queryset = queryset.filter(risk_assessment__risk_score__lt=allow_threshold)
    elif risk_level == 'medium':
        queryset = queryset.filter(
            risk_assessment__risk_score__gte=allow_threshold,
            risk_assessment__risk_score__lt=block_threshold,
        )
    elif risk_level == 'high':
        queryset = queryset.filter(risk_assessment__risk_score__gte=block_threshold)

    # Sorting
    sort_map = {
        'risk_score': 'risk_assessment__risk_score',
        'amount': 'amount',
        'timestamp': 'timestamp',
    }
    sort_field = sort_map.get(sort_by, 'risk_assessment__risk_score')
    if order == 'asc':
        queryset = queryset.order_by(sort_field)
    else:
        queryset = queryset.order_by(f'-{sort_field}')

    # Compute tier summary counts (on unfiltered-by-tier set)
    all_assessed = Transaction.objects.filter(risk_assessment__isnull=False)
    if txn_type:
        all_assessed = all_assessed.filter(transaction_type=txn_type)

    low_count = all_assessed.filter(risk_assessment__risk_score__lt=allow_threshold).count()
    medium_count = all_assessed.filter(
        risk_assessment__risk_score__gte=allow_threshold,
        risk_assessment__risk_score__lt=block_threshold,
    ).count()
    high_count = all_assessed.filter(risk_assessment__risk_score__gte=block_threshold).count()

    # Paginate
    paginator = ClassificationPagination()
    page = paginator.paginate_queryset(queryset, request)

    # Serialize
    results = []
    for txn in page:
        risk_score = None
        ml_score = None
        anomaly_score = None
        triggered_rules = []
        try:
            ra = txn.risk_assessment
            risk_score = ra.risk_score
            ml_score = ra.ml_score
            anomaly_score = ra.anomaly_score
            triggered_rules = ra.triggered_rules or []
        except Exception:
            pass

        decision_type = None
        try:
            decision_type = txn.decision.decision_type
        except Exception:
            pass

        # Determine risk tier
        if risk_score is not None:
            if risk_score < allow_threshold:
                tier = 'LOW'
            elif risk_score < block_threshold:
                tier = 'MEDIUM'
            else:
                tier = 'HIGH'
        else:
            tier = 'UNKNOWN'

        results.append({
            'id': txn.id,
            'user_id': txn.user_id,
            'merchant_id': txn.merchant_id,
            'amount': txn.amount,
            'transaction_type': txn.transaction_type,
            'timestamp': txn.timestamp.isoformat(),
            'risk_score': round(risk_score, 4) if risk_score else None,
            'ml_score': round(ml_score, 2) if ml_score else None,
            'anomaly_score': round(anomaly_score, 2) if anomaly_score else None,
            'decision': decision_type,
            'tier': tier,
            'triggered_rules': [r.get('rule_name', '') for r in triggered_rules[:3]],
        })

    response = paginator.get_paginated_response(results)
    response.data['tier_summary'] = {
        'low': low_count,
        'medium': medium_count,
        'high': high_count,
        'total': low_count + medium_count + high_count,
        'thresholds': {
            'allow': allow_threshold,
            'block': block_threshold,
        },
    }
    return response


# ═══════════════════════════════════════════════════════════════════════════
# HOURLY ACTIVITY ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([AllowAny])
def hourly_activity(request):
    """
    GET /api/analytics/hourly-activity

    Returns per-hour transaction and fraud/flagged counts aggregated from
    the database. Used by HourlyActivity.jsx and TransactionVolumeChart.jsx
    to display real-time hourly patterns.

    Response format:
        [
            {"hour": "00", "transactions": 234, "frauds": 3, "flagged": 8},
            {"hour": "01", "transactions": 180, "frauds": 2, "flagged": 4},
            ...
        ]

    - transactions: total transaction count for this hour
    - frauds: transactions where ground_truth_label = True (known fraud)
    - flagged: transactions that were BLOCKED or sent to REVIEW
    """
    from django.db.models import Case, When, IntegerField, Value
    from django.db.models.functions import ExtractHour

    # Annotate transactions with their hour-of-day (from timestamp)
    txn_qs = Transaction.objects.annotate(
        txn_hour=ExtractHour('timestamp'),
    )

    # Group by hour, count total transactions and fraud labels
    hour_data = (
        txn_qs
        .values('txn_hour')
        .annotate(
            transactions=Count('id'),
            frauds=Count(
                Case(
                    When(ground_truth_label=True, then=Value(1)),
                    output_field=IntegerField(),
                )
            ),
            flagged=Count(
                Case(
                    When(
                        decision__decision_type__in=['BLOCKED', 'REVIEW'],
                        then=Value(1),
                    ),
                    output_field=IntegerField(),
                )
            ),
        )
        .order_by('txn_hour')
    )

    # Build full 24-hour array (fill missing hours with zeros)
    hour_map = {entry['txn_hour']: entry for entry in hour_data}
    result = []
    for h in range(24):
        entry = hour_map.get(h, {})
        result.append({
            'hour': f'{h:02d}',
            'time': f'{h:02d}:00',
            'transactions': entry.get('transactions', 0),
            'frauds': entry.get('frauds', 0),
            'flagged': entry.get('flagged', 0),
        })

    return Response(result)
