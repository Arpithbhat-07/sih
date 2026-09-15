import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, ChevronDown } from 'lucide-react';
import * as api from '../../services/api';
import { RISK_TIERS } from '../../data/constants';

export const Header = ({ title = 'Command Center', onOpenSidebar }) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults([]); return; }
    let active = true;
    const timer = setTimeout(() => {
      api.queryWorks({ search: term, pageSize: 6 }).then((res) => {
        if (active) setResults(res?.rows || []);
      }).catch(() => {});
    }, 150);
    return () => { active = false; clearTimeout(timer); };
  }, [q]);

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (id) => { setOpen(false); setQ(''); navigate(`/works/${id}`); };

  return (
    <header className="h-16 border-b border-hairline bg-shell flex items-center px-4 md:px-6 justify-between shrink-0 z-10 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button className="lg:hidden text-[#A0A5B0] hover:text-[#EDEDED]" onClick={onOpenSidebar} data-testid="open-sidebar">
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-[#EDEDED] tracking-tight truncate">{title}</div>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-[#737987]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-risk-low opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-risk-low" />
            </span>
            LIVE ANALYTICS
          </div>
        </div>
      </div>

      <div ref={boxRef} className="relative flex-1 max-w-md hidden md:block">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-[#0D0F12] border border-hairline focus-within:border-brand transition-colors">
          <Search size={15} className="text-[#737987]" />
          <input
            data-testid="global-search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search work ID, district, agency..."
            className="flex-1 bg-transparent text-[13px] text-[#EDEDED] placeholder:text-[#5C616D] outline-none"
          />
          <kbd className="hidden lg:inline text-[10px] text-[#5C616D] font-mono border border-hairline rounded px-1">/</kbd>
        </div>
        {open && q && (
          <div className="absolute top-11 left-0 right-0 bg-[#0D0F12] border border-hairline rounded-md shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden z-40" data-testid="search-results">
            {results.length === 0 ? (
              <div className="px-4 py-4 text-xs text-[#737987]">No matching works found.</div>
            ) : results.map((w) => {
              const t = RISK_TIERS[w.riskTier];
              return (
                <button key={w.id} onMouseDown={() => go(w.id)} className="w-full text-left px-3 py-2.5 hover:bg-[#16191E] flex items-center gap-3 border-b border-divider last:border-0">
                  <span className="font-mono text-xs font-semibold" style={{ color: t.color }}>{w.riskScore}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-[#EDEDED] font-mono">{w.id}</div>
                    <div className="text-[11px] text-[#737987] truncate">{w.category} · {w.district}, {w.state}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button className="relative w-9 h-9 rounded-md border border-hairline bg-[#0D0F12] flex items-center justify-center text-[#A0A5B0] hover:text-[#EDEDED] hover:border-[#383C45] transition-colors" data-testid="notifications">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-risk-critical" />
        </button>
        <div className="flex items-center gap-2.5 pl-3 border-l border-hairline">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#1B2130] to-[#0F1218] border border-hairline flex items-center justify-center text-[11px] font-semibold text-brand">MA</div>
          <div className="hidden sm:block leading-tight">
            <div className="text-[12px] font-medium text-[#EDEDED]">Monitoring Authority</div>
            <div className="text-[10px] text-[#737987]">Decision Support</div>
          </div>
          <ChevronDown size={14} className="text-[#5C616D] hidden sm:block" />
        </div>
      </div>
    </header>
  );
};
