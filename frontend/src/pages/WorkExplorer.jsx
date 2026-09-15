import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Panel } from '../components/common/Panel';
import { RiskBadge } from '../components/common/RiskBadge';
import { EmptyState, Loader } from '../components/common/States';
import { CATEGORIES, RISK_TIERS } from '../data/constants';
import { formatINR } from '../lib/format';
import * as api from '../services/api';

export default function WorkExplorer() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.queryWorks({
      search: q,
      category: cat === 'All' ? 'ALL' : cat,
      sortBy: 'riskScore',
      sortDir: 'desc',
      pageSize: 24,
    }).then((res) => {
      if (active) {
        setWorks(res?.rows || []);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [q, cat]);

  return (
    <div className="space-y-5">
      <PageHeader title="Work Explorer" subtitle="Browse and inspect individual MPLADS works across the programme." testId="work-explorer-page">
        <div className="flex items-center gap-2 h-8 px-2.5 rounded-md bg-[#0D0F12] border border-hairline focus-within:border-brand">
          <Search size={13} className="text-[#737987]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search works…" className="bg-transparent text-xs text-[#EDEDED] placeholder:text-[#5C616D] outline-none w-48" data-testid="explorer-search" />
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        {['All', ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`text-xs px-3 h-8 rounded-md border transition-colors ${cat === c ? 'bg-[#16191E] border-[#383C45] text-[#EDEDED]' : 'bg-surface border-hairline text-[#A0A5B0] hover:text-[#EDEDED]'}`} data-testid={`explorer-cat-${c}`}>{c}</button>
        ))}
      </div>

      {loading && works.length === 0 ? (
        <Panel><Loader label="Searching works database…" /></Panel>
      ) : works.length === 0 ? (
        <Panel><EmptyState title="No works found" message="Adjust your search or category filter." /></Panel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {works.map((w, i) => (
            <motion.button key={w.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
              onClick={() => navigate(`/works/${w.id}`)}
              className="text-left bg-surface border border-hairline rounded-lg p-4 hover:border-[#383C45] transition-colors group" data-testid={`explorer-card-${w.id}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-[#EDEDED]">{w.id}</span>
                <RiskBadge tier={w.riskTier} />
              </div>
              <p className="text-[13px] text-[#C9CDD6] leading-snug min-h-[38px]">{w.description}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-divider">
                <div className="text-[11px] text-[#737987]">{w.district}, {w.state}</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#A0A5B0]">{formatINR(w.sanctionedAmount)}</span>
                  <span className="font-mono text-sm font-semibold" style={{ color: RISK_TIERS[w.riskTier].color }}>{w.riskScore}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-[#737987]">{w.primarySignal}</span>
                <span className="text-[11px] text-brand inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">Investigate <ArrowRight size={11} /></span>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
