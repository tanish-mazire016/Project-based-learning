"""
DRF Serializers for the fraud detection pipeline API.
"""

from rest_framework import serializers
from pipeline.models import (
    Dataset, Transaction, RejectedTransaction, TransactionFeature,
    FraudRule, RiskAssessment, Decision, ReviewQueue,
    HumanFeedback, AuditLog, AppSetting,
)


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------

class DatasetSerializer(serializers.ModelSerializer):
    percent_complete = serializers.SerializerMethodField()

    class Meta:
        model = Dataset
        fields = ['id', 'filename', 'status', 'total_batches',
                  'batches_processed', 'percent_complete', 'created_at']

    def get_percent_complete(self, obj):
        if obj.total_batches == 0:
            return 0
        return round((obj.batches_processed / obj.total_batches) * 100, 1)


class UploadResponseSerializer(serializers.Serializer):
    dataset_id = serializers.IntegerField()
    total_batches = serializers.IntegerField()


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'


class TransactionFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransactionFeature
        fields = '__all__'


class RiskAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskAssessment
        fields = '__all__'


class DecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Decision
        fields = '__all__'


# ---------------------------------------------------------------------------
# Review Queue
# ---------------------------------------------------------------------------

class ReviewQueueListSerializer(serializers.ModelSerializer):
    """Serializer for the review queue list view."""
    transaction_id = serializers.IntegerField(source='transaction.id')
    amount = serializers.FloatField(source='transaction.amount')
    user_id = serializers.CharField(source='transaction.user_id')
    merchant_id = serializers.CharField(source='transaction.merchant_id')
    transaction_type = serializers.CharField(source='transaction.transaction_type')
    risk_score = serializers.SerializerMethodField()
    top_triggered_rule = serializers.SerializerMethodField()
    time_in_queue = serializers.SerializerMethodField()

    class Meta:
        model = ReviewQueue
        fields = [
            'id', 'transaction_id', 'status', 'priority',
            'amount', 'user_id', 'merchant_id', 'transaction_type',
            'risk_score', 'top_triggered_rule', 'time_in_queue',
            'claimed_by', 'claimed_at', 'created_at',
        ]

    def get_risk_score(self, obj):
        try:
            return obj.transaction.risk_assessment.risk_score
        except Exception:
            return None

    def get_top_triggered_rule(self, obj):
        try:
            rules = obj.transaction.risk_assessment.triggered_rules
            if rules:
                return rules[0].get('rule_name', 'N/A')
        except Exception:
            pass
        return None

    def get_time_in_queue(self, obj):
        from django.utils import timezone
        delta = timezone.now() - obj.created_at
        total_seconds = int(delta.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"


class ReviewDetailSerializer(serializers.Serializer):
    """Full detail view for a single review item."""
    review = serializers.SerializerMethodField()
    transaction = serializers.SerializerMethodField()
    features = serializers.SerializerMethodField()
    risk_assessment = serializers.SerializerMethodField()
    decision = serializers.SerializerMethodField()

    def get_review(self, obj):
        return {
            'id': obj.id,
            'status': obj.status,
            'priority': obj.priority,
            'claimed_by': obj.claimed_by,
            'claimed_at': obj.claimed_at.isoformat() if obj.claimed_at else None,
            'created_at': obj.created_at.isoformat(),
        }

    def get_transaction(self, obj):
        txn = obj.transaction
        return TransactionSerializer(txn).data

    def get_features(self, obj):
        try:
            return TransactionFeatureSerializer(obj.transaction.features).data
        except TransactionFeature.DoesNotExist:
            return None

    def get_risk_assessment(self, obj):
        try:
            return RiskAssessmentSerializer(obj.transaction.risk_assessment).data
        except RiskAssessment.DoesNotExist:
            return None

    def get_decision(self, obj):
        try:
            return DecisionSerializer(obj.transaction.decision).data
        except Decision.DoesNotExist:
            return None


class FeedbackSubmitSerializer(serializers.Serializer):
    """Validation for feedback submission."""
    verdict = serializers.ChoiceField(choices=['FRAUD', 'LEGITIMATE', 'UNCERTAIN'])
    confidence_score = serializers.IntegerField(min_value=1, max_value=5)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

class FraudRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FraudRule
        fields = ['id', 'name', 'description', 'weight', 'is_active',
                  'version', 'integrity_hash', 'created_at', 'updated_at']


class AppSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSetting
        fields = ['id', 'key', 'value', 'updated_at']


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ['id', 'event_type', 'entity_id', 'entity_type',
                  'description', 'previous_hash', 'current_hash', 'created_at']
