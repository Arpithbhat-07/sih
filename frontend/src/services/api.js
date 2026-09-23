// Service/data-access layer for MPLADS Sentinel.
// Connects React UI to live FastAPI REST backend with graceful demo fallback.

import axios from 'axios';
import * as mockData from '../data/mockData';
import { tierForScore } from '../data/constants';

export function resolveApiBaseUrl(env = (typeof process !== 'undefined' ? process.env : {})) {
  const raw =
    env.REACT_APP_API_BASE_URL ||
    env.REACT_APP_BACKEND_URL ||
    env.REACT_APP_API_URL ||
    'http://127.0.0.1:8000/api';

  let clean = raw.trim().replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    clean = `${clean}/api`;
  }
  return clean;
}

const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 35000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let currentAuthToken = typeof window !== 'undefined' ? localStorage.getItem('sentinel_token') : null;

export function setAuthToken(token) {
  currentAuthToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
}

// Request interceptor ensuring Bearer token is attached
apiClient.interceptors.request.use(
  (config) => {
    const token = currentAuthToken || (typeof window !== 'undefined' ? localStorage.getItem('sentinel_token') : null);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor handling 401 (session expired)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('sentinel_token');
      localStorage.removeItem('sentinel_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

let hasLoggedFallback = false;
function logFallback(endpoint, err) {
  if (!hasLoggedFallback) {
    console.warn(`[MPLADS Sentinel] API unavailable at ${API_BASE_URL} (${endpoint}) — using demo fallback`, err?.message || err);
    hasLoggedFallback = true;
  }
}

// ==================== NORMALIZATION LAYER ====================

export function normalizeWork(w) {
  if (!w) return null;
  const id = w.id || w.workId;
  const riskScore = typeof w.riskScore === 'number' ? w.riskScore : Number(w.riskScore) || 0;
  const riskTier = w.riskTier || tierForScore(riskScore);
  const costDeviation = typeof w.costDeviation === 'number' ? w.costDeviation : 0;
  const delayDays = typeof w.delayDays === 'number' ? w.delayDays : 0;
  const duplicateSimilarity = w.duplicateSimilarity || (w.duplicateCandidate ? 85 : 0);

  // Normalize findings
  const rawFindings = w.findings || [];
  const findings = rawFindings.map((f, idx) => {
    const det = f.detector || '';
    const conf = typeof f.confidence === 'number' ? (f.confidence <= 1.0 ? Math.round(f.confidence * 100) : Math.round(f.confidence)) : 85;
    const sev = f.severity || (conf > 90 ? 'CRITICAL' : conf > 78 ? 'HIGH' : 'MEDIUM');
    const explanation = f.explanation || f.message || 'Analytical signal flagged by anomaly engine.';
    let evidence = f.evidence;
    if (!evidence) {
      if (det === 'cost' || f.title?.includes('Cost')) {
        evidence = `+${costDeviation}% above category median`;
      } else if (det === 'delay' || f.title?.includes('Timeline') || f.title?.includes('Duration')) {
        evidence = `+${delayDays} days beyond expected completion`;
      } else if (det === 'duplicate' || f.title?.includes('Duplicate')) {
        evidence = `High attribute similarity (${duplicateSimilarity}%) with peer work`;
      } else if (det === 'agency' || f.title?.includes('Agency')) {
        evidence = 'Elevated share of flagged works for agency';
      } else {
        evidence = 'Within expected pattern';
      }
    }
    return {
      id: f.id || `f-${det || idx}`,
      detector: det,
      severity: sev,
      title: f.title || 'Anomaly Analysis',
      explanation,
      message: explanation,
      evidence,
      confidence: conf,
    };
  });

  // Normalize financials
  const fin = w.financials || {};
  const expenditure = fin.expenditure ?? w.expenditure ?? 0;
  const sanctionedAmount = fin.sanctionedAmount ?? w.sanctionedAmount ?? 0;
  const estimatedCost = fin.estimatedCost ?? w.estimatedCost ?? sanctionedAmount;
  const historicalMedian = fin.historicalMedian ?? (costDeviation ? Math.round(expenditure / (1 + costDeviation / 100)) : sanctionedAmount);
  const utilization = fin.utilization ?? w.utilization ?? (sanctionedAmount > 0 ? Number(((expenditure / sanctionedAmount) * 100).toFixed(1)) : 0);

  const financials = {
    estimatedCost,
    sanctionedAmount,
    expenditure,
    utilization,
    costDeviation,
    historicalMedian,
  };

  // Normalize similar works
  const similar = (w.similar || []).map((s) => ({
    ...s,
    id: s.id || s.workId,
    workId: s.workId || s.id,
    similarity: typeof s.similarity === 'number' ? s.similarity : 75,
    riskScore: typeof s.riskScore === 'number' ? s.riskScore : 50,
    riskTier: s.riskTier || tierForScore(s.riskScore || 50),
  }));

  // Normalize breakdown
  const breakdown = Array.isArray(w.breakdown) && w.breakdown.length > 0
    ? w.breakdown
    : mockData.buildBreakdown(w);

  // Normalize timeline
  const timeline = Array.isArray(w.timeline) && w.timeline.length > 0 ? w.timeline : [
    { key: 'Recommended', date: w.sanctionDate, done: true },
    { key: 'Sanctioned', date: w.sanctionDate, done: true },
    { key: 'Work Started', date: w.sanctionDate, done: true },
    { key: 'Expected Completion', date: w.expectedCompletion, done: !w.delayed, expected: true },
    { key: 'Actual Completion', date: w.actualCompletion || w.expectedCompletion, done: w.status === 'Completed', delayed: w.delayed },
  ];

  return {
    ...w,
    id,
    workId: id,
    riskScore,
    riskTier,
    costDeviation,
    delayed: Boolean(w.delayed),
    delayDays,
    duplicateCandidate: Boolean(w.duplicateCandidate),
    duplicateSimilarity,
    financials,
    findings,
    similar,
    breakdown,
    timeline,
  };
}

export function normalizeAgency(ag, idx = 0) {
  if (!ag) return null;
  const id = ag.id || `AG-${100 + (ag.idx ?? idx)}`;
  const name = ag.name || ag.agency || 'Implementing Agency';
  const projects = ag.projects ?? ag.works ?? 0;
  const value = ag.value ?? ag.total_value ?? 0;
  const avgCost = ag.avgCost ?? ag.avg_cost ?? (projects > 0 ? Math.round(value / projects) : 0);
  const avgRisk = ag.avgRisk ?? (typeof ag.avg_risk === 'number' ? ag.avg_risk : 0);
  const delayPct = ag.delayPct ?? ag.delay_rate ?? 0;
  const anomalyRate = ag.anomalyRate ?? ag.anomaly_rate ?? 0;
  const counts = ag.counts || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  return {
    ...ag,
    id,
    name,
    agency: name,
    projects,
    value,
    avgCost,
    avgRisk,
    delayPct,
    anomalyRate,
    counts,
  };
}

export function normalizeSummary(s) {
  if (!s) return { ...mockData.summary };
  return {
    totalWorks: s.totalWorks || 3000,
    totalSanctioned: s.totalSanctioned || 0,
    totalExpenditure: s.totalExpenditure || 0,
    highRiskWorks: s.highRiskWorks ?? (s.counts ? (s.counts.CRITICAL || 0) + (s.counts.HIGH || 0) : 0),
    criticalWorks: s.criticalWorks ?? (s.counts ? s.counts.CRITICAL || 0 : 0),
    delayedWorks: s.delayedWorks || 0,
    duplicateCandidates: s.duplicateCandidates || 0,
    counts: s.counts || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    utilization: s.utilization || 0,
    datasetName: s.datasetName || 'Synthetic Demonstration Dataset',
    disclaimer: s.disclaimer || 'Analytical signals do not constitute proof of fraud or misconduct. Final assessment requires authorized human investigation.',
    stateSummary: s.stateSummary || [],
  };
}

export function normalizeAnalytics(d) {
  if (!d) return null;
  return {
    states: d.states || [],
    categories: d.categories || [],
    agencies: (d.agencies || []).map((a, i) => normalizeAgency(a, i)),
    efficiency: d.efficiency || [],
    utilizationHeatmap: d.utilizationHeatmap || [],
    riskTrend: d.riskTrend || [],
    expenditureTrend: d.expenditureTrend || [],
    disclaimer: d.disclaimer || 'Analytical signals do not constitute proof of fraud or misconduct. Final assessment requires authorized human investigation.',
  };
}

export function normalizeAlerts(al) {
  if (!Array.isArray(al)) return [];
  return al.map((a, i) => ({
    id: a.id || `AL-${2000 + i}`,
    severity: a.severity || 'HIGH',
    category: a.category || 'Potential Irregularity',
    title: a.title || 'Analytical Alert',
    workId: a.workId || a.id,
    state: a.state || '',
    district: a.district || '',
    description: a.description || '',
    signal: a.signal || 'Anomaly detected',
    recommendedAction: a.recommendedAction || 'Requires review',
    timestamp: a.timestamp || new Date().toISOString(),
    confidence: typeof a.confidence === 'number' ? (a.confidence <= 1 ? Math.round(a.confidence * 100) : a.confidence) : 85,
  }));
}

// ==================== ENDPOINT FACADES ====================

// ---------- Command Center ----------
export async function getSummary() {
  try {
    const res = await apiClient.get('/summary');
    return normalizeSummary(res.data);
  } catch (err) {
    logFallback('/summary', err);
    return { ...mockData.summary };
  }
}

export async function getRiskTrend() {
  try {
    const res = await apiClient.get('/analytics');
    if (res.data?.riskTrend && res.data.riskTrend.length > 0) {
      return res.data.riskTrend;
    }
  } catch (err) {
    logFallback('/analytics (riskTrend)', err);
  }
  return mockData.riskTrend;
}

export async function getExpenditureTrend() {
  try {
    const res = await apiClient.get('/analytics');
    if (res.data?.expenditureTrend && res.data.expenditureTrend.length > 0) {
      return res.data.expenditureTrend;
    }
  } catch (err) {
    logFallback('/analytics (expenditureTrend)', err);
  }
  return mockData.expenditureTrend;
}

export async function getStateAggregates() {
  try {
    const res = await apiClient.get('/states');
    return res.data;
  } catch (err) {
    logFallback('/states', err);
    return mockData.stateAggregates;
  }
}

export async function getStateByCode(code) {
  const states = await getStateAggregates();
  return states.find((s) => s.code === code) || null;
}

export async function getFilterOptions() {
  try {
    const res = await apiClient.get('/filters');
    return res.data;
  } catch (err) {
    logFallback('/filters', err);
    return {
      states: mockData.STATES.map((s) => ({ code: s.code, name: s.name })),
      districts: [...new Set(mockData.getAllWorks().map((w) => w.district))].sort(),
      categories: [...new Set(mockData.getAllWorks().map((w) => w.category))].sort(),
      agencies: mockData.AGENCIES.slice().sort(),
      riskTiers: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    };
  }
}

// ---------- Works / Risk Monitor (filter + sort + paginate) ----------
export async function getRisk(params = {}) {
  try {
    const res = await apiClient.get('/risk', { params });
    return {
      ...res.data,
      rows: (res.data.rows || []).map(normalizeWork),
    };
  } catch (err) {
    logFallback('/risk', err);
    return queryWorksFallback(params);
  }
}

export async function queryWorks(params = {}) {
  try {
    const res = await apiClient.get('/works', { params });
    return {
      ...res.data,
      rows: (res.data.rows || []).map(normalizeWork),
    };
  } catch (err) {
    logFallback('/works', err);
    return queryWorksFallback(params);
  }
}

export const getRiskWorks = queryWorks;

// ==================== AUTHENTICATION ====================

export async function login(username, password) {
  try {
    const res = await apiClient.post('/auth/login', { username, password });
    return res.data;
  } catch (err) {
    if (err.response) {
      const status = err.response.status;
      const detail = err.response.data?.detail;

      if (status === 401) {
        throw new Error(typeof detail === 'string' ? detail : 'Invalid username or password.');
      }
      if (status === 403) {
        throw new Error('You are not authorized to access this account or scope.');
      }
      if (status === 404) {
        throw new Error('Authentication service endpoint was not found. Please check the backend configuration.');
      }
      if (status === 422) {
        throw new Error('The login request was invalid. Please try again.');
      }
      if (status === 500) {
        throw new Error('The authentication service encountered a server error. Please try again.');
      }
      if (status === 502 || status === 503 || status === 504) {
        throw new Error('The backend is temporarily unavailable. Please try again in a moment.');
      }
      throw new Error(typeof detail === 'string' ? detail : `Authentication request failed with status ${status}.`);
    }

    if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) {
      throw new Error('The backend is taking longer than expected to respond. Please try again shortly.');
    }

    throw new Error('Unable to reach the authentication service. Please check the deployment configuration or try again.');
  }
}

export async function getCurrentUser() {
  try {
    const res = await apiClient.get('/auth/me');
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) {
      return null;
    }
    // For network errors or server downtime, throw so caller can distinguish from 401 session expiration
    throw err;
  }
}

export async function logout() {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // Ignore error
  }
}

