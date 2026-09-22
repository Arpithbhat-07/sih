import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const TITLES = {
  '/dashboard': 'Command Center',
  '/risk': 'Risk Monitor',
  '/works': 'Work Explorer',
  '/analytics': 'Programme Analytics',
  '/alerts': 'Intelligence Alerts',
  '/agencies': 'Implementing Agencies',
  '/districts': 'District Monitoring',
  '/investigations': 'Investigation Queue',
  '/ai': 'Sentinel AI',
  '/data-health': 'Data Health',
  '/settings': 'Settings',
};

function titleFor(pathname) {
  if (pathname.startsWith('/works/')) return 'Work Investigation';
  if (pathname.startsWith('/compare/')) return 'Duplicate Comparison';
  if (pathname.startsWith('/agencies/')) return 'Agency Intelligence';
  return TITLES[pathname] || 'MPLADS Sentinel';
}

export const AppShell = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-shell text-[#EDEDED] overflow-hidden">
      {/* desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed top-0 left-0 h-full z-50 lg:hidden"
            >
              <Sidebar mobile onClose={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <Header title={titleFor(location.pathname)} onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-shell">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="p-5 md:p-8 max-w-[1600px] mx-auto"
            >
              <Outlet />
              <footer className="mt-10 pt-5 border-t border-divider flex flex-col sm:flex-row items-center justify-between gap-2">
                <span className="text-[11px] text-[#5C616D]">MPLADS Sentinel — AI-assisted decision support for public programme monitoring</span>
                <span className="text-[11px] text-[#5C616D] font-mono">Prototype • SIH 2026 · Synthetic Demonstration Dataset</span>
              </footer>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
