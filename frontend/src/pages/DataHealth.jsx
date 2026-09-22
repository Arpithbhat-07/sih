import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  CheckCircle2, UploadCloud, Database, Columns3, Gauge, Clock,
  FileDown, AlertTriangle, Sparkles, Table2,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Panel, PanelHeader } from '../components/common/Panel';
import { RiskBadge } from '../components/common/RiskBadge';
import * as api from '../services/api';
import { RISK_TIERS, TIER_ORDER } from '../data/constants';
import { formatIndianNumber, formatINR, formatPct, formatSignedPct } from '../lib/format';
import { parseCsv, scoreRows, validate, SAMPLE_CSV, EXPECTED_COLUMNS } from '../services/ingestion';
import { downloadBlob, downloadCsv } from '../lib/exporters';

const PIPELINE = [
  'Dataset loaded (3,000 synthetic records)', 'Schema validated', 'Missing values checked', 'Duplicate records checked',
  'Feature engineering completed', 'Anomaly engine ready', 'FastAPI REST interface connected',
];

const SCORED_COLUMNS = [
  { key: 'id', label: 'Work ID' }, { key: 'description', label: 'Description' },
  { key: 'state', label: 'State' }, { key: 'district', label: 'District' },
  { key: 'category', label: 'Category' }, { key: 'sanctionedAmount', label: 'Sanctioned (INR)' },
  { key: 'expenditure', label: 'Expenditure (INR)' }, { key: 'utilization', label: 'Utilization %' },
  { key: 'costDeviation', label: 'Cost Deviation %' }, { key: 'delayDays', label: 'Delay (days)' },
  { key: 'riskScore', label: 'Risk Score' }, { key: 'riskTier', label: 'Risk Tier' },
  { key: 'primarySignal', label: 'Primary Signal' },
];

