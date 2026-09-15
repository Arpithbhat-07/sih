from backend.services.analytics import AnalyticsService
from backend.ml.preprocessing import load_dataset
from backend.ml.cost_anomaly import CostAnomalyDetector
from backend.ml.delay_detection import DelayDetector
from backend.ml.duplicate_detection import DuplicateCandidateDetector
from backend.ml.agency_anomaly import AgencyAnomalyDetector
from backend.ml.risk_engine import RiskEngine

csv_path = "backend/data/mplads_synthetic.csv"
df = load_dataset(csv_path)

print("=== 2. DETECTOR AUDIT ===")

# A. Cost Anomaly Detector
cost_detector = CostAnomalyDetector()
cost_detector.fit(df)
cost_res = cost_detector.analyze_dataframe(df)
cost_anomalies = [r for r in cost_res if r["is_anomaly"]]
print(f"Cost Detector:")
print(f"  Total records: {len(cost_res)}")
print(f"  Anomalies flagged: {len(cost_anomalies)}")
print(f"  Score min/mean/max: {min(r['score'] for r in cost_res)} / {sum(r['score'] for r in cost_res)/len(cost_res):.2f} / {max(r['score'] for r in cost_res)}")
print(f"  Sample anomaly result: {cost_anomalies[0]}")

# B. Delay Detector
delay_detector = DelayDetector()
delay_detector.fit(df)
delay_res = delay_detector.analyze_dataframe(df)
delay_anomalies = [r for r in delay_res if r["is_anomaly"]]
print(f"\nDelay Detector:")
print(f"  Total records: {len(delay_res)}")
print(f"  Anomalies flagged: {len(delay_anomalies)}")
print(f"  Score min/mean/max: {min(r['score'] for r in delay_res)} / {sum(r['score'] for r in delay_res)/len(delay_res):.2f} / {max(r['score'] for r in delay_res)}")
print(f"  Sample anomaly result: {delay_anomalies[0]}")

# C. Duplicate Detector
dup_detector = DuplicateCandidateDetector(min_similarity_threshold=70)
dup_detector.fit_and_detect(df)
dup_candidates = dup_detector.get_candidates()
dup_evals = [dup_detector.get_work_result(w) for w in df["work_id"]]
dup_flagged = [d for d in dup_evals if d["is_anomaly"]]
print(f"\nDuplicate Detector:")
print(f"  Candidate pairs generated: {len(dup_candidates)}")
print(f"  Works flagged as duplicate candidate: {len(dup_flagged)}")
print(f"  Sample pair: {dup_candidates[0]}")

# D. Agency Anomaly Detector
agency_detector = AgencyAnomalyDetector()
agency_detector.fit(df, cost_results=cost_res, delay_results=delay_res)
profiles = agency_detector.get_profiles()
outliers = [p for p in profiles if p["is_outlier"]]
print(f"\nAgency Anomaly Detector:")
print(f"  Agencies evaluated: {len(profiles)}")
print(f"  Outlier agencies: {len(outliers)} ({[p['agency'] for p in outliers]})")

# E. Unified Analytics Pipeline Run
print(f"\n=== Running Full Analytics Service Pipeline ===")
svc = AnalyticsService(csv_path)
summary = svc.summary
print(f"Summary totalWorks: {summary['totalWorks']}")
print(f"Summary counts: {summary['counts']}")
print(f"Total high-risk (CRITICAL + HIGH): {summary['highRiskWorks']}")
print(f"Delayed works: {summary['delayedWorks']}")
print(f"Duplicate candidates: {summary['duplicateCandidates']}")
