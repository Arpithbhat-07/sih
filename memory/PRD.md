# MPLADS SENTINEL — Product Requirements (PRD)

## Original Problem Statement
SIH 2026 · PS ID 26102 (MoSPI / DIID). Build a **stunning, frontend-only** decision-support
platform "MPLADS SENTINEL — AI-Powered Risk, Anomaly & Efficiency Intelligence" to help
authorities monitor MPLADS works and identify where to look first: DATA → ANALYSIS →
ANOMALY → RISK SCORE → EXPLANATION → RECOMMENDED ACTION → HUMAN INVESTIGATION.
Core message: "We don't replace investigation. We tell authorities where to look first."
NOT an accusation engine.

## Scope
FRONTEND ONLY. No FastAPI/Mongo/ML/auth. Realistic synthetic mock data via a clean
service/data abstraction so a real backend can replace it without UI changes.

## Architecture
- React 19 (CRA + craco) + Tailwind + Recharts + Lucide + Framer Motion. Package manager: yarn.
- Persistent app shell: left sidebar (260px) + top header (64px) + scrollable main.
- Data abstraction:
  - `src/data/` — `mockData.js` (deterministic generator: 3,000 works, aggregates, trends),
    `constants.js`, `indiaSvg.js` (MapSVG India with IN-XX state ids).
  - `src/services/` — `api.js` (Promise-based; swap bodies for `fetch(${API}/...)` later),
    `aiEngine.js` (mock Sentinel AI), `investigationStore.js` (localStorage queue).
- Design system: dark-first (#090A0B shell, #121417 surface), IBM Plex Sans/Mono,
  risk-tier semantic colors (critical/high/medium/low), 1px hairline borders.

## User Personas
Ministry officials, State Nodal Authorities, District Authorities, MPs, policy/data teams.

## Core Requirements (static)
Command Center, Risk Monitor, Work Investigation (hero), Analytics, Alerts, Agencies,
Districts, Investigation Queue, Sentinel AI, Data Health. Interconnected navigation,
working search/filters, mock AI, investigation workflow, risk scoring, responsive.

## Implemented (2026-06 — v0.9.0)
- ✅ App shell: sidebar (grouped nav, active highlight, data-status footer), header
  (breadcrumb/title, global search w/ autosuggest, LIVE ANALYTICS, profile), mobile drawer.
- ✅ Command Center: hero message, 5 animated KPI cards, national risk donut + intelligence
  insights, interactive India SVG risk map (hover tooltip + click → Risk Monitor), 12-month
  risk trend (toggle count/value/expenditure), sanctioned-vs-expenditure bars + utilization
  insight, priority alerts table, Sentinel AI insight panel, disclaimer.
- ✅ Risk Monitor: advanced filters (state/district/category/agency/risk level/min-score/search),
  sortable + paginated polished table w/ prominent risk score cells, reset, export toast, legend.
- ✅ Work Investigation: radial score meter, component breakdown, dossier, financial analysis +
  comparison chart, project timeline w/ delay, AI findings (severity/evidence/confidence),
  potential duplicates (Compare Works), recommended action checklist, Add to Investigation Queue.
- ✅ Analytics: state performance table, category bar, agency scatter, completion efficiency,
  fund utilization heatmap. ✅ Alerts feed w/ category filters. ✅ Agencies list + detail.
  ✅ Districts sortable table. ✅ Investigation Queue w/ status workflow (localStorage).
  ✅ Sentinel AI conversational UI w/ suggested prompts + data signals. ✅ Data Health pipeline
  + mock upload. ✅ Settings. ✅ Work Explorer grid.
- ✅ Tested by testing agent: 100% of exercised frontend flows pass, zero bugs.

## Backlog / Remaining
- P1: Compare-Works side-by-side comparison view (currently navigates to the similar work).
- P1: Wire Sentinel AI to a real LLM (kept mock per user choice "wire up later").
- P2: Real CSV/Excel parsing on upload; export to actual downloadable CSV/PDF.
- P2: Saved filter presets, notification center panel.
- P3: Connect FastAPI backend by replacing bodies in `src/services/api.js`.

## Next Tasks
Connect a real LLM to Sentinel AI; build the side-by-side Compare Works view; real export files.
