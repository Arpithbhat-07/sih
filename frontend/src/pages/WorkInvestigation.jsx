import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import {
  ArrowLeft, FileText, Building2, MapPin, Calendar, CircleCheck, Plus,
  AlertTriangle, Copy, ArrowRight, ShieldCheck, TrendingUp, Info, Clock,
} from 'lucide-react';
import { Crumbs } from '../components/common/PageHeader';
import { Panel, PanelHeader } from '../components/common/Panel';
import { RadialScore } from '../components/common/RadialScore';
import { RiskBadge } from '../components/common/RiskBadge';
import { Loader, EmptyState } from '../components/common/States';
import { CHART } from '../components/common/chartTheme';
import { RISK_TIERS } from '../data/constants';
import { formatINR, formatPct, formatSignedPct, formatDate } from '../lib/format';
import * as api from '../services/api';
import { addToQueue, isQueued } from '../services/investigationStore';
import { generateBriefPdf } from '../lib/exporters';

const CHECKLIST = [
  'Verify technical estimate',
  'Compare BOQ and sanctioned estimate',
  'Review payment history',
  'Verify physical progress',
  'Compare similar works',
  'Review implementing agency history',
];

const sevColor = (s) => (RISK_TIERS[s] || RISK_TIERS.LOW).color;

