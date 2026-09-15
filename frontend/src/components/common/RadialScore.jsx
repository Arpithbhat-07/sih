import React from 'react';
import { motion } from 'framer-motion';
import { RISK_TIERS, tierForScore } from '../../data/constants';

// Radial risk score meter using an SVG progress ring with animated sweep.
export const RadialScore = ({ score = 0, size = 200, stroke = 14, label = true }) => {
  const tier = tierForScore(score);
  const t = RISK_TIERS[tier];
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E2126" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={t.color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${t.color}66)` }}
        />
      </svg>
      {label && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono font-semibold tabular-nums leading-none" style={{ fontSize: size * 0.26, color: t.color }}>
            {score}
          </div>
          <div className="text-[11px] text-[#737987] mt-1">/ 100</div>
          <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider" style={{ color: t.color }}>{t.label} Risk</div>
        </div>
      )}
    </div>
  );
};
