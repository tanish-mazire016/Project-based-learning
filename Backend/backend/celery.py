"""
Celery application configuration for the fraud detection pipeline.

Queues:
  cleaning_queue     → process_cleaning_batch
  features_queue     → process_feature_engineering_batch
  scoring_queue      → process_risk_scoring_batch
  decisions_queue    → process_decisions_batch
  adaptive_queue     → run_adaptive_engine
  audit_queue        → verify_audit_chain
"""

import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('fraud_pipeline')

# Pull all CELERY_* settings from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps (pipeline.tasks.*)
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Simple debug task to verify Celery is running."""
    print(f'Request: {self.request!r}')
