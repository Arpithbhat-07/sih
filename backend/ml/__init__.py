"""
ProcureGuard Machine Learning & Analytical Engines
Exports modular detectors for price, bid, vendor, repeated award, relationship,
contract execution anomalies, and composite risk scoring.
"""

from backend.ml.preprocessing import preprocess_dataframe, load_dataset, validate_schema
from backend.ml.price_anomaly import PriceAnomalyDetector
from backend.ml.bid_anomaly import BidAnomalyDetector
from backend.ml.vendor_anomaly import VendorAnomalyDetector
from backend.ml.repeated_award import RepeatedAwardDetector
from backend.ml.relationship_anomaly import RelationshipAnomalyDetector
from backend.ml.contract_anomaly import ContractAnomalyDetector
from backend.ml.risk_engine import RiskEngine, tier_for_score, RISK_TIERS

# Backward compatibility aliases
CostAnomalyDetector = PriceAnomalyDetector
DelayDetector = ContractAnomalyDetector
DuplicateCandidateDetector = RelationshipAnomalyDetector
AgencyAnomalyDetector = VendorAnomalyDetector

__all__ = [
    "preprocess_dataframe",
    "load_dataset",
    "validate_schema",
    "PriceAnomalyDetector",
    "BidAnomalyDetector",
    "VendorAnomalyDetector",
    "RepeatedAwardDetector",
    "RelationshipAnomalyDetector",
    "ContractAnomalyDetector",
    "RiskEngine",
    "tier_for_score",
    "RISK_TIERS",
    "CostAnomalyDetector",
    "DelayDetector",
    "DuplicateCandidateDetector",
    "AgencyAnomalyDetector",
]
