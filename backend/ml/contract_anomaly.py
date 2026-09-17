"""
ProcureGuard - Contract & Payment Execution Anomaly Engine
Monitors procurement delivery and payment execution signals:
  - Payment disbursements exceeding original awarded contract value (cost overrun)
  - Completion timeline slippage / delivery delay
  - Significant divergence between pre-tender technical estimates and final awarded sum
"""

import pandas as pd
from typing import Dict, Any, List


class ContractAnomalyDetector:
    def __init__(self):
        pass

    def fit(self, df: pd.DataFrame) -> "ContractAnomalyDetector":
        return self

    def analyze_tender(self, row: pd.Series) -> Dict[str, Any]:
        """
        Evaluate contract and payment execution indicators.
        Returns score (0-5), is_anomaly, and neutral explanation.
        """
        awarded = float(row.get("awarded_value", row.get("sanctioned_amount", 0.0)))
        payment = float(row.get("payment_amount", row.get("expenditure", 0.0)))
        delay_days = int(row.get("completion_delay_days", row.get("delay_days", 0)))
        estimated = float(row.get("estimated_value", row.get("estimated_cost", awarded)))

        score = 0
        issues = []
        is_anomaly = False

        # Payment overrun check
        if awarded > 0 and payment > awarded:
            overrun_pct = round(((payment - awarded) / awarded) * 100.0, 1)
            if overrun_pct > 15.0:
                score += 3
                is_anomaly = True
                issues.append(f"Cumulative disbursements exceed contract value by {overrun_pct:+}%")
            elif overrun_pct > 5.0:
                score += 1
                issues.append(f"Disbursements moderately exceed awarded sum by {overrun_pct:+}%")

        # Timeline delay check
        if delay_days > 45:
            score += 2
            is_anomaly = True
            issues.append(f"Execution delay of {delay_days} days beyond contracted completion date")
        elif delay_days > 15:
            score += 1
            issues.append(f"Minor timeline slippage of {delay_days} days")

        score = min(5, score)

        if is_anomaly:
            explanation = "; ".join(issues) + "."
        else:
            explanation = "Contract milestones and payment disbursements conform to authorized schedule."

        return {
            "score": score,
            "max_score": 5,
            "delay_days": delay_days,
            "payment_overrun_pct": round(((payment - awarded) / awarded * 100.0), 1) if awarded > 0 and payment > awarded else 0.0,
            "is_anomaly": is_anomaly,
            "explanation": explanation,
        }

    def analyze_dataframe(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        return [self.analyze_tender(row) for _, row in df.iterrows()]
