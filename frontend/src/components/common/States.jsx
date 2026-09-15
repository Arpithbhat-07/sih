import React from 'react';
import { Inbox, Loader2, WifiOff } from 'lucide-react';

export const EmptyState = ({ icon: Icon = Inbox, title, message }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    <div className="w-12 h-12 rounded-lg border border-hairline bg-[#0D0F12] flex items-center justify-center mb-4">
      <Icon size={22} strokeWidth={1.5} className="text-[#737987]" />
    </div>
    <h4 className="text-sm font-medium text-[#EDEDED]">{title}</h4>
    {message && <p className="text-xs text-[#737987] mt-1 max-w-sm">{message}</p>}
  </div>
);

export const Loader = ({ label = 'Loading intelligence…' }) => (
  <div className="flex flex-col items-center justify-center py-20 text-[#737987]">
    <Loader2 size={22} className="animate-spin text-brand" />
    <span className="text-xs mt-3">{label}</span>
  </div>
);

export const ErrorState = ({ title = 'Analytics engine unavailable', message = 'Showing cached demonstration data.' }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    <div className="w-12 h-12 rounded-lg border border-hairline bg-[#0D0F12] flex items-center justify-center mb-4">
      <WifiOff size={22} strokeWidth={1.5} className="text-risk-high" />
    </div>
    <h4 className="text-sm font-medium text-[#EDEDED]">{title}</h4>
    <p className="text-xs text-[#737987] mt-1 max-w-sm">{message}</p>
  </div>
);

// Skeleton block
export const Skel = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-[#16191E] ${className}`} />
);
