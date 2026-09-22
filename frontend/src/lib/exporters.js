// Real file exporters — CSV downloads and PDF investigation briefs.
import { jsPDF } from 'jspdf';
import { formatINR, formatPct, formatSignedPct, formatDate } from './format';

export function downloadBlob(filename, content, mime = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, columns) {
  const header = columns.map((c) => csvCell(c.label)).join(',');
  const body = rows
    .map((r) => columns.map((c) => csvCell(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

export function downloadCsv(filename, rows, columns) {
  downloadBlob(filename, toCsv(rows, columns), 'text/csv;charset=utf-8;');
}

// ---- Risk Monitor / works export ----
export const WORK_EXPORT_COLUMNS = [
  { key: 'id', label: 'Work ID' },
  { key: 'description', label: 'Description' },
  { key: 'state', label: 'State' },
  { key: 'district', label: 'District' },
  { key: 'constituency', label: 'Constituency' },
  { key: 'agency', label: 'Implementing Agency' },
  { key: 'category', label: 'Category' },
  { key: 'sanctionedAmount', label: 'Sanctioned (INR)' },
  { key: 'expenditure', label: 'Expenditure (INR)' },
  { key: 'utilization', label: 'Utilization %' },
  { key: 'costDeviation', label: 'Cost Deviation %' },
  { key: 'delayDays', label: 'Delay (days)' },
  { key: 'riskScore', label: 'Risk Score' },
  { key: 'riskTier', label: 'Risk Tier' },
  { key: 'primarySignal', label: 'Primary Signal' },
  { key: 'status', label: 'Status' },
];

// ---- Investigation brief PDF ----
export function generateBriefPdf(work) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  const maxW = W - M * 2;
  let y = M;

  const line = (h = 16) => { y += h; if (y > 760) { doc.addPage(); y = M; } };
  const text = (str, size = 10, color = [40, 40, 40], style = 'normal', x = M) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(String(str), maxW - (x - M));
    lines.forEach((ln) => { doc.text(ln, x, y); line(size + 4); });
  };
  const rule = () => { doc.setDrawColor(210); doc.line(M, y, W - M, y); line(12); };
  const kv = (k, v) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(110);
    doc.text(k.toUpperCase(), M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30);
    const lines = doc.splitTextToSize(String(v), maxW - 150);
    doc.text(lines, M + 150, y);
    line(14 + (lines.length - 1) * 12);
  };

  // Header band
  doc.setFillColor(9, 10, 11); doc.rect(0, 0, W, 84, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('MPLADS SENTINEL', M, 40);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(180);
  doc.text('Investigation Brief  ·  AI-assisted decision support', M, 58);
  doc.setTextColor(120); doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleString('en-IN')}  ·  Prototype · SIH 2026`, M, 72);
  y = 110;

  const tier = work.riskTier;
  const tierColor = tier === 'CRITICAL' ? [200, 40, 40] : tier === 'HIGH' ? [200, 110, 30] : tier === 'MEDIUM' ? [170, 140, 20] : [40, 150, 80];
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(20);
  doc.text(work.id, M, y);
  doc.setFontSize(11); doc.setTextColor(tierColor[0], tierColor[1], tierColor[2]);
  doc.text(`RISK ${work.riskScore}/100  ·  ${tier}`, M + 120, y);
  line(20);
  text(work.description, 11, [70, 70, 70]);
  line(4); rule();

  text('WORK INFORMATION', 11, [20, 20, 20], 'bold'); line(2);
  kv('State', work.state);
  kv('District', work.district);
  kv('MP Constituency', work.constituency);
  kv('Implementing Agency', work.agency);
  kv('Category', work.category);
  kv('Sanction Date', formatDate(work.sanctionDate));
  kv('Expected Completion', formatDate(work.expectedCompletion));
  kv('Status', work.status);
  line(4); rule();

  const f = work.financials || work;
  text('FINANCIAL ANALYSIS', 11, [20, 20, 20], 'bold'); line(2);
  kv('Estimated Cost', formatINR(f.estimatedCost));
  kv('Sanctioned Amount', formatINR(f.sanctionedAmount));
  kv('Expenditure', formatINR(f.expenditure));
  kv('Utilization', formatPct(f.utilization, 0));
  kv('Cost Deviation', formatSignedPct(f.costDeviation, 0));
  if (f.historicalMedian) kv('Historical Median', formatINR(f.historicalMedian));
  line(4); rule();

  if (work.findings?.length) {
    text('AI FINDINGS', 11, [20, 20, 20], 'bold'); line(2);
    work.findings.forEach((fd) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30);
      doc.text(`• ${fd.title}  (${fd.severity}, ${fd.confidence}% confidence)`, M, y); line(14);
      text(fd.explanation, 9, [90, 90, 90], 'normal', M + 12);
      text(`Evidence: ${fd.evidence}`, 9, [110, 110, 110], 'italic', M + 12);
      line(2);
    });
    rule();
  }

  text('RECOMMENDED ACTION', 11, [20, 20, 20], 'bold'); line(2);
  text('Recommend detailed financial and procurement review before final closure.', 10, [60, 60, 60]);
  ['Verify technical estimate', 'Compare BOQ and sanctioned estimate', 'Review payment history', 'Verify physical progress', 'Compare similar works', 'Review implementing agency history']
    .forEach((c) => { text(`[ ]  ${c}`, 9, [80, 80, 80], 'normal', M + 12); });
  line(6);
  doc.setDrawColor(230); doc.setFillColor(248, 248, 248);
  const boxY = y; const boxLines = doc.splitTextToSize('Anomaly indicators represent analytical signals and do not constitute proof of fraud or misconduct. Final assessment requires authorized human investigation.', maxW - 20);
  doc.rect(M, boxY, maxW, boxLines.length * 11 + 16, 'FD');
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(110);
  doc.text(boxLines, M + 10, boxY + 14);

  doc.save(`${work.id}-investigation-brief.pdf`);
}
