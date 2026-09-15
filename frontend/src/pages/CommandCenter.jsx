import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Legend,
} from 'recharts';
import {
  Layers, IndianRupee, ShieldAlert, Clock, Copy, ArrowRight, Sparkles, Info,
} from 'lucide-react';
import { KpiCard } from '../components/common/KpiCard';
import { Panel, PanelHeader } from '../components/common/Panel';
import { RiskBadge } from '../components/common/RiskBadge';
import { IndiaMap } from '../components/common/IndiaMap';
import { Loader } from '../components/common/States';
import { CHART } from '../components/common/chartTheme';
import { RISK_TIERS, TIER_ORDER, FISCAL_YEAR } from '../data/constants';
import { formatCr, formatINR, formatIndianNumber } from '../lib/format';
import * as api from '../services/api';

const DonutLabel = ({ total }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
    <div className="font-mono text-2xl font-semibold text-[#EDEDED] tabular-nums">{formatIndianNumber(total)}</div>
    <div className="text-[11px] text-[#737987]">total works</div>
  </div>
);

const FilterPill = ({ label, value, options, onChange }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none bg-[#0D0F12] border border-hairline rounded-md pl-3 pr-8 h-8 text-xs text-[#EDEDED] hover:border-[#383C45] focus:border-brand outline-none cursor-pointer"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default function CommandCenter() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState([]);
  const [exp, setExp] = useState([]);
  const [states, setStates] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trendMode, setTrendMode] = useState('count');
  const [fy, setFy] = useState(FISCAL_YEAR);
  const [stateF, setStateF] = useState('All States');
  const [catF, setCatF] = useState('All Categories');

  useEffect(() => {
    Promise.all([
      api.getSummary(), api.getRiskTrend(), api.getExpenditureTrend(),
      api.getStateAggregates(), api.getAlerts(),
    ]).then(([s, t, e, st, al]) => {
      setData(s); setTrend(t); setExp(e); setStates(st); setAlerts(al.slice(0, 6));
    });
  }, []);

  if (!data) return <Loader label="Loading national overview…" />;

  const donut = TIER_ORDER.map((k) => ({ name: RISK_TIERS[k].label, value: data.counts[k], color: RISK_TIERS[k].color, key: k }));
  const topStates = [...states].sort((a, b) => b.highRisk - a.highRisk).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-lg border border-hairline bg-surface p-6 md:p-7">
        <div className="absolute right-0 top-0 h-full w-[38%] opacity-[0.06]" style={{ background: 'radial-gradient(circle at 80% 20%, #4D8CFF, transparent 60%)' }} />
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 relative">
          <div>
            <div className="inline-flex items-center gap-2 mb-3 px-2 py-0.5 rounded border border-hairline bg-[#0D0F12] text-[10px] text-[#A0A5B0]">
              <span className="w-1.5 h-1.5 rounded-full bg-ai" /> Synthetic Demonstration Dataset
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#EDEDED]">From thousands of records to prioritized action.</h1>
            <p className="text-sm text-[#A0A5B0] mt-2 max-w-2xl">
              Sentinel continuously analyzes project, financial and execution signals to identify where attention is needed most —
              <span className="text-[#EDEDED]"> we don't replace investigation, we tell authorities where to look first.</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill value={fy} onChange={setFy} options={[FISCAL_YEAR, 'FY 2024–25', 'FY 2023–24']} />
            <FilterPill value={stateF} onChange={setStateF} options={['All States', ...states.map((s) => s.name)]} />
            <FilterPill value={catF} onChange={setCatF} options={['All Categories', 'Education', 'Health', 'Road Construction', 'Water & Sanitation']} />
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard testId="kpi-total-works" label="Total Works" value={data.totalWorks} icon={Layers} trend={4.2} index={0} onClick={() => navigate('/works')} />
        <KpiCard testId="kpi-total-sanctioned" label="Total Sanctioned" value={data.totalSanctioned / 1e7} prefix="₹" suffix=" Cr" decimals={0} icon={IndianRupee} trend={2.8} accent="#8B5CF6" index={1} />
        <KpiCard testId="kpi-high-risk" label="High Risk Works" value={data.highRiskWorks} icon={ShieldAlert} trend={12.4} accent="#F15252" index={2} onClick={() => navigate('/risk?riskLevel=HIGH')} />
        <KpiCard testId="kpi-delayed" label="Delayed Works" value={data.delayedWorks} icon={Clock} trend={6.1} accent="#F59638" index={3} onClick={() => navigate('/risk')} />
        <KpiCard testId="kpi-duplicates" label="Duplicate Candidates" value={data.duplicateCandidates} icon={Copy} trend={-3.4} accent="#F3D35E" index={4} />
      </div>

      {/* Risk overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-5">
          <PanelHeader title="National Risk Overview" subtitle="Distribution of works by risk tier" />
          <div className="p-5 flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-[200px] h-[200px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={68} outerRadius={92} paddingAngle={2} startAngle={90} endAngle={-270} stroke="none">
                    {donut.map((d) => <Cell key={d.key} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={CHART.tooltip.contentStyle} itemStyle={CHART.tooltip.itemStyle} formatter={(v, n) => [formatIndianNumber(v), n]} />
                </PieChart>
              </ResponsiveContainer>
              <DonutLabel total={data.totalWorks} />
            </div>
            <div className="flex-1 w-full space-y-2">
              {donut.map((d) => (
                <div key={d.key} className="flex items-center justify-between py-1.5 border-b border-divider last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs text-[#A0A5B0]">{d.name}</span>
                  </div>
                  <span className="font-mono text-sm font-semibold" style={{ color: d.color }}>{formatIndianNumber(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-7">
          <PanelHeader title="Risk Intelligence" subtitle="System-generated summary of current posture" />
          <div className="p-5 space-y-3">
            {[
              { c: '#F15252', t: `${data.counts.CRITICAL} critical works require immediate review.` },
              { c: '#F59638', t: `${data.counts.HIGH} works exhibit significant anomalies.` },
              { c: '#F3D35E', t: `${formatIndianNumber(data.counts.MEDIUM)} works require monitoring.` },
              { c: '#52C47E', t: `Majority of works (${formatIndianNumber(data.counts.LOW)}) remain within expected patterns.` },
            ].map((r, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-[#0D0F12] border border-divider">
                <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: r.c }} />
                <p className="text-[13px] text-[#C9CDD6]">{r.t}</p>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-[#737987]">
              <Info size={13} /> Indicators are analytical signals, not proof of misconduct.
            </div>
          </div>
        </Panel>
      </div>

      {/* Risk map */}
      <Panel>
        <PanelHeader title="State Risk Intelligence" subtitle="Geographic distribution of implementation risk — hover a state for detail" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5">
          <div className="lg:col-span-7">
            <IndiaMap states={states} />
            <div className="flex items-center justify-center gap-4 mt-2">
              {TIER_ORDER.map((k) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: RISK_TIERS[k].color, opacity: 0.72 }} />
                  <span className="text-[11px] text-[#737987]">{RISK_TIERS[k].label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="text-[11px] uppercase tracking-wider text-[#737987] mb-2">Highest concentration</div>
            <div className="space-y-1.5">
              {topStates.map((s) => (
                <button key={s.code} onClick={() => navigate(`/risk?state=${s.code}`)} className="w-full flex items-center justify-between p-2.5 rounded-md bg-[#0D0F12] border border-divider hover:border-[#383C45] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: RISK_TIERS[s.riskTier].color }} />
                    <div className="text-left">
                      <div className="text-xs text-[#EDEDED] group-hover:text-white">{s.name}</div>
                      <div className="text-[10px] text-[#737987] font-mono">{s.works} works · {formatCr(s.sanctioned)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold" style={{ color: RISK_TIERS[s.riskTier].color }}>{s.highRisk}</div>
                    <div className="text-[10px] text-[#737987]">high-risk</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* Trend + Expenditure */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-7">
          <PanelHeader
            title="Risk Trend — Last 12 Months"
            subtitle="Evolution of risk signals over time"
            action={
              <div className="flex items-center gap-1 bg-[#0D0F12] border border-hairline rounded-md p-0.5">
                {[['count', 'Risk Count'], ['value', 'Risk Value'], ['exp', 'Expenditure']].map(([k, l]) => (
                  <button key={k} onClick={() => setTrendMode(k)} className={`text-[11px] px-2.5 py-1 rounded transition-colors ${trendMode === k ? 'bg-[#1A1D21] text-[#EDEDED]' : 'text-[#737987] hover:text-[#A0A5B0]'}`}>{l}</button>
                ))}
              </div>
            }
          />
          <div className="p-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  {['critical', 'high', 'medium', 'low'].map((k) => (
                    <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.colors[k]} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART.colors[k]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                  <linearGradient id="g-single" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4D8CFF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4D8CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={CHART.axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={CHART.axisTick} axisLine={false} tickLine={false} width={44} />
                <Tooltip contentStyle={CHART.tooltip.contentStyle} labelStyle={CHART.tooltip.labelStyle} itemStyle={CHART.tooltip.itemStyle} cursor={CHART.tooltip.cursor} />
                {trendMode === 'count' && ['critical', 'high', 'medium', 'low'].map((k) => (
                  <Area key={k} type="monotone" dataKey={k} stroke={CHART.colors[k]} strokeWidth={1.6} fill={`url(#g-${k})`} name={k.charAt(0).toUpperCase() + k.slice(1)} />
                ))}
                {trendMode === 'value' && <Area type="monotone" dataKey="riskValue" stroke="#4D8CFF" strokeWidth={1.8} fill="url(#g-single)" name="Risk value (₹ Cr)" />}
                {trendMode === 'exp' && <Area type="monotone" dataKey="expenditure" stroke="#4D8CFF" strokeWidth={1.8} fill="url(#g-single)" name="Expenditure (₹ Cr)" />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="lg:col-span-5">
          <PanelHeader title="Sanctioned vs Expenditure" subtitle="Monthly fund flow (₹ Cr)" />
          <div className="p-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exp} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={CHART.axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={CHART.axisTick} axisLine={false} tickLine={false} width={44} />
                <Tooltip contentStyle={CHART.tooltip.contentStyle} labelStyle={CHART.tooltip.labelStyle} itemStyle={CHART.tooltip.itemStyle} cursor={CHART.tooltip.cursor} />
                <Bar dataKey="sanctioned" fill="#2A3550" radius={[2, 2, 0, 0]} name="Sanctioned" />
                <Bar dataKey="expenditure" fill="#4D8CFF" radius={[2, 2, 0, 0]} name="Expenditure" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mx-4 mb-4 p-3 rounded-md bg-[#0D0F12] border border-divider">
            <p className="text-[12px] text-[#C9CDD6]">National fund utilization is currently <span className="font-mono text-brand font-semibold">{data.utilization}%</span>, with significant variation across districts.</p>
          </div>
        </Panel>
      </div>

      {/* Priority alerts */}
      <Panel>
        <PanelHeader
          title="Priority Alerts"
          subtitle="Highest-priority works flagged for review"
          action={<button onClick={() => navigate('/alerts')} className="text-xs text-brand hover:text-white transition-colors flex items-center gap-1">View all <ArrowRight size={13} /></button>}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-header border-y border-hairline text-[#737987] text-[11px] uppercase tracking-wider">
                <th className="text-left font-medium px-4 py-2.5">Work ID</th>
                <th className="text-left font-medium px-4 py-2.5">Location</th>
                <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">Category</th>
                <th className="text-left font-medium px-4 py-2.5">Risk</th>
                <th className="text-left font-medium px-4 py-2.5 hidden lg:table-cell">Primary Signal</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-right font-medium px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} onClick={() => navigate(`/works/${a.workId}`)} className="border-b border-divider hover:bg-surface-hover cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#EDEDED]">{a.workId}</td>
                  <td className="px-4 py-3 text-xs text-[#A0A5B0]">{a.district}, {a.state}</td>
                  <td className="px-4 py-3 text-xs text-[#A0A5B0] hidden md:table-cell">{a.category}</td>
                  <td className="px-4 py-3"><RiskBadge tier={a.severity} dot /></td>
                  <td className="px-4 py-3 text-xs text-[#A0A5B0] hidden lg:table-cell">{a.signal}</td>
                  <td className="px-4 py-3"><span className="text-[11px] font-mono uppercase text-[#737987]">{a.category}</span></td>
                  <td className="px-4 py-3 text-right"><span className="text-xs text-brand inline-flex items-center gap-1">Investigate <ArrowRight size={12} /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* AI insight */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="bg-surface border border-hairline border-t-2 border-t-ai rounded-lg p-5 shadow-[0_8px_30px_rgba(139,92,246,0.05)]">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-md bg-ai/10 border border-ai/30 flex items-center justify-center shrink-0">
              <Sparkles size={17} className="text-ai" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-[#EDEDED]">Sentinel AI Insight</h3>
                <span className="text-[10px] font-mono text-ai px-1.5 py-0.5 rounded bg-ai/10 border border-ai/20">GENERATED</span>
              </div>
              <p className="text-[13px] text-[#C9CDD6] leading-relaxed max-w-3xl">
                Risk concentration has increased in 3 districts over the last quarter. The strongest contributing signals are
                abnormal project costs, extended completion periods and high agency-level concentration. Prioritized review
                is recommended for the {data.counts.CRITICAL} critical works.
              </p>
              <button onClick={() => navigate('/ai')} className="mt-3 text-xs text-ai hover:text-[#a78bfa] transition-colors inline-flex items-center gap-1">
                View Analysis <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <Disclaimer />
    </div>
  );
}

const Disclaimer = () => (
  <p className="text-[11px] text-[#5C616D] text-center pt-2">
    Anomaly indicators represent analytical signals and do not constitute proof of fraud or misconduct. Final assessment requires authorized human investigation.
  </p>
);
