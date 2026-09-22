"""
Unit Tests for MPLADS Sentinel Machine Learning & Analytics Engine.
Verifies preprocessing, anomaly detectors, risk scoring ranges, and API integrity.
"""

import pytest
import pandas as pd
import numpy as np
import math
from pathlib import Path

from backend.ml.preprocessing import preprocess_dataframe, load_dataset, validate_schema
from backend.ml.cost_anomaly import CostAnomalyDetector
from backend.ml.delay_detection import DelayDetector
from backend.ml.duplicate_detection import DuplicateCandidateDetector
from backend.ml.agency_anomaly import AgencyAnomalyDetector
from backend.ml.risk_engine import RiskEngine, tier_for_score
from backend.services.analytics import AnalyticsService

DATA_PATH = Path(__file__).parent.parent / "backend" / "data" / "mplads_synthetic.csv"


def test_schema_validation():
    """Verify schema validator checks required fields."""
    valid_df = pd.DataFrame({
        "work_id": ["W-01"],
        "sanctioned_amount": [1000000],
        "expenditure": [900000],
    })
    is_valid, missing_req, _ = validate_schema(valid_df)
    assert is_valid is True
    assert len(missing_req) == 0

    invalid_df = pd.DataFrame({"work_id": ["W-02"]})
    is_valid, missing_req, _ = validate_schema(invalid_df)
    assert is_valid is False
    assert "sanctioned_amount" in missing_req


def test_dataset_loading_and_preprocessing():
    """Verify that dataset loads cleanly with correct columns and no row loss."""
    assert DATA_PATH.exists(), f"Dataset not found at {DATA_PATH}"
    df = load_dataset(str(DATA_PATH))
    assert len(df) == 3000
    assert "sanctioned_amount" in df.columns
    assert "expenditure" in df.columns
    assert "utilization" in df.columns
    assert "delay_days" in df.columns
    assert df["sanctioned_amount"].isnull().sum() == 0
    assert df["expenditure"].isnull().sum() == 0


def test_cost_anomaly_detector():
    """Verify cost anomaly detector produces bounded scores and interpretable outputs."""
    df = load_dataset(str(DATA_PATH))
    detector = CostAnomalyDetector()
    detector.fit(df)

    # Test baseline work
    normal_work = df[df["cost_deviation"] <= 0].iloc[0]
    res_normal = detector.analyze_work(normal_work)
    assert 0 <= res_normal["score"] <= 35
    assert res_normal["is_anomaly"] is False
    assert 0.0 <= res_normal["confidence"] <= 1.0

    # Test anomalous high-cost work
    high_work = df[df["cost_deviation"] > 40].iloc[0]
    res_high = detector.analyze_work(high_work)
    assert 0 <= res_high["score"] <= 35
    assert res_high["is_anomaly"] is True
    assert "baseline" in res_high
    assert res_high["confidence"] > 0.70


def test_delay_detector():
    """Verify delay detector properly computes expected vs actual days."""
    df = load_dataset(str(DATA_PATH))
    detector = DelayDetector()
    detector.fit(df)

    # Delayed work
    delayed_works = df[df["delayed"] == True]
    assert len(delayed_works) > 0
    res_delayed = detector.analyze_work(delayed_works.iloc[0])
    assert res_delayed["is_anomaly"] is True
    assert 0 <= res_delayed["score"] <= 25
    assert res_delayed["delay_days"] > 0

    # On-time work
    ontime_works = df[df["delayed"] == False]
    res_ontime = detector.analyze_work(ontime_works.iloc[0])
    assert res_ontime["is_anomaly"] is False
    assert res_ontime["score"] == 0


def test_duplicate_detector():
    """Verify TF-IDF + structured similarity identifies candidate pairs."""
    df = load_dataset(str(DATA_PATH))
    detector = DuplicateCandidateDetector(min_similarity_threshold=70)
    detector.fit_and_detect(df)

    candidates = detector.get_candidates()
    assert isinstance(candidates, list)
    assert len(candidates) > 0

    top_candidate = candidates[0]
    assert "work_a" in top_candidate
    assert "work_b" in top_candidate
    assert top_candidate["similarity_score"] >= 70
    assert top_candidate["classification"] == "POTENTIAL_DUPLICATE"

    # Test work duplicate score bounds
    work_res = detector.get_work_result(top_candidate["work_a"])
    assert 0 <= work_res["score"] <= 20


def test_agency_anomaly_detector():
    """Verify agency detector calculates anomaly rates and flags statistical outliers."""
    df = load_dataset(str(DATA_PATH))
    detector = AgencyAnomalyDetector()
    detector.fit(df)

    profiles = detector.get_profiles()
    assert len(profiles) > 0
    assert "agency" in profiles[0]
    assert "anomaly_rate" in profiles[0]
    assert "delay_rate" in profiles[0]

    # Verify score bounds for an individual work
    row = df.iloc[0]
    res = detector.analyze_work(row)
    assert 0 <= res["score"] <= 15


def test_risk_score_range_and_tier_classification():
    """CRITICAL: Verify risk score is strictly 0–100 and mapped to valid tiers."""
    for score in range(0, 101):
        tier = tier_for_score(score)
        assert tier in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

    assert tier_for_score(0) == "LOW"
    assert tier_for_score(29) == "LOW"
    assert tier_for_score(30) == "MEDIUM"
    assert tier_for_score(59) == "MEDIUM"
    assert tier_for_score(60) == "HIGH"
    assert tier_for_score(79) == "HIGH"
    assert tier_for_score(80) == "CRITICAL"
    assert tier_for_score(100) == "CRITICAL"


def test_full_analytics_pipeline_no_nan_or_infinities():
    """CRITICAL: Verify full service pipeline runs with zero NaN/Infinity values."""
    service = AnalyticsService(str(DATA_PATH))
    summary = service.summary

    assert summary["totalWorks"] == 3000
    assert summary["highRiskWorks"] > 0
    assert summary["counts"]["CRITICAL"] > 0
    assert summary["counts"]["HIGH"] > 0
    assert summary["counts"]["MEDIUM"] > 0
    assert summary["counts"]["LOW"] > 0

    for w in service.works:
        score = w["riskScore"]
        assert isinstance(score, int)
        assert 0 <= score <= 100
        assert w["riskTier"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assert not math.isnan(w["utilization"])
        assert not math.isinf(w["utilization"])
        assert not math.isnan(w["costDeviation"])
        assert not math.isinf(w["costDeviation"])
        assert isinstance(w["breakdown"], list)
        assert len(w["breakdown"]) == 5

    # Check pagination query works
    paged = service.query_works(page=1, pageSize=12)
    assert len(paged["rows"]) == 12
    assert paged["total"] == 3000
    assert paged["totalPages"] == 250

    # Check detail view works
    first_id = service.works[0]["id"]
    detail = service.get_work_detail(first_id)
    assert detail is not None
    assert detail["id"] == first_id
    assert "similar" in detail
    assert "financials" in detail