// ---------- Work Investigation ----------
export async function getWorkDetail(id) {
  try {
    const res = await apiClient.get(`/works/${id}`);
    return normalizeWork(res.data);
  } catch (err) {
    if (err.response?.status === 403) {
      throw new Error(err.response?.data?.detail || 'Access forbidden: Work is outside your authorized jurisdiction.');
    }
    logFallback(`/works/${id}`, err);
    return getWorkDetailFallback(id);
  }
}

// ---------- Analytics ----------
export async function getAnalytics() {
  try {
    const res = await apiClient.get('/analytics');
    return normalizeAnalytics(res.data);
  } catch (err) {
    logFallback('/analytics', err);
    return getAnalyticsFallback();
  }
}

// ---------- Alerts ----------
export async function getAlerts() {
  try {
    const res = await apiClient.get('/alerts');
    return normalizeAlerts(res.data);
  } catch (err) {
    logFallback('/alerts', err);
    return getAlertsFallback();
  }
}

// ---------- Compare two works ----------
export async function getComparison(idA, idB) {
  try {
    const res = await apiClient.get(`/compare/${idA}/${idB}`);
    return {
      ...res.data,
      a: normalizeWork(res.data.a),
      b: normalizeWork(res.data.b),
    };
  } catch (err) {
    if (err.response?.status === 403) {
      throw new Error(err.response?.data?.detail || 'Access forbidden: One or both works are outside your authorized jurisdiction.');
    }
    logFallback(`/compare/${idA}/${idB}`, err);
    return getComparisonFallback(idA, idB);
  }
}

