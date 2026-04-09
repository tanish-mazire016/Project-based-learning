"""
URL routing for the fraud detection pipeline API.

All routes are mounted under /api/ by the root urls.py.
"""

from django.urls import path
from pipeline import views

urlpatterns = [
    # ── Stage 1: Data Ingestion ──
    path('ingestion/upload', views.upload_dataset, name='upload-dataset'),
    path('ingestion/<int:dataset_id>/status', views.dataset_status, name='dataset-status'),

    # ── Stage 6: Human Review ──
    path('reviews/queue', views.review_queue_list, name='review-queue'),
    path('reviews/<int:review_id>/claim', views.claim_review, name='claim-review'),
    path('reviews/<int:review_id>/detail', views.review_detail, name='review-detail'),
    path('reviews/<int:review_id>/submit', views.submit_feedback, name='submit-feedback'),

    # ── Settings (read-only) ──
    path('settings/thresholds', views.get_thresholds, name='get-thresholds'),
    path('settings/rules', views.get_rules, name='get-rules'),
    path('settings/audit-logs', views.get_audit_logs, name='get-audit-logs'),
]
