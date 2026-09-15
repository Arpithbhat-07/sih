"""
MPLADS Sentinel - Cost Anomaly Detection Engine
Robust statistical benchmarking comparing works against peer groups (category/region).
Uses Median, Interquartile Range (IQR), and Isolation Forest to identify genuine cost outliers
without penalizing legitimately capital-intensive sectors.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.ensemble import IsolationForest


class CostAnomalyDetector:
    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination
        self.category_stats: Dict[str, Dict[str, float]] = {}
        self.state_category_stats: Dict[str, Dict[str, float]] = {}
        self.iso_forest: IsolationForest = None

    def fit(self, df: pd.DataFrame) -> "CostAnomalyDetector":
        """Fit baselines per category and category-state pairs."""
        # 1. National Category Baselines (Median, Q1, Q3, IQR)
        for cat, grp in df.groupby("category"):
            vals = grp["sanctioned_amount"].values
            q1 = float(np.percentile(vals, 25))
            med = float(np.median(vals))
            q3 = float(np.percentile(vals, 75))
            iqr = float(max(1.0, q3 - q1))
            self.category_stats[cat] = {
                "median": med,
                "q1": q1,
                "q3": q3,
                "iqr": iqr,
                "count": len(vals),
                "upper_fence": q3 + 1.5 * iqr,
            }

        # 2. State + Category localized baselines where sample size >= 10
        for (state, cat), grp in df.groupby(["state", "category"]):
            if len(grp) >= 10:
                vals = grp["sanctioned_amount"].values
                q1 = float(np.percentile(vals, 25))
                med = float(np.median(vals))
                q3 = float(np.percentile(vals, 75))
                iqr = float(max(1.0, q3 - q1))
                key = f"{state}|{cat}"
                self.state_category_stats[key] = {
                    "median": med,
                    "q1": q1,
                    "q3": q3,
                    "iqr": iqr,
                    "count": len(vals),
                    "upper_fence": q3 + 1.5 * iqr,
                }

        # 3. Fit Isolation Forest on normalized features if enough observations
        if len(df) >= 50:
            features = []
            for _, row in df.iterrows():
                cat = row["category"]
                cat_stat = self.category_stats.get(cat, {"median": 1000000.0, "iqr": 500000.0})
                rel_cost = row["sanctioned_amount"] / max(1.0, cat_stat["median"])
                util = row["utilization"] / 100.0
                features.append([rel_cost, util])
            
            self.iso_forest = IsolationForest(
                contamination=self.contamination,
                random_state=42,
                n_estimators=100
            )
            self.iso_forest.fit(features)

        return self

    def analyze_work(self, row: pd.Series) -> Dict[str, Any]:
        """
        Evaluate cost anomaly for an individual work record.
        Returns score (0-35), deviation_percent, baseline, is_anomaly, and explanation.
        """
        cat = row.get("category", "Other")
        state = row.get("state", "")
        sanctioned = float(row.get("sanctioned_amount", 0.0))
        expenditure = float(row.get("expenditure", 0.0))
        utilization = float(row.get("utilization", 0.0))

        # Check localized baseline first, then fallback to national category
        loc_key = f"{state}|{cat}"
        stats = self.state_category_stats.get(loc_key) or self.category_stats.get(
            cat, {"median": max(1.0, sanctioned), "q1": 0.0, "q3": sanctioned, "iqr": 1.0, "upper_fence": sanctioned * 1.5, "count": 1}
        )

        baseline = stats["median"]
        iqr = stats["iqr"]
        upper_fence = stats["upper_fence"]

        # Cost deviation relative to baseline
        if baseline > 0:
            deviation_percent = round(((sanctioned - baseline) / baseline) * 100.0, 1)
        else:
            deviation_percent = 0.0

        # Primary anomaly criteria:
        # 1) Sanctioned cost exceeds category upper fence (Q3 + 1.5*IQR) OR deviation > 40%
        # 2) Significant expenditure overrun: utilization > 115%
        cost_outlier = sanctioned > upper_fence or deviation_percent > 40.0
        exp_overrun = utilization > 115.0

        # Calculate score (max 35 component weight for overall risk engine)
        if deviation_percent <= 0 and not exp_overrun:
            score = 0
            is_anomaly = False
            msg = "Project cost is within normal historical baseline for comparable works."
            confidence = 0.85
        elif deviation_percent <= 25 and not exp_overrun:
            score = int(round(min(12, deviation_percent * 0.48)))
            is_anomaly = False
            msg = "Project cost shows mild variation but remains within acceptable statistical range."
            confidence = 0.80
        elif deviation_percent <= 40 and not exp_overrun:
            score = int(round(12 + (deviation_percent - 25) * 0.53))
            is_anomaly = False
            msg = "Project cost is moderately elevated compared with peer category median."
            confidence = 0.84
        else:
            # High / Critical deviation
            dev_score = min(25, 20 + int(round((deviation_percent - 40) * 0.25)))
            exp_score = min(10, int(round(max(0.0, utilization - 100.0) * 0.4))) if exp_overrun else 0
            score = min(35, dev_score + exp_score)
            is_anomaly = True

            if cost_outlier and exp_overrun:
                msg = f"Sanctioned amount is +{deviation_percent}% above baseline and expenditure exceeds sanctioned budget ({utilization}% utilization)."
            elif cost_outlier:
                msg = f"Project sanctioned cost is significantly above the historical baseline (+{deviation_percent}%) for comparable {cat} works."
            else:
                msg = f"Project exhibits significant expenditure overrun with fund utilization at {utilization}% of sanctioned allocation."

            # Statistical confidence scaled by IQR distance
            iqr_distance = (sanctioned - baseline) / max(1.0, iqr)
            confidence = min(0.96, max(0.75, round(0.75 + min(0.20, iqr_distance * 0.05), 2)))

        return {
            "is_anomaly": is_anomaly,
            "score": score,
            "max_score": 35,
            "deviation_percent": deviation_percent,
            "baseline": int(round(baseline)),
            "sanctioned_amount": int(round(sanctioned)),
            "expenditure": int(round(expenditure)),
            "utilization": utilization,
            "message": msg,
            "confidence": confidence,
        }

    def analyze_dataframe(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Run cost anomaly detection on the entire DataFrame."""
        results = []
        for _, row in df.iterrows():
            res = self.analyze_work(row)
            res["work_id"] = row["work_id"]
            results.append(res)
        return results