// ---------- Districts and Agencies ----------
export async function getDistricts() {
  try {
    const res = await apiClient.get('/districts');
    return res.data;
  } catch (err) {
    logFallback('/districts', err);
    return mockData.districtAggregates;
  }
}

export async function getAgencies() {
  try {
    const res = await apiClient.get('/agencies');
    return (res.data || []).map(normalizeAgency);
  } catch (err) {
    logFallback('/agencies', err);
    return mockData.agencyAggregates.map(normalizeAgency);
  }
}

export async function getAgencyById(id) {
  const list = await getAgencies();
  return list.find((a) => a.id === id || a.name === id) || null;
}

// ---------- Duplicates ----------
export async function getDuplicates(limit = 50) {
  try {
    const res = await apiClient.get('/duplicates', { params: { limit } });
    return res.data;
  } catch (err) {
    logFallback('/duplicates', err);
    const dups = mockData.getAllWorks().filter((w) => w.duplicateCandidate).slice(0, limit);
    return dups.map((w, i) => {
      const next = dups[(i + 1) % dups.length] || w;
      return {
        work_a: w.id,
        work_b: next.id,
        similarity_score: 85,
        signals: {
          description_similarity: 82.0,
          location_match: w.state === next.state,
          same_district: w.district === next.district,
          category_match: w.category === next.category,
          agency_match: w.agency === next.agency,
          cost_similarity: 88.0,
        },
        classification: 'POTENTIAL_DUPLICATE',
      };
    });
  }
}

