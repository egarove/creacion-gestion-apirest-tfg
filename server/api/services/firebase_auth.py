# -*- coding: utf-8 -*-
"""
Firebase ID token verification using Google public keys (RSA/RS256).
Caches keys respecting Cache-Control max-age to avoid rate-limit.
"""
import re
import time
import threading

import jwt
import requests
from cryptography import x509
from cryptography.hazmat.backends import default_backend

FIREBASE_PROJECT = "gestion-api-rest-dam"
_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)

_cache: dict = {"keys": {}, "expires": 0.0}
_lock = threading.Lock()


def _get_public_keys() -> dict:
    with _lock:
        if time.time() < _cache["expires"]:
            return _cache["keys"]
        resp = requests.get(_CERTS_URL, timeout=5)
        resp.raise_for_status()
        m = re.search(r"max-age=(\d+)", resp.headers.get("Cache-Control", "max-age=3600"))
        max_age = int(m.group(1)) if m else 3600
        _cache["keys"] = resp.json()
        _cache["expires"] = time.time() + max_age - 60  # 1-min safety buffer
        return _cache["keys"]


def verify_token(token: str) -> dict:
    """Verify a Firebase ID token. Returns payload dict or raises ValueError."""
    keys = _get_public_keys()
    try:
        header = jwt.get_unverified_header(token)
    except jwt.DecodeError as exc:
        raise ValueError(f"Invalid token format: {exc}") from exc
    kid = header.get("kid")
    if kid not in keys:
        raise ValueError("Unknown key ID in token header")
    cert = x509.load_pem_x509_certificate(keys[kid].encode(), default_backend())
    public_key = cert.public_key()
    payload = jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
        audience=FIREBASE_PROJECT,
        issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT}",
    )
    return payload
