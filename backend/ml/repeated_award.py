"""
ProcureGuard - Repeated Award & Concentration Detector
Identifies unusual market concentration where a specific vendor secures a disproportionate
share of awards within a particular department, procurement category, or geographic jurisdiction.
"""

import pandas as pd
from typing import Dict, Any, List


class RepeatedAwardDetector:
    def __init__(self):
        self.dept_vendor_share: Dict[str, Dict[str, float]] = {}
        self.cat_vendor_share: Dict[str, Dict[str, float]] = {}
        self.dept_totals: Dict[str, int] = {}

    def fit(self, df: pd.DataFrame) -> "RepeatedAwardDetector":
        """Compute vendor market share within departments and categories."""
        v_col = "winning_vendor_name" if "winning_vendor_name" in df.columns else "agency"
        d_col = "department" if "department" in df.columns else None
        c_col = "category"

        # 1. Department concentration
        if d_col:
            for dept, grp in df.groupby(d_col):
                tot = len(grp)
                self.dept_totals[dept] = tot
                counts = grp[v_col].value_counts()
                self.dept_vendor_share[dept] = {
                    v: (count / tot) for v, count in counts.items()
                }

        # 2. Category concentration
        for cat, grp in df.groupby(c_col):
            tot = len(grp)
            counts = grp[v_col].value_counts()
            self.cat_vendor_share[cat] = {
                v: (count / tot) for v, count in counts.items()
            }

        return self

    def analyze_tender(self, row: pd.Series) -> Dict[str, Any]:
        """
        Evaluate repeated award concentration for a tender.
        Returns score (0-15), is_anomaly, and neutral explanation.
        """
        v_name = row.get("winning_vendor_name", row.get("agency", ""))
        dept = row.get("department", "")
        cat = row.get("category", "")

        dept_share = self.dept_vendor_share.get(dept, {}).get(v_name, 0.0)
        cat_share = self.cat_vendor_share.get(cat, {}).get(v_name, 0.0)
        dept_tot = self.dept_totals.get(dept, 100)

        score = 0
        is_anomaly = False

        if dept_share >= 0.35 and dept_tot >= 30:
            score = 15
            is_anomaly = True
            explanation = (
                f"Vendor '{v_name}' holds an unusually high concentration ({dept_share*100:.1f}%) "
                f"of all awards administered by {dept} ({int(round(dept_share*dept_tot))}/{dept_tot} tenders)."
            )
        elif cat_share >= 0.30:
            score = 12
            is_anomaly = True
            explanation = (
                f"Vendor '{v_name}' has received an elevated share ({cat_share*100:.1f}%) "
                f"of regional {cat} awards."
            )
        elif dept_share >= 0.20 and dept_tot >= 20:
            score = 8
            explanation = (
                f"Vendor '{v_name}' shows moderate concentration ({dept_share*100:.1f}%) "
                f"in {dept} procurements."
            )
        else:
            explanation = (
                f"Award distribution is within competitive diversity thresholds "
                f"({dept_share*100:.1f}% share in {dept or 'department'})."
            )

        return {
            "score": min(15, max(0, score)),
            "max_score": 15,
            "department_share_pct": round(dept_share * 100.0, 1),
            "category_share_pct": round(cat_share * 100.0, 1),
            "is_anomaly": is_anomaly,
            "explanation": explanation,
        }

    def analyze_dataframe(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        return [self.analyze_tender(row) for _, row in df.iterrows()]
