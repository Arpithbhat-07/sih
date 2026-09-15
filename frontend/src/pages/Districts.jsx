import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Panel } from '../components/common/Panel';
import { Loader } from '../components/common/States';
import * as api from '../services/api';
import { formatCr, formatPct } from '../lib/format';

const riskColor = (r) => (r >= 55 ? '#F15252' : r >= 40 ? '#F59638' : r >= 28 ? '#F3D35E' : '#52C47E');

const COLS = [
  { key: 'district', label: 'District', type: 'str' },
  { key: 'state', label: 'State', type: 'str' },
  { key: 'works', label: 'Works', type: 'num' },
  { key: 'sanctioned', label: 'Sanctioned', type: 'num', fmt: formatCr },
  { key: 'utilization', label: 'Utilization', type: 'num', fmt: (v) => formatPct(v, 0) },
  { key: 'avgRisk', label: 'Avg Risk', type: 'num', risk: true },
  { key: 'delayed', label: 'Delayed', type: 'num' },
  { key: 'alerts', label: 'Alerts', type: 'num' },
];

export default function Districts() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ by: 'avgRisk', dir: 'desc' });

  useEffect(() => { api.getDistricts().then(setRows); }, []);

  const view = useMemo(() => {
    if (!rows) return [];
    let list = rows;
    const term = q.trim().toLowerCase();
    if (term) list = list.filter((d) => d.district.toLowerCase().includes(term) || d.state.toLowerCase().includes(term));
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => (typeof a[sort.by] === 'string' ? a[sort.by].localeCompare(b[sort.by]) * dir : (a[sort.by] - b[sort.by]) * dir));
  }, [rows, q, sort]);

  if (!rows) return <Loader label="Aggregating district monitoring…" />;
  const onSort = (k) => setSort((s) => ({ by: k, dir: s.by === k && s.dir === 'desc' ? 'asc' : 'desc' }));

  return (
    <div className="space-y-5">
      <PageHeader title="District Monitoring" subtitle="District-level implementation and risk overview." testId="districts-page">
        <div className="flex items-center gap-2 h-8 px-2.5 rounded-md bg-[#0D0F12] border border-hairline focus-within:border-brand">
          <Search size={13} className="text-[#737987]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search district…" className="bg-transparent text-xs text-[#EDEDED] placeholder:text-[#5C616D] outline-none w-40" data-testid="district-search" />
        </div>
      </PageHeader>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-header border-y border-hairline text-[#737987] text-[11px] uppercase tracking-wider">
                {COLS.map((c) => (
                  <th key={c.key} className="text-left font-medium px-4 py-2.5 whitespace-nowrap">
                    <button onClick={() => onSort(c.key)} className="inline-flex items-center gap-1 hover:text-[#EDEDED] transition-colors">
                      {c.label}
                      {sort.by === c.key ? (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-40" />}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.map((d) => (
                <tr key={`${d.district}-${d.state}`} onClick={() => navigate(`/risk?state=${d.stateCode}`)} className="border-b border-divider hover:bg-surface-hover cursor-pointer transition-colors">
                  <td className="px-4 py-2.5 text-xs text-[#EDEDED]">{d.district}</td>
                  <td className="px-4 py-2.5 text-xs text-[#A0A5B0]">{d.state}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#A0A5B0]">{d.works}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#A0A5B0]">{formatCr(d.sanctioned)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#A0A5B0]">{formatPct(d.utilization, 0)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold" style={{ color: riskColor(d.avgRisk) }}>{d.avgRisk}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[#A0A5B0]">{d.delayed}</td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: d.alerts > 20 ? '#F59638' : '#A0A5B0' }}>{d.alerts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
