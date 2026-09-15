import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PageHeader = ({ title, subtitle, children, testId }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6"
    data-testid={testId}
  >
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-[#EDEDED]">{title}</h1>
      {subtitle && <p className="text-sm text-[#A0A5B0] mt-1 max-w-2xl">{subtitle}</p>}
    </div>
    {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
  </motion.div>
);

export const Crumbs = ({ items }) => (
  <div className="flex items-center gap-1.5 text-xs text-[#737987]">
    {items.map((it, i) => (
      <React.Fragment key={i}>
        {i > 0 && <ChevronRight size={12} />}
        {it.to ? (
          <Link to={it.to} className="hover:text-[#A0A5B0] transition-colors">{it.label}</Link>
        ) : (
          <span className={i === items.length - 1 ? 'text-[#A0A5B0]' : ''}>{it.label}</span>
        )}
      </React.Fragment>
    ))}
  </div>
);
