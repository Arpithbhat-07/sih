"""
MPLADS Sentinel - Implementing Agency Anomaly Detector
Evaluates agency-level performance indicators, delay rates, and cost concentrations
to identify statistical outliers requiring portfolio review.

NOTE: An elevated indicator is an analytical signal for prioritized administrative review,
not proof of irregularity or wrongdoing.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List


class AgencyAnomalyDetector:
    def __init__(self):
        self.agency_profiles: Dict[str, Dict[str, Any]] = {}
        self.national_avg_anomaly_rate: float = 0.0
        self.national_avg_delay_rate: float = 0.0

    def fit(self, df: pd.DataFrame, cost_results: List[Dict[str, Any]] = None, delay_results: List[Dict[str, Any]] = None) -> "AgencyAnomalyDetector":
        """Build statistical baseline profiles for all implementing agencies."""
        df_work = df.copy()

        # Map cost and delay anomaly flags if available
        if cost_results:
            cost_map = {r["work_id"]: r["is_anomaly"] for r in cost_results}
            df_work["cost_anomaly"] = df_work["work_id"].map(cost_map).fillna(False)
        else:
            df_work["cost_anomaly"] = df_work["cost_deviation"] > 40.0

        if delay_results:
            delay_map = {r["work_id"]: r["is_anomaly"] for r in delay_results}
            df_work["delay_anomaly"] = df_work["work_id"].map(delay_map).fillna(False)
        else:
            df_work["delay_anomaly"] = df_work["delayed"]

        df_work["any_anomaly"] = df_work["cost_anomaly"] | df_work["delay_anomaly"]

        # National 75th percentile of cost for concentration testing
        national_q3_cost = float(np.percentile(df_work["sanctioned_amount"].values, 75))

        profiles = {}
        anomaly_rates = []
        delay_rates = []

        for agency_name, grp in df_work.groupby("agency"):
            n_proj = len(grp)
            tot_val = float(grp["sanctioned_amount"].sum())
            avg_c = float(grp["sanctioned_amount"].mean())
            med_c = float(grp["sanctioned_amount"].median())

            n_delayed = int(grp["delay_anomaly"].sum())
            delay_pct = round((n_delayed / n_proj) * 100.0, 1) if n_proj > 0 else 0.0

            n_anomalous = int(grp["any_anomaly"].sum())
            anomaly_pct = round((n_anomalous / n_proj) * 100.0, 1) if n_proj > 0 else 0.0

            n_high_val = int((grp["sanctioned_amount"] >= national_q3_cost).sum())
            high_val_pct = round((n_high_val / n_proj) * 100.0, 1) if n_proj > 0 else 0.0

            profiles[agency_name] = {
                "agency": agency_name,
                "projects": n_proj,
                "total_value": int(round(tot_val)),
                "avg_cost": int(round(avg_c)),
                "median_cost": int(round(med_c)),
                "delay_count": n_delayed,
                "delay_rate": delay_pct,
                "anomaly_count": n_anomalous,
                "anomaly_rate": anomaly_pct,
                "high_value_concentration": high_val_pct,
            }
            anomaly_rates.append(anomaly_pct)
            delay_rates.append(delay_pct)

        self.national_avg_anomaly_rate = float(np.mean(anomaly_rates)) if anomaly_rates else 0.0
        self.national_avg_delay_rate = float(np.mean(delay_rates)) if delay_rates else 0.0
        q75_anomaly = float(np.percentile(anomaly_rates, 75)) if anomaly_rates else 15.0
        q75_delay = float(np.percentile(delay_rates, 75)) if delay_rates else 13.0
        q75_conc = float(np.percentile([p["high_value_concentration"] for p in profiles.values()], 75)) if profiles else 30.0

        # Mark statistical outlier agencies (top quartile in anomaly rate, delay, or cost concentration)
        for name, p in profiles.items():
            is_anomaly_outlier = p["anomaly_rate"] >= q75_anomaly
            is_delay_outlier = p["delay_rate"] >= q75_delay
            is_cost_conc = p["high_value_concentration"] >= q75_conc

            is_outlier = is_anomaly_outlier or is_delay_outlier or is_cost_conc
            p["is_outlier"] = is_outlier

            if is_outlier:
                reasons = []
                if is_anomaly_outlier:
                    reasons.append(f"Elevated anomaly rate ({p['anomaly_rate']}%)")
                if is_delay_outlier:
                    reasons.append(f"Elevated project slippage ({p['delay_rate']}% delayed)")
                if is_cost_conc:
                    reasons.append(f"High-value work concentration ({p['high_value_concentration']}%)")
                p["status_message"] = "Agency-level anomaly: " + "; ".join(reasons) + " — requires portfolio review."
            else:
                p["status_message"] = "Agency performance indicators are within standard distribution."

        self.agency_profiles = profiles
        return self

    def analyze_work(self, row: pd.Series) -> Dict[str, Any]:
        """
        Evaluate agency contribution to an individual work's risk.
        Returns score (0-15) and context message.
        """
        agency = row.get("agency", "Unassigned Agency")
        prof = self.agency_profiles.get(agency)

        if not prof:
            return {
                "agency": agency,
                "is_anomaly": False,
                "score": 0,
                "max_score": 15,
                "message": "Implementing agency profile not found.",
                "confidence": 0.50,
            }

        if prof["is_outlier"]:
            # Component score scaled up to 15
            score = min(15, 8 + int(round((prof["anomaly_rate"] / 100.0) * 7.0)))
            msg = f"Work executed by {agency}, which currently exhibits an unusual project pattern ({prof['status_message']})."
            confidence = min(0.92, round(0.70 + (prof["projects"] / 100.0) * 0.15, 2))
            return {
                "agency": agency,
                "is_anomaly": True,
                "score": score,
                "max_score": 15,
                "anomaly_rate": prof["anomaly_rate"],
                "delay_rate": prof["delay_rate"],
                "message": msg,
                "confidence": confidence,
            }

        return {
            "agency": agency,
            "is_anomaly": False,
            "score": min(4, int(round((prof["anomaly_rate"] / 100.0) * 4.0))),
            "max_score": 15,
            "anomaly_rate": prof["anomaly_rate"],
            "delay_rate": prof["delay_rate"],
            "message": f"Implementing agency {agency} maintains performance metrics within expected national parameters.",
            "confidence": 0.85,
        }

    def get_profiles(self) -> List[Dict[str, Any]]:
        """Return all agency profiles sorted by average anomaly rate."""
        return sorted(self.agency_profiles.values(), key=lambda x: x["anomaly_rate"], reverse=True)
