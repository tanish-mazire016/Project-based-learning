"""
Django ORM models for the fraud detection pipeline.

13 tables:
  1.  Dataset               — uploaded file tracking
  2.  Transaction           — cleaned transaction records
  3.  RejectedTransaction   — rows that failed validation
  4.  TransactionFeature    — engineered features (12 PaySim columns)
  5.  FraudRule             — configurable scoring rules
  6.  RuleVersion           — weight/threshold change history
  7.  RiskAssessment        — per-transaction risk scores
  8.  Decision              — ALLOWED / REVIEW / BLOCKED verdicts
  9.  ReviewQueue           — human review work items
  10. HumanFeedback         — analyst verdicts on flagged transactions
  11. AuditLog              — tamper-evident event chain
  12. AppSetting            — runtime configuration (thresholds)
  13. SecurityAlert         — audit chain violation alerts
"""

from django.db import models


# ---------------------------------------------------------------------------
# Enums (TextChoices)
# ---------------------------------------------------------------------------

class DatasetStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PROCESSING = 'PROCESSING', 'Processing'
    DONE = 'DONE', 'Done'
    FAILED = 'FAILED', 'Failed'


class DecisionType(models.TextChoices):
    ALLOWED = 'ALLOWED', 'Allowed'
    REVIEW = 'REVIEW', 'Review'
    BLOCKED = 'BLOCKED', 'Blocked'


class ReviewStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    CLAIMED = 'CLAIMED', 'Claimed'
    RESOLVED = 'RESOLVED', 'Resolved'


class Verdict(models.TextChoices):
    FRAUD = 'FRAUD', 'Fraud'
    LEGITIMATE = 'LEGITIMATE', 'Legitimate'
    UNCERTAIN = 'UNCERTAIN', 'Uncertain'


class AuditEventType(models.TextChoices):
    BATCH_CLEANED = 'BATCH_CLEANED', 'Batch Cleaned'
    BATCH_FAILED = 'BATCH_FAILED', 'Batch Failed'
    FEATURES_ENGINEERED = 'FEATURES_ENGINEERED', 'Features Engineered'
    TRANSACTION_ASSESSED = 'TRANSACTION_ASSESSED', 'Transaction Assessed'
    INTEGRITY_VIOLATION = 'INTEGRITY_VIOLATION', 'Integrity Violation'
    DECISION_MADE = 'DECISION_MADE', 'Decision Made'
    FEEDBACK_SUBMITTED = 'FEEDBACK_SUBMITTED', 'Feedback Submitted'
    RULE_WEIGHTS_UPDATED = 'RULE_WEIGHTS_UPDATED', 'Rule Weights Updated'
    THRESHOLDS_UPDATED = 'THRESHOLDS_UPDATED', 'Thresholds Updated'
    CHAIN_VIOLATION = 'CHAIN_VIOLATION', 'Chain Violation'


# ---------------------------------------------------------------------------
# 1. Dataset
# ---------------------------------------------------------------------------

class Dataset(models.Model):
    """Tracks an uploaded file through the ingestion pipeline."""
    filename = models.CharField(max_length=500)
    status = models.CharField(
        max_length=20,
        choices=DatasetStatus.choices,
        default=DatasetStatus.PENDING,
    )
    total_batches = models.IntegerField(default=0)
    batches_processed = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'datasets'
        ordering = ['-created_at']

    def __str__(self):
        return f"Dataset {self.id}: {self.filename} ({self.status})"


# ---------------------------------------------------------------------------
# 2. Transaction
# ---------------------------------------------------------------------------

class Transaction(models.Model):
    """
    Cleaned transaction record.

    PaySim column mapping:
      nameOrig       → user_id
      nameDest        → merchant_id
      amount          → amount
      type            → transaction_type
      step            → step (raw) + timestamp (converted UTC)
      oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest → location_metadata
      isFraud         → ground_truth_label  (NOT is_outlier)
      isFlaggedFraud  → stored in location_metadata
    """
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE, related_name='transactions'
    )
    user_id = models.CharField(max_length=255, db_index=True)    # nameOrig
    merchant_id = models.CharField(max_length=255, db_index=True) # nameDest
    amount = models.FloatField()
    currency = models.CharField(max_length=10, default='SIM')
    transaction_type = models.CharField(max_length=20)            # PaySim 'type'
    step = models.IntegerField()                                  # raw step value
    timestamp = models.DateTimeField(db_index=True)               # base_date + timedelta(hours=step)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    device_fingerprint = models.CharField(max_length=255, null=True, blank=True)
    location_metadata = models.JSONField(default=dict)            # balance fields
    is_outlier = models.BooleanField(default=False)               # statistical outlier (amount > 3σ)
    ground_truth_label = models.BooleanField(null=True, blank=True)  # isFraud from PaySim
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['dataset', 'user_id']),
        ]

    def __str__(self):
        return f"Txn {self.id}: {self.user_id}→{self.merchant_id} ${self.amount}"


