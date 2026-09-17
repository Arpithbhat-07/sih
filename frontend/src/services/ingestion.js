// Client-side ProcureGuard CSV ingestion: parse a real CSV, validate the schema, and
// re-score every row using the same analytical heuristics.
import { tierForScore } from '../data/constants';

export const REQUIRED_COLUMNS = ['tender_id', 'awarded_value'];

export const EXPECTED_COLUMNS = [
  'tender_id', 'description', 'state', 'district', 'department', 'vendor', 'category',
  'estimated_cost', 'awarded_value', 'disbursed_amount', 'bidder_count', 'expected_days', 'actual_days',
];

// A small, correct CSV parser (handles quoted fields, commas and escaped quotes).
export function parseCsv(text) {
  const rows = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { record.push(field); field = ''; }
    else if (c === '\n') { record.push(field); rows.push(record); field = ''; record = []; }
    else field += c;
  }
  if (field.length || record.length) { record.push(field); rows.push(record); }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ''));
  if (!nonEmpty.length) return { headers: [], rows: [] };
  const headers = nonEmpty[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const objects = nonEmpty.slice(1).map((r) => {
    const o = {};
    headers.forEach((h, idx) => { o[h] = (r[idx] ?? '').trim(); });
    return o;
  });
  return { headers, rows: objects };
}

const num = (v) => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function scoreRows(rows) {
  // category baselines derived from the uploaded data itself
  const byCat = {};
  rows.forEach((r) => {
    const c = (r.category || 'Other').trim() || 'Other';
    const val = num(r.awarded_value || r.sanctioned_amount);
    (byCat[c] = byCat[c] || []).push(val);
  });
  const catMedian = {};
  Object.entries(byCat).forEach(([c, arr]) => { catMedian[c] = median(arr) || 1; });

  return rows.map((r, i) => {
    const sanctioned = num(r.awarded_value || r.sanctioned_amount);
    const expenditure = num(r.disbursed_amount || r.expenditure);
    const estimated = num(r.estimated_cost) || Math.round(sanctioned * 0.92);
    const expected = num(r.expected_days) || 270;
    const actual = num(r.actual_days) || expected;
    const cat = (r.category || 'Other').trim() || 'Other';
    const baseline = catMedian[cat] || sanctioned || 1;
    const bidderCount = num(r.bidder_count) || 3;

    const utilization = sanctioned ? Math.round((expenditure / sanctioned) * 1000) / 10 : 0;
    const costDeviation = Math.round(((sanctioned - baseline) / baseline) * 100);
    const delayDays = Math.max(0, actual - expected);

    const costScore = Math.min(30, Math.max(0, costDeviation) * 0.5);
    const expScore = Math.min(25, Math.max(0, utilization - 100) * 0.9);
    const delayScore = Math.min(25, delayDays / 4);
    const bidScore = bidderCount === 1 ? 15 : bidderCount === 2 ? 8 : 0;
    const complianceGap = (!r.state || !r.district || !sanctioned) ? 5 : 0;

    const riskScore = Math.max(0, Math.min(100, Math.round(costScore + expScore + delayScore + bidScore + complianceGap)));

    const signals = [];
    if (costDeviation > 40) signals.push('Price anomaly');
    if (bidderCount === 1) signals.push('Single-bidder tender');
    if (utilization > 115) signals.push('Disbursement overrun');
    if (delayDays > 0) signals.push('Execution delay');
    if (complianceGap) signals.push('Missing required attributes');
    if (!signals.length) signals.push('Within expected pattern');

    return {
      id: (r.tender_id || r.work_id || `ROW-${i + 1}`).trim(),
      description: r.description || '—',
      state: r.state || '—',
      district: r.district || '—',
      agency: r.vendor || r.department || r.agency || '—',
      category: cat,
      estimatedCost: estimated,
      sanctionedAmount: sanctioned,
      expenditure,
      utilization,
      costDeviation,
      delayDays,
      riskScore,
      riskTier: tierForScore(riskScore),
      primarySignal: signals[0],
      signals,
    };
  });
}

export function validate(parsed) {
  const hasId = parsed.headers.includes('tender_id') || parsed.headers.includes('work_id');
  const hasValue = parsed.headers.includes('awarded_value') || parsed.headers.includes('sanctioned_amount');
  const missing = [];
  if (!hasId) missing.push('tender_id');
  if (!hasValue) missing.push('awarded_value');
  return { ok: missing.length === 0 && parsed.rows.length > 0, missing, count: parsed.rows.length };
}

export const SAMPLE_CSV = `tender_id,description,state,district,department,vendor,category,estimated_cost,awarded_value,disbursed_amount,bidder_count,expected_days,actual_days
TND-2026-09001,Construction of 4-lane Ring Road Corridor,Karnataka,Bengaluru Urban,PWD Infrastructure Cell,V-1042 Enterprise Logistics,Roads & Bridges,21000000,23000000,24500000,4,270,300
TND-2026-09002,Procurement of Digital CT Scanning Equipment,Tamil Nadu,Chennai,State Health Logistics Bureau,V-2187 Apex Healthcare Systems,Healthcare & Medical Supplies,14000000,42000000,61000000,2,240,420
TND-2026-09003,Solar Powered Community RO Treatment Plant,Maharashtra,Pune,Rural Water Supply Division,V-3104 CleanWater Engineering,Water Supply & Sanitation,16000000,16500000,9800000,5,210,215
TND-2026-09004,Primary Education Smart Classroom Computing Labs,Uttar Pradesh,Lucknow,Department of Basic Education,V-1042 Enterprise Logistics,School Infrastructure,8500000,31000000,47000000,1,240,410
TND-2026-09005,State Data Centre Cloud Migration & Cybersecurity,Karnataka,Bengaluru Urban,Centre for e-Governance,V-4412 InfoTech Solutions,IT & Digital Infrastructure,9000000,9500000,7200000,4,180,185
TND-2026-09006,Municipal Solid Waste Composting & Biogas Facility,Bihar,Patna,Urban Development Authority,V-1983 EcoClean Systems,Urban Development & Smart Cities,7000000,7600000,8900000,3,150,260
`;