// ---------- Export (all filtered rows, no pagination) ----------
export async function getWorksForExport(filters = {}) {
  try {
    const res = await apiClient.get('/works', {
      params: { ...filters, page: 1, pageSize: 10000 },
    });
    return (res.data.rows || []).map(normalizeWork);
  } catch (err) {
    logFallback('/works (export)', err);
    const fallbackRes = queryWorksFallback({ ...filters, page: 1, pageSize: 100000 });
    return fallbackRes.rows;
  }
}

// ==================== MOCK FALLBACK IMPLEMENTATIONS ====================

function queryWorksFallback({
  search = '', state = 'ALL', district = 'ALL', category = 'ALL', agency = 'ALL',
  riskLevel = 'ALL', minScore = 0, maxScore = 100,
  sortBy = 'riskScore', sortDir = 'desc', page = 1, pageSize = 12,
} = {}) {
  let list = mockData.getAllWorks();
  const q = search.trim().toLowerCase();
  if (q) {
    list = list.filter((w) =>
      w.id.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q) ||
      w.state.toLowerCase().includes(q) ||
      w.district.toLowerCase().includes(q) ||
      w.agency.toLowerCase().includes(q) ||
      w.category.toLowerCase().includes(q));
  }
  if (state !== 'ALL') list = list.filter((w) => w.stateCode === state || w.state === state);
  if (district !== 'ALL') list = list.filter((w) => w.district === district);
  if (category !== 'ALL') list = list.filter((w) => w.category === category);
  if (agency !== 'ALL') list = list.filter((w) => w.agency === agency);
  if (riskLevel !== 'ALL') list = list.filter((w) => w.riskTier === riskLevel);
  list = list.filter((w) => w.riskScore >= minScore && w.riskScore <= maxScore);

  const dir = sortDir === 'asc' ? 1 : -1;
  list = [...list].sort((a, b) => {
    const av = a[sortBy]; const bv = b[sortBy];
    if (typeof av === 'string') return av.localeCompare(bv) * dir;
    return (av - bv) * dir;
  });

  const total = list.length;
  const start = (page - 1) * pageSize;
  const rows = list.slice(start, start + pageSize).map(normalizeWork);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

