"""
ProcureGuard - Price Anomaly Detection Engine
Peer-group benchmarking comparing procurement prices against comparable procurements
based on category, geography/state, and budget range.
Uses robust statistics (Median, IQR, Median Absolute Deviation - MAD) and Isolation Forest
to distinguish genuine price anomalies from legitimate capital-intensive variation.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.ensemble import IsolationForest


class PriceAnomalyDetector:
    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination
        self.category_stats: Dict[str, Dict[str, float]] = {}
        self.state_category_stats: Dict[str, Dict[str, float]] = {}
        self.iso_forest: IsolationForest = None

    def fit(self, df: pd.DataFrame) -> "PriceAnomalyDetector":
        """Compute category-level and state-localized baselines using robust statistics."""
        value_col = "awarded_value" if "awarded_value" in df.columns else "sanctioned_amount"

        # 1. National Category Baselines
        for cat, grp in df.groupby("category"):
            vals = grp[value_col].values.astype(float)
            q1 = float(np.percentile(vals, 25))
            med = float(np.median(vals))
            q3 = float(np.percentile(vals, 75))
            iqr = float(max(1.0, q3 - q1))
            mad = float(np.median(np.abs(vals - med)))
            mad = max(1.0, mad)

            self.category_stats[cat] = {
                "median": med,
                "q1": q1,
                "q3": q3,
                "iqr": iqr,
                "mad": mad,
                "count": len(vals),
                "upper_fence": q3 + 1.5 * iqr,
            }

        # 2. State + Category localized baselines (where sample >= 10)
        for (state, cat), grp in df.groupby(["state", "category"]):
            if len(grp) >= 10:
                vals = grp[value_col].values.astype(float)
                q1 = float(np.percentile(vals, 25))
                med = float(np.median(vals))
                q3 = float(np.percentile(vals, 75))
                iqr = float(max(1.0, q3 - q1))
                mad = float(max(1.0, np.median(np.abs(vals - med))))
                key = f"{state}|{cat}"
                self.state_category_stats[key] = {
                    "median": med,
                    "q1": q1,
                    "q3": q3,
                    "iqr": iqr,
                    "mad": mad,
                    "count": len(vals),
                    "upper_fence": q3 + 1.5 * iqr,
                }

        # 3. Fit Isolation Forest on normalized price features
        if len(df) >= 50:
            features = []
            for _, row in df.iterrows():
                cat = row["category"]
                cat_stat = self.category_stats.get(cat, {"median": 2000000.0, "mad": 500000.0})
                val = float(row.get(value_col, 0.0))
                rel_price = val / max(1.0, cat_stat["median"])
                est = float(row.get("estimated_value", val))
                ratio = val / max(1.0, est)
                features.append([rel_price, ratio])

            self.iso_forest = IsolationForest(
                contamination=self.contamination,
                random_state=42,
                n_estimators=100,
            )
            self.iso_forest.fit(features)

        return self

    def analyze_tender(self, row: pd.Series, iso_flag: Optional[bool] = None) -> Dict[str, Any]:
        """
        Evaluate price anomaly for a tender.
        Returns score (0-25), deviation_percent, baseline, is_anomaly, and neutral explanation.
        """
        cat = row.get("category", "General")
        state = row.get("state", "")
        value_col = "awarded_value" if "awarded_value" in row else "sanctioned_amount"
        val = float(row.get(value_col, 0.0))
        est = float(row.get("estimated_value", val))

        # Check localized baseline first, fallback to category
        loc_key = f"{state}|{cat}"
        stats = self.state_category_stats.get(loc_key) or self.category_stats.get(
            cat, {"median": max(1.0, val), "q1": 0.0, "q3": val, "iqr": 1.0, "mad": 1.0, "upper_fence": val * 1.5, "count": 1}
        )

        baseline = stats["median"]
        mad = stats["mad"]
        upper_fence = stats["upper_fence"]

        # Percentage deviation from peer median
        deviation_pct = round(((val - baseline) / max(1.0, baseline)) * 100.0, 1)

        # Robust Z-score using MAD
        robust_z = (val - baseline) / (1.4826 * mad) if mad > 0 else 0.0

        # Isolation Forest check
        if iso_flag is None:
            if self.iso_forest is not None:
                rel_price = val / max(1.0, baseline)
                ratio = val / max(1.0, est)
                pred = self.iso_forest.predict([[rel_price, ratio]])[0]
                iso_flag = (pred == -1)
            else:
                iso_flag = False

        # Anomaly scoring logic (0 to 25 points)
        score = 0
        is_anomaly = False

        if val > upper_fence or robust_z > 3.0:
            score = 25 if deviation_pct > 50 else (20 if deviation_pct > 30 else 16)
            is_anomaly = True
        elif deviation_pct > 25 or robust_z > 2.0:
            score = 14
            is_anomaly = True
        elif deviation_pct > 15 or robust_z > 1.5:
            score = 8
        elif iso_flag:
            score = 10
            is_anomaly = True

        # Construct neutral, evidence-based message
        if is_anomaly:
            explanation = (
                f"Awarded value (₹{int(val):,}) is {deviation_pct:+.1f}% above the peer group median "
                f"(₹{int(baseline):,}) for comparable {cat} procurements in {state or 'the region'}."
            )
        else:
            explanation = (
                f"Procurement value is consistent with peer group baselines for {cat} "
                f"(deviation {deviation_pct:+.1f}% relative to median ₹{int(baseline):,})."
            )

        return {
            "score": min(25, max(0, score)),
            "max_score": 25,
            "deviation_percent": deviation_pct,
            "baseline": int(round(baseline)),
            "is_anomaly": is_anomaly,
            "robust_z": round(float(robust_z), 2),
            "iso_anomaly": iso_flag,
            "explanation": explanation,
        }

    def analyze_dataframe(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Evaluate all tenders in the DataFrame with batch Isolation Forest inference."""
        iso_flags = [False] * len(df)
        if self.iso_forest is not None and len(df) > 0:
            value_col = "awarded_value" if "awarded_value" in df.columns else "sanctioned_amount"
            features = []
            for _, row in df.iterrows():
                cat = row.get("category", "General")
                cat_stat = self.category_stats.get(cat, {"median": 2000000.0, "mad": 500000.0})
                val = float(row.get(value_col, 0.0))
                rel_price = val / max(1.0, cat_stat["median"])
                est = float(row.get("estimated_value", val))
                ratio = val / max(1.0, est)
                features.append([rel_price, ratio])
            preds = self.iso_forest.predict(features)
            iso_flags = [bool(p == -1) for p in preds]

        results = []
        for idx, (_, row) in enumerate(df.iterrows()):
            results.append(self.analyze_tender(row, iso_flag=iso_flags[idx]))
        return results

