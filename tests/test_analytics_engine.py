"""
Unit Tests for ProcureGuard Machine Learning & Analytics Engine.
Verifies preprocessing, modular anomaly detectors, composite risk scoring ranges,
and multi-entity graph pipeline integrity.
"""

import pytest
import pandas as pd
import numpy as np
import math
from pathlib import Path

from backend.ml.preprocessing import preprocess_dataframe, load_dataset, validate_schema
from backend.ml.price_anomaly import PriceAnomalyDetector
from backend.ml.bid_anomaly import BidAnomalyDetector
from backend.ml.vendor_anomaly import VendorAnomalyDetector
from backend.ml.repeated_award import RepeatedAwardDetector
from backend.ml.relationship_anomaly import RelationshipAnomalyDetector
from backend.ml.contract_anomaly import ContractAnomalyDetector
from backend.ml.risk_engine import RiskEngine, tier_for_score, RISK_TIERS
from backend.services.analytics import AnalyticsService

DATA_PATH = Path(__file__).parent.parent / "backend" / "data" / "procurement_synthetic.csv"


def test_schema_validation():
    """Verify schema validator checks required procurement fields."""
    valid_df = pd.DataFrame({
        "tender_id": ["TND-01"],
        "awarded_value": [1000000],
        "payment_amount": [900000],
    })
    is_valid, missing_req, _ = validate_schema(valid_df)
    assert is_valid is True
    assert len(missing_req) == 0

    invalid_df = pd.DataFrame({"title": ["Test Procurement"]})
    is_valid, missing_req, _ = validate_schema(invalid_df)
    assert is_valid is False
    assert "tender_id" in missing_req or "awarded_value" in missing_req


def test_dataset_loading_and_preprocessing():
    """Verify that dataset loads cleanly with 5,000 records and no missing financials."""
    assert DATA_PATH.exists(), f"Dataset not found at {DATA_PATH}"
    df = load_dataset(str(DATA_PATH))
    assert len(df) == 5000
    assert "awarded_value" in df.columns
    assert "payment_amount" in df.columns
    assert "tender_id" in df.columns
    assert "utilization" in df.columns
    assert df["awarded_value"].isnull().sum() == 0
    assert df["payment_amount"].isnull().sum() == 0


def test_price_anomaly_detector():
    """Verify price anomaly detector produces bounded 0-25 scores and transparent metrics."""
    df = load_dataset(str(DATA_PATH))
    detector = PriceAnomalyDetector()
    detector.fit(df)

    # Benchmark normal tender
    normal_row = df[df["awarded_value"] <= df["estimated_value"]].iloc[0]
    res_normal = detector.analyze_tender(normal_row)
    assert 0 <= res_normal["score"] <= 25
    assert "deviation_percent" in res_normal
    assert "baseline" in res_normal

    # High anomaly tender (TND-2026-01842)
    high_row = df[df["tender_id"] == "TND-2026-01842"].iloc[0]
    res_high = detector.analyze_tender(high_row)
    assert res_high["score"] == 25
    assert res_high["is_anomaly"] is True
    assert res_high["deviation_percent"] > 30.0


def test_bid_anomaly_detector():
    """Verify bid anomaly detector checks bidder participation against category baselines."""
    df = load_dataset(str(DATA_PATH))
    detector = BidAnomalyDetector()
    detector.fit(df)

    low_bid_row = df[df["bidder_count"] <= 2].iloc[0]
    res_low = detector.analyze_tender(low_bid_row)
    assert 0 <= res_low["score"] <= 20
    assert res_low["is_anomaly"] is True
    assert "peer_median" in res_low


def test_vendor_anomaly_detector():
    """Verify vendor behavior profiler generates win rates and bounded risk scores."""
    df = load_dataset(str(DATA_PATH))
    detector = VendorAnomalyDetector()
    detector.fit(df)
    profiles = detector.get_profiles()
    assert len(profiles) > 0
    v = profiles[0]
    assert "win_rate" in v
    assert "total_wins" in v

    # Test vendor evaluation
    res = detector.analyze_tender(df.iloc[0])
    assert 0 <= res["score"] <= 20
    assert "explanation" in res


def test_repeated_award_detector():
    """Verify repeated award detector flags department-level market concentration."""
    df = load_dataset(str(DATA_PATH))
    detector = RepeatedAwardDetector()
    detector.fit(df)
    res = detector.analyze_tender(df.iloc[0])
    assert 0 <= res["score"] <= 15
    assert "department_share_pct" in res


def test_relationship_anomaly_detector():
    """Verify relationship engine builds multi-entity nodes and links."""
    df = load_dataset(str(DATA_PATH))
    detector = RelationshipAnomalyDetector()
    detector.fit_and_build_graph(df)
    graph = detector.get_network_graph()
    assert "nodes" in graph
    assert "links" in graph
    assert len(graph["nodes"]) >= 30
    assert len(graph["links"]) >= 10

    res = detector.analyze_tender(df.iloc[0])
    assert 0 <= res["score"] <= 15


def test_contract_anomaly_detector():
    """Verify contract detector scores payment overruns and execution delays."""
    df = load_dataset(str(DATA_PATH))
    detector = ContractAnomalyDetector()
    detector.fit(df)
    res = detector.analyze_tender(df.iloc[0])
    assert 0 <= res["score"] <= 5


def test_risk_score_range_and_tier_classification():
    """Verify 0-100 composite risk scoring matches ProcureGuard tiers."""
    assert tier_for_score(85) == "CRITICAL"
    assert tier_for_score(70) == "HIGH"
    assert tier_for_score(45) == "MEDIUM"
    assert tier_for_score(15) == "LOW"

    engine = RiskEngine()
    eval_res = engine.compute_composite_risk(
        tender_id="TND-TEST",
        price_eval={"score": 25, "is_anomaly": True, "deviation_percent": 50.0, "explanation": "High price"},
        bid_eval={"score": 16, "is_anomaly": True, "bidder_count": 2, "peer_median": 5, "explanation": "Low bidders"},
        vendor_eval={"score": 10, "is_anomaly": True, "win_rate": 40.0, "total_wins": 20, "explanation": "High win rate"},
        repeated_eval={"score": 15, "is_anomaly": True, "department_share_pct": 55.0, "explanation": "Dominant vendor"},
        relationship_eval={"score": 10, "is_anomaly": True, "connected_awards": 15, "explanation": "Dense relationship"},
        contract_eval={"score": 3, "is_anomaly": True, "delay_days": 45, "payment_overrun_pct": 10.0, "explanation": "Delay"},
    )
    assert 80 <= eval_res["risk_score"] <= 100
    assert eval_res["risk_level"] == "CRITICAL"
    assert len(eval_res["findings"]) >= 5


def test_full_analytics_pipeline_no_nan_or_infinities():
    """Verify AnalyticsService runs end-to-end on 5,000 tenders with 0 NaNs."""
    service = AnalyticsService(str(DATA_PATH))
    assert len(service.tenders) == 5000
    assert service.summary["totalTenders"] == 5000
    assert service.summary["highPriorityCases"] > 0
    assert len(service.state_aggregates) >= 20
    assert len(service.department_aggregates) >= 8
    assert len(service.vendor_aggregates) >= 30
    assert len(service.alerts) > 0
    assert len(service.network_graph["nodes"]) > 0

    # Ensure no NaN or infinite values in summaries
    for key, val in service.summary.items():
        if isinstance(val, (float, int)):
            assert not math.isnan(val)
            assert not math.isinf(val)