function getWorkDetailFallback(id) {
  const w = mockData.getWorkById(id);
  if (!w) return null;
  const breakdown = mockData.buildBreakdown(w);
  const similar = mockData.getSimilarWorks(w, 3);
  const median = Math.round(w.expenditure / (1 + w.costDeviation / 100));
  return normalizeWork({
    ...w,
    breakdown,
    similar,
    financials: {
      estimatedCost: w.estimatedCost,
      sanctionedAmount: w.sanctionedAmount,
      expenditure: w.expenditure,
      utilization: w.utilization,
      costDeviation: w.costDeviation,
      historicalMedian: median,
    },
  });
}

function getAnalyticsFallback() {
  const cats = mockData.categoryAggregates.map((c) => c.category);
  const heatmap = mockData.stateAggregates.slice(0, 12).map((s) => {
    const row = { state: s.name };
    cats.forEach((c) => { row[c] = 55 + Math.round((s.avgRisk + c.length * 3) % 45); });
    return row;
  });

  return normalizeAnalytics({
    states: mockData.stateAggregates,
    categories: mockData.categoryAggregates,
    agencies: mockData.agencyAggregates,
    utilizationHeatmap: heatmap,
    efficiency: mockData.categoryAggregates.map((c) => ({
      category: c.category,
      expected: 270,
      actual: 270 + Math.round((c.avgRisk / 100) * 160),
    })),
    riskTrend: mockData.riskTrend,
    expenditureTrend: mockData.expenditureTrend,
  });
}

