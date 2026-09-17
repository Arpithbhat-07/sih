# PROCUREGUARD

> **AI-Powered Public Procurement Anomaly & Investigation Intelligence Platform**

---

## 🏛️ Executive Summary

**ProcureGuard** is an enterprise-grade public procurement intelligence and audit surveillance platform designed for central vigilance directorates, state procurement nodal agencies, district tender authorities, and specialized investigation teams.

Government procurement generates large volumes of tenders, bids, vendors, contracts, and payments. While the majority of transactions are legitimate, unusual bidding behavior, repeated awards, unexplained price deviations, or covert relationships between participants can be difficult to identify through manual review. The core challenge is not simply finding transactions that look unusual, but helping investigators distinguish meaningful patterns from legitimate market variation.

ProcureGuard follows a strict **"DETECT → EXPLAIN → PRIORITIZE → INVESTIGATE"** philosophy:
* It generates **investigation priority scores (0–100)** to help authorities prioritize limited audit bandwidth.
* It provides **transparent analytical evidence** (price deviations, bidder counts, win rates, entity graph links) for every flagged case.
* It **never accuses entities of corruption or labels transactions as fraud** — anomaly signals are decision-support indicators for authorized human review.

---

## ⚡ System Architecture

```text
       ┌─────────────────────────────────────────────────────────┐
       │                   ProcureGuard UI                       │
       │   (React 19 · Tailwind · Recharts · Framer Motion · SVG)│
       └────────────────────────────┬────────────────────────────┘
                                    │ REST APIs + Bearer RBAC
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                 FastAPI Backend Server                  │
       │    (Sub-15ms Latency · Anti-Tampering Scope Enforcement)│
       └────────────────────────────┬────────────────────────────┘
                                    │ Preprocessing & Dual Mapping
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │               Modular ML Analytics Pipeline             │
       │  ┌────────────────────────┐   ┌───────────────────────┐ │
       │  │  Price Anomaly Engine  │   │  Bid Anomaly Engine   │ │
       │  │   (MAD + IsoForest)    │   │  (Low Participation) │ │
       │  │       (0–25 pts)       │   │      (0–20 pts)       │ │
       │  └────────────────────────┘   └───────────────────────┘ │
       │  ┌────────────────────────┐   ┌───────────────────────┐ │
       │  │  Vendor Anomaly Engine │   │ Repeated Award Engine │ │
       │  │  (Win Rate & Profiling)│   │ (Market Concentration)│ │
       │  │       (0–20 pts)       │   │      (0–15 pts)       │ │
       │  └────────────────────────┘   └───────────────────────┘ │
       │  ┌────────────────────────┐   ┌───────────────────────┐ │
       │  │  Relationship Graph    │   │ Contract Anomaly Eng  │ │
       │  │ (Entity Link Analysis) │   │  (Overrun & Delays)   │ │
       │  │       (0–15 pts)       │   │       (0–5 pts)       │ │
       │  └────────────────────────┘   └───────────────────────┘ │
       │  ┌───────────────────────────────────────────────────┐ │
       │  │   Composite 0–100 Priority Risk Engine + Synergy   │ │
       │  └───────────────────────────────────────────────────┘ │
       └────────────────────────────┬────────────────────────────┘
                                    │ Indexed Records & Graph Nodes
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │         5,000 Deterministic Procurement Records         │
       │  10 Sectors · 20 States · 89 Districts · 50 Depts · 80 Vendors│
       └─────────────────────────────────────────────────────────┘
```

---

## 🧠 Modular Machine Learning & Analytics Detectors

ProcureGuard features six independent, mathematically grounded anomaly detection engines located in `backend/ml/`:

| Engine | File | Method | Max Weight | Primary Analytical Signal |
|---|---|---|:---:|---|
| **Price Anomaly** | `price_anomaly.py` | Category Median Absolute Deviation (MAD) Z-score + Vectorized Isolation Forest ensemble | **25 pts** | Unexplained pricing outlier vs historical peer tenders |
| **Bid Participation** | `bid_anomaly.py` | Single-bidder penalty (1.0x) and 2-bidder low competition penalty (0.6x) | **20 pts** | Subdued competition / restricted bidding pool |
| **Vendor Profiling** | `vendor_anomaly.py` | Empirical win-rate vs benchmark (3.0x threshold) + vendor historical anomaly rate | **20 pts** | Disproportionate vendor success rate & risk history |
| **Repeated Award** | `repeated_award.py` | Department & Category Herfindahl-Hirschman / award concentration ratio | **15 pts** | Vendor capture of specific department tender portfolios |
| **Relationship Graph** | `relationship_anomaly.py` | Multi-entity bipartite network graph detecting shared directors, phones, addresses | **15 pts** | Covert corporate linkages between competing bidders |
| **Contract Execution** | `contract_anomaly.py` | Payment disbursement overruns (>115% of award) and execution schedule delays | **5 pts** | Post-award financial leakage & timeline slippage |

### Composite Risk Scoring & Synergy Rules
The total score is normalized to **0–100**:
`Base Score = S_price + S_bid + S_vendor + S_repeat + S_rel + S_contract`