# ---------------------------------------------------------------------------
# 3. RejectedTransaction
# ---------------------------------------------------------------------------

class RejectedTransaction(models.Model):
    """Rows that failed cleaning validation."""
    dataset = models.ForeignKey(
        Dataset, on_delete=models.CASCADE, related_name='rejected_transactions'
    )
    raw_row = models.JSONField()
    rejection_reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rejected_transactions'
        ordering = ['-created_at']


# ---------------------------------------------------------------------------
# 4. TransactionFeature
# ---------------------------------------------------------------------------

class TransactionFeature(models.Model):
    """
    Engineered features for a transaction.

    The 12 columns match the output of feature_engineering.py:
      amount, oldbalanceOrg, oldbalanceDest, hour,
      orig_txn_count, dest_txn_count, high_amount,
      type_CASH_IN, type_CASH_OUT, type_DEBIT, type_PAYMENT, type_TRANSFER
    """
    transaction = models.OneToOneField(
        Transaction, on_delete=models.CASCADE, related_name='features'
    )
    # Numeric features
    feat_amount = models.FloatField()
    feat_old_balance_org = models.FloatField()
    feat_old_balance_dest = models.FloatField()
    feat_hour = models.IntegerField()
    feat_orig_txn_count = models.IntegerField()
    feat_dest_txn_count = models.IntegerField()
    feat_high_amount = models.IntegerField()        # 0 or 1
    # One-hot encoded transaction type
    feat_type_cash_in = models.IntegerField()       # 0 or 1
    feat_type_cash_out = models.IntegerField()      # 0 or 1
    feat_type_debit = models.IntegerField()         # 0 or 1
    feat_type_payment = models.IntegerField()       # 0 or 1
    feat_type_transfer = models.IntegerField()      # 0 or 1
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'transaction_features'

    def to_model_input_dict(self):
        """Return feature dict in the column order the ML models expect."""
        return {
            'amount': self.feat_amount,
            'oldbalanceOrg': self.feat_old_balance_org,
            'oldbalanceDest': self.feat_old_balance_dest,
            'hour': self.feat_hour,
            'orig_txn_count': self.feat_orig_txn_count,
            'dest_txn_count': self.feat_dest_txn_count,
            'high_amount': self.feat_high_amount,
            'type_CASH_IN': self.feat_type_cash_in,
            'type_CASH_OUT': self.feat_type_cash_out,
            'type_DEBIT': self.feat_type_debit,
            'type_PAYMENT': self.feat_type_payment,
            'type_TRANSFER': self.feat_type_transfer,
        }


# ---------------------------------------------------------------------------
# 5. FraudRule
# ---------------------------------------------------------------------------

class FraudRule(models.Model):
    """
    Configurable fraud detection rule.

    Each rule references specific PaySim feature columns.
    integrity_hash = SHA-256 of the rule config dict for tamper detection.
    """
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, default='')
    rule_config = models.JSONField(default=dict)  # feature, operator, threshold, etc.
    weight = models.FloatField(default=1.0)
    is_active = models.BooleanField(default=True)
    integrity_hash = models.CharField(max_length=64)  # SHA-256 hex digest
    version = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'fraud_rules'
        ordering = ['name']

    def __str__(self):
        return f"Rule: {self.name} (w={self.weight}, v{self.version})"


# ---------------------------------------------------------------------------
# 6. RuleVersion
# ---------------------------------------------------------------------------

