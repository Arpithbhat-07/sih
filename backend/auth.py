"""
ProcureGuard - Authentication & Role-Based Access Control (RBAC) Module
Provides password hashing (PBKDF2-SHA256), cryptographic signed session tokens,
procurement authority user repository, and FastAPI security dependencies.
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

SECRET_KEY = os.environ.get("PROCUREGUARD_AUTH_SECRET", "procureguard-sih-demo-key-2026-secure-token")
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
    role: str  # MINISTRY (National Director) | STATE_AUTHORITY | DISTRICT_AUTHORITY | MP (Auditor)
    scope: str  # NATIONAL | STATE | DISTRICT | AUDITOR
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
            userId="USR-NAT-001",
            username="ministry.demo",
            role="MINISTRY",
            scope="NATIONAL",
            fullName="Chief Procurement Vigilance Officer",
            designation="Central Public Procurement Oversight Directorate",
            avatarInitials="CP",
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
            fullName="State Procurement Audit Officer",
            designation="Directorate of State Public Procurements, Karnataka",
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
            fullName="District Tender Oversight Officer",
            designation="District Procurement Monitoring Cell (Bengaluru Urban)",
            avatarInitials="DT",
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
            fullName="District Tender Oversight Officer",
            designation="District Procurement Monitoring Cell (Bengaluru Urban)",
            avatarInitials="DT",
        ),
        "password_hash": _DEMO123_HASH,
    },
    "mp.demo": {
        "user": User(
            userId="USR-INV-002",
            username="mp.demo",
            role="MP",
            scope="AUDITOR",
            state="Karnataka",
            district="Bengaluru Urban",
            constituency="Bengaluru Urban PC",
            mpName="Lead Procurement Auditor",
            fullName="Senior Procurement Investigator",
            designation="Autonomous Vigilance & Integrity Investigation Unit",
            avatarInitials="PI",
        ),
        "password_hash": _DEMO123_HASH,
    },
    "mp.bangalore.demo": {
        "user": User(
            userId="USR-INV-001",
            username="mp.bangalore.demo",
            role="MP",
            scope="AUDITOR",
            state="Karnataka",
            district="Bengaluru Urban",
            constituency="Special Investigation Unit",
            mpName="Lead Procurement Auditor",
            fullName="Senior Procurement Investigator",
            designation="Autonomous Vigilance & Integrity Investigation Unit",
            avatarInitials="PI",
        ),
        "password_hash": _DEMO123_HASH,
    },
}


def authenticate_user(username: str, password: str) -> Optional[User]:
    """Validate user credentials against demo repository."""
    user_entry = DEMO_USERS.get(username.strip().lower())
    if not user_entry:
        return None
    if verify_password(password, user_entry["password_hash"]):
        return user_entry["user"]
    return None


def get_current_user_optional(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[User]:
    """Retrieve authenticated user if valid token present, otherwise None."""
    if not creds or not creds.credentials:
        return None
    data = decode_access_token(creds.credentials)
    if not data:
        return None
    username = data.get("sub", "")
    user_entry = DEMO_USERS.get(username.lower())
    if user_entry:
        return user_entry["user"]
    return None


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> User:
    """Strict dependency requiring authenticated user session."""
    user = get_current_user_optional(creds)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session invalid or expired. Please authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user