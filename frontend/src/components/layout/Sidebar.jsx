import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ShieldAlert, Search, BarChart3, Bell,
  Building2, MapPin, ClipboardList, Sparkles, Activity, Settings, X, Network,
} from 'lucide-react';
import { Wordmark } from '../common/Logo';
import { cn } from '../../lib/utils';

import { useAuth } from '../../context/AuthContext';

const NavItem = ({ item, onNavigate }) => (
  <NavLink
    to={item.to}
    onClick={onNavigate}
    data-testid={item.testId}
    className={({ isActive }) =>
      cn(
        'group relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors duration-150',
        isActive ? 'bg-[#16191E] text-[#EDEDED]' : 'text-[#A0A5B0] hover:text-[#EDEDED] hover:bg-[#121417]',
      )
    }
  >
    {({ isActive }) => (
      <>
        {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full" style={{ background: item.accent ? '#8B5CF6' : '#4D8CFF' }} />}
        <item.icon size={16} strokeWidth={1.6} className={cn(isActive && (item.accent ? 'text-ai' : 'text-brand'))} />
        <span className="truncate">{item.label}</span>
      </>
    )}
  </NavLink>
);

export const Sidebar = ({ onNavigate, onClose, mobile = false }) => {
  const { role } = useAuth();

  // Role-tailored dashboard title
  const dashboardLabel =
    role === 'DISTRICT_AUTHORITY'
      ? 'District Tenders'
      : role === 'MP'
      ? 'Audit Dossier'
      : 'Command Center';

  // Role-based permission map
  const isAllowed = (path) => {
    if (!role || role === 'MINISTRY') return true;
    if (role === 'STATE_AUTHORITY') {
      return path !== '/data-health';
    }
    if (role === 'DISTRICT_AUTHORITY') {
      return ['/dashboard', '/risk', '/works', '/relationships', '/alerts', '/investigations', '/ai', '/settings'].includes(path);
    }
    if (role === 'MP') {
      return ['/dashboard', '/risk', '/works', '/relationships', '/agencies', '/alerts', '/ai', '/settings'].includes(path);
    }
    return true;
  };

  const navGroups = [
    {
      section: 'Overview',
      items: [{ to: '/dashboard', label: dashboardLabel, icon: LayoutDashboard, testId: 'nav-dashboard' }],
    },
    {
      section: 'Intelligence',
      items: [
        { to: '/risk', label: 'Risk Monitor', icon: ShieldAlert, testId: 'nav-risk' },
        { to: '/works', label: 'Tender Explorer', icon: Search, testId: 'nav-works' },
        { to: '/relationships', label: 'Procurement Network', icon: Network, testId: 'nav-relationships' },
        { to: '/analytics', label: 'Analytics', icon: BarChart3, testId: 'nav-analytics' },
        { to: '/alerts', label: 'Alerts', icon: Bell, testId: 'nav-alerts' },
      ],
    },
    {
      section: 'Entities & Ops',
      items: [
        { to: '/agencies', label: 'Vendors & Agencies', icon: Building2, testId: 'nav-agencies' },
        { to: '/districts', label: 'Districts', icon: MapPin, testId: 'nav-districts' },
        { to: '/investigations', label: 'Investigation Queue', icon: ClipboardList, testId: 'nav-investigations' },
      ],
    },
    {
      section: 'AI',
      items: [{ to: '/ai', label: 'ProcureGuard AI', icon: Sparkles, testId: 'nav-ai', accent: true }],
    },
    {
      section: 'System',
      items: [
        { to: '/data-health', label: 'Data Health', icon: Activity, testId: 'nav-data-health' },
        { to: '/settings', label: 'Settings', icon: Settings, testId: 'nav-settings' },
      ],
    },
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isAllowed(item.to)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className="w-[260px] h-full flex-shrink-0 border-r border-hairline bg-shell flex flex-col">
      <div className="h-16 flex items-center justify-between px-4 border-b border-hairline shrink-0">
        <Wordmark />
        {mobile && (
          <button onClick={onClose} className="text-[#737987] hover:text-[#EDEDED] p-1" data-testid="sidebar-close">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.section}>
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5C616D]">{group.section}</div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

    <div className="px-4 py-4 border-t border-hairline shrink-0 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-risk-low opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-risk-low" />
        </span>
        <span className="text-[11px] text-[#A0A5B0] font-medium">Data Engine Online</span>
      </div>
      <div className="text-[10px] text-[#5C616D] leading-relaxed">
        Last updated<br />
        <span className="text-[#737987] font-mono">Today, 09:42 AM</span>
      </div>
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-hairline bg-[#0D0F12] text-[10px] text-[#737987]">
        <span className="w-1 h-1 rounded-full bg-ai" /> Prototype • SIH 2026
      </div>
    </div>
  </aside>
  );
};

