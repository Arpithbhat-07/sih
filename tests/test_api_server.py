"""
API Server endpoint verification tests.
Tests that FastAPI endpoints return valid JSON matching frontend data contracts,
with zero NaN/Infinity leaks, proper error handling, filtering, and pagination.
"""

import math
from fastapi.testclient import TestClient
from backend.server import app

client = TestClient(app)


def assert_no_nan(data):
    """Recursively check that no NaN or Infinity exists in response payload."""
    if isinstance(data, dict):
        for k, v in data.items():
            assert_no_nan(v)
    elif isinstance(data, list):
        for item in data:
            assert_no_nan(item)
    elif isinstance(data, float):
        assert not math.isnan(data), f"Found NaN float in response: {data}"
        assert not math.isinf(data), f"Found Inf float in response: {data}"


def test_root_endpoint():
    response = client.get("/api/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "MPLADS Sentinel API"
    assert data["status"] == "online"
    assert "disclaimer" in data
    assert_no_nan(data)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "MPLADS Sentinel API"
    assert "dataset" in data
    assert data["dataset"]["records"] == 3000
    assert_no_nan(data)


def test_summary_endpoint():
    response = client.get("/api/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["totalWorks"] == 3000
    assert data["totalSanctioned"] > 0
    assert data["totalExpenditure"] > 0
    assert "criticalWorks" in data
    assert "highRiskWorks" in data
    assert "delayedWorks" in data
    assert "duplicateCandidates" in data
    assert "counts" in data
    assert "CRITICAL" in data["counts"]
    assert "HIGH" in data["counts"]
    assert "MEDIUM" in data["counts"]
    assert "LOW" in data["counts"]
    assert "utilization" in data
    assert "stateSummary" in data
    assert len(data["stateSummary"]) > 0
    assert "disclaimer" in data
    assert_no_nan(data)


def test_risk_endpoint():
    response = client.get("/api/risk?page=1&pageSize=10&riskTier=CRITICAL")
    assert response.status_code == 200
    data = response.json()
    assert "rows" in data
    assert "total" in data
    assert "totalPages" in data
    assert data["page"] == 1
    assert data["pageSize"] == 10
    assert len(data["rows"]) <= 10
    for row in data["rows"]:
        assert row["riskTier"] == "CRITICAL"
        assert 80 <= row["riskScore"] <= 100
        assert "id" in row
        assert "workId" in row
        assert "primarySignal" in row
    assert_no_nan(data)


def test_works_query_and_pagination():
    response = client.get("/api/works?page=1&pageSize=5&riskLevel=CRITICAL")
    assert response.status_code == 200
    data = response.json()
    assert "rows" in data
    assert len(data["rows"]) <= 5
    assert "total" in data
    assert "totalPages" in data
    if len(data["rows"]) > 0:
        first = data["rows"][0]
        assert first["riskTier"] == "CRITICAL"
        assert 80 <= first["riskScore"] <= 100
        assert "workId" in first
        assert "breakdown" in first
    assert_no_nan(data)


def test_works_query_filters():
    # Test state and category filtering
    res = client.get("/api/works?state=MH&category=Healthcare&pageSize=20")
    assert res.status_code == 200
    data = res.json()
    assert "rows" in data
    for row in data["rows"]:
        assert row["stateCode"] == "MH"
        assert row["category"] == "Healthcare"
    assert_no_nan(data)


def test_work_detail_endpoint_valid():
    list_res = client.get("/api/works?pageSize=1")
    wid = list_res.json()["rows"][0]["id"]

    res = client.get(f"/api/works/{wid}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["id"] == wid
    assert detail["workId"] == wid
    assert "breakdown" in detail
    assert "findings" in detail
    assert "financials" in detail
    assert "timeline" in detail
    assert "similar" in detail
    assert isinstance(detail["breakdown"], list)
    assert isinstance(detail["timeline"], list)
    assert_no_nan(detail)


def test_work_detail_endpoint_not_found():
    res = client.get("/api/works/NONEXISTENT_WORK_99999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_states_endpoint():
    res = client.get("/api/states")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "code" in first
    assert "name" in first
    assert "state" in first
    assert "works" in first
    assert "totalWorks" in first
    assert "highRisk" in first
    assert "avgRisk" in first
    assert_no_nan(data)


def test_districts_agencies_categories_alerts():
    for ep in ["/api/districts", "/api/agencies", "/api/categories", "/api/alerts"]:
        res = client.get(ep)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert_no_nan(data)


def test_filters_endpoint():
    res = client.get("/api/filters")
    assert res.status_code == 200
    data = res.json()
    assert "states" in data
    assert "districts" in data
    assert "categories" in data
    assert "agencies" in data
    assert "riskTiers" in data
    assert set(data["riskTiers"]) == {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
    assert_no_nan(data)


def test_analytics_endpoint():
    res = client.get("/api/analytics")
    assert res.status_code == 200
    data = res.json()
    assert "states" in data
    assert "categories" in data
    assert "agencies" in data
    assert "efficiency" in data
    assert "utilizationHeatmap" in data
    assert "riskTrend" in data
    assert "expenditureTrend" in data
    assert "disclaimer" in data
    assert len(data["efficiency"]) > 0
    assert len(data["utilizationHeatmap"]) > 0
    assert len(data["riskTrend"]) == 12
    assert len(data["expenditureTrend"]) == 12
    assert_no_nan(data)


def test_compare_endpoint_valid():
    list_res = client.get("/api/works?pageSize=2")
    rows = list_res.json()["rows"]
    id_a = rows[0]["id"]
    id_b = rows[1]["id"]

    res = client.get(f"/api/compare/{id_a}/{id_b}")
    assert res.status_code == 200
    data = res.json()
    assert "similarity" in data
    assert 0 <= data["similarity"] <= 100
    assert "attributes" in data
    assert "matches" in data
    assert "a" in data
    assert "b" in data
    assert_no_nan(data)


def test_compare_endpoint_invalid():
    res = client.get("/api/compare/NONEXISTENT_A/NONEXISTENT_B")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_pagination_validation():
    # Page < 1 should return 422 Unprocessable Entity
    res = client.get("/api/works?page=0")
    assert res.status_code == 422

    res = client.get("/api/risk?page=-1")
    assert res.status_code == 422


def test_analyze_upload_invalid_extension():
    files = {"file": ("test.txt", b"some text", "text/plain")}
    res = client.post("/api/analyze", files=files)
    assert res.status_code == 400
    assert "only .csv files are supported" in res.json()["detail"].lower()


def test_analyze_upload_empty_file():
    files = {"file": ("empty.csv", b"", "text/csv")}
    res = client.post("/api/analyze", files=files)
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


def test_analyze_upload_invalid_content():
    files = {"file": ("bad.csv", b"not,a,real\ncsv", "image/png")}
    res = client.post("/api/analyze", files=files)
    assert res.status_code == 400
    assert "unsupported content type" in res.json()["detail"].lower()


def test_analyze_upload_oversized():
    # Construct a dummy stream that exceeds 25 MB
    oversized_data = b"x" * (25 * 1024 * 1024 + 1024)
    files = {"file": ("huge.csv", oversized_data, "text/csv")}
    res = client.post("/api/analyze", files=files)
    assert res.status_code == 413
    assert "exceeds maximum allowed upload size" in res.json()["detail"].lower()


