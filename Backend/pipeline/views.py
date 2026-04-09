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
import math
import logging

import pandas as pd
from django.conf import settings as django_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from pipeline.models import (
    Dataset, ReviewQueue, HumanFeedback, FraudRule, AppSetting, AuditLog,
    ReviewStatus, DatasetStatus,
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
