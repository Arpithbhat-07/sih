import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, ChevronDown, LogOut, Shield, MapPin, Building, Award, Landmark } from 'lucide-react';
import * as api from '../../services/api';
import { RISK_TIERS } from '../../data/constants';
import { useAuth } from '../../context/AuthContext';

export const Header = ({ title = 'Command Center', onOpenSidebar }) => {
  const { user, logout } = useAuth();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const boxRef = useRef(null);
  const profileRef = useRef(null);
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
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (id) => { setOpen(false); setQ(''); navigate(`/works/${id}`); };

  // Role and scope resolution
  const role = user?.role || 'MINISTRY';
  let scopeLabel = 'National Scope · All India';
  let roleTitle = 'CENTRAL PROCUREMENT VIGILANCE';
  let ScopeIcon = Landmark;
  let scopeColor = '#4D8CFF';

  if (role === 'STATE_AUTHORITY') {
    scopeLabel = `${user?.state || 'Karnataka'} · State Scope`;
    roleTitle = 'STATE PROCUREMENT NODAL';
    ScopeIcon = Building;
    scopeColor = '#F3D35E';
  } else if (role === 'DISTRICT_AUTHORITY') {
    scopeLabel = `${user?.district || 'Bengaluru Urban'} · District Scope`;
    roleTitle = 'DISTRICT TENDER AUTHORITY';
    ScopeIcon = MapPin;
    scopeColor = '#52C47E';
  } else if (role === 'MP') {
    scopeLabel = `${user?.constituency || 'Bengaluru Urban'} · Audit Dossier`;
    roleTitle = 'PROCUREMENT INVESTIGATOR';
    ScopeIcon = Award;
    scopeColor = '#8B5CF6';
  }

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

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

        {/* Visible Header Scope Indicator */}
        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-hairline">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border"
            style={{
              backgroundColor: `${scopeColor}12`,
              borderColor: `${scopeColor}30`,
              color: scopeColor,
            }}
          >
            <ScopeIcon size={12} />
            <span>{scopeLabel}</span>
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
            placeholder="Search tender ID, vendor, department..."
            className="flex-1 bg-transparent text-[13px] text-[#EDEDED] placeholder:text-[#5C616D] outline-none"
          />
          <kbd className="hidden lg:inline text-[10px] text-[#5C616D] font-mono border border-hairline rounded px-1">/</kbd>
        </div>
        {open && q && (
          <div className="absolute top-11 left-0 right-0 bg-[#0D0F12] border border-hairline rounded-md shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden z-40" data-testid="search-results">
            {results.length === 0 ? (
              <div className="px-4 py-4 text-xs text-[#737987]">No matching tenders found.</div>
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

        {/* User Profile & Logout Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 pl-3 border-l border-hairline hover:opacity-90 transition-opacity cursor-pointer text-left"
          >
            <div
              className="w-8 h-8 rounded-md border flex items-center justify-center text-[11px] font-semibold"
              style={{
                backgroundColor: `${scopeColor}15`,
                borderColor: `${scopeColor}35`,
                color: scopeColor,
              }}
            >
              {user?.avatarInitials || 'MA'}
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-[12px] font-medium text-[#EDEDED] truncate max-w-[140px]">
                {user?.fullName || 'Monitoring Authority'}
              </div>
              <div className="text-[10px] font-mono text-[#737987] truncate max-w-[140px]">
                {roleTitle}
              </div>
            </div>
            <ChevronDown size={14} className="text-[#5C616D] hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-12 w-72 bg-[#0D0F12] border border-[#272A30] rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-2 border-b border-[#1E2126] mb-2">
                <div className="text-xs font-semibold text-[#EDEDED]">{user?.fullName || 'Monitoring Authority'}</div>
                <div className="text-[11px] text-[#A0A5B0] mt-0.5">{user?.designation || 'Decision Support'}</div>
                <div className="mt-2 pt-2 border-t border-[#1E2126] flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[#737987]">ID: {user?.userId || 'USR-001'}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#16191E] border border-[#272A30] text-[#A0A5B0]">
                    {user?.username || 'demo'}
                  </span>
                </div>
              </div>

              {/* Scoped Information Card */}
              <div className="p-2.5 rounded-lg bg-[#16191E] border border-[#272A30] mb-3">
                <div className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: scopeColor }}>
                  <ScopeIcon size={13} />
                  <span className="font-semibold">{scopeLabel}</span>
                </div>
                <div className="text-[10px] text-[#737987] mt-1">
                  Enforced server-side. Data queries strictly constrained to authorized jurisdiction.
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-risk-critical hover:bg-risk-critical/10 rounded-lg transition-colors cursor-pointer font-medium"
              >
                <LogOut size={14} />
                <span>Sign Out ({user?.username})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
