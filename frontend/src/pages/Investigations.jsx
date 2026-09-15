import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Panel } from '../components/common/Panel';
import { RiskBadge } from '../components/common/RiskBadge';
import { EmptyState } from '../components/common/States';
import { INVESTIGATION_STATUSES, INVESTIGATION_STATUS_META } from '../data/constants';
import { formatDate } from '../lib/format';
import { getQueue, subscribe, updateStatus } from '../services/investigationStore';

const priorityColor = { P1: '#F15252', P2: '#F59638', P3: '#F3D35E' };

export default function Investigations() {
  const navigate = useNavigate();
  const [items, setItems] = useState(getQueue());
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => subscribe(setItems), []);

  const counts = INVESTIGATION_STATUSES.reduce((m, s) => ({ ...m, [s]: items.filter((i) => i.status === s).length }), {});
  const view = statusFilter === 'All' ? items : items.filter((i) => i.status === statusFilter);

  const changeStatus = (id, status) => { updateStatus(id, status); toast.success('Investigation status updated', { description: `${id} → ${status}` }); };

  return (
    <div className="space-y-5">
      <PageHeader title="Investigation Queue" subtitle="Workflow tracking after AI detection — from flagged signal to human resolution." testId="investigations-page" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {INVESTIGATION_STATUSES.map((s) => {
          const meta = INVESTIGATION_STATUS_META[s];
          return (
            <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'All' : s)}
              className={`text-left bg-surface border rounded-lg p-3 transition-colors ${statusFilter === s ? 'border-[#383C45]' : 'border-hairline hover:border-[#383C45]'}`}
              data-testid={`status-filter-${s}`}>
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: meta.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />{s}
              </div>
              <div className="font-mono text-xl font-semibold text-[#EDEDED] mt-1">{counts[s]}</div>
            </button>
          );
        })}
      </div>

      <Panel>
        {view.length === 0 ? (
          <EmptyState title="No investigations in this view" message="Add works from the investigation pages to build the queue." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-header border-y border-hairline text-[#737987] text-[11px] uppercase tracking-wider">
                  {['Priority', 'Work', 'Risk', 'Reason', 'Assigned To', 'Status', 'Due Date'].map((h) => <th key={h} className="text-left font-medium px-4 py-2.5">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {view.map((it) => (
                  <tr key={it.id} className="border-b border-divider hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3"><span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded border" style={{ color: priorityColor[it.priority], borderColor: `${priorityColor[it.priority]}44` }}>{it.priority}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/works/${it.workId}`)} className="text-left">
                        <div className="font-mono text-xs text-[#EDEDED] hover:text-brand transition-colors">{it.workId}</div>
                        <div className="text-[11px] text-[#737987] max-w-[220px] truncate">{it.district}, {it.state}</div>
                      </button>
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2"><RiskBadge tier={it.riskTier} /><span className="font-mono text-xs text-[#A0A5B0]">{it.riskScore}</span></td>
                    <td className="px-4 py-3 text-xs text-[#A0A5B0]">{it.reason}</td>
                    <td className="px-4 py-3 text-xs text-[#A0A5B0]">{it.assignedTo}</td>
                    <td className="px-4 py-3">
                      <div className="relative inline-block">
                        <select value={it.status} onChange={(e) => changeStatus(it.id, e.target.value)} data-testid={`status-select-${it.workId}`}
                          className="appearance-none pl-2.5 pr-7 h-7 rounded border text-[11px] font-medium bg-[#0D0F12] outline-none cursor-pointer"
                          style={{ color: INVESTIGATION_STATUS_META[it.status].color, borderColor: INVESTIGATION_STATUS_META[it.status].border }}>
                          {INVESTIGATION_STATUSES.map((s) => <option key={s} value={s} className="bg-[#0D0F12] text-[#EDEDED]">{s}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: INVESTIGATION_STATUS_META[it.status].color }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#737987]">{formatDate(it.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
