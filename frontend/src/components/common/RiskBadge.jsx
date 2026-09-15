import React from 'react';
import { RISK_TIERS } from '../../data/constants';
import { cn } from '../../lib/utils';

// Risk tier badge. `variant`: 'solid' (chip) or 'score' (number + label).
export const RiskBadge = ({ tier, className, dot = false }) => {
  const t = RISK_TIERS[tier] || RISK_TIERS.LOW;
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border uppercase tracking-wide', className)}
      style={{ color: t.color, backgroundColor: t.bg, borderColor: t.border }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />}
      {t.label}
    </span>
  );
};

// Prominent risk score cell used in tables.
export const RiskScoreCell = ({ score }) => {
  const tier = score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
  const t = RISK_TIERS[tier];
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-base font-semibold tabular-nums" style={{ color: t.color }}>{score}</span>
      <div className="flex-1 min-w-[52px] max-w-[70px] h-1.5 rounded-full bg-[#1E2126] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: t.color }} />
      </div>
    </div>
  );
};

export const SeverityDot = ({ tier }) => {
  const t = RISK_TIERS[tier] || RISK_TIERS.LOW;
  return <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: t.color }} />;
};
