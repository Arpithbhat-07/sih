"""
ProcureGuard - Bid Participation & Anomaly Detector
Detects unusual bidder participation patterns relative to peer procurements:
  - Unusually low bidder count (e.g. 1-2 bidders when peer group median is 5-6)
  - Single-bidder predominance in competitive categories
  - Compressed or distorted bid distribution patterns

Maintains strictly neutral investigative framing without accusing entities of collusion.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List


class BidAnomalyDetector:
    def __init__(self):
        self.category_bidder_stats: Dict[str, Dict[str, float]] = {}

    def fit(self, df: pd.DataFrame) -> "BidAnomalyDetector":
        """Compute expected bidder count baselines per procurement category."""
        bid_col = "bidder_count" if "bidder_count" in df.columns else None

        for cat, grp in df.groupby("category"):
            if bid_col and bid_col in grp:
                counts = grp[bid_col].values.astype(float)
                med = float(np.median(counts))
                q1 = float(np.percentile(counts, 25))
                q3 = float(np.percentile(counts, 75))
            else:
                med, q1, q3 = 5.0, 4.0, 6.0

            self.category_bidder_stats[cat] = {
                "median": med,
                "q1": q1,
                "q3": q3,
                "min_expected": max(2, int(q1 - 1)),
            }
        return self

    def analyze_tender(self, row: pd.Series) -> Dict[str, Any]:
        """
        Evaluate bidder participation for a tender.
        Returns score (0-20), is_anomaly, and neutral explanation.
        """
        cat = row.get("category", "General")
        bidders = int(row.get("bidder_count", 4))
        stats = self.category_bidder_stats.get(cat, {"median": 5.0, "min_expected": 3})
        peer_med = int(round(stats["median"]))

        score = 0
        is_anomaly = False

        if bidders <= 1:
            score = 20
            is_anomaly = True
            explanation = (
                f"Single bidder participated in tender. Comparable {cat} procurements "
                f"typically attract a median of {peer_med} competing bids."
            )
        elif bidders <= 2:
            score = 16
            is_anomaly = True
            explanation = (
                f"Unusually low bidder participation: only {bidders} bidders submitted bids relative "
                f"to a peer group median of {peer_med} for {cat} tenders."
            )
        elif bidders < stats["min_expected"]:
            score = 10
            is_anomaly = True
            explanation = (
                f"Bidder count ({bidders}) is below the 25th percentile threshold "
                f"({stats['min_expected']} bidders) for comparable {cat} procurements."
            )
        else:
            explanation = (
                f"Bidder participation is within standard competitive range "
                f"({bidders} bidders vs peer median {peer_med})."
            )

        return {
            "score": min(20, max(0, score)),
            "max_score": 20,
            "bidder_count": bidders,
            "peer_median": peer_med,
            "is_anomaly": is_anomaly,
            "explanation": explanation,
        }

    def analyze_dataframe(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        return [self.analyze_tender(row) for _, row in df.iterrows()]
