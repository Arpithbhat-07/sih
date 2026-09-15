import sys
sys.path.insert(0, ".")
from backend.services.analytics import AnalyticsService

svc = AnalyticsService("backend/data/mplads_synthetic.csv")
works = svc.works

print("=== RISK FORMULA & COMPONENT SUM AUDIT ===")
mismatches = []
for w in works:
    score = w["riskScore"]
    breakdown = w["breakdown"]
    breakdown_sum = sum(item["value"] for item in breakdown)
    if score != breakdown_sum:
        mismatches.append((w["id"], score, breakdown_sum, breakdown))

print(f"Total works checked: {len(works)}")
print(f"Component sum mismatches: {len(mismatches)}")
if mismatches:
    print(f"Sample mismatch: {mismatches[0]}")

# Group works by tier
by_tier = {"CRITICAL": [], "HIGH": [], "MEDIUM": [], "LOW": []}
for w in works:
    by_tier[w["riskTier"]].append(w)

print("\n--- CRITICAL WORKS (ALL) ---")
for w in by_tier["CRITICAL"]:
    b = {item["key"]: item["value"] for item in w["breakdown"]}
    tot = sum(b.values())
    print(f"ID: {w['id']} | Score: {w['riskScore']} | Tier: {w['riskTier']} | Cost: {b.get('Cost anomaly',0)} | Delay: {b.get('Delay anomaly',0)} | Dup: {b.get('Duplicate similarity',0)} | Agency: {b.get('Agency anomaly',0)} | Comp: {b.get('Compliance',0)} | Sum: {tot} | Match: {tot == w['riskScore']}")

print("\n--- HIGH WORKS (3 SAMPLES) ---")
for w in by_tier["HIGH"][:3]:
    b = {item["key"]: item["value"] for item in w["breakdown"]}
    tot = sum(b.values())
    print(f"ID: {w['id']} | Score: {w['riskScore']} | Tier: {w['riskTier']} | Cost: {b.get('Cost anomaly',0)} | Delay: {b.get('Delay anomaly',0)} | Dup: {b.get('Duplicate similarity',0)} | Agency: {b.get('Agency anomaly',0)} | Comp: {b.get('Compliance',0)} | Sum: {tot} | Match: {tot == w['riskScore']}")

print("\n--- MEDIUM WORKS (3 SAMPLES) ---")
for w in by_tier["MEDIUM"][:3]:
    b = {item["key"]: item["value"] for item in w["breakdown"]}
    tot = sum(b.values())
    print(f"ID: {w['id']} | Score: {w['riskScore']} | Tier: {w['riskTier']} | Cost: {b.get('Cost anomaly',0)} | Delay: {b.get('Delay anomaly',0)} | Dup: {b.get('Duplicate similarity',0)} | Agency: {b.get('Agency anomaly',0)} | Comp: {b.get('Compliance',0)} | Sum: {tot} | Match: {tot == w['riskScore']}")

print("\n--- LOW WORKS (3 SAMPLES) ---")
for w in by_tier["LOW"][:3]:
    b = {item["key"]: item["value"] for item in w["breakdown"]}
    tot = sum(b.values())
    print(f"ID: {w['id']} | Score: {w['riskScore']} | Tier: {w['riskTier']} | Cost: {b.get('Cost anomaly',0)} | Delay: {b.get('Delay anomaly',0)} | Dup: {b.get('Duplicate similarity',0)} | Agency: {b.get('Agency anomaly',0)} | Comp: {b.get('Compliance',0)} | Sum: {tot} | Match: {tot == w['riskScore']}")
