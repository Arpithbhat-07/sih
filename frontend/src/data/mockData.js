// Synthetic demonstration dataset for MPLADS Sentinel.
// Deterministically generated so the demo is stable across reloads.
// This module produces works, and derived state / district / agency / category
// aggregates plus time-series used across the UI.

import { CATEGORIES, tierForScore } from './constants';

// ---- deterministic RNG ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260426);
const rand = (min, max) => min + rng() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

// ---- geography (synthetic-safe: real place names, synthetic works) ----
export const STATES = [
  { code: 'IN-UP', name: 'Uttar Pradesh', weight: 14, districts: ['Lucknow', 'Kanpur Nagar', 'Varanasi', 'Prayagraj', 'Gorakhpur', 'Meerut'] },
  { code: 'IN-MH', name: 'Maharashtra', weight: 12, districts: ['Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane', 'Solapur'] },
  { code: 'IN-KA', name: 'Karnataka', weight: 10, districts: ['Bengaluru Urban', 'Mysuru', 'Belagavi', 'Kalaburagi', 'Tumakuru'] },
  { code: 'IN-TN', name: 'Tamil Nadu', weight: 10, districts: ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'] },
  { code: 'IN-WB', name: 'West Bengal', weight: 9, districts: ['Kolkata', 'Howrah', 'Darjeeling', 'Murshidabad', 'Bardhaman'] },
  { code: 'IN-BR', name: 'Bihar', weight: 8, districts: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga'] },
  { code: 'IN-RJ', name: 'Rajasthan', weight: 7, districts: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner'] },
  { code: 'IN-GJ', name: 'Gujarat', weight: 7, districts: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar'] },
  { code: 'IN-MP', name: 'Madhya Pradesh', weight: 7, districts: ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain'] },
  { code: 'IN-TG', name: 'Telangana', weight: 5, districts: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'] },
  { code: 'IN-AP', name: 'Andhra Pradesh', weight: 5, districts: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati'] },
  { code: 'IN-KL', name: 'Kerala', weight: 5, districts: ['Thiruvananthapuram', 'Ernakulam', 'Kozhikode', 'Thrissur'] },
  { code: 'IN-PB', name: 'Punjab', weight: 4, districts: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'] },
  { code: 'IN-OR', name: 'Odisha', weight: 4, districts: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Sambalpur'] },
  { code: 'IN-HR', name: 'Haryana', weight: 4, districts: ['Gurugram', 'Faridabad', 'Hisar', 'Panipat'] },
  { code: 'IN-AS', name: 'Assam', weight: 3, districts: ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat'] },
  { code: 'IN-JH', name: 'Jharkhand', weight: 3, districts: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'] },
  { code: 'IN-CT', name: 'Chhattisgarh', weight: 3, districts: ['Raipur', 'Bilaspur', 'Durg', 'Korba'] },
  { code: 'IN-UT', name: 'Uttarakhand', weight: 2, districts: ['Dehradun', 'Haridwar', 'Nainital'] },
  { code: 'IN-DL', name: 'Delhi', weight: 2, districts: ['New Delhi', 'North Delhi', 'South Delhi'] },
];

export const AGENCIES = [
  'Meridian Infra Works', 'Sankalp Rural Development Corp', 'Pragati Construction Cell',
  'Aarambh Engineering Board', 'Nirman Urban Works Agency', 'Setu Public Works Division',
  'Unnati Infra Solutions', 'Disha Municipal Works', 'Sahyog Development Trust',
  'Prerna Civil Works Unit', 'Aadhar Works Agency', 'Vikas Engineering Corp',
  'Samruddhi Infra Board', 'Kaushal Construction Division', 'Utkarsh Rural Agency',
  'Sujal Water Works Cell', 'Gramin Vikas Nigam', 'Chetna Public Amenities Unit',
  'Arth Development Board', 'Nabh Infra Consortium',
];

const LOCALITIES = ['Ward 4', 'Sector 7', 'Block B', 'Phase II', 'Zone 3', 'Gram Panchayat', 'Ward 11', 'New Colony'];

const DESC_TEMPLATES = {
  Education: ['Construction of additional classrooms at Govt. School', 'Provision of smart-classroom and furniture setup', 'Boundary wall construction for school campus', 'Construction of library block at higher secondary school'],
  Health: ['Construction of community health sub-centre', 'Upgradation of PHC ward and medical equipment', 'Construction of ambulance shed and waiting hall', 'Development of maternal care wing at CHC'],
  'Road Construction': ['Construction of CC road with side drains', 'Blacktopping of village approach road', 'Construction of RCC culvert and link road', 'Widening and strengthening of internal roads'],
  'Water & Sanitation': ['Installation of community RO water plant', 'Construction of overhead water tank', 'Drainage and sanitation improvement works', 'Laying of piped water supply network'],
  'Community Infrastructure': ['Construction of community hall / bhavan', 'Development of multipurpose community centre', 'Construction of common facility centre', 'Construction of anganwadi and community shelter'],
  'Public Amenities': ['Construction of public toilet block', 'Installation of solar street lighting', 'Construction of bus shelter and waiting shed', 'Development of public park and pathways'],
  Sports: ['Development of village playground', 'Construction of open gym and sports facility', 'Construction of indoor sports hall', 'Development of multipurpose sports ground'],
  Other: ['Provision of mobility van for local body', 'Installation of public address and CCTV system', 'Miscellaneous local area development works', 'Construction of crematorium shed and pathway'],
};

// baseline sanctioned amount (rupees) medians per category — used for cost deviation
const CATEGORY_BASELINE = {
  Education: 890000,
  Health: 1450000,
  'Road Construction': 2200000,
  'Water & Sanitation': 1650000,
  'Community Infrastructure': 1900000,
  'Public Amenities': 720000,
  Sports: 980000,
  Other: 640000,
};

// ---- weighted state pool ----
const statePool = [];
STATES.forEach((s) => { for (let i = 0; i < s.weight; i++) statePool.push(s); });

// ---- tier assignment (exact counts) ----
const TIER_COUNTS = { CRITICAL: 32, HIGH: 115, MEDIUM: 428, LOW: 2425 };
const TOTAL = 3000;
const tierArray = [];
Object.entries(TIER_COUNTS).forEach(([tier, count]) => { for (let i = 0; i < count; i++) tierArray.push(tier); });
// deterministic shuffle
for (let i = tierArray.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [tierArray[i], tierArray[j]] = [tierArray[j], tierArray[i]];
}

const scoreForTier = (tier) => {
  if (tier === 'CRITICAL') return randInt(80, 98);
  if (tier === 'HIGH') return randInt(60, 79);
  if (tier === 'MEDIUM') return randInt(30, 59);
  return randInt(6, 29);
};

const FY_START = new Date('2025-04-01').getTime();
const DAY = 86400000;

function generateWorks() {
  const works = [];
  for (let i = 0; i < TOTAL; i++) {
    const tier = tierArray[i];
    const score = scoreForTier(tier);
    const state = pick(statePool);
    const district = pick(state.districts);
    const category = pick(CATEGORIES);
    const agencyIdx = randInt(0, AGENCIES.length - 1);
    const agency = AGENCIES[agencyIdx];
    const baseline = CATEGORY_BASELINE[category];

    // sanctioned amount around baseline; higher risk skews higher
    const riskMult = tier === 'CRITICAL' ? rand(1.3, 2.1) : tier === 'HIGH' ? rand(1.1, 1.6) : tier === 'MEDIUM' ? rand(0.8, 1.2) : rand(0.55, 1.05);
    const sanctionedAmount = Math.round((baseline * riskMult) / 1000) * 1000;
    const estimatedCost = Math.round((sanctionedAmount * rand(0.82, 1.02)) / 1000) * 1000;

    // expenditure / utilization
    let utilFactor;
    if (tier === 'CRITICAL') utilFactor = rand(1.1, 1.7);
    else if (tier === 'HIGH') utilFactor = rand(0.85, 1.3);
    else if (tier === 'MEDIUM') utilFactor = rand(0.55, 1.05);
    else utilFactor = rand(0.35, 0.95);
    const expenditure = Math.round((sanctionedAmount * utilFactor) / 1000) * 1000;
    const utilization = Math.round((expenditure / sanctionedAmount) * 1000) / 10;
    const costDeviation = Math.round(((sanctionedAmount - baseline) / baseline) * 100);

    const expectedDays = randInt(210, 365);
    const sanctionDate = new Date(FY_START + randInt(0, 300) * DAY);

    works.push({
      id: `W-${10001 + i}`,
      description: `${pick(DESC_TEMPLATES[category])}, ${pick(LOCALITIES)}`,
      state: state.name,
      stateCode: state.code,
      district,
      constituency: `${district} (PC-${randInt(1, 40)})`,
      mp: `Hon'ble MP — ${district} PC`,
      agency,
      category,
      riskScore: score,
      riskTier: tier,
      estimatedCost,
      sanctionedAmount,
      expenditure,
      utilization,
      costDeviation,
      expectedDays,
      sanctionDate: sanctionDate.toISOString(),
      _agencyIdx: agencyIdx,
    });
  }
  return works;
}

const works = generateWorks();

// ---- delayed selection (exactly 312, weighted to higher risk) ----
const delayOrder = works.map((w, i) => ({ i, key: w.riskScore + rng() * 45 })).sort((a, b) => b.key - a.key);
const DELAYED_COUNT = 312;
for (let k = 0; k < works.length; k++) {
  const w = works[delayOrder[k].i];
  if (k < DELAYED_COUNT) {
    w.delayed = true;
    w.delayDays = w.riskTier === 'CRITICAL' ? randInt(90, 190) : w.riskTier === 'HIGH' ? randInt(45, 140) : randInt(20, 90);
  } else {
    w.delayed = false;
    w.delayDays = 0;
  }
}

// ---- duplicate candidate selection (exactly 89) ----
const dupOrder = works.map((w, i) => ({ i, key: w.riskScore + rng() * 60 })).sort((a, b) => b.key - a.key);
const DUP_COUNT = 89;
dupOrder.forEach((o, k) => { works[o.i].duplicateCandidate = k < DUP_COUNT; });

// ---- derive completion dates, status, signals, primary signal ----
works.forEach((w) => {
  const actualDays = w.expectedDays + w.delayDays;
  w.actualDays = actualDays;
  const sanction = new Date(w.sanctionDate).getTime();
  w.expectedCompletion = new Date(sanction + w.expectedDays * DAY).toISOString();

  let status;
  const roll = rng();
  if (w.delayed) status = roll < 0.35 ? 'Stalled' : 'Delayed';
  else if (w.utilization >= 92) status = 'Completed';
  else status = 'In Progress';
  w.status = status;
  w.actualCompletion = status === 'Completed' ? new Date(sanction + actualDays * DAY).toISOString() : null;

  const signals = [];
  if (w.costDeviation > 40) signals.push('Cost anomaly');
  if (w.utilization > 115) signals.push('Expenditure anomaly');
  if (w.delayed) signals.push('Project delay');
  if (w.duplicateCandidate) signals.push('Potential duplicate work');
  if (w._agencyIdx < 4 && w.riskScore > 55) signals.push('Agency concentration');
  if (w.utilization > 100 && w.status !== 'Completed') signals.push('Progress mismatch');
  if (w.riskTier === 'CRITICAL' && rng() < 0.4) signals.push('Unusual payment pattern');
  if (rng() < 0.05) signals.push('Missing/invalid data');
  if (w.riskTier !== 'LOW' && rng() < 0.15) signals.push('Compliance deviation');
  if (signals.length === 0) signals.push('Within expected pattern');
  w.signals = signals;

  // primary signal: pick the most severe present
  const severityRank = ['Cost anomaly', 'Potential duplicate work', 'Expenditure anomaly', 'Project delay', 'Unusual payment pattern', 'Agency concentration', 'Progress mismatch', 'Compliance deviation', 'Missing/invalid data', 'Within expected pattern'];
  w.primarySignal = severityRank.find((s) => signals.includes(s)) || signals[0];
});

// ---- risk score breakdown (for investigation page), derived deterministically ----
export function buildBreakdown(w) {
  const s = w.riskScore;
  const cost = Math.min(35, Math.round((s / 100) * 35 * (w.costDeviation > 40 ? 1.05 : 0.6)));
  const delay = Math.min(25, Math.round((w.delayDays / 190) * 25) || Math.round((s / 100) * 10));
  const duplicate = w.duplicateCandidate ? Math.min(20, Math.round((s / 100) * 20)) : Math.round((s / 100) * 6);
  const agency = w.signals.includes('Agency concentration') ? Math.min(15, Math.round((s / 100) * 15)) : Math.round((s / 100) * 5);
  const compliance = w.signals.includes('Compliance deviation') ? 5 : Math.round((s / 100) * 3);
  return [
    { key: 'Cost anomaly', value: cost, max: 35 },
    { key: 'Delay anomaly', value: delay, max: 25 },
    { key: 'Duplicate similarity', value: duplicate, max: 20 },
    { key: 'Agency anomaly', value: agency, max: 15 },
    { key: 'Compliance', value: compliance, max: 5 },
  ];
}

// ---- aggregates ----
function tierCounts(list) {
  const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  list.forEach((w) => c[w.riskTier]++);
  return c;
}

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export const stateAggregates = STATES.map((s) => {
  const list = works.filter((w) => w.stateCode === s.code);
  const counts = tierCounts(list);
  const sanctioned = list.reduce((a, w) => a + w.sanctionedAmount, 0);
  const expenditure = list.reduce((a, w) => a + w.expenditure, 0);
  const highRisk = counts.CRITICAL + counts.HIGH;
  const avgRisk = list.length ? Math.round((list.reduce((a, w) => a + w.riskScore, 0) / list.length) * 10) / 10 : 0;
  const delayed = list.filter((w) => w.delayed).length;
  return {
    code: s.code, name: s.name, districts: s.districts,
    works: list.length, counts, highRisk, sanctioned, expenditure,
    utilization: sanctioned ? Math.round((expenditure / sanctioned) * 1000) / 10 : 0,
    avgRisk, delayed, highRiskShare: list.length ? highRisk / list.length : 0,
  };
});

// derive a map tier per state by ranking high-risk share -> stable spread
const rankedStates = [...stateAggregates].sort((a, b) => b.highRiskShare - a.highRiskShare);
rankedStates.forEach((s, idx) => {
  let tier;
  if (idx < 2) tier = 'CRITICAL';
  else if (idx < 7) tier = 'HIGH';
  else if (idx < 14) tier = 'MEDIUM';
  else tier = 'LOW';
  const target = stateAggregates.find((x) => x.code === s.code);
  target.riskTier = tier;
});

export const districtAggregates = (() => {
  const map = {};
  works.forEach((w) => {
    const key = `${w.district}|${w.state}`;
    if (!map[key]) map[key] = { district: w.district, state: w.state, stateCode: w.stateCode, works: 0, sanctioned: 0, expenditure: 0, riskSum: 0, delayed: 0, highRisk: 0, alerts: 0 };
    const d = map[key];
    d.works++; d.sanctioned += w.sanctionedAmount; d.expenditure += w.expenditure; d.riskSum += w.riskScore;
    if (w.delayed) d.delayed++;
    if (w.riskTier === 'CRITICAL' || w.riskTier === 'HIGH') { d.highRisk++; d.alerts += w.signals.length; }
  });
  return Object.values(map).map((d) => ({
    ...d,
    avgRisk: Math.round((d.riskSum / d.works) * 10) / 10,
    utilization: Math.round((d.expenditure / d.sanctioned) * 1000) / 10,
  })).sort((a, b) => b.avgRisk - a.avgRisk);
})();

export const agencyAggregates = AGENCIES.map((name, idx) => {
  const list = works.filter((w) => w._agencyIdx === idx);
  const value = list.reduce((a, w) => a + w.sanctionedAmount, 0);
  const avgCost = list.length ? value / list.length : 0;
  const avgRisk = list.length ? Math.round((list.reduce((a, w) => a + w.riskScore, 0) / list.length) * 10) / 10 : 0;
  const delayed = list.filter((w) => w.delayed).length;
  const anomalous = list.filter((w) => w.riskTier === 'CRITICAL' || w.riskTier === 'HIGH').length;
  const counts = tierCounts(list);
  return {
    id: `AG-${100 + idx}`, name, idx,
    projects: list.length, value, avgCost, avgRisk,
    delayPct: list.length ? Math.round((delayed / list.length) * 1000) / 10 : 0,
    anomalyRate: list.length ? Math.round((anomalous / list.length) * 1000) / 10 : 0,
    counts,
  };
}).sort((a, b) => b.avgRisk - a.avgRisk);

export const categoryAggregates = CATEGORIES.map((cat) => {
  const list = works.filter((w) => w.category === cat);
  const sanctioned = list.reduce((a, w) => a + w.sanctionedAmount, 0);
  const avgRisk = list.length ? Math.round((list.reduce((a, w) => a + w.riskScore, 0) / list.length) * 10) / 10 : 0;
  return {
    category: cat, works: list.length, sanctioned, avgRisk,
    medianCost: median(list.map((w) => w.sanctionedAmount)),
    delayed: list.filter((w) => w.delayed).length,
  };
});

// ---- time series ----
const MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
export const riskTrend = MONTHS.map((m, i) => {
  const t = i / 11;
  return {
    month: m,
    critical: Math.round(14 + t * 20 + Math.sin(i) * 3),
    high: Math.round(70 + t * 55 + Math.cos(i) * 8),
    medium: Math.round(360 + t * 90 + Math.sin(i / 2) * 20),
    low: Math.round(2300 + t * 130 + Math.cos(i / 2) * 25),
    riskValue: Math.round(90 + t * 95 + Math.sin(i) * 10),
    expenditure: Math.round(180 + t * 150 + Math.cos(i) * 15),
  };
});

export const expenditureTrend = MONTHS.map((m, i) => {
  const sanctioned = Math.round(300 + i * 30 + Math.sin(i) * 20);
  const spent = Math.round(sanctioned * (0.62 + (i / 11) * 0.16));
  return { month: m, sanctioned, expenditure: spent, utilization: Math.round((spent / sanctioned) * 100) };
});

// ---- global KPI summary ----
const globalCounts = tierCounts(works);
export const summary = {
  totalWorks: works.length,
  totalSanctioned: works.reduce((a, w) => a + w.sanctionedAmount, 0),
  totalExpenditure: works.reduce((a, w) => a + w.expenditure, 0),
  highRiskWorks: globalCounts.CRITICAL + globalCounts.HIGH,
  delayedWorks: works.filter((w) => w.delayed).length,
  duplicateCandidates: works.filter((w) => w.duplicateCandidate).length,
  counts: globalCounts,
};
summary.utilization = Math.round((summary.totalExpenditure / summary.totalSanctioned) * 1000) / 10;

export const works_ = works;
export function getAllWorks() { return works; }
export function getWorkById(id) { return works.find((w) => w.id === id); }

// similar / duplicate works for a given work
export function getSimilarWorks(work, n = 3) {
  return works
    .filter((w) => w.id !== work.id && w.category === work.category)
    .map((w) => {
      const costClose = 1 - Math.min(1, Math.abs(w.sanctionedAmount - work.sanctionedAmount) / work.sanctionedAmount);
      const sameState = w.state === work.state ? 0.3 : 0;
      const sameDistrict = w.district === work.district ? 0.2 : 0;
      const sim = Math.min(0.98, 0.55 + costClose * 0.25 + sameState + sameDistrict + rng() * 0.05);
      return { ...w, similarity: Math.round(sim * 100) };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, n);
}
