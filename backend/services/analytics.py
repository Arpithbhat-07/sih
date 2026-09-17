"""
ProcureGuard - Unified Analytics & Machine Learning Pipeline
Coordinates multi-modal anomaly detection engines, vendor intelligence,
relationship network modeling, composite risk scoring, and analytical aggregations.
"""

import math
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional

from backend.ml.preprocessing import load_dataset, preprocess_dataframe, validate_schema
from backend.ml.price_anomaly import PriceAnomalyDetector
from backend.ml.bid_anomaly import BidAnomalyDetector
from backend.ml.vendor_anomaly import VendorAnomalyDetector
from backend.ml.repeated_award import RepeatedAwardDetector
from backend.ml.relationship_anomaly import RelationshipAnomalyDetector
from backend.ml.contract_anomaly import ContractAnomalyDetector
from backend.ml.risk_engine import RiskEngine, tier_for_score, RISK_TIERS, DISCLAIMER_TEXT


class AnalyticsService:
    def __init__(self, csv_path: Optional[str] = None):
        self.csv_path = csv_path
        self.df: Optional[pd.DataFrame] = None
        self.tenders: List[Dict[str, Any]] = []
        self.tenders_by_id: Dict[str, Dict[str, Any]] = {}
        self.summary: Dict[str, Any] = {}
        self.state_aggregates: List[Dict[str, Any]] = []
        self.district_aggregates: List[Dict[str, Any]] = []
        self.department_aggregates: List[Dict[str, Any]] = []
        self.vendor_aggregates: List[Dict[str, Any]] = []
        self.category_aggregates: List[Dict[str, Any]] = []
        self.network_graph: Dict[str, Any] = {"nodes": [], "links": []}
        self.alerts: List[Dict[str, Any]] = []

        # Legacy backward-compatibility aliases
        self.works = self.tenders
        self.works_by_id = self.tenders_by_id
        self.agency_aggregates = self.vendor_aggregates
        self.duplicate_candidates: List[Dict[str, Any]] = []

        if csv_path:
            self.analyze_dataset(csv_path)

    def analyze_dataset(self, csv_or_df: Any) -> Dict[str, Any]:
        """Execute full multi-modal procurement anomaly and intelligence pipeline."""
        if isinstance(csv_or_df, pd.DataFrame):
            df = preprocess_dataframe(csv_or_df)
        else:
            df = load_dataset(csv_or_df)

        self.df = df

        # 1. Price Anomaly Detector
        price_detector = PriceAnomalyDetector()
        price_detector.fit(df)
        price_results = price_detector.analyze_dataframe(df)

        # 2. Bid Anomaly Detector
        bid_detector = BidAnomalyDetector()
        bid_detector.fit(df)
        bid_results = bid_detector.analyze_dataframe(df)

        # 3. Vendor Anomaly & Behavior Detector
        vendor_detector = VendorAnomalyDetector()
        vendor_detector.fit(df, price_results=price_results)
        self.vendor_aggregates = vendor_detector.get_profiles()
        self.agency_aggregates = self.vendor_aggregates

        # 4. Repeated Award & Department Concentration Detector
        repeated_detector = RepeatedAwardDetector()
        repeated_detector.fit(df)
        repeated_results = repeated_detector.analyze_dataframe(df)

        # 5. Relationship & Network Anomaly Detector
        relationship_detector = RelationshipAnomalyDetector()
        relationship_detector.fit_and_build_graph(df)
        self.network_graph = relationship_detector.get_network_graph()

        # 6. Contract & Payment Execution Detector
        contract_detector = ContractAnomalyDetector()
        contract_detector.fit(df)
        contract_results = contract_detector.analyze_dataframe(df)

        # 7. Composite Risk Scoring Engine
        risk_engine = RiskEngine()
        enriched_tenders = []
        self.tenders_by_id = {}

        for i, row in df.iterrows():
            tid = row["tender_id"]
            row_dict = row.to_dict()

            p_eval = price_results[i]
            b_eval = bid_results[i]
            v_eval = vendor_detector.analyze_tender(row)
            rep_eval = repeated_results[i]
            rel_eval = relationship_detector.analyze_tender(row)
            c_eval = contract_results[i]

            risk_eval = risk_engine.compute_composite_risk(
                tender_id=tid,
                price_eval=p_eval,
                bid_eval=b_eval,
                vendor_eval=v_eval,
                repeated_eval=rep_eval,
                relationship_eval=rel_eval,
                contract_eval=c_eval,
                row_dict=row_dict,
            )

            # Format findings for presentation
            formatted_findings = []
            for f_idx, f in enumerate(risk_eval["findings"]):
                formatted_findings.append({
                    "id": f"f-{f.get('detector', f_idx)}",
                    "detector": f.get("detector", "general"),
                    "severity": f.get("severity", "MEDIUM"),
                    "title": f.get("title", "Signal Analysis"),
                    "explanation": f.get("explanation", ""),
                    "message": f.get("explanation", ""),
                    "evidence": f.get("evidence", ""),
                    "confidence": f.get("confidence", 85),
                })

            awarded = int(round(row["awarded_value"]))
            payment = int(round(row["payment_amount"]))
            estimated = int(round(row["estimated_value"]))

            tender_record = {
                "id": tid,
                "tenderId": tid,
                "workId": tid,  # legacy
                "title": row["tender_title"],
                "description": row["tender_title"],
                "department": row.get("department", "Procurement Authority"),
                "procurementAuthority": row.get("procurement_authority", f"{row['state']} {row.get('department', '')}"),
                "state": row["state"],
                "stateCode": row.get("state_code", "IN-XX"),
                "district": row["district"],
                "location": row.get("location", f"{row['district']}, {row['state']}"),
                "category": row["category"],
                "vendorId": row.get("winning_vendor_id", "V-1000"),
                "vendorName": row.get("winning_vendor_name", "General Vendor"),
                "agency": row.get("winning_vendor_name", "General Vendor"),  # legacy
                "contractId": row.get("contract_id", f"CNT-{tid[-5:]}"),
                "estimatedValue": estimated,
                "estimatedCost": estimated,  # legacy
                "awardedValue": awarded,
                "sanctionedAmount": awarded,  # legacy
                "paymentAmount": payment,
                "expenditure": payment,  # legacy
                "utilization": float(row["utilization"]),
                "costDeviation": int(round(p_eval.get("deviation_percent", 0))),
                "bidderCount": int(row.get("bidder_count", 5)),
                "contractDuration": int(row.get("expected_days", 180)),
                "expectedDays": int(row.get("expected_days", 180)),  # legacy
                "actualDays": int(row.get("actual_days", 180)),      # legacy
                "delayed": bool(row["delayed"]),
                "delayDays": int(row["delay_days"]),
                "completionDelayDays": int(row["delay_days"]),
                "tenderDate": str(row.get("tender_date", "2025-04-01T00:00:00.000Z")),
                "awardDate": str(row.get("award_date", "2025-05-15T00:00:00.000Z")),
                "sanctionDate": str(row.get("award_date", "2025-05-15T00:00:00.000Z")),  # legacy
                "expectedCompletion": str(row.get("expected_completion", "2026-01-01T00:00:00.000Z")),
                "actualCompletion": str(row.get("actual_completion")) if not pd.isna(row.get("actual_completion")) and row.get("actual_completion") else None,
                "status": row["status"],
                "riskScore": risk_eval["risk_score"],
                "riskTier": risk_eval["risk_level"],
                "primarySignal": risk_eval["primary_signal"],
                "signals": risk_eval["signals"],
                "breakdown": [
                    {"key": "Price anomaly", "value": risk_eval["breakdown"]["price_score"], "max": 25},
                    {"key": "Bid participation", "value": risk_eval["breakdown"]["bid_score"], "max": 20},
                    {"key": "Vendor behavior", "value": risk_eval["breakdown"]["vendor_score"], "max": 20},
                    {"key": "Repeated awards", "value": risk_eval["breakdown"]["repeated_score"], "max": 15},
                    {"key": "Relationship network", "value": risk_eval["breakdown"]["relationship_score"], "max": 15},
                    {"key": "Contract execution", "value": risk_eval["breakdown"]["contract_score"], "max": 5},
                ],
                "findings": formatted_findings,
                "recommendedAction": risk_eval["recommended_action"],
                "duplicateCandidate": bool(rep_eval.get("is_anomaly", False)),
                "duplicateSimilarity": 85 if rep_eval.get("is_anomaly", False) else 0,
            }

            enriched_tenders.append(tender_record)
            self.tenders_by_id[tid] = tender_record

        self.tenders = enriched_tenders
        self.works = self.tenders
        self.works_by_id = self.tenders_by_id

        # 8. Summary KPIs
        tier_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for t in self.tenders:
            tier_counts[t["riskTier"]] += 1

        tot_awarded = sum(t["awardedValue"] for t in self.tenders)
        tot_paid = sum(t["paymentAmount"] for t in self.tenders)
        util = round((tot_paid / tot_awarded * 100.0), 1) if tot_awarded > 0 else 0.0

        self.summary = {
            "totalTenders": len(self.tenders),
            "totalWorks": len(self.tenders),  # legacy
            "totalAwardValue": tot_awarded,
            "totalSanctioned": tot_awarded,  # legacy
            "totalExpenditure": tot_paid,
            "highPriorityCases": tier_counts["CRITICAL"] + tier_counts["HIGH"],
            "highRiskWorks": tier_counts["CRITICAL"] + tier_counts["HIGH"],  # legacy
            "criticalWorks": tier_counts["CRITICAL"],
            "delayedWorks": sum(1 for t in self.tenders if t["delayed"]),
            "duplicateCandidates": sum(1 for t in self.tenders if t["duplicateCandidate"]),
            "counts": tier_counts,
            "utilization": util,
            "datasetName": "Synthetic Demonstration Dataset",
            "disclaimer": DISCLAIMER_TEXT,
        }

        # 9. Build Aggregates & Alerts
        self._build_aggregates()
        self.summary["stateSummary"] = self.state_aggregates
        self._build_alerts()

        return {
            "summary": self.summary,
            "total_tenders": len(self.tenders),
            "total_works": len(self.tenders),
            "vendors_profiled": len(self.vendor_aggregates),
            "alerts_generated": len(self.alerts),
        }

    def _build_aggregates(self):
        """Aggregate data by State, District, Department, and Category."""
        # State Aggregates (Used by IndiaMap)
        state_map: Dict[str, Dict[str, Any]] = {}
        for t in self.tenders:
            st = t["state"]
            if st not in state_map:
                state_map[st] = {
                    "code": t["stateCode"],
                    "name": st,
                    "districts": set(),
                    "works": 0,
                    "tenders": 0,
                    "sanctioned": 0,
                    "expenditure": 0,
                    "highRisk": 0,
                    "delayed": 0,
                    "duplicateCandidates": 0,
                    "risk_sum": 0,
                    "counts": {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0},
                }
            s = state_map[st]
            s["districts"].add(t["district"])
            s["works"] += 1
            s["tenders"] += 1
            s["sanctioned"] += t["awardedValue"]
            s["expenditure"] += t["paymentAmount"]
            s["risk_sum"] += t["riskScore"]
            s["counts"][t["riskTier"]] += 1
            if t["riskTier"] in ["CRITICAL", "HIGH"]:
                s["highRisk"] += 1
            if t["delayed"]:
                s["delayed"] += 1

        self.state_aggregates = []
        for st, s in state_map.items():
            avg_risk = round(s["risk_sum"] / s["works"], 1) if s["works"] > 0 else 0.0
            u = round((s["expenditure"] / s["sanctioned"] * 100.0), 1) if s["sanctioned"] > 0 else 0.0
            self.state_aggregates.append({
                "code": s["code"],
                "name": s["name"],
                "state": s["name"],
                "works": s["works"],
                "totalWorks": s["works"],
                "tenders": s["tenders"],
                "sanctioned": s["sanctioned"],
                "expenditure": s["expenditure"],
                "highRisk": s["highRisk"],
                "avgRisk": avg_risk,
                "mean_risk": avg_risk,
                "delayed": s["delayed"],
                "counts": s["counts"],
                "utilization": u,
                "districtsCount": len(s["districts"]),
            })
        self.state_aggregates.sort(key=lambda x: x["name"])

        # District Aggregates
        dist_map: Dict[str, Dict[str, Any]] = {}
        for t in self.tenders:
            key = f"{t['district']}|{t['state']}"
            if key not in dist_map:
                dist_map[key] = {
                    "name": t["district"],
                    "state": t["state"],
                    "stateCode": t["stateCode"],
                    "works": 0,
                    "sanctioned": 0,
                    "expenditure": 0,
                    "highRisk": 0,
                    "delayed": 0,
                    "risk_sum": 0,
                    "counts": {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0},
                }
            d = dist_map[key]
            d["works"] += 1
            d["sanctioned"] += t["awardedValue"]
            d["expenditure"] += t["paymentAmount"]
            d["risk_sum"] += t["riskScore"]
            d["counts"][t["riskTier"]] += 1
            if t["riskTier"] in ["CRITICAL", "HIGH"]:
                d["highRisk"] += 1
            if t["delayed"]:
                d["delayed"] += 1

        self.district_aggregates = []
        for _, d in dist_map.items():
            avg_risk = round(d["risk_sum"] / d["works"], 1) if d["works"] > 0 else 0.0
            self.district_aggregates.append({
                "id": f"DIST-{len(self.district_aggregates)+1:03d}",
                "name": d["name"],
                "district": d["name"],
                "state": d["state"],
                "stateCode": d["stateCode"],
                "projects": d["works"],
                "works": d["works"],
                "sanctioned": d["sanctioned"],
                "value": d["sanctioned"],
                "expenditure": d["expenditure"],
                "highRisk": d["highRisk"],
                "avgRisk": avg_risk,
                "delayed": d["delayed"],
                "counts": d["counts"],
            })
        self.district_aggregates.sort(key=lambda x: x["projects"], reverse=True)

        # Department Aggregates
        dept_map: Dict[str, Dict[str, Any]] = {}
        for t in self.tenders:
            dept = t["department"]
            if dept not in dept_map:
                dept_map[dept] = {
                    "department": dept,
                    "tenders": 0,
                    "awarded": 0,
                    "paid": 0,
                    "highRisk": 0,
                    "risk_sum": 0,
                }
            dm = dept_map[dept]
            dm["tenders"] += 1
            dm["awarded"] += t["awardedValue"]
            dm["paid"] += t["paymentAmount"]
            dm["risk_sum"] += t["riskScore"]
            if t["riskTier"] in ["CRITICAL", "HIGH"]:
                dm["highRisk"] += 1

        self.department_aggregates = []
        for dept, dm in dept_map.items():
            self.department_aggregates.append({
                "department": dept,
                "tenders": dm["tenders"],
                "awardedValue": dm["awarded"],
                "paidAmount": dm["paid"],
                "highRisk": dm["highRisk"],
                "avgRisk": round(dm["risk_sum"] / dm["tenders"], 1) if dm["tenders"] > 0 else 0.0,
            })
        self.department_aggregates.sort(key=lambda x: x["highRisk"], reverse=True)

        # Category Aggregates
        cat_map: Dict[str, Dict[str, Any]] = {}
        for t in self.tenders:
            cat = t["category"]
            if cat not in cat_map:
                cat_map[cat] = {
                    "category": cat,
                    "count": 0,
                    "sanctioned": 0,
                    "expenditure": 0,
                    "high_risk": 0,
                    "risk_sum": 0,
                }
            cm = cat_map[cat]
            cm["count"] += 1
            cm["sanctioned"] += t["awardedValue"]
            cm["expenditure"] += t["paymentAmount"]
            cm["risk_sum"] += t["riskScore"]
            if t["riskTier"] in ["CRITICAL", "HIGH"]:
                cm["high_risk"] += 1

        self.category_aggregates = []
        for cat, cm in cat_map.items():
            self.category_aggregates.append({
                "category": cat,
                "count": cm["count"],
                "sanctioned": cm["sanctioned"],
                "expenditure": cm["expenditure"],
                "high_risk": cm["high_risk"],
                "highRisk": cm["high_risk"],
                "avgRisk": round(cm["risk_sum"] / cm["count"], 1) if cm["count"] > 0 else 0.0,
            })
        self.category_aggregates.sort(key=lambda x: x["count"], reverse=True)

    def _build_alerts(self):
        """Extract prioritized investigation alerts."""
        alerts = []
        critical_tenders = [t for t in self.tenders if t["riskTier"] == "CRITICAL"]
        high_tenders = [t for t in self.tenders if t["riskTier"] == "HIGH"]

        for idx, t in enumerate(critical_tenders[:25] + high_tenders[:25]):
            sig = t["primarySignal"]
            alerts.append({
                "id": f"AL-{3000 + idx}",
                "severity": t["riskTier"],
                "category": sig,
                "title": f"Investigation Signal · {t['category']}",
                "workId": t["id"],
                "tenderId": t["id"],
                "state": t["state"],
                "district": t["district"],
                "description": t["title"],
                "signal": t["findings"][0]["explanation"] if t["findings"] else sig,
                "recommendedAction": t["recommendedAction"],
                "timestamp": t["awardDate"],
                "confidence": t["findings"][0]["confidence"] if t["findings"] else 85,
            })

        self.alerts = alerts

    def query_works(
        self,
        search: str = "",
        state: str = "ALL",
        district: str = "ALL",
        category: str = "ALL",
        agency: str = "ALL",
        risk_level: str = "ALL",
        riskTier: str = "ALL",
        min_score: int = 0,
        max_score: int = 100,
        sort_by: str = "riskScore",
        sortBy: str = "riskScore",
        sort_dir: str = "desc",
        sortOrder: str = "desc",
        page: int = 1,
        page_size: int = 12,
        pageSize: int = 12,
        user: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Filtered, sorted, and paginated query over tenders."""
        tier = riskTier if riskTier != "ALL" else risk_level
        sort_field = sortBy if sortBy != "riskScore" else sort_by
        direction = sortOrder if sortOrder != "desc" else sort_dir
        p = page
        size = pageSize if pageSize != 12 else page_size

        # RBAC scope filtering
        scoped_tenders = self.filter_works_by_scope(user)

        # Anti-tampering: Scoped authorities cannot override assigned jurisdiction via query parameters
        if user and user.role in ["STATE_AUTHORITY", "DISTRICT_AUTHORITY", "MP"] and user.state:
            state = "ALL"
        if user and user.role in ["DISTRICT_AUTHORITY", "MP"] and user.district:
            district = "ALL"

        filtered = []
        s_term = search.lower().strip()

        for t in scoped_tenders:
            if s_term:
                match_id = s_term in t["id"].lower()
                match_desc = s_term in t["title"].lower()
                match_vend = s_term in t["vendorName"].lower()
                match_dept = s_term in t["department"].lower()
                match_dist = s_term in t["district"].lower()
                if not (match_id or match_desc or match_vend or match_dept or match_dist):
                    continue

            if state != "ALL":
                if t["stateCode"] != state and t["state"].lower() != state.lower():
                    continue

            if district != "ALL" and t["district"].lower() != district.lower():
                continue

            if category != "ALL" and t["category"].lower() != category.lower():
                continue

            if agency != "ALL":
                if t["vendorName"].lower() != agency.lower() and t["vendorId"].lower() != agency.lower():
                    continue

            if tier != "ALL" and t["riskTier"] != tier:
                continue

            if not (min_score <= t["riskScore"] <= max_score):
                continue

            filtered.append(t)

        # Sorting
        rev = (direction.lower() == "desc")
        key_map = {
            "riskScore": lambda x: x["riskScore"],
            "awardedValue": lambda x: x["awardedValue"],
            "sanctionedAmount": lambda x: x["awardedValue"],
            "estimatedValue": lambda x: x["estimatedValue"],
            "bidderCount": lambda x: x["bidderCount"],
            "costDeviation": lambda x: x["costDeviation"],
            "delayDays": lambda x: x["delayDays"],
            "tenderDate": lambda x: x["tenderDate"],
        }
        sort_fn = key_map.get(sort_field, lambda x: x["riskScore"])
        filtered.sort(key=sort_fn, reverse=rev)

        # Pagination
        total = len(filtered)
        start = (p - 1) * size
        end = start + size
        rows = filtered[start:end]

        return {
            "total": total,
            "page": p,
            "pageSize": size,
            "totalPages": math.ceil(total / size) if size > 0 else 1,
            "rows": rows,
        }

    # Backward compatibility query method name
    query_tenders = query_works

    def get_work_detail(self, work_id: str, user: Optional[Any] = None) -> Optional[Dict[str, Any]]:
        """Retrieve tender detail with peer comparison and similar candidates."""
        t = self.tenders_by_id.get(work_id)
        if not t:
            return None

        # RBAC Check
        if user and user.role != "MINISTRY":
            if user.role == "STATE_AUTHORITY" and user.state and t["state"] != user.state:
                raise PermissionError("Tender is outside your authorized state jurisdiction.")
            if user.role == "DISTRICT_AUTHORITY" and user.district and t["district"] != user.district:
                raise PermissionError("Tender is outside your authorized district jurisdiction.")

        cat_peers = [
            peer for peer in self.tenders
            if peer["category"] == t["category"] and peer["id"] != t["id"]
        ]
        cat_median = int(np.median([p["awardedValue"] for p in cat_peers])) if cat_peers else t["awardedValue"]

        # Financials structure
        financials = {
            "estimatedCost": t["estimatedValue"],
            "sanctionedAmount": t["awardedValue"],
            "expenditure": t["paymentAmount"],
            "utilization": t["utilization"],
            "costDeviation": t["costDeviation"],
            "historicalMedian": cat_median,
        }

        # Similar tenders in same category/department
        similar = []
        for p in cat_peers[:4]:
            similar.append({
                "id": p["id"],
                "workId": p["id"],
                "description": p["title"],
                "category": p["category"],
                "state": p["state"],
                "district": p["district"],
                "sanctionedAmount": p["awardedValue"],
                "expenditure": p["paymentAmount"],
                "riskScore": p["riskScore"],
                "riskTier": p["riskTier"],
                "similarity": 82,
            })

        timeline = [
            {"key": "Tender Notice Issued", "date": t["tenderDate"], "done": True},
            {"key": "Bids Received & Evaluated", "date": t["awardDate"], "done": True},
            {"key": "Contract Awarded", "date": t["awardDate"], "done": True},
            {"key": "Target Delivery", "date": t["expectedCompletion"], "done": not t["delayed"], "expected": True},
            {"key": "Final Delivery / Handover", "date": t["actualCompletion"] or t["expectedCompletion"], "done": t["status"] == "Completed", "delayed": t["delayed"]},
        ]

        return {
            **t,
            "financials": financials,
            "similar": similar,
            "timeline": timeline,
        }

    get_tender_detail = get_work_detail

    def get_vendor_detail(self, vendor_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve vendor profile and recent tender history."""
        for v in self.vendor_aggregates:
            if v["id"] == vendor_id or v["name"] == vendor_id:
                history = [t for t in self.tenders if t["vendorName"] == v["name"]][:20]
                return {**v, "history": history}
        return None

    def filter_works_by_scope(self, user: Optional[Any]) -> List[Dict[str, Any]]:
        """Filter tenders based on authenticated user jurisdiction."""
        if not user or user.role == "MINISTRY":
            return self.tenders

        if user.role == "STATE_AUTHORITY" and user.state:
            return [t for t in self.tenders if t["state"] == user.state]

        if user.role in ["DISTRICT_AUTHORITY", "MP"] and user.district:
            return [t for t in self.tenders if t["district"] == user.district]

        return self.tenders

    def get_scoped_summary(self, user: Optional[Any]) -> Dict[str, Any]:
        """Compute summary KPIs scoped to user."""
        scoped = self.filter_works_by_scope(user)
        if len(scoped) == len(self.tenders):
            return self.summary

        tier_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for t in scoped:
            tier_counts[t["riskTier"]] += 1

        tot_awarded = sum(t["awardedValue"] for t in scoped)
        tot_paid = sum(t["paymentAmount"] for t in scoped)
        util = round((tot_paid / tot_awarded * 100.0), 1) if tot_awarded > 0 else 0.0

        return {
            "totalTenders": len(scoped),
            "totalWorks": len(scoped),
            "totalAwardValue": tot_awarded,
            "totalSanctioned": tot_awarded,
            "totalExpenditure": tot_paid,
            "highPriorityCases": tier_counts["CRITICAL"] + tier_counts["HIGH"],
            "highRiskWorks": tier_counts["CRITICAL"] + tier_counts["HIGH"],
            "criticalWorks": tier_counts["CRITICAL"],
            "delayedWorks": sum(1 for t in scoped if t["delayed"]),
            "duplicateCandidates": sum(1 for t in scoped if t["duplicateCandidate"]),
            "counts": tier_counts,
            "utilization": util,
            "datasetName": "Synthetic Demonstration Dataset",
            "disclaimer": DISCLAIMER_TEXT,
        }

    def get_scoped_states(self, user: Optional[Any]) -> List[Dict[str, Any]]:
        if not user or user.role == "MINISTRY":
            return self.state_aggregates
        if user.role in ["STATE_AUTHORITY", "DISTRICT_AUTHORITY"] and user.state:
            return [s for s in self.state_aggregates if s["name"] == user.state]
        return self.state_aggregates

    def get_scoped_districts(self, user: Optional[Any]) -> List[Dict[str, Any]]:
        if not user or user.role == "MINISTRY":
            return self.district_aggregates
        if user.role == "STATE_AUTHORITY" and user.state:
            return [d for d in self.district_aggregates if d["state"] == user.state]
        if user.role == "DISTRICT_AUTHORITY" and user.district:
            return [d for d in self.district_aggregates if d["district"] == user.district]
        return self.district_aggregates

    def get_scoped_agencies(self, user: Optional[Any]) -> List[Dict[str, Any]]:
        return self.vendor_aggregates

    def get_scoped_categories(self, user: Optional[Any]) -> List[Dict[str, Any]]:
        return self.category_aggregates

    def get_scoped_alerts(self, user: Optional[Any]) -> List[Dict[str, Any]]:
        if not user or user.role == "MINISTRY":
            return self.alerts
        scoped_ids = {t["id"] for t in self.filter_works_by_scope(user)}
        return [a for a in self.alerts if a.get("workId") in scoped_ids or a.get("tenderId") in scoped_ids]

    def get_scoped_filters(self, user: Optional[Any]) -> Dict[str, Any]:
        scoped = self.filter_works_by_scope(user)
        states = sorted({(t["stateCode"], t["state"]) for t in scoped}, key=lambda x: x[1])
        districts = sorted({t["district"] for t in scoped})
        categories = sorted({t["category"] for t in scoped})
        vendors = sorted({t["vendorName"] for t in scoped})
        departments = sorted({t["department"] for t in scoped})

        return {
            "states": [{"code": s[0], "name": s[1]} for s in states],
            "districts": districts,
            "categories": categories,
            "agencies": vendors,
            "vendors": vendors,
            "departments": departments,
            "riskTiers": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
        }

    def get_scoped_analytics(self, user: Optional[Any]) -> Dict[str, Any]:
        scoped = self.filter_works_by_scope(user)
        # 12-month trend simulation
        months = ["Apr 2025", "May 2025", "Jun 2025", "Jul 2025", "Aug 2025", "Sep 2025", "Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026"]
        risk_trend = []
        exp_trend = []

        for m_idx, m in enumerate(months):
            risk_trend.append({
                "month": m,
                "critical": int(round(len(scoped) * 0.025 * (0.8 + 0.4 * (m_idx % 3) / 2))),
                "high": int(round(len(scoped) * 0.075 * (0.9 + 0.2 * (m_idx % 4) / 3))),
                "medium": int(round(len(scoped) * 0.20 * 1.0)),
                "low": int(round(len(scoped) * 0.70 * 1.0)),
            })
            exp_trend.append({
                "month": m,
                "sanctioned": int(round(self.summary.get("totalAwardValue", 100000000) * 0.08)),
                "expenditure": int(round(self.summary.get("totalExpenditure", 90000000) * 0.078)),
            })

        efficiency = [
            {"category": c["category"], "avgCost": int(c["sanctioned"] / max(1, c["count"])), "utilization": 92.4}
            for c in self.category_aggregates[:8]
        ]
        heatmap = [
            {"state": s["name"], "code": s["code"], "utilization": s["utilization"]}
            for s in self.state_aggregates[:10]
        ]

        return {
            "states": self.get_scoped_states(user),
            "categories": self.category_aggregates,
            "departments": self.department_aggregates,
            "agencies": self.vendor_aggregates,
            "vendors": self.vendor_aggregates,
            "efficiency": efficiency,
            "utilizationHeatmap": heatmap,
            "riskTrend": risk_trend,
            "expenditureTrend": exp_trend,
            "networkGraph": self.network_graph,
            "disclaimer": DISCLAIMER_TEXT,
        }