* **Synergy Boost (+8 pts)**: Triggered when **concurrent** high price deviation (>= 15 pts) and single/low bidder participation (>= 15 pts) are detected.
* **Synergy Boost (+7 pts)**: Triggered when **concurrent** high vendor concentration (>= 12 pts) and relationship link flags (>= 10 pts) are detected.
* **Tiers**:
  * `CRITICAL` (80–100): Immediate priority review required before disbursement.
  * `HIGH` (60–79): Significant multi-signal anomalies flagged.
  * `MEDIUM` (40–59): Moderate deviations requiring routine oversight.
  * `LOW` (0–39): Transactions within expected statistical patterns.

---

## 🕸️ Procurement Relationship Network Graph

The interactive network graph (`/relationships`) maps relationships across entities:
* **Node Types**: Vendors (blue), Departments (amber), Directors/Owners (purple), and Tenders (emerald).
* **Link Types**: Awarded contracts, bidding participation, directorships, shared phone numbers, and shared registered office addresses.
* **Visual Clustering**: Force-directed layout identifies tightly connected bidder clusters, potential shell companies, and captive department relationships.

---

## 🤖 ProcureGuard AI Grounded Intelligence Layer

Located at `/ai`, ProcureGuard AI is a deterministic analytical assistant:
* **Intent Detection**: Automatically parses tender IDs (`TND-2026-01842`), vendor IDs (`V-1042`), department names, states, and analytical questions.
* **Grounded Analytical Context**: Queries live FastAPI endpoints (`/api/tenders/{id}`, `/api/relationships`, `/api/summary`) to retrieve verified facts.
* **Structured Response**: Outputs an executive summary, itemized evidence table, and prioritized actionable checklist for field auditors.
* **Zero Hallucination**: Fully deterministic and offline-first; never invents data or makes judicial accusations.

---

## 🔒 Role-Based Access Control (RBAC) & Anti-Tampering

All queries are authenticated via PBKDF2-SHA256 password hashing and URL-safe HMAC-SHA256 bearer tokens. Jurisdictional boundaries are strictly enforced on the server:

| Role | Demo User | Scope | Assigned Jurisdiction | Accessible Records |
|---|---|---|---|:---:|
| **Central Directorate** | `ministry.demo` | `NATIONAL` | All India | 5,000 Tenders |
| **State Authority** | `state.ka.demo` | `STATE` | Karnataka | 417 Tenders |
| **District Authority** | `district.mangalore.demo` | `DISTRICT` | Bengaluru Urban | 89 Tenders |
| **Special Investigator** | `mp.demo` | `AUDITOR` | Bengaluru Urban (Special Unit) | 89 Tenders |

* **Anti-Tampering Query Enforcement**: When a scoped user queries `/api/tenders?state=Uttar+Pradesh`, the server overrides the user parameter with their authenticated scope (`Karnataka`), preventing horizontal privilege escalation.

---

## 📊 Synthetic Demonstration Dataset Specification

* **Filename**: `backend/data/procurement_synthetic.csv`
* **Random Seed**: `20260917` (100% deterministic generation via `generate_procurement_data.py`)
* **Volume**: 5,000 procurement tenders across 20 Indian states and 89 districts.
* **Sectors**:
  1. Roads & Bridges
  2. Healthcare & Medical Supplies
  3. School Infrastructure
  4. Water Supply & Sanitation
  5. Rural Electrification & Solar
  6. IT & Digital Infrastructure
  7. Urban Development & Smart Cities
  8. Agriculture & Irrigation Works
  9. Public Housing & Buildings
  10. Environmental & Waste Management
* **Structured Scenarios**: Includes dedicated anchor test cases, e.g. **`TND-2026-01842`** (Risk Score: 84, Critical Tier, Price Anomaly + Low Bidder participation, awarded to `V-1042 Enterprise Logistics`).

---

## 🚀 Quickstart Guide

### Prerequisites
* Python 3.10+
* Node.js 18+ and npm
* Git

### 1. Clone & Set Up Backend
```bash
git clone https://github.com/Arpithbhat-07/sih.git
cd sih/backend

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI server (runs on http://127.0.0.1:8000)
uvicorn server:app --reload --port 8000
```

### 2. Set Up Frontend
```bash
cd ../frontend

# Install dependencies
npm install

# Start React development server (runs on http://localhost:3000)
npm start
```

### 3. Run Automated Tests
```bash
cd ../backend

# Run all 47 unit, integration, and authorization tests
pytest tests/ -v
```

---

## ⚖️ Responsible AI & Ethical Disclaimer

Anomaly indicators and priority risk scores generated by ProcureGuard represent mathematical and statistical signals designed to assist human auditors in prioritizing workloads. **They do not constitute legal proof of fraud, corruption, collusion, or criminal wrongdoing.** Final determinations require authorized human inquiry and verification against physical project milestones.

---

*ProcureGuard • AI-Powered Public Procurement Anomaly & Investigation Intelligence Platform.*
