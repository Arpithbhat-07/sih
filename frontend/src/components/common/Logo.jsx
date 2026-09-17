import React from 'react';
import { cn } from '../../lib/utils';

// Abstract sentinel / radar-shield logo built purely with SVG (no stock imagery).
export const Logo = ({ size = 34, className }) => (
  <div
    className={cn('relative flex items-center justify-center rounded-md', className)}
    style={{ width: size, height: size, background: 'linear-gradient(160deg,#141821,#0C0E12)', border: '1px solid #272A30' }}
  >
    <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24" fill="none">
      <path d="M12 2.2 3.6 5.4v6.3c0 4.6 3.2 8.4 8.4 10 5.2-1.6 8.4-5.4 8.4-10V5.4L12 2.2Z" stroke="#4D8CFF" strokeWidth="1.3" fill="rgba(77,140,255,0.08)" />
      <circle cx="12" cy="11" r="4.4" stroke="#4D8CFF" strokeWidth="0.9" opacity="0.55" />
      <circle cx="12" cy="11" r="2.2" stroke="#8B5CF6" strokeWidth="0.9" opacity="0.8" />
      <path d="M12 11 L16 8.2" stroke="#8B5CF6" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="11" r="1" fill="#4D8CFF" />
    </svg>
  </div>
);

export const Wordmark = ({ collapsed = false }) => (
  <div className="flex items-center gap-2.5 min-w-0">
    <Logo />
    {!collapsed && (
      <div className="min-w-0">
        <div className="text-[13px] font-semibold tracking-tight text-[#EDEDED] leading-tight truncate">
          PROCURE<span className="text-brand">GUARD</span>
        </div>
        <div className="text-[10px] text-[#737987] leading-tight truncate">Public Procurement Intelligence</div>
      </div>
    )}
  </div>
);
