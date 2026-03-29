import os
import base64
import hashlib
from cryptography.fernet import Fernet


def _build_fernet() -> Fernet:
    secret = os.getenv("WALLET_MASTER_ENCRYPTION_KEY", "")
    if not secret:
        raise ValueError("WALLET_MASTER_ENCRYPTION_KEY is not set")

    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_private_key(private_key: str) -> str:
    f = _build_fernet()
    return f.encrypt(private_key.encode("utf-8")).decode("utf-8")


def decrypt_private_key(encrypted_private_key: str) -> str:
    f = _build_fernet()
    return f.decrypt(encrypted_private_key.encode("utf-8")).decode("utf-8")