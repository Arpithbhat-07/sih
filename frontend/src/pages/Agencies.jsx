import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie,
} from 'recharts';
import { Building2, ArrowLeft, ArrowRight } from 'lucide-react';
import { PageHeader, Crumbs } from '../components/common/PageHeader';
import { Panel, PanelHeader } from '../components/common/Panel';
import { RiskBadge } from '../components/common/RiskBadge';
import { Loader, EmptyState } from '../components/common/States';
import { CHART } from '../components/common/chartTheme';
import { RISK_TIERS, TIER_ORDER } from '../data/constants';
import { formatCr, formatINR, formatPct } from '../lib/format';
import * as api from '../services/api';

const riskColor = (r) => (r >= 55 ? '#F15252' : r >= 40 ? '#F59638' : r >= 28 ? '#F3D35E' : '#52C47E');

export default function Agencies() {
  const { id } = useParams();
  if (id) return <AgencyDetail id={id} />;
  return <AgencyList />;
}

function AgencyList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  useEffect(() => { api.getAgencies().then(setRows); }, []);
  if (!rows) return <Loader label="Analyzing procurement vendors…" />;

  return (
    <div className="space-y-5">
      <PageHeader title="Vendor & Agency Intelligence" subtitle="Behavioral profiling, win rates, and anomaly detection across suppliers and contractors." testId="agencies-page" />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-header border-y border-hairline text-[#737987] text-[11px] uppercase tracking-wider">
                {['Vendor / Agency', 'Tenders Won', 'Total Value', 'Avg Value', 'Avg Risk', 'Delay %', 'Anomaly Rate', ''].map((h, i) => <th key={i} className="text-left font-medium px-4 py-2.5">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} onClick={() => navigate(`/agencies/${a.id}`)} className="border-b border-divider hover:bg-surface-hover cursor-pointer transition-colors" data-testid={`agency-row-${a.id}`}>
                  <td className="px-4 py-3 text-xs text-[#EDEDED] flex items-center gap-2"><Building2 size={14} className="text-[#737987]" />{a.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#A0A5B0]">{a.projects}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#A0A5B0]">{formatCr(a.value)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#A0A5B0]">{formatINR(a.avgCost)}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: riskColor(a.avgRisk) }}>{a.avgRisk}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#A0A5B0]">{formatPct(a.delayPct, 1)}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: a.anomalyRate > 25 ? '#F59638' : '#A0A5B0' }}>{formatPct(a.anomalyRate, 1)}</td>
                  <td className="px-4 py-3 text-right"><ArrowRight size={13} className="text-brand inline" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function AgencyDetail({ id }) {
  const navigate = useNavigate();
  const [agency, setAgency] = useState(null);
  const [works, setWorks] = useState([]);

  useEffect(() => {
    api.getAgencyById(id).then((a) => {
      setAgency(a || false);
      if (a) {
        api.queryWorks({ agency: a.name, pageSize: 50 }).then((res) => {
          setWorks(res?.rows || []);
        });
      }
    });
  }, [id]);

  if (agency === null) return <Loader />;
  if (!agency) return <EmptyState icon={Building2} title="Agency not found" />;

  const dist = TIER_ORDER.map((k) => ({ name: RISK_TIERS[k].label, value: agency.counts[k], color: RISK_TIERS[k].color }));
  const catData = Object.values(works.reduce((m, w) => {
    m[w.category] = m[w.category] || { category: w.category, works: 0 };
    m[w.category].works++;
    return m;
  }, {}));

  return (
    <div className="space-y-6">
      <Crumbs items={[{ label: 'Vendors', to: '/agencies' }, { label: agency.name }]} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/agencies')} className="mt-1 w-8 h-8 rounded-md border border-hairline bg-surface flex items-center justify-center text-[#A0A5B0] hover:text-[#EDEDED] transition-colors"><ArrowLeft size={16} /></button>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#737987]">Vendor Intelligence</div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#EDEDED]">{agency.name}</h1>
            <p className="text-sm text-[#A0A5B0] mt-1 font-mono">{agency.id} · {agency.projects} tenders won · {formatCr(agency.value)} total awarded value</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/relationships')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-[#16191E] border border-hairline hover:border-brand text-[#EDEDED] transition-colors"
        >
          View in Procurement Network →
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Average Risk" value={agency.avgRisk} accent={riskColor(agency.avgRisk)} />
        <Stat label="Average Tender Value" value={formatINR(agency.avgCost)} />
        <Stat label="Delay Rate" value={formatPct(agency.delayPct, 1)} accent="#F59638" />
        <Stat label="Anomaly Rate" value={formatPct(agency.anomalyRate, 1)} accent="#F15252" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel>
          <PanelHeader title="Risk Distribution" subtitle="Tenders by risk tier" />
          <div className="p-5 flex items-center gap-6">
            <div className="w-[150px] h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dist} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
                    {dist.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={CHART.tooltip.contentStyle} itemStyle={CHART.tooltip.itemStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {dist.map((d) => (
                <div key={d.name} className="flex items-center justify-between py-1 border-b border-divider last:border-0">
                  <span className="flex items-center gap-2 text-xs text-[#A0A5B0]"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} />{d.name}</span>
                  <span className="font-mono text-sm font-semibold" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Sector Distribution" subtitle="Tenders by category" />
          <div className="p-4 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData} margin={{ top: 8, right: 8, left: -14, bottom: 30 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" tick={{ ...CHART.axisTick, fontSize: 9 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} interval={0} />
                <YAxis tick={CHART.axisTick} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={CHART.tooltip.contentStyle} itemStyle={CHART.tooltip.itemStyle} cursor={CHART.tooltip.cursor} />
                <Bar dataKey="works" fill="#4D8CFF" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="High-Priority Tenders" subtitle={`Top flagged tenders awarded to ${agency.name}`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-header border-y border-hairline text-[#737987] text-[11px] uppercase tracking-wider">
                {['Risk', 'Tender ID', 'Description', 'District', 'Score', ''].map((h, i) => <th key={i} className="text-left font-medium px-4 py-2.5">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {works.slice(0, 8).map((w) => (
                <tr key={w.id} onClick={() => navigate(`/works/${w.id}`)} className="border-b border-divider hover:bg-surface-hover cursor-pointer transition-colors">
                  <td className="px-4 py-2.5"><RiskBadge tier={w.riskTier} /></td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#EDEDED]">{w.id}</td>
                  <td className="px-4 py-2.5 text-xs text-[#A0A5B0] max-w-[280px] truncate">{w.description}</td>
                  <td className="px-4 py-2.5 text-xs text-[#A0A5B0]">{w.district}</td>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold" style={{ color: RISK_TIERS[w.riskTier].color }}>{w.riskScore}</td>
                  <td className="px-4 py-2.5 text-right"><ArrowRight size={13} className="text-brand inline" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

const Stat = ({ label, value, accent = '#EDEDED' }) => (
  <div className="bg-surface border border-hairline rounded-lg p-4">
    <div className="text-[10px] uppercase tracking-wider text-[#737987]">{label}</div>
    <div className="font-mono text-xl font-semibold mt-1 tabular-nums" style={{ color: accent }}>{value}</div>
  </div>
);