function getAlertsFallback() {
  const highRisk = mockData.getAllWorks()
    .filter((w) => w.riskTier === 'CRITICAL' || w.riskTier === 'HIGH')
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 40);
  const now = Date.now();
  const alerts = highRisk.map((w, i) => {
    return {
      id: `AL-${2000 + i}`,
      severity: w.riskTier,
      category: w.primarySignal.includes('Cost') ? 'Cost Anomaly' : w.primarySignal.includes('delay') ? 'Delay' : 'Potential Duplicate',
      title: `Flagged ${w.primarySignal}`,
      workId: w.id,
      state: w.state,
      district: w.district,
      description: `${w.id} in ${w.district} flagged for ${w.primarySignal.toLowerCase()}; risk score ${w.riskScore}/100.`,
      signal: w.primarySignal,
      recommendedAction: 'Verify physical progress and documentation',
      timestamp: new Date(now - i * 1000 * 60 * (7 + (i % 11))).toISOString(),
      confidence: Math.min(96, 74 + (w.riskScore % 22)),
    };
  });
  return normalizeAlerts(alerts);
}

const STOP = new Set(['of', 'at', 'and', 'the', 'for', 'with', 'to', 'a', 'in', 'on', 'construction', 'works', 'work']);
function tokenize(s) {
  return new Set(
    String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}
function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  a.forEach((x) => { if (b.has(x)) inter++; });
  return inter / (a.size + b.size - inter);
}

function getComparisonFallback(idA, idB) {
  const a = mockData.getWorkById(idA);
  const b = mockData.getWorkById(idB);
  if (!a || !b) return null;

  const descOverlap = Math.round(jaccard(tokenize(a.description), tokenize(b.description)) * 100);
  const costDelta = Math.round((Math.abs(a.sanctionedAmount - b.sanctionedAmount) / Math.max(a.sanctionedAmount, b.sanctionedAmount)) * 100);
  const costMatch = costDelta <= 15;
  const sameState = a.state === b.state;
  const sameDistrict = a.district === b.district;
  const sameCategory = a.category === b.category;
  const sameAgency = a.agency === b.agency;

  const attributes = [
    { key: 'Category', a: a.category, b: b.category, match: sameCategory },
    { key: 'State', a: a.state, b: b.state, match: sameState },
    { key: 'District', a: a.district, b: b.district, match: sameDistrict },
    { key: 'Implementing Agency', a: a.agency, b: b.agency, match: sameAgency },
    { key: 'Sanctioned Amount', a: a.sanctionedAmount, b: b.sanctionedAmount, match: costMatch, money: true, note: `${costDelta}% apart` },
    { key: 'Expenditure', a: a.expenditure, b: b.expenditure, match: Math.abs(a.expenditure - b.expenditure) / Math.max(a.expenditure, b.expenditure) <= 0.15, money: true },
    { key: 'Description overlap', a: a.description, b: b.description, match: descOverlap >= 40, note: `${descOverlap}% token overlap`, desc: true },
  ];

  const similarity = Math.round(Math.min(98,
    (sameCategory ? 22 : 0) + (sameState ? 16 : 0) + (sameDistrict ? 14 : 0) +
    (sameAgency ? 10 : 0) + (costMatch ? 18 : Math.max(0, 18 - costDelta / 4)) + descOverlap * 0.25));

  const matches = attributes.filter((x) => x.match).map((x) => x.key);
  return { a: normalizeWork(a), b: normalizeWork(b), attributes, similarity, descOverlap, costDelta, matches };
}

export { tierForScore };

