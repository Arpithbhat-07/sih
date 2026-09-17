// Domain constants for ProcureGuard.

export const RISK_TIERS = {
  CRITICAL: { key: 'CRITICAL', label: 'Critical', min: 80, max: 100, color: '#F15252', bg: 'rgba(241,82,82,0.10)', border: 'rgba(241,82,82,0.28)', dot: '#F15252' },
  HIGH: { key: 'HIGH', label: 'High', min: 60, max: 79, color: '#F59638', bg: 'rgba(245,150,56,0.10)', border: 'rgba(245,150,56,0.28)', dot: '#F59638' },
  MEDIUM: { key: 'MEDIUM', label: 'Medium', min: 30, max: 59, color: '#F3D35E', bg: 'rgba(243,211,94,0.10)', border: 'rgba(243,211,94,0.28)', dot: '#F3D35E' },
  LOW: { key: 'LOW', label: 'Low', min: 0, max: 29, color: '#52C47E', bg: 'rgba(82,196,126,0.10)', border: 'rgba(82,196,126,0.28)', dot: '#52C47E' },
};

export const TIER_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export function tierForScore(score) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

export const CATEGORIES = [
  'Education',
  'Health',
  'Road Construction',
  'Water & Sanitation',
  'Community Infrastructure',
  'Public Amenities',
  'Sports',
  'Other',
];

export const SIGNAL_TYPES = [
  'Cost anomaly',
  'Expenditure anomaly',
  'Project delay',
  'Potential duplicate work',
  'Agency concentration',
  'Unusual payment pattern',
  'Progress mismatch',
  'Missing/invalid data',
  'Compliance deviation',
  'Geographic clustering',
];

export const WORK_STATUSES = ['In Progress', 'Completed', 'Delayed', 'Stalled'];

export const INVESTIGATION_STATUSES = ['New', 'Under Review', 'Investigation', 'Resolved', 'Dismissed'];

export const INVESTIGATION_STATUS_META = {
  New: { color: '#4D8CFF', bg: 'rgba(77,140,255,0.10)', border: 'rgba(77,140,255,0.28)' },
  'Under Review': { color: '#F3D35E', bg: 'rgba(243,211,94,0.10)', border: 'rgba(243,211,94,0.28)' },
  Investigation: { color: '#F59638', bg: 'rgba(245,150,56,0.10)', border: 'rgba(245,150,56,0.28)' },
  Resolved: { color: '#52C47E', bg: 'rgba(82,196,126,0.10)', border: 'rgba(82,196,126,0.28)' },
  Dismissed: { color: '#737987', bg: 'rgba(115,121,135,0.10)', border: 'rgba(115,121,135,0.28)' },
};

export const ALERT_CATEGORIES = [
  'Cost Anomaly',
  'Delay',
  'Potential Duplicate',
  'Agency Pattern',
  'Compliance',
  'Fund Utilization',
];

export const FISCAL_YEAR = 'FY 2025–26';
