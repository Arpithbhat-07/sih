"""
MPLADS Sentinel - Automated Authorization & RBAC Test Suite (Milestone 5)
Verifies server-side scope enforcement, anti-tampering, work detail authorization,
cross-jurisdiction comparison blocks, authentication tokens, and scoped analytics.
"""

import pytest
from fastapi.testclient import TestClient
from backend.server import app
from backend.auth import create_access_token, DEMO_USERS, hash_password, verify_password

client = TestClient(app)


def get_token_for(username: str) -> str:
    user_entry = DEMO_USERS[username]
    user = user_entry["user"]
    return create_access_token({"sub": user.username, "role": user.role, "scope": user.scope})


def auth_headers(username: str):
    token = get_token_for(username)
    return {"Authorization": f"Bearer {token}"}


# -------------------- 1. AUTHENTICATION TESTS --------------------

def test_login_success_all_roles():
    for uname in ["ministry.demo", "state.ka.demo", "district.mangalore.demo", "district.bengaluru.demo", "mp.demo"]:
        res = client.post("/api/auth/login", json={"username": uname, "password": "demo123"})
        assert res.status_code == 200, f"Login failed for {uname}"
        data = res.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["username"] == uname


def test_login_invalid_password():
    res = client.post("/api/auth/login", json={"username": "ministry.demo", "password": "wrongpassword"})
    assert res.status_code == 401
    assert "Invalid username or password" in res.json()["detail"]


def test_unauthenticated_me_returns_401():
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_invalid_token_returns_401():
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.string"})
    assert res.status_code == 401


def test_authenticated_me_returns_user_profile():
    res = client.get("/api/auth/me", headers=auth_headers("state.ka.demo"))
    assert res.status_code == 200
    user = res.json()
    assert user["username"] == "state.ka.demo"
    assert user["role"] == "STATE_AUTHORITY"
    assert user["state"] == "Karnataka"


def test_logout():
    res = client.post("/api/auth/logout")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


# -------------------- 2. SCOPED DATA ACCESS & FILTERING --------------------

def test_ministry_can_access_national_works():
    res = client.get("/api/works?pageSize=1", headers=auth_headers("ministry.demo"))
    assert res.status_code == 200
    assert res.json()["total"] == 5000


def test_state_authority_can_access_only_assigned_state():
    res = client.get("/api/works?pageSize=1000", headers=auth_headers("state.ka.demo"))
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 417
    for w in data["rows"]:
        assert w["state"] == "Karnataka"


def test_district_authority_can_access_only_assigned_district():
    res = client.get("/api/works?pageSize=1000", headers=auth_headers("district.bengaluru.demo"))
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 89
    for w in data["rows"]:
        assert w["state"] == "Karnataka"
        assert w["district"] == "Bengaluru Urban"


def test_mp_can_access_only_their_projects():
    res = client.get("/api/works?pageSize=1000", headers=auth_headers("mp.demo"))
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 89


# -------------------- 3. ANTI-TAMPERING QUERY ENFORCEMENT --------------------

def test_district_authority_cannot_bypass_scope_via_query_params():
    # Attempt to request Uttar Pradesh works
    res = client.get("/api/works?state=Uttar%20Pradesh", headers=auth_headers("district.bengaluru.demo"))
    assert res.status_code == 200
    data = res.json()
    # Must still return ONLY Bengaluru Urban works, NOT Uttar Pradesh
    assert data["total"] == 89
    for w in data["rows"]:
        assert w["state"] == "Karnataka"
        assert w["district"] == "Bengaluru Urban"


def test_state_authority_cannot_bypass_scope_via_query_params():
    # Attempt to request Bihar works
    res = client.get("/api/works?state=Bihar", headers=auth_headers("state.ka.demo"))
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 417
    for w in data["rows"]:
        assert w["state"] == "Karnataka"


# -------------------- 4. WORK DETAIL AUTHORIZATION (HTTP 403) --------------------

