# MPLADS Sentinel

> **AI-Powered Multi-Signal Anomaly Detection & Expenditure Monitoring Platform for the Members of Parliament Local Area Development Scheme (MPLADS)**  
> *Developed for the Smart India Hackathon (SIH)*

---

## 🏛️ Executive Summary

**MPLADS Sentinel** is an enterprise-grade public infrastructure expenditure surveillance platform designed for district authorities, nodal ministries, and audit teams. By applying statistical baseline models, NLP semantic embeddings, and multi-modal risk aggregation across 3,000 public work projects, MPLADS Sentinel identifies cost deviations, schedule slippages, duplicate work proposals, and agency portfolio concentrations with full explainability and mathematical rigor.

---

## ⚡ Key Highlights & System Architecture

```text
       ┌─────────────────────────────────────────────────────────┐
       │                   MPLADS Sentinel UI                    │
       │     (React CRA · Radix UI · Tailwind · Framer Motion)    │
       └────────────────────────────┬────────────────────────────┘
                                    │ REST APIs
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                 FastAPI Backend Server                  │
       │           (Sub-10ms Latency · CORS Guarded)             │
       └────────────────────────────┬────────────────────────────┘
                                    │ Unified Ingestion Pipeline
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │               Analytics & ML Engine Layer               │
       │  ┌───────────────────────┐   ┌───────────────────────┐  │
       │  │  Cost Anomaly Engine  │   │     Delay Detector    │  │
       │  │    (MAD + IsoForest)  │   │  (Schedule Slippage)  │  │
       │  └───────────────────────┘   └───────────────────────┘  │
       │  ┌───────────────────────┐   ┌───────────────────────┐  │
       │  │   Duplicate Detector  │   │ Agency Anomaly Engine │  │
       │  │   (TF-IDF + Cosine)   │   │  (Portfolio Outliers) │  │
       │  └───────────────────────┘   └───────────────────────┘  │
       │  ┌───────────────────────────────────────────────────┐  │
       │  │       Composite 0–100 Risk Engine + Synergy       │  │
       │  └───────────────────────────────────────────────────┘  │
       └────────────────────────────┬────────────────────────────┘
                                    │ Indexed Records
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │               3,000 Synthetic MPLADS Works              │
       │       20 States · 89 Districts · 20 Agencies · 8 Sectors │
       └─────────────────────────────────────────────────────────┘
```

### 1. Multi-Modal Analytical Engines
* **Cost Anomaly Detector**: Employs Median Absolute Deviation (MAD) category baselines combined with an Isolation Forest ensemble to detect expenditure escalations exceeding category medians.
* **Timeline Delay Engine**: Computes schedule slippage against baseline timelines, identifying stalled and delayed projects.
* **Duplicate Candidate Screener**: Sector-blocked TF-IDF n-grams (1–2 grams) with multi-attribute cosine similarity across descriptions, geo-proximity, and budgetary windows to detect duplicate proposals without manual comparison.
* **Agency Concentration Engine**: Evaluates implementing agencies on capacity constraints, delay frequency, and cost anomaly ratios relative to the national benchmark.
* **Composite Risk Scoring (0–100)**: Multi-factor risk engine aggregating cost (35), delay (25), duplicate similarity (20), agency risk (15), and compliance (5) with compound synergy boosts for concurrent multi-signal anomalies.

### 2. Sentinel AI Grounded Intelligence Layer
* **Grounded Analytical Queries**: Supports work investigations, state rankings, duplicate candidate analysis, agency comparisons, and prioritized investigation protocols.
* **100% Offline & Deterministic**: Zero external LLM / API key dependencies; pluggable architecture ready for future LLM integration.
* **Quick Shortcut**: "Investigate Highest Risk" single-click inspection dossier for top critical work `W-11261`.

### 3. Responsible AI & Neutrality
* Built strictly to adhere to the Ministry of Statistics and Programme Implementation (MoSPI) neutral terminology guidelines.
* Zero accusatory language (`fraud`, `corruption`, `guilty`, `scam` are prohibited).
* Statutory disclaimer on all exports and analytical views:
  > *"Analytical signals do not constitute proof of fraud or misconduct. Final assessment requires authorized human investigation."*

---

## 📊 Performance & Verification Benchmarks

* **Pipeline Ingestion**: Full multi-modal processing of 3,000 projects in **1.18 seconds**.
* **API Response Time**: Sub-10ms response latencies across all 12 endpoints.
* **Automated Test Coverage**:
  * **27 / 27** Python backend tests passing (`pytest`).
  * **16 / 16** Frontend Jest integration tests passing (`craco test`).
  * **13 / 13** Playwright end-to-end browser tests passing.

---

## 🚀 Quick Start Guide

### Prerequisites
* Python 3.11+
* Node.js 18+ and Yarn / npm

### 1. Backend Setup
```bash
# Navigate to repository root
cd sih

# Install Python dependencies
pip install -r backend/requirements.txt

# Launch FastAPI backend server (Port 8000)
python -m uvicorn backend.server:app --port 8000 --reload
```
API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)  
Health Endpoint: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
yarn install

# Launch React development server (Port 3000)
yarn start
```
Frontend Application: [http://localhost:3000](http://localhost:3000)

---

## 📁 Repository Structure

```text
├── backend/
│   ├── data/
│   │   └── mplads_synthetic.csv     # 3,000 synthetic MPLADS work records
│   ├── ml/
│   │   ├── cost_anomaly.py          # MAD + Isolation Forest cost detector
│   │   ├── delay_detection.py       # Timeline schedule slippage detector
│   │   ├── duplicate_detection.py   # TF-IDF + Cosine similarity engine
│   │   ├── agency_anomaly.py        # Agency portfolio outlier scoring
│   │   ├── risk_engine.py           # 0–100 composite risk scoring engine
│   │   └── preprocessing.py         # Ingestion, validation & normalization
│   ├── services/
│   │   └── analytics.py             # Unified high-performance analytics service
│   ├── requirements.txt             # Backend Python dependencies
│   └── server.py                    # FastAPI REST API endpoints & security guards
├── frontend/
│   ├── public/                      # Static assets & index.html
│   ├── src/
│   │   ├── components/              # UI components (Header, Nav, MetricCards)
│   │   ├── pages/
│   │   │   ├── CommandCenter.jsx    # Executive Dashboard & KPIs
│   │   │   ├── RiskMonitor.jsx      # Filterable work risk monitor
│   │   │   ├── WorkInvestigation.jsx# Full dossier & evidence breakdown
│   │   │   ├── ComparePage.jsx      # Side-by-side work comparison
│   │   │   ├── Analytics.jsx        # Category, agency & geographic analytics
│   │   │   └── SentinelAI.jsx       # Grounded analytical AI assistant
│   │   ├── services/
│   │   │   ├── api.js               # Live FastAPI data connector with fallback
│   │   │   └── sentinelAI.js        # Grounded intelligence reasoning engine
│   │   └── App.js                   # Application routing and theme provider
│   └── package.json                 # Frontend dependencies & scripts
├── tests/
│   ├── test_analytics_engine.py     # ML detector unit tests
│   └── test_api_server.py           # FastAPI endpoint and upload security tests
└── README.md                        # Documentation
```

---

## 🔒 Security Posture
* **Upload Defense**: 25 MB maximum upload limit on CSV ingest with chunked streaming and MIME validation.
* **CORS Policy**: Restricted to authorized development origins (`localhost:3000`).
* **Environment Integrity**: Zero secrets committed; 100% portable `pathlib.Path` resolution.

---

## 📄 License
Developed for educational and demonstration purposes for the **Smart India Hackathon (SIH)**.
