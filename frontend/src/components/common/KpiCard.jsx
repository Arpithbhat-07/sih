import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { CountUp } from './CountUp';
import { cn } from '../../lib/utils';

// Premium KPI card with icon, animated metric and trend delta.
export const KpiCard = ({
  label, value, prefix = '', suffix = '', decimals = 0,
  icon: Icon, trend, trendLabel = 'vs previous period', accent = '#4D8CFF',
  index = 0, onClick, testId,
}) => {
  const up = trend >= 0;
  return (
    <motion.button
      type="button"
      data-testid={testId}
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className={cn(
        'text-left bg-surface border border-hairline rounded-lg p-5 relative overflow-hidden group',
        onClick && 'hover:border-[#383C45] cursor-pointer',
        'transition-colors duration-150',
      )}
    >
      <div className="absolute top-0 left-0 h-full w-[3px]" style={{ background: accent, opacity: 0.85 }} />
      <div className="flex items-start justify-between">
        <span className="text-[11px] uppercase tracking-wider text-[#737987] font-medium">{label}</span>
        {Icon && (
          <span className="w-7 h-7 rounded-md flex items-center justify-center border border-hairline bg-[#0D0F12]">
            <Icon size={15} strokeWidth={1.6} style={{ color: accent }} />
          </span>
        )}
      </div>
      <div className="mt-3 font-mono text-[26px] font-semibold text-[#EDEDED] tabular-nums leading-none">
        <CountUp value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-1.5 py-0.5 rounded"
            style={{ color: up ? '#52C47E' : '#F15252', background: up ? 'rgba(82,196,126,0.1)' : 'rgba(241,82,82,0.1)' }}
          >
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {up ? '+' : ''}{Math.abs(trend).toFixed(1)}%
          </span>
          <span className="text-[11px] text-[#737987]">{trendLabel}</span>
        </div>
      )}
    </motion.button>
  );
};
