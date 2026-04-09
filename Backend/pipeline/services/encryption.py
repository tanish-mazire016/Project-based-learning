"""
Encryption Service — AES-256-GCM for sensitive reviewer notes.
"""

import os
import logging
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_key() -> bytes:
    """Get the 32-byte AES key from settings (hex-encoded)."""
    hex_key = getattr(settings, 'ENCRYPTION_KEY', '')
    if len(hex_key) < 64:
        raise ValueError(
            "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). "
            "Generate one with: python -c \"import os; print(os.urandom(32).hex())\""
        )
    return bytes.fromhex(hex_key[:64])


def encrypt_notes(plaintext: str) -> bytes:
    """
    Encrypt reviewer notes using AES-256-GCM.

    Returns:
        bytes: nonce (12 bytes) + ciphertext + tag
    """
    if not plaintext:
        return b''

    key = _get_key()
    aesgcm = AESGCM(key)

    # 96-bit (12 byte) nonce — recommended for GCM
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)

    # Prepend nonce to ciphertext for storage
    return nonce + ciphertext


def decrypt_notes(encrypted: bytes) -> str:
    """
    Decrypt reviewer notes encrypted with encrypt_notes().

    Args:
        encrypted: bytes containing nonce (12 bytes) + ciphertext + tag

    Returns:
        Decrypted plaintext string.
    """
    if not encrypted:
        return ''

    key = _get_key()
    aesgcm = AESGCM(key)

    # Extract nonce (first 12 bytes) and ciphertext
    nonce = encrypted[:12]
    ciphertext = encrypted[12:]

    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode('utf-8')
