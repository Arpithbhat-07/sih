import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search, RotateCcw, Download, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, SlidersHorizontal, ArrowRight,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Panel } from '../components/common/Panel';
import { RiskBadge, RiskScoreCell } from '../components/common/RiskBadge';
import { EmptyState, Loader } from '../components/common/States';
import { RISK_TIERS, TIER_ORDER } from '../data/constants';
import { formatINR } from '../lib/format';
import * as api from '../services/api';
import { downloadCsv, WORK_EXPORT_COLUMNS } from '../lib/exporters';

const SortHead = ({ label, col, sort, onSort, className = '' }) => (
  <th className={`text-left font-medium px-4 py-2.5 whitespace-nowrap ${className}`}>
    <button onClick={() => onSort(col)} className="inline-flex items-center gap-1 hover:text-[#EDEDED] transition-colors">
      {label}
      {sort.by === col ? (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-40" />}
    </button>
  </th>
);

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] uppercase tracking-wider text-[#737987]">{label}</label>
    {children}
  </div>
);

const selectCls = 'appearance-none bg-[#0D0F12] border border-hairline rounded-md pl-2.5 pr-7 h-8 text-xs text-[#EDEDED] hover:border-[#383C45] focus:border-brand outline-none cursor-pointer min-w-[120px]';

export default function RiskMonitor() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [opts, setOpts] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: '', state: params.get('state') || 'ALL', district: 'ALL', category: 'ALL',
    agency: 'ALL', riskLevel: params.get('riskLevel') || 'ALL', minScore: 0, maxScore: 100,
  });
  const [sort, setSort] = useState({ by: 'riskScore', dir: 'desc' });
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => { api.getFilterOptions().then(setOpts); }, []);

  useEffect(() => {
    setLoading(true);
    api.queryWorks({ ...filters, sortBy: sort.by, sortDir: sort.dir, page, pageSize })
      .then((r) => { setResult(r); setLoading(false); });
  }, [filters, sort, page]);

  const set = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const onSort = (col) => setSort((s) => ({ by: col, dir: s.by === col && s.dir === 'desc' ? 'asc' : 'desc' }));
  const reset = () => { setFilters({ search: '', state: 'ALL', district: 'ALL', category: 'ALL', agency: 'ALL', riskLevel: 'ALL', minScore: 0, maxScore: 100 }); setPage(1); };
  const exportReport = async () => {
    const rows = await api.getWorksForExport({ ...filters, sortBy: sort.by, sortDir: sort.dir });
    if (!rows.length) { toast.error('No tenders match the current filters.'); return; }
    downloadCsv(`procureguard-risk-report-${new Date().toISOString().slice(0, 10)}.csv`, rows, WORK_EXPORT_COLUMNS);
    toast.success('Risk report prepared successfully.', { description: `${rows.length} tenders exported to CSV.` });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Risk Monitor" subtitle="Prioritized tenders and contracts requiring monitoring or investigation." testId="risk-monitor-page">
        <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs h-8 px-3 rounded-md border border-hairline bg-surface text-[#A0A5B0] hover:text-[#EDEDED] hover:border-[#383C45] transition-colors" data-testid="reset-filters">
          <RotateCcw size={13} /> Reset
        </button>
        <button onClick={exportReport} className="inline-flex items-center gap-1.5 text-xs h-8 px-3 rounded-md bg-[#EDEDED] text-shell font-medium hover:bg-white transition-colors" data-testid="export-report">
          <Download size={13} /> Export Report
        </button>
      </PageHeader>

      {/* Filters */}
      <Panel className="p-4">
        <div className="flex items-center gap-2 mb-3 text-xs text-[#737987]"><SlidersHorizontal size={13} /> Filters</div>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Search">
            <div className="flex items-center gap-2 h-8 px-2.5 rounded-md bg-[#0D0F12] border border-hairline focus-within:border-brand min-w-[200px]">
              <Search size={13} className="text-[#737987]" />
              <input data-testid="risk-search" value={filters.search} onChange={(e) => set('search', e.target.value)} placeholder="Tender ID, description, vendor…" className="flex-1 bg-transparent text-xs text-[#EDEDED] placeholder:text-[#5C616D] outline-none" />
            </div>
          </Field>
          <Field label="State">
            <select data-testid="filter-state" className={selectCls} value={filters.state} onChange={(e) => set('state', e.target.value)}>
              <option value="ALL">All States</option>
              {opts?.states.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="District">
            <select data-testid="filter-district" className={selectCls} value={filters.district} onChange={(e) => set('district', e.target.value)}>
              <option value="ALL">All Districts</option>
              {opts?.districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select data-testid="filter-category" className={selectCls} value={filters.category} onChange={(e) => set('category', e.target.value)}>
              <option value="ALL">All Categories</option>
              {opts?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Vendor / Agency">
            <select data-testid="filter-agency" className={selectCls} value={filters.agency} onChange={(e) => set('agency', e.target.value)}>
              <option value="ALL">All Vendors</option>
              {opts?.agencies.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Risk Level">
            <select data-testid="filter-risk" className={selectCls} value={filters.riskLevel} onChange={(e) => set('riskLevel', e.target.value)}>
              <option value="ALL">All Levels</option>
              {TIER_ORDER.map((k) => <option key={k} value={k}>{RISK_TIERS[k].label}</option>)}
            </select>
          </Field>
          <Field label={`Min Risk Score: ${filters.minScore}`}>
            <input type="range" min={0} max={100} value={filters.minScore} onChange={(e) => set('minScore', Number(e.target.value))} className="w-[140px] accent-brand" data-testid="filter-minscore" />
          </Field>
        </div>
      </Panel>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        {TIER_ORDER.map((k) => (
          <div key={k} className="flex items-center gap-1.5 text-[11px] text-[#737987]">
            <span className="w-2 h-2 rounded-full" style={{ background: RISK_TIERS[k].color }} />
            {RISK_TIERS[k].label} <span className="font-mono text-[#5C616D]">{RISK_TIERS[k].min}–{RISK_TIERS[k].max}</span>
          </div>
        ))}
        <span className="ml-auto text-[11px] text-[#737987] font-mono">{result?.total ?? 0} tenders match filters</span>
      </div>

      {/* Table */}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="risk-table">
            <thead>
              <tr className="bg-surface-header border-y border-hairline text-[#737987] text-[11px] uppercase tracking-wider">
                <SortHead label="Risk" col="riskTier" sort={sort} onSort={onSort} />
                <SortHead label="Tender ID" col="id" sort={sort} onSort={onSort} />
                <th className="text-left font-medium px-4 py-2.5">Description</th>
                <SortHead label="State" col="state" sort={sort} onSort={onSort} className="hidden md:table-cell" />
                <th className="text-left font-medium px-4 py-2.5 hidden lg:table-cell">Category</th>
                <SortHead label="Awarded" col="sanctionedAmount" sort={sort} onSort={onSort} className="hidden xl:table-cell" />
                <SortHead label="Disbursed" col="expenditure" sort={sort} onSort={onSort} className="hidden xl:table-cell" />
                <SortHead label="Score" col="riskScore" sort={sort} onSort={onSort} />
                <th className="text-left font-medium px-4 py-2.5 hidden lg:table-cell">Primary Signal</th>
                <th className="text-right font-medium px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10}><Loader label="Scoring tenders…" /></td></tr>
              ) : result.rows.length === 0 ? (
                <tr><td colSpan={10}><EmptyState title="No tenders match your filters" message="Try adjusting the risk level, state or search term." /></td></tr>
              ) : result.rows.map((w) => (
                <tr key={w.id} onClick={() => navigate(`/works/${w.id}`)} className="border-b border-divider hover:bg-surface-hover cursor-pointer transition-colors" data-testid={`work-row-${w.id}`}>
                  <td className="px-4 py-3"><RiskBadge tier={w.riskTier} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-[#EDEDED]">{w.id}</td>
                  <td className="px-4 py-3 text-xs text-[#A0A5B0] max-w-[240px] truncate">{w.description}</td>
                  <td className="px-4 py-3 text-xs text-[#A0A5B0] hidden md:table-cell">{w.state}</td>
                  <td className="px-4 py-3 text-xs text-[#A0A5B0] hidden lg:table-cell">{w.category}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#A0A5B0] hidden xl:table-cell">{formatINR(w.sanctionedAmount)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#A0A5B0] hidden xl:table-cell">{formatINR(w.expenditure)}</td>
                  <td className="px-4 py-3 min-w-[130px]"><RiskScoreCell score={w.riskScore} /></td>
                  <td className="px-4 py-3 text-xs text-[#A0A5B0] hidden lg:table-cell">{w.primarySignal}</td>
                  <td className="px-4 py-3 text-right"><span className="text-xs text-brand inline-flex items-center gap-1">Open <ArrowRight size={12} /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {result && result.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-hairline">
            <span className="text-[11px] text-[#737987] font-mono">Page {result.page} of {result.totalPages}</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-7 w-7 flex items-center justify-center rounded border border-hairline text-[#A0A5B0] disabled:opacity-30 hover:border-[#383C45] transition-colors" data-testid="page-prev"><ChevronLeft size={14} /></button>
              <button disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 w-7 flex items-center justify-center rounded border border-hairline text-[#A0A5B0] disabled:opacity-30 hover:border-[#383C45] transition-colors" data-testid="page-next"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
