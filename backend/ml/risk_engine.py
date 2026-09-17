"""
ProcureGuard - Composite Investigation Priority Risk Engine
Combines multi-modal procurement anomaly signals into a transparent, deterministic
0–100 Investigation Priority Score.

Component weights:
  - Price Anomaly: 25 points
  - Bid Participation: 20 points
  - Vendor Behavior: 20 points
  - Repeated Awards: 15 points
  - Relationship Signals: 15 points
  - Contract & Payment Execution: 5 points
  Total: 100 points

Risk Tiers:
  - 0–29: LOW
  - 30–59: MEDIUM
  - 60–79: HIGH
  - 80–100: CRITICAL

IMPORTANT RESPONSIBLE AI DIRECTIVE:
The composite score represents INVESTIGATION PRIORITY — directing limited investigative
resources to where human review provides highest value. It does NOT represent probability
of corruption or wrongdoing.
"""

from typing import Dict, Any, List, Optional
import numpy as np

DISCLAIMER_TEXT = (
    "Analytical signals do not constitute proof of fraud, corruption, misconduct, or wrongdoing. "
    "Final assessment requires authorized human investigation."
)

RISK_TIERS = {
    "CRITICAL": {"min": 80, "max": 100, "label": "Critical Priority", "color": "#F15252"},
    "HIGH": {"min": 60, "max": 79, "label": "High Priority", "color": "#F59638"},
    "MEDIUM": {"min": 30, "max": 59, "label": "Medium Priority", "color": "#F3D35E"},
    "LOW": {"min": 0, "max": 29, "label": "Low Priority", "color": "#52C47E"},
}

WEIGHTS = {
    "price": 25,
    "bid": 20,
    "vendor": 20,
    "repeated_award": 15,
    "relationship": 15,
    "contract": 5,
}


def tier_for_score(score: int) -> str:
    """Classify 0-100 score into standard ProcureGuard investigation priority tiers."""
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 30:
        return "MEDIUM"
    return "LOW"


