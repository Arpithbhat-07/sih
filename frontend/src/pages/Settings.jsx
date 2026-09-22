import React, { useState } from 'react';
import { toast } from 'sonner';
import { SlidersHorizontal, Bell, Shield, Palette, Database } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Panel, PanelHeader } from '../components/common/Panel';

const Toggle = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)} className={`w-9 h-5 rounded-full p-0.5 transition-colors ${on ? 'bg-brand' : 'bg-[#272A30]'}`}>
    <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`} />
  </button>
);

const Setting = ({ icon: Icon, title, desc, children }) => (
  <div className="flex items-center justify-between gap-4 p-4 border-b border-divider last:border-0">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-md border border-hairline bg-[#0D0F12] flex items-center justify-center shrink-0"><Icon size={15} className="text-[#A0A5B0]" /></div>
      <div>
        <div className="text-sm text-[#EDEDED]">{title}</div>
        <div className="text-[11px] text-[#737987]">{desc}</div>
      </div>
    </div>
    {children}
  </div>
);

export default function Settings() {
  const [s, setS] = useState({ critical: true, weekly: true, agency: false, autoAssign: true });
  const [threshold, setThreshold] = useState(80);
  const set = (k, v) => { setS((p) => ({ ...p, [k]: v })); toast.success('Preference updated'); };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" subtitle="Configure alerting thresholds, notifications and system preferences." testId="settings-page" />

      <Panel>
        <PanelHeader title="Alerting" subtitle="Notification preferences" />
        <div>
          <Setting icon={Bell} title="Critical alert notifications" desc="Notify immediately when a work reaches critical risk"><Toggle on={s.critical} onChange={(v) => set('critical', v)} /></Setting>
          <Setting icon={SlidersHorizontal} title="Weekly intelligence digest" desc="Summary of new signals and queue changes"><Toggle on={s.weekly} onChange={(v) => set('weekly', v)} /></Setting>
          <Setting icon={Shield} title="Agency pattern alerts" desc="Alert on unusual agency-level concentration"><Toggle on={s.agency} onChange={(v) => set('agency', v)} /></Setting>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Risk Engine" subtitle="Scoring thresholds" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#EDEDED]">Critical risk threshold</span>
            <span className="font-mono text-sm text-brand font-semibold">{threshold}</span>
          </div>
          <input type="range" min={60} max={95} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-full accent-brand" data-testid="threshold-slider" />
          <p className="text-[11px] text-[#737987] mt-2">Works scoring at or above this value are auto-classified as critical priority.</p>
          <div className="mt-4 pt-4 border-t border-divider">
            <Setting icon={Database} title="Auto-assign to queue" desc="Automatically add new critical works to the investigation queue"><Toggle on={s.autoAssign} onChange={(v) => set('autoAssign', v)} /></Setting>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="About" subtitle="Prototype information" />
        <div className="p-5 space-y-2 text-xs text-[#A0A5B0]">
          <Row k="Product" v="MPLADS Sentinel" />
          <Row k="Version" v="0.9.0 · Prototype" />
          <Row k="Event" v="Smart India Hackathon 2026" />
          <Row k="Dataset" v="Synthetic Demonstration Dataset" />
          <Row k="Data mode" v="Local mock service layer (backend-ready)" />
        </div>
      </Panel>
    </div>
  );
}

const Row = ({ k, v }) => (
  <div className="flex items-center justify-between py-1 border-b border-divider last:border-0">
    <span className="text-[#737987]">{k}</span>
    <span className="text-[#EDEDED] font-mono">{v}</span>
  </div>
);
