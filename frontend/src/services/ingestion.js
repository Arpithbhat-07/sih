// Client-side MPLADS CSV ingestion: parse a real CSV, validate the schema, and
// re-score every row using the same analytical heuristics used across Sentinel.
import { tierForScore } from '../data/constants';

export const REQUIRED_COLUMNS = ['work_id', 'sanctioned_amount', 'expenditure'];

export const EXPECTED_COLUMNS = [
  'work_id', 'description', 'state', 'district', 'agency', 'category',
  'estimated_cost', 'sanctioned_amount', 'expenditure', 'expected_days', 'actual_days',
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
    (byCat[c] = byCat[c] || []).push(num(r.sanctioned_amount));
  });
  const catMedian = {};
  Object.entries(byCat).forEach(([c, arr]) => { catMedian[c] = median(arr) || 1; });

  return rows.map((r, i) => {
    const sanctioned = num(r.sanctioned_amount);
    const expenditure = num(r.expenditure);
    const estimated = num(r.estimated_cost) || Math.round(sanctioned * 0.92);
    const expected = num(r.expected_days) || 270;
    const actual = num(r.actual_days) || expected;
    const cat = (r.category || 'Other').trim() || 'Other';
    const baseline = catMedian[cat] || sanctioned || 1;

    const utilization = sanctioned ? Math.round((expenditure / sanctioned) * 1000) / 10 : 0;
    const costDeviation = Math.round(((sanctioned - baseline) / baseline) * 100);
    const delayDays = Math.max(0, actual - expected);

    const costScore = Math.min(35, Math.max(0, costDeviation) * 0.5);
    const expScore = Math.min(25, Math.max(0, utilization - 100) * 0.9);
    const delayScore = Math.min(25, delayDays / 4);
    const complianceGap = (!r.state || !r.district || !sanctioned) ? 8 : 0;
    const riskScore = Math.max(0, Math.min(100, Math.round(costScore + expScore + delayScore + complianceGap)));

    const signals = [];
    if (costDeviation > 40) signals.push('Cost anomaly');
    if (utilization > 115) signals.push('Expenditure anomaly');
    if (delayDays > 0) signals.push('Project delay');
    if (complianceGap) signals.push('Missing/invalid data');
    if (!signals.length) signals.push('Within expected pattern');

    return {
      id: (r.work_id || `ROW-${i + 1}`).trim(),
      description: r.description || '—',
      state: r.state || '—',
      district: r.district || '—',
      agency: r.agency || '—',
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
  const missing = REQUIRED_COLUMNS.filter((c) => !parsed.headers.includes(c));
  return { ok: missing.length === 0 && parsed.rows.length > 0, missing, count: parsed.rows.length };
}

export const SAMPLE_CSV = `work_id,description,state,district,agency,category,estimated_cost,sanctioned_amount,expenditure,expected_days,actual_days
W-90001,Construction of CC road with side drains,Karnataka,Bengaluru Urban,Meridian Infra Works,Road Construction,2100000,2300000,2450000,270,300
W-90002,Construction of community health sub-centre,Tamil Nadu,Chennai,Setu Public Works Division,Health,1400000,4200000,6100000,240,420
W-90003,Installation of community RO water plant,Maharashtra,Pune,Sujal Water Works Cell,Water & Sanitation,1600000,1650000,980000,210,215
W-90004,Construction of additional classrooms at Govt School,Uttar Pradesh,Lucknow,Vikas Engineering Corp,Education,850000,3100000,4700000,240,410
W-90005,Development of village playground,Kerala,Ernakulam,Prerna Civil Works Unit,Sports,900000,950000,720000,180,185
W-90006,Construction of public toilet block,Bihar,Patna,Disha Municipal Works,Public Amenities,700000,760000,890000,150,260
`;