export default function WorkInvestigation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [work, setWork] = useState(undefined);
  const [checked, setChecked] = useState({});
  const [queued, setQueued] = useState(false);

  useEffect(() => {
    setWork(undefined);
    api.getWorkDetail(id).then((w) => { setWork(w); if (w) setQueued(isQueued(w.id)); });
  }, [id]);

  if (work === undefined) return <Loader label="Assembling investigation dossier…" />;
  if (!work) return <EmptyState icon={AlertTriangle} title="Work not found" message={`No record for ${id} in the current dataset.`} />;

  const t = RISK_TIERS[work.riskTier];
  const compare = [
    { name: 'Historical median', value: work.financials.historicalMedian, color: '#2A3550' },
    { name: 'This project', value: work.financials.expenditure, color: t.color },
  ];
  const addQueue = () => {
    const { added } = addToQueue(work);
    setQueued(true);
    toast[added ? 'success' : 'info'](added ? 'Added to Investigation Queue' : 'Already in Investigation Queue', {
      description: `${work.id} · ${work.riskTier} risk · assigned as ${work.riskTier === 'CRITICAL' ? 'P1' : 'P2'}`,
    });
  };

  const genBrief = () => {
    generateBriefPdf(work);
    toast.success('Investigation brief generated.', { description: `PDF for ${work.id} downloaded.` });
  };

  return (
    <div className="space-y-6" data-testid="work-investigation-page">
      <Crumbs items={[{ label: 'Risk Monitor', to: '/risk' }, { label: 'Work Investigation' }, { label: work.id }]} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="mt-1 w-8 h-8 rounded-md border border-hairline bg-surface flex items-center justify-center text-[#A0A5B0] hover:text-[#EDEDED] hover:border-[#383C45] transition-colors" data-testid="back-button">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#737987]">Work Investigation</div>
            <div className="flex items-center gap-3 mt-0.5">
              <h1 className="text-2xl font-semibold tracking-tight font-mono text-[#EDEDED]">{work.id}</h1>
              <RiskBadge tier={work.riskTier} dot />
            </div>
            <p className="text-sm text-[#A0A5B0] mt-1 max-w-2xl">{work.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={genBrief} className="inline-flex items-center gap-1.5 text-xs h-9 px-3 rounded-md border border-hairline bg-surface text-[#A0A5B0] hover:text-[#EDEDED] hover:border-[#383C45] transition-colors" data-testid="generate-brief">
            <FileText size={14} /> Generate Brief
          </button>
          <button onClick={addQueue} disabled={queued} className="inline-flex items-center gap-1.5 text-xs h-9 px-3.5 rounded-md bg-[#EDEDED] text-shell font-medium hover:bg-white transition-colors disabled:opacity-50" data-testid="add-to-queue">
            {queued ? <><CircleCheck size={14} /> In Queue</> : <><Plus size={14} /> Add to Investigation Queue</>}
          </button>
        </div>
      </div>

      {/* Score hero + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-4 flex flex-col items-center justify-center p-6">
          <RadialScore score={work.riskScore} size={200} />
          <p className="text-xs text-[#A0A5B0] text-center mt-4 max-w-[220px]">High priority — detailed review recommended before final closure.</p>
        </Panel>

        <Panel className="lg:col-span-8">
          <PanelHeader title="Risk Score Breakdown" subtitle="Component contribution to the composite score" />
          <div className="p-5 space-y-4">
            {work.breakdown.map((b, i) => (
              <motion.div key={b.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[#C9CDD6]">{b.key}</span>
                  <span className="font-mono text-xs text-[#A0A5B0]"><span className="text-[#EDEDED] font-semibold">{b.value}</span> / {b.max}</span>
                </div>
                <div className="h-2 rounded-full bg-[#1E2126] overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: b.value / b.max > 0.75 ? '#F15252' : b.value / b.max > 0.5 ? '#F59638' : '#4D8CFF' }}
                    initial={{ width: 0 }} animate={{ width: `${(b.value / b.max) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.06 }} />
                </div>
              </motion.div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Work info + Financial */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-5">
          <PanelHeader title="Work Information" subtitle="Investigation dossier" />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            <Info2 icon={FileText} label="Work Description" value={work.description} full />
            <Info2 icon={MapPin} label="State" value={work.state} />
            <Info2 icon={MapPin} label="District" value={work.district} />
            <Info2 icon={MapPin} label="MP Constituency" value={work.constituency} />
            <Info2 icon={Building2} label="Implementing Agency" value={work.agency} />
            <Info2 icon={FileText} label="Work Category" value={work.category} />
            <Info2 icon={Calendar} label="Sanction Date" value={formatDate(work.sanctionDate)} />
            <Info2 icon={Calendar} label="Expected Completion" value={formatDate(work.expectedCompletion)} />
            <Info2 icon={Calendar} label="Actual Completion" value={work.actualCompletion ? formatDate(work.actualCompletion) : 'Ongoing'} />
            <Info2 icon={Clock} label="Status" value={work.status} />
          </div>
        </Panel>

        <Panel className="lg:col-span-7">
          <PanelHeader title="Financial Analysis" subtitle="Cost, sanction and expenditure comparison" />
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              <Metric label="Estimated Cost" value={formatINR(work.financials.estimatedCost)} />
              <Metric label="Sanctioned Amount" value={formatINR(work.financials.sanctionedAmount)} />
              <Metric label="Expenditure" value={formatINR(work.financials.expenditure)} />
              <Metric label="Utilization" value={formatPct(work.financials.utilization, 0)} accent={work.financials.utilization > 100 ? '#F15252' : '#52C47E'} />
              <Metric label="Cost Deviation" value={formatSignedPct(work.financials.costDeviation, 0)} accent={work.financials.costDeviation > 40 ? '#F15252' : '#F59638'} />
              <Metric label="Historical Median" value={formatINR(work.financials.historicalMedian)} />
            </div>
            <div className="text-[11px] uppercase tracking-wider text-[#737987] mb-2">Similar Projects vs This Project</div>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compare} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                  <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={CHART.axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => formatINR(v, { withSymbol: false })} />
                  <YAxis type="category" dataKey="name" tick={{ ...CHART.axisTick, fontFamily: 'IBM Plex Sans' }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip contentStyle={CHART.tooltip.contentStyle} itemStyle={CHART.tooltip.itemStyle} cursor={CHART.tooltip.cursor} formatter={(v) => formatINR(v)} />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={26}>
                    {compare.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Panel>
      </div>

      {/* Timeline */}
      <Panel>
        <PanelHeader title="Project Timeline" subtitle={work.delayed ? `Delay of ${work.delayDays} days detected` : 'Execution proceeding within expected window'} />
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <Metric label="Expected Duration" value={`${work.expectedDays} days`} />
            <Metric label="Actual Duration" value={`${work.actualDays} days`} accent={work.delayed ? '#F59638' : '#52C47E'} />
            <Metric label="Delay" value={work.delayDays > 0 ? `${work.delayDays} days` : 'On schedule'} accent={work.delayDays > 0 ? '#F15252' : '#52C47E'} />
          </div>
          <div className="relative pl-6 border-l-2 border-hairline ml-2 space-y-4">
            {work.timeline.map((step, i) => (
              <motion.div key={step.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="relative">
                <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{ background: '#121417', borderColor: step.delayed ? '#F15252' : step.expected ? '#F59638' : '#4D8CFF' }}>
                  {step.done && <span className="w-1.5 h-1.5 rounded-full" style={{ background: step.delayed ? '#F15252' : step.expected ? '#F59638' : '#4D8CFF' }} />}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#EDEDED]">{step.key}</span>
                  <span className="font-mono text-[11px] text-[#737987]">{formatDate(step.date)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Panel>

      {/* AI Findings */}
      <Panel>
        <PanelHeader title="AI Findings" subtitle="Analytical signals with supporting evidence and confidence" action={<span className="text-[10px] font-mono text-ai px-1.5 py-0.5 rounded bg-ai/10 border border-ai/20">SENTINEL ENGINE</span>} />
        <div className="p-5 grid grid-cols-1 gap-3">
          {work.findings.map((f, i) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="rounded-md border border-divider bg-[#0D0F12] p-4" style={{ borderLeft: `2px solid ${sevColor(f.severity)}` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: sevColor(f.severity) }} />
                  <h4 className="text-sm font-semibold text-[#EDEDED]">{f.title}</h4>
                  <RiskBadge tier={f.severity} />
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-[#737987] uppercase tracking-wider">Confidence</div>
                  <div className="font-mono text-sm font-semibold" style={{ color: sevColor(f.severity) }}>{f.confidence}%</div>
                </div>
              </div>
              <p className="text-[13px] text-[#C9CDD6] mt-2 leading-relaxed">{f.explanation}</p>
              <div className="mt-3 flex items-center gap-2 text-[11px]">
                <span className="text-[#737987]">Evidence:</span>
                <span className="font-mono px-2 py-0.5 rounded bg-[#16191E] border border-divider text-[#EDEDED]">{f.evidence}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* Duplicates */}
      <Panel>
        <PanelHeader title="Potential Duplicate / Similar Works" subtitle="Works sharing strong attribute similarity" />
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {work.similar.map((s) => (
            <div key={s.id} className="rounded-md border border-divider bg-[#0D0F12] p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-[#EDEDED]">{s.id}</span>
                <div className="flex items-center gap-1.5">
                  <Copy size={12} className="text-[#737987]" />
                  <span className="font-mono text-sm font-semibold" style={{ color: s.similarity > 88 ? '#F15252' : s.similarity > 75 ? '#F59638' : '#F3D35E' }}>{s.similarity}%</span>
                </div>
              </div>
              <p className="text-[12px] text-[#A0A5B0] leading-snug flex-1">{s.description}</p>
              <div className="flex flex-wrap gap-1 mt-2.5 mb-3">
                {['Location', 'Category', 'Cost range'].map((a) => <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-[#16191E] border border-divider text-[#737987]">{a}</span>)}
              </div>
              <button onClick={() => navigate(`/compare/${work.id}/${s.id}`)} className="text-xs text-brand hover:text-white transition-colors inline-flex items-center gap-1" data-testid={`compare-${s.id}`}>Compare Works <ArrowRight size={12} /></button>
            </div>
          ))}
        </div>
      </Panel>

      {/* Recommended action */}
      <div className="bg-surface border border-hairline border-t-2 border-t-brand rounded-lg p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-md bg-brand/10 border border-brand/30 flex items-center justify-center shrink-0"><ShieldCheck size={17} className="text-brand" /></div>
          <div>
            <h3 className="text-sm font-semibold text-[#EDEDED]">Recommended Action</h3>
            <p className="text-[13px] text-[#C9CDD6] mt-1">Recommend detailed financial and procurement review before final closure.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {CHECKLIST.map((item, i) => (
            <button key={i} onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))} className="flex items-center gap-2.5 p-2.5 rounded-md border border-divider bg-[#0D0F12] hover:border-[#383C45] transition-colors text-left" data-testid={`checklist-${i}`}>
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked[i] ? 'bg-brand border-brand' : 'border-[#383C45]'}`}>
                {checked[i] && <CircleCheck size={12} className="text-shell" />}
              </span>
              <span className={`text-xs ${checked[i] ? 'text-[#5C616D] line-through' : 'text-[#C9CDD6]'}`}>{item}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addQueue} disabled={queued} className="inline-flex items-center gap-1.5 text-xs h-9 px-4 rounded-md bg-[#EDEDED] text-shell font-medium hover:bg-white transition-colors disabled:opacity-50">
            {queued ? <><CircleCheck size={14} /> In Queue</> : <><Plus size={14} /> Add to Investigation Queue</>}
          </button>
          <button onClick={() => navigate('/ai')} className="inline-flex items-center gap-1.5 text-xs h-9 px-3 rounded-md border border-hairline bg-surface text-[#A0A5B0] hover:text-[#EDEDED] hover:border-[#383C45] transition-colors">
            Ask Sentinel AI <ArrowRight size={13} />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-[#5C616D] flex items-center gap-1.5 justify-center pt-1">
        <Info size={12} /> Anomaly indicators represent analytical signals and do not constitute proof of fraud or misconduct. Final assessment requires authorized human investigation.
      </p>
    </div>
  );
}

const Info2 = ({ icon: Icon, label, value, full }) => (
  <div className={full ? 'sm:col-span-2' : ''}>
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#737987] mb-1"><Icon size={11} /> {label}</div>
    <div className="text-[13px] text-[#EDEDED]">{value}</div>
  </div>
);

const Metric = ({ label, value, accent = '#EDEDED' }) => (
  <div className="rounded-md border border-divider bg-[#0D0F12] p-3">
    <div className="text-[10px] uppercase tracking-wider text-[#737987]">{label}</div>
    <div className="font-mono text-lg font-semibold mt-1 tabular-nums" style={{ color: accent }}>{value}</div>
  </div>
);
