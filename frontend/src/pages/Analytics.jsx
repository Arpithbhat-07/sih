import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ScatterChart, Scatter, ZAxis, ComposedChart, Line,
} from 'recharts';
import { PageHeader } from '../components/common/PageHeader';
import { Panel, PanelHeader } from '../components/common/Panel';
import { Loader } from '../components/common/States';
import { CHART } from '../components/common/chartTheme';
import { RISK_TIERS } from '../data/constants';
import { formatCr, formatINR, formatPct } from '../lib/format';
import * as api from '../services/api';

const riskColor = (r) => (r >= 55 ? '#F15252' : r >= 40 ? '#F59638' : r >= 28 ? '#F3D35E' : '#52C47E');
const heatColor = (v) => {
  if (v >= 90) return 'rgba(241,82,82,0.85)';
  if (v >= 80) return 'rgba(245,150,56,0.75)';
  if (v >= 70) return 'rgba(243,211,94,0.6)';
  if (v >= 60) return 'rgba(82,196,126,0.5)';
  return 'rgba(82,196,126,0.28)';
};

export default function Analytics() {
  const [d, setD] = useState(null);
  useEffect(() => { api.getAnalytics().then(setD); }, []);
  if (!d) return <Loader label="Compiling programme analytics…" />;

  const cats = d.categories.map((c) => c.category);

  return (
    <div className="space-y-6">
      <PageHeader title="Programme Analytics" subtitle="Identify trends, inefficiencies and structural patterns across MPLADS implementation." testId="analytics-page" />

      {/* State performance */}
      <Panel>
        <PanelHeader title="State Performance" subtitle="Financial and risk posture by state" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-header border-y border-hairline text-[#737987] text-[11px] uppercase tracking-wider">
                {['State', 'Works', 'Sanctioned', 'Expenditure', 'Utilization', 'Avg Risk', 'Delayed %'].map((h) => <th key={h} className="text-left font-medium px-4 py-2.5">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {d.states.map((s) => (
                <tr key={s.code} className="border-b border-divider hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-2.5 text-xs text-[#EDEDED] flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full" style={{ background: RISK_TIERS[s.riskTier].color }} />{s.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#A0A5B0]">{s.works}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#A0A5B0]">{formatCr(s.sanctioned)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#A0A5B0]">{formatCr(s.expenditure)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: s.utilization > 90 ? '#F59638' : '#A0A5B0' }}>{formatPct(s.utilization, 0)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold" style={{ color: riskColor(s.avgRisk) }}>{s.avgRisk}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#A0A5B0]">{formatPct((s.delayed / s.works) * 100, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category analysis */}
        <Panel>
          <PanelHeader title="Category Analysis" subtitle="Works and average risk by category" />
          <div className="p-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.categories} margin={{ top: 8, right: 8, left: -14, bottom: 40 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" tick={{ ...CHART.axisTick, fontFamily: 'IBM Plex Sans' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={60} interval={0} />
                <YAxis tick={CHART.axisTick} axisLine={false} tickLine={false} width={44} />
                <Tooltip contentStyle={CHART.tooltip.contentStyle} labelStyle={CHART.tooltip.labelStyle} itemStyle={CHART.tooltip.itemStyle} cursor={CHART.tooltip.cursor} />
                <Bar dataKey="works" radius={[2, 2, 0, 0]} name="Works">
                  {d.categories.map((c, i) => <Cell key={i} fill={riskColor(c.avgRisk)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Agency scatter */}
        <Panel>
          <PanelHeader title="Agency Performance" subtitle="Avg cost vs avg risk (bubble = works)" />
          <div className="p-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 12, left: -6, bottom: 4 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="avgCost" name="Avg cost" tick={CHART.axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => formatINR(v, { withSymbol: false })} />
                <YAxis type="number" dataKey="avgRisk" name="Avg risk" tick={CHART.axisTick} axisLine={false} tickLine={false} width={38} domain={[0, 100]} />
                <ZAxis type="number" dataKey="projects" range={[40, 400]} />
                <Tooltip contentStyle={CHART.tooltip.contentStyle} itemStyle={CHART.tooltip.itemStyle} cursor={{ strokeDasharray: '3 3', stroke: '#383C45' }}
                  formatter={(v, n) => (n === 'Avg cost' ? formatINR(v) : v)}
                  labelFormatter={() => ''} />
                <Scatter data={d.agencies} name="Agencies">
                  {d.agencies.map((a, i) => <Cell key={i} fill={riskColor(a.avgRisk)} fillOpacity={0.7} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Completion efficiency */}
      <Panel>
        <PanelHeader title="Completion Efficiency" subtitle="Expected vs actual duration by category (days)" />
        <div className="p-4 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={d.efficiency} margin={{ top: 8, right: 8, left: -14, bottom: 40 }}>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" tick={{ ...CHART.axisTick, fontFamily: 'IBM Plex Sans' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={60} interval={0} />
              <YAxis tick={CHART.axisTick} axisLine={false} tickLine={false} width={44} />
              <Tooltip contentStyle={CHART.tooltip.contentStyle} labelStyle={CHART.tooltip.labelStyle} itemStyle={CHART.tooltip.itemStyle} cursor={CHART.tooltip.cursor} />
              <Bar dataKey="expected" fill="#2A3550" radius={[2, 2, 0, 0]} name="Expected" barSize={22} />
              <Line type="monotone" dataKey="actual" stroke="#F59638" strokeWidth={2} dot={{ r: 3, fill: '#F59638' }} name="Actual" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Fund utilization heatmap */}
      <Panel>
        <PanelHeader title="Fund Utilization Heatmap" subtitle="Utilization % across State × Category" />
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-xs border-separate" style={{ borderSpacing: '3px' }}>
            <thead>
              <tr>
                <th className="text-left text-[10px] uppercase tracking-wider text-[#737987] px-2 py-1 font-medium">State</th>
                {cats.map((c) => <th key={c} className="text-[10px] text-[#737987] px-1 py-1 font-medium min-w-[64px]">{c.split(' ')[0]}</th>)}
              </tr>
            </thead>
            <tbody>
              {d.utilizationHeatmap.map((row) => (
                <tr key={row.state}>
                  <td className="text-xs text-[#A0A5B0] px-2 py-1 whitespace-nowrap">{row.state}</td>
                  {cats.map((c) => (
                    <td key={c} className="text-center rounded" style={{ background: heatColor(row[c]) }}>
                      <span className="font-mono text-[11px] text-[#0A0B0C] font-semibold">{row[c]}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