def test_work_detail_authorized_and_unauthorized():
    # Find one Karnataka Bengaluru Urban work and one non-Karnataka work
    ka_res = client.get("/api/works?pageSize=1", headers=auth_headers("district.bengaluru.demo"))
    ka_wid = ka_res.json()["rows"][0]["id"]

    # Ministry gets a non-Karnataka work
    all_res = client.get("/api/works?pageSize=50", headers=auth_headers("ministry.demo"))
    non_ka_wid = next(w["id"] for w in all_res.json()["rows"] if w["state"] != "Karnataka")

    # 1. District Authority accesses own work -> Allowed 200
    res_own = client.get(f"/api/works/{ka_wid}", headers=auth_headers("district.bengaluru.demo"))
    assert res_own.status_code == 200
    assert res_own.json()["id"] == ka_wid

    # 2. District Authority accesses out-of-district work -> Blocked 403
    res_other = client.get(f"/api/works/{non_ka_wid}", headers=auth_headers("district.bengaluru.demo"))
    assert res_other.status_code == 403
    assert "Access forbidden" in res_other.json()["detail"]

    # 3. State Authority accesses out-of-state work -> Blocked 403
    res_state_other = client.get(f"/api/works/{non_ka_wid}", headers=auth_headers("state.ka.demo"))
    assert res_state_other.status_code == 403
    assert "Access forbidden" in res_state_other.json()["detail"]

    # 4. Ministry accesses any work -> Allowed 200
    res_min = client.get(f"/api/works/{non_ka_wid}", headers=auth_headers("ministry.demo"))
    assert res_min.status_code == 200


# -------------------- 5. COMPARISON AUTHORIZATION (HTTP 403) --------------------

def test_compare_works_authorization():
    ka_res = client.get("/api/works?pageSize=2", headers=auth_headers("district.bengaluru.demo"))
    ka_wid_1 = ka_res.json()["rows"][0]["id"]
    ka_wid_2 = ka_res.json()["rows"][1]["id"]

    all_res = client.get("/api/works?pageSize=50", headers=auth_headers("ministry.demo"))
    non_ka_wid = next(w["id"] for w in all_res.json()["rows"] if w["state"] != "Karnataka")

    # Authorized compare within same district -> 200
    res_auth = client.get(f"/api/compare/{ka_wid_1}/{ka_wid_2}", headers=auth_headers("district.bengaluru.demo"))
    assert res_auth.status_code == 200

    # Cross-jurisdiction compare -> 403 Forbidden
    res_unauth = client.get(f"/api/compare/{ka_wid_1}/{non_ka_wid}", headers=auth_headers("district.bengaluru.demo"))
    assert res_unauth.status_code == 403
    assert "Access forbidden" in res_unauth.json()["detail"]


# -------------------- 6. SCOPED ANALYTICS & SUMMARY --------------------

def test_scoped_summary():
    min_sum = client.get("/api/summary", headers=auth_headers("ministry.demo")).json()
    state_sum = client.get("/api/summary", headers=auth_headers("state.ka.demo")).json()
    dist_sum = client.get("/api/summary", headers=auth_headers("district.bengaluru.demo")).json()

    assert min_sum["totalWorks"] == 5000
    assert state_sum["totalWorks"] == 417
    assert dist_sum["totalWorks"] == 89

    # Sanctioned amount must be strictly localized
    assert min_sum["totalSanctioned"] > state_sum["totalSanctioned"] > dist_sum["totalSanctioned"]


def test_scoped_states_and_districts():
    state_res = client.get("/api/states", headers=auth_headers("state.ka.demo")).json()
    assert len(state_res) == 1
    assert state_res[0]["name"] == "Karnataka"

    dist_res = client.get("/api/districts", headers=auth_headers("district.bengaluru.demo")).json()
    assert len(dist_res) == 1
    assert dist_res[0]["district"] == "Bengaluru Urban"


def test_scoped_alerts():
    min_alerts = client.get("/api/alerts", headers=auth_headers("ministry.demo")).json()
    dist_alerts = client.get("/api/alerts", headers=auth_headers("district.bengaluru.demo")).json()

    assert len(min_alerts) >= len(dist_alerts)
    for alert in dist_alerts:
        assert alert["state"] == "Karnataka"
        assert alert["district"] == "Bengaluru Urban"