class RuleVersion(models.Model):
    """Snapshot of a rule weight/threshold change for audit trail."""
    rule = models.ForeignKey(
        FraudRule, on_delete=models.CASCADE, related_name='versions',
        null=True, blank=True,
    )
    weight_before = models.FloatField(null=True, blank=True)
    weight_after = models.FloatField(null=True, blank=True)
    threshold_before = models.FloatField(null=True, blank=True)
    threshold_after = models.FloatField(null=True, blank=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'rule_versions'
        ordering = ['-changed_at']


# ---------------------------------------------------------------------------
# 7. RiskAssessment
# ---------------------------------------------------------------------------

class RiskAssessment(models.Model):
    """
    Risk score for a transaction.

    risk_score is 0.0–1.0 (normalized from the 0–100 combine_scores output).
    triggered_rules is a JSONB list of matched rule details.
    """
    transaction = models.OneToOneField(
        Transaction, on_delete=models.CASCADE, related_name='risk_assessment'
    )
    risk_score = models.FloatField()  # 0.0 – 1.0
    ml_score = models.FloatField(default=0.0)       # raw 0-100 from XGBoost
    anomaly_score = models.FloatField(default=0.0)  # raw 0-100 from Isolation Forest
    triggered_rules = models.JSONField(default=list)
    rule_weights_snapshot = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'risk_assessments'

    def __str__(self):
        return f"Risk {self.transaction_id}: {self.risk_score:.3f}"


# ---------------------------------------------------------------------------
# 8. Decision
# ---------------------------------------------------------------------------

class Decision(models.Model):
    """Pipeline decision for a transaction based on threshold comparison."""
    transaction = models.OneToOneField(
        Transaction, on_delete=models.CASCADE, related_name='decision'
    )
    decision_type = models.CharField(max_length=10, choices=DecisionType.choices)
    reason = models.TextField(blank=True, default='')
    threshold_snapshot = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'decisions'

    def __str__(self):
        return f"Decision {self.transaction_id}: {self.decision_type}"


# ---------------------------------------------------------------------------
# 9. ReviewQueue
# ---------------------------------------------------------------------------

class ReviewQueue(models.Model):
    """Work item for human analyst review."""
    transaction = models.ForeignKey(
        Transaction, on_delete=models.CASCADE, related_name='reviews'
    )
    decision = models.ForeignKey(
        Decision, on_delete=models.CASCADE, related_name='reviews'
    )
    status = models.CharField(
        max_length=10,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING,
    )
    priority = models.IntegerField(default=0, db_index=True)
    claimed_by = models.CharField(max_length=255, null=True, blank=True)
    claimed_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'review_queue'
        ordering = ['-priority', 'created_at']

    def __str__(self):
        return f"Review {self.id}: txn={self.transaction_id} ({self.status})"


# ---------------------------------------------------------------------------
# 10. HumanFeedback
# ---------------------------------------------------------------------------

class HumanFeedback(models.Model):
    """
    Analyst verdict on a flagged transaction.

    notes_encrypted: AES-256-GCM encrypted reviewer notes.
    feedback_hash:   SHA-256(transaction_id + verdict + confidence + timestamp)
    """
    review_queue = models.ForeignKey(
        ReviewQueue, on_delete=models.CASCADE, related_name='feedback'
    )
    transaction = models.ForeignKey(
        Transaction, on_delete=models.CASCADE, related_name='feedback'
    )
    verdict = models.CharField(max_length=15, choices=Verdict.choices)
    confidence_score = models.IntegerField()  # 1–5
    notes_encrypted = models.BinaryField(null=True, blank=True)
    feedback_hash = models.CharField(max_length=64)  # SHA-256 hex digest
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'human_feedback'
        ordering = ['-created_at']


# ---------------------------------------------------------------------------
# 11. AuditLog
# ---------------------------------------------------------------------------

class AuditLog(models.Model):
    """
    Tamper-evident audit chain.

    Each entry's current_hash is SHA-256(previous_hash + event + entity + desc + ts).
    The chain can be verified by walking entries in created_at order.
    """
    event_type = models.CharField(max_length=30, choices=AuditEventType.choices)
    entity_id = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    previous_hash = models.CharField(max_length=64, default='0' * 64)
    current_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['created_at']

    def __str__(self):
        return f"Audit {self.id}: {self.event_type} ({self.entity_type}/{self.entity_id})"


# ---------------------------------------------------------------------------
# 12. AppSetting
# ---------------------------------------------------------------------------

class AppSetting(models.Model):
    """Runtime configuration key-value store (e.g. thresholds)."""
    key = models.CharField(max_length=100, unique=True)
    value = models.CharField(max_length=500)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'app_settings'

    def __str__(self):
        return f"{self.key} = {self.value}"

    @classmethod
    def get(cls, key: str, default: str = '') -> str:
        """Fetch a setting value by key."""
        try:
            return cls.objects.get(key=key).value
        except cls.DoesNotExist:
            return default


# ---------------------------------------------------------------------------
# 13. SecurityAlert
# ---------------------------------------------------------------------------

class SecurityAlert(models.Model):
    """Alert raised when the audit chain integrity is violated."""
    audit_log = models.ForeignKey(
        AuditLog, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='alerts',
    )
    description = models.TextField()
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'security_alerts'
        ordering = ['-created_at']
