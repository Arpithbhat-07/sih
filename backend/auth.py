"""
MPLADS Sentinel - Authentication & Role-Based Access Control (RBAC) Module
Provides password hashing (PBKDF2-SHA256), cryptographic signed session tokens,
demo user repository, and FastAPI security dependencies.
"""

import os
import hmac
import json
import base64
import hashlib
import time
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.environ.get("SENTINEL_AUTH_SECRET", "mplads-sentinel-sih-demo-key-2026-secure-token")
TOKEN_EXPIRY_SECONDS = 86400 * 7  # 7 days

security = HTTPBearer(auto_error=False)


def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    """Hash password with PBKDF2-HMAC-SHA256 and salt."""
    if salt is None:
        salt = os.urandom(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{salt.hex()}:{hashed.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify candidate password against stored salt:hash string."""
    try:
        salt_hex, hashed_hex = stored_hash.split(":")
        salt = bytes.fromhex(salt_hex)
        expected = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(expected.hex(), hashed_hex)
    except Exception:
        return False


def create_access_token(payload: Dict[str, Any], expires_in: int = TOKEN_EXPIRY_SECONDS) -> str:
    """Generate URL-safe cryptographic HMAC-SHA256 signed token."""
    data = {
        **payload,
        "exp": int(time.time()) + expires_in,
        "iat": int(time.time()),
    }
    payload_json = json.dumps(data, separators=(",", ":"))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode("utf-8")).decode("utf-8").rstrip("=")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")
    return f"{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify signature and expiration of access token."""
    try:
        parts = token.strip().split(".")
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("utf-8"), hashlib.sha256).digest()
        expected_b64 = base64.urlsafe_b64encode(expected_sig).decode("utf-8").rstrip("=")
        if not hmac.compare_digest(expected_b64, sig_b64):
            return None
        pad = len(payload_b64) % 4
        if pad:
            payload_b64 += "=" * (4 - pad)
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode("utf-8"))
        data = json.loads(payload_bytes.decode("utf-8"))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None


class User(BaseModel):
    userId: str
    username: str
    role: str  # MINISTRY | STATE_AUTHORITY | DISTRICT_AUTHORITY | MP
    scope: str  # NATIONAL | STATE | DISTRICT | MP
    state: Optional[str] = None
    district: Optional[str] = None
    constituency: Optional[str] = None
    mpName: Optional[str] = None
    fullName: str
    designation: str
    avatarInitials: str


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: User


_DEMO123_HASH = hash_password("demo123")

DEMO_USERS: Dict[str, Dict[str, Any]] = {
    "ministry.demo": {
        "user": User(
            userId="USR-MIN-001",
            username="ministry.demo",
            role="MINISTRY",
            scope="NATIONAL",
            fullName="Joint Secretary (Monitoring)",
            designation="Ministry of Statistics & Programme Implementation (MoSPI)",
            avatarInitials="MA",
        ),
        "password_hash": _DEMO123_HASH,
    },
    "state.ka.demo": {
        "user": User(
            userId="USR-STA-KA-001",
            username="state.ka.demo",
            role="STATE_AUTHORITY",
            scope="STATE",
            state="Karnataka",
            fullName="State Nodal Officer",
            designation="Planning & Statistics Department, Karnataka",
            avatarInitials="SK",
        ),
        "password_hash": _DEMO123_HASH,
    },
    "district.mangalore.demo": {
        "user": User(
            userId="USR-DST-BLR-001",
            username="district.mangalore.demo",
            role="DISTRICT_AUTHORITY",
            scope="DISTRICT",
            state="Karnataka",
            district="Bengaluru Urban",
            fullName="District Authority (Bengaluru / Dakshina Division)",
            designation="District Planning Cell, Bengaluru Urban",
            avatarInitials="DA",
        ),
        "password_hash": _DEMO123_HASH,
    },
    "district.bengaluru.demo": {
        "user": User(
            userId="USR-DST-BLR-002",
            username="district.bengaluru.demo",
            role="DISTRICT_AUTHORITY",
            scope="DISTRICT",
            state="Karnataka",
            district="Bengaluru Urban",
            fullName="Deputy Commissioner & District Authority",
            designation="District Planning Cell, Bengaluru Urban",
            avatarInitials="DB",
        ),
        "password_hash": _DEMO123_HASH,
    },
    "mp.demo": {
        "user": User(
            userId="USR-MP-KA-001",
            username="mp.demo",
            role="MP",
            scope="MP",
            state="Karnataka",
            constituency="Bengaluru Urban (PC-29)",
            mpName="Bengaluru Urban PC",
            fullName="Hon'ble Member of Parliament",
            designation="Lok Sabha Constituency: Bengaluru Urban PC",
            avatarInitials="MP",
        ),
        "password_hash": _DEMO123_HASH,
    },
}


def authenticate_user(username: str, password: str) -> Optional[User]:
    """Verify credentials and return user object if valid."""
    user_entry = DEMO_USERS.get(username.strip().lower())
    if not user_entry:
        return None
    if not verify_password(password, user_entry["password_hash"]):
        return None
    return user_entry["user"]


def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[User]:
    """
    Extract authenticated user if Authorization header is present and valid.
    If no header is passed, returns None (allowing public/backward-compatible calls).
    If an invalid header is passed, raises HTTP 401 Unauthorized.
    """
    if not auth or not auth.credentials:
        return None

    token = auth.credentials.strip()
    data = decode_access_token(token)
    if not data or "sub" not in data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = data.get("sub")
    user_entry = DEMO_USERS.get(username)
    if not user_entry:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session no longer valid.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_entry["user"]


def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    """Strict authorization dependency requiring an authenticated user."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user