class RiskEngine:
    def __init__(self):
        self.weights = WEIGHTS

    def compute_composite_risk(
        self,
        tender_id: str,
        price_eval: Dict[str, Any],
        bid_eval: Dict[str, Any],
        vendor_eval: Dict[str, Any],
        repeated_eval: Dict[str, Any],
        relationship_eval: Dict[str, Any],
        contract_eval: Dict[str, Any],
        row_dict: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Compute transparent, deterministic 0–100 composite investigation priority score.
        """
        s_price = min(25, max(0, price_eval.get("score", 0)))
        s_bid = min(20, max(0, bid_eval.get("score", 0)))
        s_vendor = min(20, max(0, vendor_eval.get("score", 0)))
        s_rep = min(15, max(0, repeated_eval.get("score", 0)))
        s_rel = min(15, max(0, relationship_eval.get("score", 0)))
        s_contract = min(5, max(0, contract_eval.get("score", 0)))

        raw_score = s_price + s_bid + s_vendor + s_rep + s_rel + s_contract

        # Synergy bonus: If 3 or more independent anomaly signals are triggered,
        # apply synergy adjustment (+3 to +5) capped at 98.
        anomaly_count = sum([
            bool(price_eval.get("is_anomaly")),
            bool(bid_eval.get("is_anomaly")),
            bool(vendor_eval.get("is_anomaly")),
            bool(repeated_eval.get("is_anomaly")),
            bool(relationship_eval.get("is_anomaly")),
            bool(contract_eval.get("is_anomaly")),
        ])

        synergy = 0
        if anomaly_count >= 4:
            synergy = 5
        elif anomaly_count >= 3:
            synergy = 3

        final_score = int(round(min(98, raw_score + synergy)))
        tier = tier_for_score(final_score)

        # Build individual findings for explainability
        findings = []
        signals = []

        if price_eval.get("is_anomaly"):
            signals.append("PRICE ANOMALY")
            findings.append({
                "detector": "price",
                "title": "Price Deviation Signal",
                "severity": "CRITICAL" if price_eval.get("deviation_percent", 0) > 40 else "HIGH",
                "explanation": price_eval.get("explanation", ""),
                "evidence": f"+{price_eval.get('deviation_percent', 0):.1f}% above peer group median",
                "confidence": 90 if price_eval.get("deviation_percent", 0) > 30 else 80,
            })

        if bid_eval.get("is_anomaly"):
            signals.append("BID PARTICIPATION")
            findings.append({
                "detector": "bid",
                "title": "Bidder Participation Signal",
                "severity": "HIGH" if bid_eval.get("bidder_count", 0) <= 2 else "MEDIUM",
                "explanation": bid_eval.get("explanation", ""),
                "evidence": f"{bid_eval.get('bidder_count', 0)} bidders vs peer median {bid_eval.get('peer_median', 5)}",
                "confidence": 85,
            })

        if vendor_eval.get("is_anomaly"):
            signals.append("VENDOR BEHAVIOR")
            findings.append({
                "detector": "vendor",
                "title": "Vendor Win-Rate Pattern",
                "severity": "HIGH",
                "explanation": vendor_eval.get("explanation", ""),
                "evidence": f"Win rate: {vendor_eval.get('win_rate', 0)}% across {vendor_eval.get('total_wins', 0)} awards",
                "confidence": 82,
            })

        if repeated_eval.get("is_anomaly"):
            signals.append("REPEATED AWARDS")
            findings.append({
                "detector": "repeated_award",
                "title": "Department Award Concentration",
                "severity": "HIGH",
                "explanation": repeated_eval.get("explanation", ""),
                "evidence": f"{repeated_eval.get('department_share_pct', 0)}% share of department awards",
                "confidence": 88,
            })

        if relationship_eval.get("is_anomaly"):
            signals.append("RELATIONSHIP NETWORK")
            findings.append({
                "detector": "relationship",
                "title": "Relational Network Density",
                "severity": "MEDIUM",
                "explanation": relationship_eval.get("explanation", ""),
                "evidence": f"{relationship_eval.get('connected_awards', 0)} contracts within same authority",
                "confidence": 80,
            })

        if contract_eval.get("is_anomaly"):
            signals.append("CONTRACT EXECUTION")
            findings.append({
                "detector": "contract",
                "title": "Contract Slippage / Overrun",
                "severity": "MEDIUM",
                "explanation": contract_eval.get("explanation", ""),
                "evidence": f"Delay: {contract_eval.get('delay_days', 0)} days, Overrun: {contract_eval.get('payment_overrun_pct', 0)}%",
                "confidence": 80,
            })

        # Primary signal determination
        if signals:
            primary_signal = signals[0]
        else:
            primary_signal = "Within expected pattern"
            findings.append({
                "detector": "baseline",
                "title": "Standard Procurement Baseline",
                "severity": "LOW",
                "explanation": "Procurement attributes and competitive indicators conform to historical expectations.",
                "evidence": "All component indicators within normal range",
                "confidence": 95,
            })

        # Recommended investigation action steps (grounded, non-accusatory)
        recommended_actions = []
        if price_eval.get("is_anomaly"):
            recommended_actions.append("Verify technical estimate and compare unit prices against regional schedule of rates.")
        if bid_eval.get("is_anomaly"):
            recommended_actions.append("Review complete bid submission log to confirm broad tender notification and eligibility criteria.")
        if repeated_eval.get("is_anomaly") or vendor_eval.get("is_anomaly"):
            recommended_actions.append("Examine department award distribution to ensure competitive procurement access.")
        if relationship_eval.get("is_anomaly"):
            recommended_actions.append("Review observable vendor co-bidding patterns across historical category tenders.")
        if contract_eval.get("is_anomaly"):
            recommended_actions.append("Verify milestone completion certificates and payment voucher reconciliations.")
        if not recommended_actions:
            recommended_actions.append("Routine administrative audit sampling during annual procurement reconciliation.")

        return {
            "tender_id": tender_id,
            "risk_score": final_score,
            "risk_level": tier,
            "primary_signal": primary_signal,
            "signals": signals if signals else ["Within expected pattern"],
            "breakdown": {
                "price_score": s_price,
                "bid_score": s_bid,
                "vendor_score": s_vendor,
                "repeated_score": s_rep,
                "relationship_score": s_rel,
                "contract_score": s_contract,
                "synergy": synergy,
            },
            "findings": findings,
            "recommended_action": " ".join(recommended_actions),
            "disclaimer": DISCLAIMER_TEXT,
        }
