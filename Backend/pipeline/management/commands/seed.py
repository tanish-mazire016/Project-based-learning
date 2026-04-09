"""
Seed Script — Django management command.

Creates sample FraudRules (referencing PaySim feature columns)
and populates AppSettings with default thresholds.

Usage: python manage.py seed
"""

import json
import hashlib
from django.core.management.base import BaseCommand

from pipeline.models import FraudRule, AppSetting


def compute_rule_hash(config: dict) -> str:
    """Compute SHA-256 integrity hash for a rule config."""
    config_str = json.dumps(config, sort_keys=True)
    return hashlib.sha256(config_str.encode()).hexdigest()


# 5 fraud rules that reference the actual 12 PaySim engineered feature columns
SEED_RULES = [
    {
        'name': 'high_amount_rule',
        'description': (
            'Flags transactions where the high_amount feature is 1 '
            '(amount above 95th percentile of the batch). '
            'References feature: high_amount from feature_engineering.py create_high_amount_flag().'
        ),
        'rule_config': {
            'feature': 'high_amount',
            'operator': '==',
            'threshold': 1,
            'description': 'Transaction amount above 95th percentile',
        },
        'weight': 0.25,
    },
    {
        'name': 'emptied_account_rule',
        'description': (
            'Flags transactions where amount >= oldbalanceOrg (account drained). '
            'References features: amount, oldbalanceOrg from feature_engineering.py.'
        ),
        'rule_config': {
            'feature': 'amount',
            'operator': '>=',
            'threshold': 0,  # Compared against oldbalanceOrg at runtime
            'compare_feature': 'oldbalanceOrg',
            'description': 'Transaction drains the sender account',
        },
        'weight': 0.20,
    },
    {
        'name': 'high_frequency_sender_rule',
        'description': (
            'Flags transactions from senders with high transaction count. '
            'References feature: orig_txn_count from feature_engineering.py create_frequency_features().'
        ),
        'rule_config': {
            'feature': 'orig_txn_count',
            'operator': '>',
            'threshold': 5,
            'description': 'Sender has more than 5 transactions in the batch',
        },
        'weight': 0.20,
    },
    {
        'name': 'suspicious_type_rule',
        'description': (
            'Flags TRANSFER and CASH_OUT transactions (the only types where fraud occurs in PaySim). '
            'References features: type_TRANSFER, type_CASH_OUT from feature_engineering.py encode_categorical_features().'
        ),
        'rule_config': {
            'feature': 'type_TRANSFER',
            'operator': '==',
            'threshold': 1,
            'alt_feature': 'type_CASH_OUT',
            'alt_operator': '==',
            'alt_threshold': 1,
            'logic': 'OR',
            'description': 'Transaction type is TRANSFER or CASH_OUT',
        },
        'weight': 0.20,
    },
    {
        'name': 'anomaly_detection_rule',
        'description': (
            'Flags transactions where the Isolation Forest model detects anomalous behavior. '
            'This rule operates on the anomaly_score computed by risk_engine.py compute_anomaly_score(). '
            'The anomaly score is derived from the full 12-feature vector.'
        ),
        'rule_config': {
            'feature': 'anomaly_score',
            'operator': '>',
            'threshold': 50,
            'description': 'Isolation Forest anomaly score above 50 (normalized 0-100)',
        },
        'weight': 0.15,
    },
]

SEED_SETTINGS = [
    {'key': 'ALLOW_THRESHOLD', 'value': '0.30'},
    {'key': 'BLOCK_THRESHOLD', 'value': '0.65'},
]


class Command(BaseCommand):
    help = 'Seed the database with initial FraudRules and AppSettings'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding database...'))

        # ── Seed Fraud Rules ──
        created_rules = 0
        for rule_data in SEED_RULES:
            config = rule_data['rule_config']
            integrity_hash = compute_rule_hash(config)

            rule, created = FraudRule.objects.update_or_create(
                name=rule_data['name'],
                defaults={
                    'description': rule_data['description'],
                    'rule_config': config,
                    'weight': rule_data['weight'],
                    'is_active': True,
                    'integrity_hash': integrity_hash,
                    'version': 1,
                },
            )
            action = 'Created' if created else 'Updated'
            self.stdout.write(f"  {action} rule: {rule.name} (weight={rule.weight}, hash={integrity_hash[:12]}...)")
            if created:
                created_rules += 1

        # ── Seed App Settings ──
        created_settings = 0
        for setting_data in SEED_SETTINGS:
            setting, created = AppSetting.objects.update_or_create(
                key=setting_data['key'],
                defaults={'value': setting_data['value']},
            )
            action = 'Created' if created else 'Updated'
            self.stdout.write(f"  {action} setting: {setting.key} = {setting.value}")
            if created:
                created_settings += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone! {created_rules} rules and {created_settings} settings seeded.'
            )
        )
