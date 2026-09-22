// Formatting helpers for the MPLADS Sentinel UI.

// Indian grouping for plain integers, e.g. 1234567 -> "12,34,567"
export function formatIndianNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const num = Math.round(n);
  const str = Math.abs(num).toString();
  if (str.length <= 3) return (num < 0 ? '-' : '') + str;
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const withCommas = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  return (num < 0 ? '-' : '') + withCommas;
}

// Rupee amount (input in rupees) -> "₹8.4 L" / "₹3.2 Cr"
export function formatINR(rupees, { withSymbol = true } = {}) {
  if (rupees === null || rupees === undefined || isNaN(rupees)) return '—';
  const sym = withSymbol ? '₹' : '';
  const abs = Math.abs(rupees);
  if (abs >= 1e7) return `${sym}${(rupees / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sym}${(rupees / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `${sym}${(rupees / 1e3).toFixed(1)} K`;
  return `${sym}${Math.round(rupees)}`;
}

export function formatCr(rupees) {
  if (rupees === null || rupees === undefined || isNaN(rupees)) return '—';
  return `₹${(rupees / 1e7).toFixed(0)} Cr`;
}

export function formatPct(v, digits = 1) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return `${v.toFixed(digits)}%`;
}

export function formatSignedPct(v, digits = 1) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const s = v >= 0 ? '+' : '';
  return `${s}${v.toFixed(digits)}%`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
