"""
MPLADS Sentinel - Composite Risk Scoring Engine
Combines multi-modal anomaly signals into a transparent, deterministic 0–100 risk score.
Component weights:
  - Cost Anomaly: 35%
  - Delay Anomaly: 25%
  - Duplicate Similarity: 20%
  - Agency Anomaly: 15%
  - Compliance & Integrity: 5%

Includes responsible administrative framing and disclaimers.
"""

from typing import Dict, Any, List, Optional
import numpy as np

DISCLAIMER_TEXT = (
    "Analytical signals do not constitute proof of fraud or misconduct. "
    "Final assessment requires authorized human investigation."
)

RISK_TIERS = {
    "CRITICAL": {"min": 80, "max": 100, "label": "Critical"},
    "HIGH": {"min": 60, "max": 79, "label": "High"},
    "MEDIUM": {"min": 30, "max": 59, "label": "Medium"},
    "LOW": {"min": 0, "max": 29, "label": "Low"},
}


def tier_for_score(score: int) -> str:
    """Classify 0-100 risk score into standard MPLADS Sentinel tiers."""
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 30:
        return "MEDIUM"
    return "LOW"


class RiskEngine:
    def __init__(self):
        pass

    def evaluate_compliance(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate compliance and data integrity (up to 5 points).
        Flags missing essential geography, invalid costs, or progress mismatches.
        """
        score = 0
        issues = []

        sanctioned = float(row.get("sanctioned_amount", 0.0))
        expenditure = float(row.get("expenditure", 0.0))
        state = str(row.get("state", "")).strip().lower()
        district = str(row.get("district", "")).strip().lower()
        status = str(row.get("status", "")).strip().lower()

        # Missing state or district
        if not state or state in ["unspecified state", "—", "-"] or not district or district in ["unspecified district", "—", "-"]:
            score += 2
            issues.append("Missing administrative location data")

        # Invalid or non-positive sanction
        if sanctioned <= 0:
            score += 2
            issues.append("Invalid or missing sanctioned amount")

        # Status progress mismatch: expenditure exceeds 100% but status is In Progress/Delayed
        if sanctioned > 0 and expenditure > sanctioned and status != "completed":
            score += 1
            issues.append("Fund disbursement mismatch with recorded project status")

        score = min(5, score)
        return {
            "score": score,
            "max_score": 5,
            "is_anomaly": score > 0,
            "issues": issues,
            "message": "; ".join(issues) if issues else "All basic data compliance checks passed.",
        }

    def compute_composite_risk(
        self,
        work_id: str,
        cost_eval: Dict[str, Any],
        delay_eval: Dict[str, Any],
        duplicate_eval: Dict[str, Any],
        agency_eval: Dict[str, Any],
        row_dict: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Compute transparent, normalized composite risk score (0–100)
        from individual detector evaluations.
        """
        comp_eval = self.evaluate_compliance(row_dict)

        # Collect available component scores and their theoretical maxes
        components = [
            ("cost", cost_eval.get("score", 0), cost_eval.get("max_score", 35)),
            ("delay", delay_eval.get("score", 0), delay_eval.get("max_score", 25)),
            ("duplicate", duplicate_eval.get("score", 0), duplicate_eval.get("max_score", 20)),
            ("agency", agency_eval.get("score", 0), agency_eval.get("max_score", 15)),
            ("compliance", comp_eval.get("score", 0), comp_eval.get("max_score", 5)),
        ]

        total_earned = sum(c[1] for c in components)
        total_possible = sum(c[2] for c in components)

        # Normalization if any detector is omitted/unavailable
        if total_possible > 0 and total_possible != 100:
            raw_score = (total_earned / total_possible) * 100.0
        else:
            raw_score = float(total_earned)

        # Compound anomaly synergy: in public works auditing, simultaneous
        # cost deviation + delay + duplicate candidate signal is a compound high-priority risk
        anomalies_active = sum([
            bool(cost_eval.get("is_anomaly")),
            bool(delay_eval.get("is_anomaly")),
            bool(duplicate_eval.get("is_anomaly")),
            bool(agency_eval.get("is_anomaly")),
        ])
        if anomalies_active >= 3:
            compound_boost = 6 if anomalies_active == 3 else 10
            raw_score += compound_boost

        # Clamp strictly between 0 and 100
        risk_score = int(round(min(100.0, max(0.0, raw_score))))
        risk_level = tier_for_score(risk_score)

        # Compile structured signals
        signals: List[str] = []
        if cost_eval.get("is_anomaly"):
            if cost_eval.get("deviation_percent", 0) > 40:
                signals.append("Cost anomaly")
            if cost_eval.get("utilization", 0) > 115:
                signals.append("Expenditure anomaly")
        if delay_eval.get("is_anomaly"):
            signals.append("Project delay")
        if duplicate_eval.get("is_anomaly"):
            signals.append("Potential duplicate work")
        if agency_eval.get("is_anomaly"):
            signals.append("Agency concentration")
        if comp_eval.get("is_anomaly"):
            signals.append("Compliance deviation")

        if not signals:
            signals.append("Within expected pattern")

        # Determine primary signal based on relative severity
        severity_rank = [
            "Cost anomaly",
            "Potential duplicate work",
            "Expenditure anomaly",
            "Project delay",
            "Agency concentration",
            "Compliance deviation",
            "Within expected pattern",
        ]
        primary_signal = next((s for s in severity_rank if s in signals), signals[0])

        # Recommended action based on risk level and primary signal
        if risk_level == "CRITICAL":
            if "Potential duplicate work" in signals:
                action = "Prioritized physical site verification and duplicate contract audit recommended."
            elif "Cost anomaly" in signals:
                action = "Recommend detailed financial and procurement review before final closure."
            elif "Expenditure anomaly" in signals:
                action = "Immediate financial reconciliation of expenditure vouchers required."
            else:
                action = "Expedited administrative review and engineering audit recommended."
        elif risk_level == "HIGH":
            action = "Recommend focused technical estimate reconciliation and progress verification."
        elif risk_level == "MEDIUM":
            action = "Routine monitoring recommended during quarterly review cycle."
        else:
            action = "No intervention required; work proceeds within normal statistical baselines."

        return {
            "work_id": work_id,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "primary_signal": primary_signal,
            "signals": signals,
            "breakdown": {
                "cost_score": cost_eval.get("score", 0),
                "delay_score": delay_eval.get("score", 0),
                "duplicate_score": duplicate_eval.get("score", 0),
                "agency_score": agency_eval.get("score", 0),
                "compliance_score": comp_eval.get("score", 0),
            },
            "findings": [
                {
                    "detector": "cost",
                    "title": "Cost & Expenditure Analysis",
                    "message": cost_eval.get("message", ""),
                    "confidence": cost_eval.get("confidence", 0.8),
                },
                {
                    "detector": "delay",
                    "title": "Timeline & Execution Analysis",
                    "message": delay_eval.get("message", ""),
                    "confidence": delay_eval.get("confidence", 0.8),
                },
                {
                    "detector": "duplicate",
                    "title": "Duplicate Candidate Screening",
                    "message": duplicate_eval.get("message", ""),
                    "confidence": duplicate_eval.get("confidence", 0.8),
                },
                {
                    "detector": "agency",
                    "title": "Implementing Agency Profile",
                    "message": agency_eval.get("message", ""),
                    "confidence": agency_eval.get("confidence", 0.8),
                },
            ],
            "recommended_action": action,
            "disclaimer": DISCLAIMER_TEXT,
        }
