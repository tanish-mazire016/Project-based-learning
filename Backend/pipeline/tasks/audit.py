"""
Stage 8 — Audit Chain Verification Worker

Celery task: verify_audit_chain
Queue: audit_queue
Beat schedule: every 6 hours
"""

import logging
import sys
from celery import shared_task

from pipeline.models import SecurityAlert
from pipeline.services.audit_service import verify_chain

logger = logging.getLogger(__name__)


@shared_task(
    name='pipeline.tasks.audit.verify_audit_chain',
    bind=True,
    max_retries=1,
    acks_late=True,
    reject_on_worker_lost=True,
)
def verify_audit_chain(self):
    """
    Walk the entire audit log chain and verify integrity.

    Runs on a 6-hour Celery Beat schedule.
    If violations are found, writes SecurityAlert records and logs to stderr.
    """
    try:
        violations = verify_chain()

        if not violations:
            logger.info("Audit chain verification passed — no violations found")
            return

        # ── Alert on violations ──
        logger.error(f"AUDIT CHAIN VIOLATION: {len(violations)} violations detected!")

        for v in violations:
            # Write to security_alerts table
            SecurityAlert.objects.create(
                audit_log_id=v.get('audit_log_id'),
                description=v['description'],
            )

            # Log to stderr for immediate visibility
            print(
                f"[SECURITY ALERT] Audit chain violation: {v['description']}",
                file=sys.stderr,
            )

        logger.error(
            f"Created {len(violations)} security alerts for audit chain violations"
        )

    except Exception as exc:
        logger.exception("Audit chain verification failed")
        raise self.retry(exc=exc)
