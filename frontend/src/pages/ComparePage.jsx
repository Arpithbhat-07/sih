import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, X, ArrowRight, GitCompareArrows, Info } from 'lucide-react';
import { Crumbs } from '../components/common/PageHeader';
import { Panel, PanelHeader } from '../components/common/Panel';
import { RiskBadge } from '../components/common/RiskBadge';
import { Loader, EmptyState } from '../components/common/States';
import { RISK_TIERS } from '../data/constants';
import { formatINR } from '../lib/format';
import * as api from '../services/api';

export default function ComparePage() {
  const { idA, idB } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(undefined);

  useEffect(() => { setData(undefined); api.getComparison(idA, idB).then(setData); }, [idA, idB]);

  if (data === undefined) return <Loader label="Comparing works…" />;
  if (!data) return <EmptyState icon={GitCompareArrows} title="Comparison unavailable" message="One or both works could not be found." />;

  const { a, b, attributes, similarity, matches } = data;
  const simColor = similarity > 88 ? '#F15252' : similarity > 75 ? '#F59638' : '#F3D35E';

  const renderVal = (attr, work) => {
    const raw = work === 'a' ? attr.a : attr.b;
    if (attr.money) return formatINR(raw);
    if (attr.desc) return raw;
    return raw;
  };

  return (
    <div className="space-y-6" data-testid="compare-page">
      <Crumbs items={[{ label: 'Risk Monitor', to: '/risk' }, { label: 'Work Investigation', to: `/works/${a.id}` }, { label: 'Compare' }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="mt-1 w-8 h-8 rounded-md border border-hairline bg-surface flex items-center justify-center text-[#A0A5B0] hover:text-[#EDEDED] hover:border-[#383C45] transition-colors" data-testid="compare-back"><ArrowLeft size={16} /></button>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[#737987] flex items-center gap-1.5"><GitCompareArrows size={12} /> Duplicate Comparison</div>
            <h1 className="text-2xl font-semibold tracking-tight font-mono text-[#EDEDED] mt-0.5">{a.id} <span className="text-[#5C616D]">vs</span> {b.id}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-surface border border-hairline rounded-lg px-4 py-2.5">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-[#737987]">Overall Similarity</div>
            <div className="font-mono text-2xl font-semibold leading-none" style={{ color: simColor }}>{similarity}%</div>
          </div>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(${simColor} ${similarity}%, #1E2126 0)` }}>
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-[10px] text-[#737987]">{matches.length}/{attributes.length}</div>
          </div>
        </div>
      </div>

      {/* Work headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[a, b].map((w, i) => (
          <Panel key={w.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm font-semibold text-[#EDEDED]">{w.id}</span>
              <div className="flex items-center gap-2">
                <RiskBadge tier={w.riskTier} />
                <span className="font-mono text-sm font-semibold" style={{ color: RISK_TIERS[w.riskTier].color }}>{w.riskScore}</span>
              </div>
            </div>
            <p className="text-[13px] text-[#C9CDD6] leading-snug">{w.description}</p>
            <button onClick={() => navigate(`/works/${w.id}`)} className="mt-3 text-xs text-brand hover:text-white transition-colors inline-flex items-center gap-1">Open investigation <ArrowRight size={12} /></button>
          </Panel>
        ))}
      </div>

      {/* Attribute matrix */}
      <Panel>
        <PanelHeader title="Attribute Comparison" subtitle="Matching attributes are highlighted — strong overlap indicates a potential duplicate" />
        <div className="divide-y divide-divider">
          {attributes.map((attr, i) => (
            <motion.div key={attr.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
              className="grid grid-cols-12 items-center gap-2 px-4 py-3" style={{ background: attr.match ? 'rgba(82,196,126,0.05)' : 'transparent' }}>
              <div className="col-span-12 sm:col-span-3 flex items-center gap-2">
                <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${attr.match ? 'bg-risk-low/15 text-risk-low' : 'bg-[#16191E] text-[#5C616D]'}`}>
                  {attr.match ? <Check size={12} /> : <X size={12} />}
                </span>
                <span className="text-xs text-[#737987] uppercase tracking-wide">{attr.key}</span>
              </div>
              <div className="col-span-6 sm:col-span-4">
                <div className={`text-[13px] truncate ${attr.match ? 'text-[#EDEDED]' : 'text-[#A0A5B0]'}`} title={String(renderVal(attr, 'a'))}>{renderVal(attr, 'a')}</div>
              </div>
              <div className="col-span-6 sm:col-span-4">
                <div className={`text-[13px] truncate ${attr.match ? 'text-[#EDEDED]' : 'text-[#A0A5B0]'}`} title={String(renderVal(attr, 'b'))}>{renderVal(attr, 'b')}</div>
              </div>
              <div className="hidden sm:block sm:col-span-1 text-right">
                {attr.note && <span className="text-[10px] font-mono text-[#737987]">{attr.note}</span>}
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      <p className="text-[11px] text-[#5C616D] flex items-center gap-1.5 justify-center">
        <Info size={12} /> Attribute similarity is an analytical signal indicating potential duplication and requires authorized human verification.
      </p>
    </div>
  );
}
