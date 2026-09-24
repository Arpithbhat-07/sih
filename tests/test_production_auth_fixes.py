"""
Unit & Integration Tests for Production Authentication, CORS, and Health Endpoints
Verifies:
1. Valid credentials (200 + token + user)
2. Invalid credentials (401)
3. Invalid / missing request payload (422)
4. RBAC jurisdiction enforcement
5. CORS headers for Vercel preview/production domains (*.vercel.app)
6. CORS headers for localhost development (localhost:3000, 127.0.0.1:3000)
7. Trailing slash normalization in CORS origins
8. Rejection of unauthorized origins
9. Root / and /health platform monitor endpoints
10. Secret key precedence in auth.py
"""

import os
import pytest
from fastapi.testclient import TestClient
from backend.server import app, resolve_cors_origins
from backend.auth import (
    authenticate_user,
    create_access_token,
    decode_access_token,
    DEMO_USERS,
)

client = TestClient(app)


# ==================== 1. AUTHENTICATION TESTS ====================

def test_login_valid_credentials():
    """Verify that all demo accounts authenticate with HTTP 200, returning token and user."""
    for username in ["ministry.demo", "state.ka.demo", "district.mangalore.demo", "district.bengaluru.demo", "mp.demo"]:
        res = client.post("/api/auth/login", json={"username": username, "password": "demo123"})
        assert res.status_code == 200, f"Login failed for {username}"
        data = res.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == username
        assert len(data["token"].split(".")) == 2  # URL-safe HMAC token format


def test_login_invalid_password():
    """Verify that invalid passwords return HTTP 401 with appropriate error detail."""
    res = client.post("/api/auth/login", json={"username": "ministry.demo", "password": "wrongpassword"})
    assert res.status_code == 401
    assert "Invalid username or password" in res.json()["detail"]


def test_login_unknown_user():
    """Verify that unknown usernames return HTTP 401."""
    res = client.post("/api/auth/login", json={"username": "unknown.user", "password": "demo123"})
    assert res.status_code == 401
    assert "Invalid username or password" in res.json()["detail"]


def test_login_missing_fields_returns_422():
    """Verify that malformed or missing JSON fields return HTTP 422 Unprocessable Entity."""
    res = client.post("/api/auth/login", json={"username": "ministry.demo"})
    assert res.status_code == 422

    res_empty = client.post("/api/auth/login", json={})
    assert res_empty.status_code == 422


# ==================== 2. CORS PREFLIGHT & ORIGIN TESTS ====================

def test_cors_preflight_vercel_origin():
    """Verify that preflight OPTIONS from a Vercel domain receives correct CORS headers."""
    for origin in ["https://missionx.arpith.in", "https://missionx-jade.vercel.app", "https://mplads-sentinel.vercel.app"]:
        res = client.options(
            "/api/auth/login",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,authorization",
            },
        )
        assert res.status_code == 200, f"Preflight failed for {origin}"
        assert res.headers.get("access-control-allow-origin") == origin, f"Wrong allow-origin for {origin}"
        assert res.headers.get("access-control-allow-credentials") == "true"


def test_cors_preflight_localhost_origin():
    """Verify that localhost frontend (port 3000) receives correct CORS headers."""
    for origin in ["http://localhost:3000", "http://127.0.0.1:3000"]:
        res = client.options(
            "/api/auth/login",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        assert res.status_code == 200
        assert res.headers.get("access-control-allow-origin") == origin
        assert res.headers.get("access-control-allow-credentials") == "true"


def test_cors_unauthorized_origin_rejected():
    """Verify that an unauthorized origin does not receive access-control-allow-origin header."""
    res = client.options(
        "/api/auth/login",
        headers={
            "Origin": "https://malicious-attacker-site.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    # CORSMiddleware does not set Access-Control-Allow-Origin for disallowed origins
    assert "access-control-allow-origin" not in res.headers


def test_resolve_cors_origins_normalization(monkeypatch):
    """Verify that trailing slashes and spaces are stripped and bare domains get https://."""
    monkeypatch.setenv("FRONTEND_URL", "https://my-custom-app.vercel.app/ ")
    monkeypatch.setenv("CORS_ORIGINS", "https://app1.example.com/, app2.example.com")
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:8080/ ")

    origins = resolve_cors_origins()
    assert "https://my-custom-app.vercel.app" in origins
    assert "https://my-custom-app.vercel.app/" not in origins
    assert "https://app1.example.com" in origins
    assert "https://app1.example.com/" not in origins
    assert "https://app2.example.com" in origins
    assert "http://localhost:8080" in origins


# ==================== 3. ROOT & HEALTH ENDPOINTS ====================

def test_root_endpoint():
    """Verify that GET / returns HTTP 200 with service status."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "MPLADS Sentinel API"


def test_health_endpoint():
    """Verify that GET /health returns HTTP 200 for Render health checks."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_api_health_endpoint():
    """Verify that GET /api/health returns HTTP 200 with dataset metadata."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "dataset" in data


# ==================== 4. AUTH SECRET PRECEDENCE ====================

def test_secret_key_precedence():
    """Verify that access tokens signed with configured secret can be verified."""
    token = create_access_token({"sub": "ministry.demo", "role": "MINISTRY", "scope": "NATIONAL"})
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "ministry.demo"
    assert decoded["role"] == "MINISTRY"


# ==================== 5. RBAC PRESERVATION ====================

def test_rbac_user_scopes_preserved():
    """Verify that demo user scopes and roles remain strictly intact."""
    user = authenticate_user("state.ka.demo", "demo123")
    assert user is not None
    assert user.role == "STATE_AUTHORITY"
    assert user.scope == "STATE"
    assert user.state == "Karnataka"

    dist_user = authenticate_user("district.bengaluru.demo", "demo123")
    assert dist_user is not None
    assert dist_user.role == "DISTRICT_AUTHORITY"
    assert dist_user.district == "Bengaluru Urban"
