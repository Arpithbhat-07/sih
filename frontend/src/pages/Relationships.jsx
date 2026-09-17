import React, { useEffect, useState } from 'react';
import { Network, ShieldAlert, Users, Building2, FileText, Filter } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Panel, PanelHeader } from '../components/common/Panel';
import { RelationshipGraph } from '../components/common/RelationshipGraph';
import { Loader } from '../components/common/States';
import * as api from '../services/api';

export default function Relationships() {
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRelationships().then((res) => {
      setGraphData(res);
      setLoading(false);
    });
  }, []);

  if (loading) return <Loader label="Mapping multi-entity procurement network graph…" />;

  const nodes = graphData?.nodes || [];
  const links = graphData?.links || [];
  const deptCount = nodes.filter((n) => n.type === 'DEPARTMENT').length;
  const vendorCount = nodes.filter((n) => n.type === 'VENDOR').length;
  const tenderCount = nodes.filter((n) => n.type === 'TENDER').length;

  return (
    <div className="space-y-6" data-testid="relationships-page">
      <PageHeader
        title="Procurement Relationship Intelligence"
        subtitle="Multi-entity relational mapping identifying co-bidding patterns, vendor-department concentration, and connected tenders."
        testId="relationships-header"
      />

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg border border-hairline bg-surface flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#4D8CFF]/10 flex items-center justify-center text-brand">
            <Users size={18} />
          </div>
          <div>
            <div className="font-mono text-xl font-semibold text-[#EDEDED]">{vendorCount}</div>
            <div className="text-[11px] text-[#737987]">Network Vendors</div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-hairline bg-surface flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#8B5CF6]/10 flex items-center justify-center text-ai">
            <Building2 size={18} />
          </div>
          <div>
            <div className="font-mono text-xl font-semibold text-[#EDEDED]">{deptCount}</div>
            <div className="text-[11px] text-[#737987]">Procuring Authorities</div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-hairline bg-surface flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#F15252]/10 flex items-center justify-center text-risk-critical">
            <FileText size={18} />
          </div>
          <div>
            <div className="font-mono text-xl font-semibold text-[#EDEDED]">{tenderCount}</div>
            <div className="text-[11px] text-[#737987]">Flagged Contracts</div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-hairline bg-surface flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#52C47E]/10 flex items-center justify-center text-risk-low">
            <Network size={18} />
          </div>
          <div>
            <div className="font-mono text-xl font-semibold text-[#EDEDED]">{links.length}</div>
            <div className="text-[11px] text-[#737987]">Observed Edges</div>
          </div>
        </div>
      </div>

      {/* Interactive Visual Graph */}
      <Panel className="p-0 overflow-hidden">
        <RelationshipGraph data={graphData} height={560} />
      </Panel>

      {/* Responsible AI Disclaimer */}
      <p className="text-[11px] text-[#737987] text-center max-w-2xl mx-auto">
        Observable relationship in the synthetic demonstration dataset. Analytical signals and relational links represent observed participation overlap and structural patterns. They do not constitute proof of fraud, corruption, misconduct, or wrongdoing. Final assessment requires authorized human investigation.
      </p>
    </div>
  );
}
