import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Bell } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Panel } from '../components/common/Panel';
import { RiskBadge } from '../components/common/RiskBadge';
import { EmptyState, Loader } from '../components/common/States';
import { ALERT_CATEGORIES, RISK_TIERS } from '../data/constants';
import { relativeTime } from '../lib/format';
import * as api from '../services/api';

export default function Alerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState(null);
  const [cat, setCat] = useState('All');

  useEffect(() => { api.getAlerts().then(setAlerts); }, []);

  const filtered = useMemo(() => {
    if (!alerts) return [];
    return cat === 'All' ? alerts : alerts.filter((a) => a.category === cat);
  }, [alerts, cat]);

  if (!alerts) return <Loader label="Streaming intelligence alerts…" />;

  const counts = ALERT_CATEGORIES.reduce((m, c) => ({ ...m, [c]: alerts.filter((a) => a.category === c).length }), {});

  return (
    <div className="space-y-5">
      <PageHeader title="Intelligence Alerts" subtitle="Real-time feed of analytical signals requiring review." testId="alerts-page" />

      <div className="flex flex-wrap items-center gap-2">
        {['All', ...ALERT_CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCat(c)} data-testid={`alert-filter-${c}`}
            className={`text-xs px-3 h-8 rounded-md border transition-colors ${cat === c ? 'bg-[#16191E] border-[#383C45] text-[#EDEDED]' : 'bg-surface border-hairline text-[#A0A5B0] hover:text-[#EDEDED]'}`}>
            {c}{c !== 'All' && <span className="ml-1.5 font-mono text-[10px] text-[#737987]">{counts[c]}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Panel><EmptyState icon={Bell} title="No alerts in this category" message="All clear — no active signals matching the selected category." /></Panel>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((a, i) => {
            const t = RISK_TIERS[a.severity];
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                <div className="bg-surface border border-hairline rounded-lg p-4 hover:border-[#383C45] transition-colors" style={{ borderLeft: `2px solid ${t.color}` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="relative flex h-2.5 w-2.5 mt-1.5 shrink-0">
                        {a.severity === 'CRITICAL' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: t.color }} />}
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: t.color }} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <RiskBadge tier={a.severity} />
                          <span className="text-sm font-semibold text-[#EDEDED]">{a.title}</span>
                          <span className="text-[10px] font-mono uppercase text-[#737987] px-1.5 py-0.5 rounded border border-divider">{a.category}</span>
                        </div>
                        <p className="text-[13px] text-[#C9CDD6] mt-1.5">{a.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-[#737987] font-mono flex-wrap">
                          <span className="text-[#A0A5B0]">{a.workId}</span>
                          <span>Signal: {a.signal}</span>
                          <span>Confidence: {a.confidence}%</span>
                          <span>{relativeTime(a.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/works/${a.workId}`)} className="shrink-0 text-xs text-brand hover:text-white transition-colors inline-flex items-center gap-1" data-testid={`alert-review-${a.workId}`}>
                      Review <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
