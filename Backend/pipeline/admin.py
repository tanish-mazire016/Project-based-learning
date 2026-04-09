from django.contrib import admin
from .models import (
    Dataset, Transaction, RejectedTransaction, TransactionFeature,
    FraudRule, RuleVersion, RiskAssessment, Decision,
    ReviewQueue, HumanFeedback, AuditLog, AppSetting, SecurityAlert,
)


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    list_display = ('id', 'filename', 'status', 'total_batches', 'batches_processed', 'created_at')
    list_filter = ('status',)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'dataset_id', 'user_id', 'merchant_id', 'amount', 'transaction_type', 'is_outlier', 'ground_truth_label')
    list_filter = ('transaction_type', 'is_outlier', 'ground_truth_label')
    search_fields = ('user_id', 'merchant_id')


@admin.register(RejectedTransaction)
class RejectedTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'dataset_id', 'rejection_reason', 'created_at')


@admin.register(TransactionFeature)
class TransactionFeatureAdmin(admin.ModelAdmin):
    list_display = ('id', 'transaction_id', 'feat_amount', 'feat_hour', 'feat_high_amount')


@admin.register(FraudRule)
class FraudRuleAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'weight', 'is_active', 'version', 'updated_at')
    list_filter = ('is_active',)


@admin.register(RuleVersion)
class RuleVersionAdmin(admin.ModelAdmin):
    list_display = ('id', 'rule_id', 'weight_before', 'weight_after', 'changed_at')


@admin.register(RiskAssessment)
class RiskAssessmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'transaction_id', 'risk_score', 'ml_score', 'anomaly_score')


@admin.register(Decision)
class DecisionAdmin(admin.ModelAdmin):
    list_display = ('id', 'transaction_id', 'decision_type', 'created_at')
    list_filter = ('decision_type',)


@admin.register(ReviewQueue)
class ReviewQueueAdmin(admin.ModelAdmin):
    list_display = ('id', 'transaction_id', 'status', 'priority', 'claimed_by', 'created_at')
    list_filter = ('status',)


@admin.register(HumanFeedback)
class HumanFeedbackAdmin(admin.ModelAdmin):
    list_display = ('id', 'transaction_id', 'verdict', 'confidence_score', 'created_at')
    list_filter = ('verdict',)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'event_type', 'entity_type', 'entity_id', 'created_at')
    list_filter = ('event_type',)


@admin.register(AppSetting)
class AppSettingAdmin(admin.ModelAdmin):
    list_display = ('id', 'key', 'value', 'updated_at')


@admin.register(SecurityAlert)
class SecurityAlertAdmin(admin.ModelAdmin):
    list_display = ('id', 'description', 'resolved', 'created_at')
    list_filter = ('resolved',)
