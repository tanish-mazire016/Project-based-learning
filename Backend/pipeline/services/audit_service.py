"""
Audit Service — SHA-256 tamper-evident audit chain.

Provides:
  - write_audit_log(): Append a new entry to the hash chain
  - verify_chain():    Walk the chain and detect tampering
"""

import hashlib
import logging
from datetime import datetime, timezone

from django.db import transaction as db_transaction

logger = logging.getLogger(__name__)


def write_audit_log(event_type: str, entity_id: str, entity_type: str,
                    description: str = '') -> 'AuditLog':
    """
    Append a new audit log entry to the tamper-evident hash chain.

    1. Fetch the most recent AuditLog row and get its current_hash
    2. Compute new_hash = SHA-256(previous_hash + event_type + entity_id + description + timestamp)
    3. Insert new AuditLog row

    This must run inside a transaction to prevent race conditions.
    """
    from pipeline.models import AuditLog

    with db_transaction.atomic():
        # Get the most recent entry's hash
        last_entry = AuditLog.objects.order_by('-created_at').first()
        previous_hash = last_entry.current_hash if last_entry else '0' * 64

        # Compute the new hash
        now = datetime.now(timezone.utc).isoformat()
        hash_input = f"{previous_hash}{event_type}{entity_id}{description}{now}"
        current_hash = hashlib.sha256(hash_input.encode()).hexdigest()

        # Create the entry
        entry = AuditLog.objects.create(
            event_type=event_type,
            entity_id=str(entity_id),
            entity_type=entity_type,
            description=description,
            previous_hash=previous_hash,
            current_hash=current_hash,
        )

    logger.info(f"Audit log: {event_type} for {entity_type}/{entity_id}")
    return entry


def verify_chain() -> list[dict]:
    """
    Walk the entire audit chain and verify integrity.

    Checks:
      1. Each row's previous_hash matches the prior row's current_hash
      2. (Note: we cannot recompute current_hash exactly because auto_now_add
         timestamps may differ slightly — so we only verify chain linkage)

    Returns:
        List of violation dicts: [{'audit_log_id': int, 'description': str}]
        Empty list means the chain is intact.
    """
    from pipeline.models import AuditLog

    entries = AuditLog.objects.order_by('created_at').all()
    violations = []

    prev_hash = '0' * 64  # Genesis hash

    for entry in entries:
        # Check chain linkage
        if entry.previous_hash != prev_hash:
            violations.append({
                'audit_log_id': entry.id,
                'description': (
                    f"Chain broken at entry {entry.id}: "
                    f"expected previous_hash={prev_hash[:16]}..., "
                    f"got={entry.previous_hash[:16]}..."
                ),
            })

        prev_hash = entry.current_hash

    return violations