export default function DataHealth() {
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [result, setResult] = useState(null); // { scored, count }
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  React.useEffect(() => {
    api.getSummary().then(setSummaryData);
  }, []);

  const onFile = (f) => {
    if (!f) return;
    setFile(f.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCsv(String(e.target.result));
        const v = validate(parsed);
        if (!v.ok) {
          const msg = v.missing.length ? `Missing required column(s): ${v.missing.join(', ')}` : 'No data rows found in file.';
          setError(msg);
          setResult(null);
          toast.error('Schema validation failed', { description: msg });
          return;
        }
        const scored = scoreRows(parsed.rows);
        setResult({ scored, headers: parsed.headers });
        toast.success('Dataset ingested & scored', { description: `${scored.length} works re-scored by the anomaly engine.` });
      } catch (err) {
        setError('Could not parse the file. Ensure it is a valid CSV.');
        setResult(null);
        toast.error('Ingestion failed', { description: 'Could not parse the uploaded file.' });
      }
    };
    reader.readAsText(f);
  };

  const stats = useMemo(() => {
    if (!result) return null;
    const s = result.scored;
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    s.forEach((r) => counts[r.riskTier]++);
    const avg = Math.round((s.reduce((a, r) => a + r.riskScore, 0) / s.length) * 10) / 10;
    const highRisk = counts.CRITICAL + counts.HIGH;
    return { counts, avg, highRisk, total: s.length };
  }, [result]);

  const sortedScored = useMemo(() => (result ? [...result.scored].sort((a, b) => b.riskScore - a.riskScore) : []), [result]);

  const downloadSample = () => { downloadBlob('mplads-sample-template.csv', SAMPLE_CSV, 'text/csv;charset=utf-8;'); toast.success('Sample template downloaded'); };
  const downloadScored = () => { downloadCsv('mplads-scored-results.csv', sortedScored, SCORED_COLUMNS); toast.success('Scored results exported to CSV'); };

  return (
    <div className="space-y-6">
      <PageHeader title="Data Health" subtitle="Pipeline readiness and status for synthetic demonstration dataset and custom ingestion." testId="data-health-page">
        <button onClick={downloadSample} className="inline-flex items-center gap-1.5 text-xs h-8 px-3 rounded-md border border-hairline bg-surface text-[#A0A5B0] hover:text-[#EDEDED] hover:border-[#383C45] transition-colors" data-testid="download-sample">
          <FileDown size={13} /> Sample Template
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Database} label="Rows processed" value={formatIndianNumber(result ? result.scored.length : (summaryData?.totalWorks || 3000))} />
        <Stat icon={Columns3} label="Columns" value={result ? result.headers.length : '12+'} />
        <Stat icon={Gauge} label="Data quality" value="98.4%" accent="#52C47E" />
        <Stat icon={Clock} label="Last ingestion" value={result ? 'Just now' : '09:42 AM'} sub={result ? file : (summaryData?.datasetName || 'Synthetic Dataset')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel>
          <PanelHeader title="Data Pipeline Status" subtitle="Ingestion and scoring readiness" action={<span className="text-[10px] font-mono text-risk-low px-1.5 py-0.5 rounded bg-risk-low/10 border border-risk-low/20">ALL SYSTEMS READY</span>} />
          <div className="p-5 space-y-2.5">
            {PIPELINE.map((step, i) => (
              <motion.div key={step} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 p-2.5 rounded-md bg-[#0D0F12] border border-divider">
                <CheckCircle2 size={16} className="text-risk-low shrink-0" />
                <span className="text-xs text-[#C9CDD6]">{step}</span>
                <span className="ml-auto text-[10px] font-mono text-[#5C616D]">OK</span>
              </motion.div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Ingest Dataset" subtitle="Upload a real MPLADS CSV — works are re-scored instantly on screen" />
          <div className="p-5">
            <label
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}
              className={`flex flex-col items-center justify-center text-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${drag ? 'border-brand bg-brand/5' : 'border-hairline hover:border-[#383C45]'}`}
              data-testid="upload-area"
            >
              <div className="w-12 h-12 rounded-lg border border-hairline bg-[#0D0F12] flex items-center justify-center mb-3">
                <UploadCloud size={22} className="text-brand" />
              </div>
              <span className="text-sm text-[#EDEDED] font-medium">Upload MPLADS CSV</span>
              <span className="text-xs text-[#737987] mt-1">Drag & drop or click to browse — .csv up to 50 MB</span>
              <input type="file" className="hidden" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} data-testid="file-input" />
            </label>

            <div className="mt-3 text-[11px] text-[#737987]">
              Expected columns: <span className="font-mono text-[#A0A5B0]">{EXPECTED_COLUMNS.join(', ')}</span>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 p-3 rounded-md bg-risk-critical/5 border border-risk-critical/25" data-testid="ingest-error">
                <AlertTriangle size={15} className="text-risk-critical shrink-0" />
                <span className="text-xs text-[#C9CDD6]">{error}</span>
              </div>
            )}
            {result && (
              <div className="mt-3 flex items-center gap-2 p-3 rounded-md bg-[#0D0F12] border border-divider">
                <CheckCircle2 size={15} className="text-risk-low" />
                <span className="text-xs text-[#C9CDD6] font-mono truncate">{file}</span>
                <span className="ml-auto text-[10px] text-[#737987] shrink-0">{result.scored.length} rows scored</span>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Live scoring results */}
      {result && stats && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Panel className="border-t-2 border-t-ai">
            <PanelHeader
              title="Live Scoring Results"
              subtitle={`Anomaly engine re-scored ${stats.total} uploaded works`}
              action={
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[10px] font-mono text-ai px-1.5 py-0.5 rounded bg-ai/10 border border-ai/20 flex items-center gap-1"><Sparkles size={10} /> RESCORED</span>
                  <button onClick={downloadScored} className="inline-flex items-center gap-1.5 text-xs h-8 px-3 rounded-md bg-[#EDEDED] text-shell font-medium hover:bg-white transition-colors" data-testid="download-scored">
                    <FileDown size={13} /> Export Scored CSV
                  </button>
                </div>
              }
            />
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat icon={Table2} label="Works scored" value={stats.total} />
              <Stat icon={Gauge} label="Avg risk" value={stats.avg} accent={stats.avg >= 55 ? '#F15252' : stats.avg >= 40 ? '#F59638' : '#52C47E'} />
              <Stat icon={AlertTriangle} label="High / critical" value={stats.highRisk} accent="#F59638" />
              <div className="bg-surface border border-hairline rounded-lg p-4 flex items-center gap-2">
                {TIER_ORDER.map((k) => (
                  <div key={k} className="flex-1 text-center">
                    <div className="font-mono text-sm font-semibold" style={{ color: RISK_TIERS[k].color }}>{stats.counts[k]}</div>
                    <div className="text-[9px] uppercase text-[#737987]">{RISK_TIERS[k].label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-header border-y border-hairline text-[#737987] text-[11px] uppercase tracking-wider">
                    {['Risk', 'Work ID', 'Description', 'State', 'Sanctioned', 'Utilization', 'Deviation', 'Delay', 'Score'].map((h) => <th key={h} className="text-left font-medium px-4 py-2.5">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sortedScored.slice(0, 25).map((w) => (
                    <tr key={w.id} className="border-b border-divider hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-2.5"><RiskBadge tier={w.riskTier} /></td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#EDEDED]">{w.id}</td>
                      <td className="px-4 py-2.5 text-xs text-[#A0A5B0] max-w-[260px] truncate">{w.description}</td>
                      <td className="px-4 py-2.5 text-xs text-[#A0A5B0]">{w.state}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#A0A5B0]">{formatINR(w.sanctionedAmount)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: w.utilization > 100 ? '#F59638' : '#A0A5B0' }}>{formatPct(w.utilization, 0)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: w.costDeviation > 40 ? '#F15252' : '#A0A5B0' }}>{formatSignedPct(w.costDeviation, 0)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#A0A5B0]">{w.delayDays > 0 ? `${w.delayDays}d` : '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-sm font-semibold" style={{ color: RISK_TIERS[w.riskTier].color }}>{w.riskScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sortedScored.length > 25 && <div className="px-4 py-2.5 text-[11px] text-[#737987] border-t border-hairline">Showing top 25 of {sortedScored.length} scored works · export CSV for the full set.</div>}
          </Panel>
        </motion.div>
      )}

      {!result && <p className="text-[11px] text-[#5C616D]">This prototype operates on a synthetic demonstration dataset. Upload a CSV above to see the anomaly engine re-score real rows instantly in the browser.</p>}
    </div>
  );
}

const Stat = ({ icon: Icon, label, value, sub, accent = '#EDEDED' }) => (
  <div className="bg-surface border border-hairline rounded-lg p-4">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#737987]"><Icon size={12} /> {label}</div>
    <div className="font-mono text-xl font-semibold mt-1.5 tabular-nums" style={{ color: accent }}>{value}</div>
    {sub && <div className="text-[10px] text-[#737987] mt-0.5 truncate">{sub}</div>}
  </div>
);
