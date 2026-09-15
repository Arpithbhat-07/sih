"""
MPLADS Sentinel - Project Delay & Duration Anomaly Detector
Evaluates project execution timelines against stipulated completion windows
and peer category benchmarks.
"""

import pandas as pd
import numpy as np
from datetime import datetime
from dateutil import parser as date_parser
from typing import Dict, Any, List, Optional


class DelayDetector:
    def __init__(self):
        self.category_duration_baseline: Dict[str, float] = {}

    def fit(self, df: pd.DataFrame) -> "DelayDetector":
        """Compute expected duration baseline per category."""
        for cat, grp in df.groupby("category"):
            exp_days = grp["expected_days"].dropna().values
            if len(exp_days) > 0:
                self.category_duration_baseline[cat] = float(np.median(exp_days))
            else:
                self.category_duration_baseline[cat] = 270.0
        return self

    def analyze_work(self, row: pd.Series) -> Dict[str, Any]:
        """
        Evaluate delay anomaly for a single work.
        Returns score (0-25), expected_days, actual_days, delay_days, and explanation.
        """
        cat = row.get("category", "Other")
        status = str(row.get("status", "In Progress"))
        
        # Expected duration
        expected = row.get("expected_days")
        if pd.isna(expected) or expected is None:
            expected = int(round(self.category_duration_baseline.get(cat, 270.0)))
        else:
            expected = int(expected)

        # Actual duration calculation
        actual: Optional[int] = None
        s_date_str = row.get("sanction_date")
        c_date_str = row.get("actual_completion")

        # 1. Try date difference if both dates available
        if s_date_str and c_date_str and not pd.isna(s_date_str) and not pd.isna(c_date_str):
            try:
                s_dt = date_parser.parse(str(s_date_str))
                c_dt = date_parser.parse(str(c_date_str))
                diff = (c_dt - s_dt).days
                if diff > 0:
                    actual = diff
            except Exception:
                pass

        # 2. Fall back to actual_days column if present
        if actual is None:
            val = row.get("actual_days")
            if not pd.isna(val) and val is not None and int(val) > 0:
                actual = int(val)

        # 3. Determine delay
        delay_days: Optional[int] = None
        if actual is not None and expected is not None:
            delay_days = max(0, actual - expected)
        elif not pd.isna(row.get("delay_days")) and row.get("delay_days") is not None:
            delay_days = int(row.get("delay_days"))

        is_stalled = status.lower() == "stalled"
        is_flagged_delayed = bool(row.get("delayed", False)) or status.lower() == "delayed" or is_stalled

        # Calculate score (max 25 component weight for overall risk engine)
        if delay_days is None:
            # Insufficient duration information to reliably compute delay
            score = 8 if is_stalled else 5 if is_flagged_delayed else 0
            is_anomaly = is_stalled or is_flagged_delayed
            msg = "Project status indicates delay or stalled progress, but exact milestone dates are unrecorded."
            confidence = 0.65
        elif delay_days <= 0 and not is_stalled:
            score = 0
            is_anomaly = False
            msg = "Project execution duration is within the expected timeframe."
            confidence = 0.90
        else:
            is_anomaly = True
            # Slippage scaling up to 25
            if is_stalled:
                score = min(25, 18 + int(round(delay_days / 20.0)))
                msg = f"Project execution is stalled; elapsed duration exceeds target window by {delay_days} days."
                confidence = 0.95
            elif delay_days > 90:
                score = min(25, 18 + int(round((delay_days - 90) / 15.0)))
                msg = f"Severe project delay: execution exceeds expected duration by {delay_days} days (+{round(delay_days/max(1, expected)*100)}% slippage)."
                confidence = 0.93
            elif delay_days > 30:
                score = int(round(10 + (delay_days - 30) * 0.13))
                msg = f"Project execution duration exceeds baseline schedule by {delay_days} days."
                confidence = 0.88
            else:
                score = int(round(delay_days * 0.33))
                msg = f"Minor schedule variance: execution delayed by {delay_days} days beyond expected completion."
                confidence = 0.80

        return {
            "is_anomaly": is_anomaly,
            "score": min(25, score),
            "max_score": 25,
            "expected_days": expected,
            "actual_days": actual,
            "delay_days": delay_days,
            "status": status,
            "message": msg,
            "confidence": confidence,
        }

    def analyze_dataframe(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Run delay detection on the entire DataFrame."""
        results = []
        for _, row in df.iterrows():
            res = self.analyze_work(row)
            res["work_id"] = row["work_id"]
            results.append(res)
        return results
