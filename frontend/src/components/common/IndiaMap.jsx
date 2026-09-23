import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INDIA_SVG_MAP } from '../../data/indiaSvg';
import { RISK_TIERS, TIER_ORDER } from '../../data/constants';
import { formatCr, formatIndianNumber } from '../../lib/format';
import { buildStateLookup } from '../../lib/stateNormalization';
import { Map as MapIcon, Table, ExternalLink, ShieldAlert, CheckCircle2 } from 'lucide-react';

/**
 * Interactive India State Risk Intelligence Map & Choropleth
 * - Renders data-driven SVG map representing actual state-level risk metrics
 * - Robust state normalization supporting full names, short codes, and ISO codes
 * - Interactive hover, tooltip, and click-to-inspect state selection
 * - Built-in graceful fallback to ranked state intelligence table
 */
export const IndiaMap = ({ states = [], onSelectState }) => {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'table'
  const navigate = useNavigate();

  // Fast canonical lookup dictionary
  const lookup = useMemo(() => buildStateLookup(states), [states]);

  // Handle SVG styling, event listeners, and data-driven coloring
  useEffect(() => {
    if (viewMode !== 'map') return;
    const root = containerRef.current;
    if (!root) return;

    const svg = root.querySelector('svg');
    if (svg) {
      if (!svg.getAttribute('viewBox')) {
        svg.setAttribute('viewBox', '0 0 611.85999 695.70178');
      }
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.width = '100%';
      svg.style.height = 'auto';
      svg.style.maxHeight = '480px';
      svg.style.display = 'block';
    }

    const paths = root.querySelectorAll('path');
    const cleanupHandlers = [];

    paths.forEach((path) => {
      const code = path.getAttribute('id');
      const title = path.getAttribute('title');
      const agg = lookup.get(code) || lookup.get(title);

      const isSelected = selectedState && (selectedState.code === code || (agg && selectedState.code === agg.code));

      if (agg) {
        const tier = RISK_TIERS[agg.riskTier] || RISK_TIERS.LOW;
        path.style.fill = tier.color;
        path.style.fillOpacity = isSelected ? '1' : '0.78';
        path.style.stroke = isSelected ? '#4D8CFF' : '#090A0B';
        path.style.strokeWidth = isSelected ? '2.2' : '0.8';
        path.style.cursor = 'pointer';
        path.style.transition = 'all 0.15s ease';
      } else {
        path.style.fill = '#16191E';
        path.style.fillOpacity = '0.9';
        path.style.stroke = '#272A30';
        path.style.strokeWidth = '0.5';
        path.style.cursor = 'default';
      }

      const onEnter = (e) => {
        if (!agg) return;
        path.style.fillOpacity = '1';
        path.style.stroke = '#FFFFFF';
        path.style.strokeWidth = '1.6';
        const rect = root.getBoundingClientRect();
        setTooltip({
          agg,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      };

      const onMove = (e) => {
        if (!agg) return;
        const rect = root.getBoundingClientRect();
        setTooltip((prev) => (prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : prev));
      };

      const onLeave = () => {
        if (!agg) return;
        path.style.fillOpacity = isSelected ? '1' : '0.78';
        path.style.stroke = isSelected ? '#4D8CFF' : '#090A0B';
        path.style.strokeWidth = isSelected ? '2.2' : '0.8';
        setTooltip(null);
      };

      const onClick = () => {
        if (!agg) return;
        setSelectedState(agg);
        if (onSelectState) {
          onSelectState(agg);
        }
      };

      path.addEventListener('mouseenter', onEnter);
      path.addEventListener('mousemove', onMove);
      path.addEventListener('mouseleave', onLeave);
      path.addEventListener('click', onClick);

      cleanupHandlers.push(() => {
        path.removeEventListener('mouseenter', onEnter);
        path.removeEventListener('mousemove', onMove);
        path.removeEventListener('mouseleave', onLeave);
        path.removeEventListener('click', onClick);
      });
    });

    return () => {
      cleanupHandlers.forEach((fn) => fn());
    };
  }, [lookup, selectedState, viewMode, onSelectState]);

  return (
    <div className="relative w-full" ref={containerRef} data-testid="india-risk-map">
      {/* View Switcher: Interactive Map vs Table Fallback */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#A0A5B0]">View Mode:</span>
          <div className="inline-flex rounded-md bg-[#0D0F12] border border-hairline p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
                viewMode === 'map' ? 'bg-[#1A1D21] text-[#EDEDED] font-medium' : 'text-[#737987] hover:text-[#A0A5B0]'
              }`}
            >
              <MapIcon size={12} /> Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
                viewMode === 'table' ? 'bg-[#1A1D21] text-[#EDEDED] font-medium' : 'text-[#737987] hover:text-[#A0A5B0]'
              }`}
            >
              <Table size={12} /> Ranked Table
            </button>
          </div>
        </div>

        {selectedState && (
          <button
            type="button"
            onClick={() => setSelectedState(null)}
            className="text-[11px] text-brand hover:underline"
          >
            Clear Selected State ({selectedState.name})
          </button>
        )}
      </div>

      {viewMode === 'map' ? (
        <div className="relative min-h-[420px] flex flex-col items-center justify-center">
          <div
            className="india-map-svg w-full mx-auto max-w-[440px]"
            dangerouslySetInnerHTML={{ __html: INDIA_SVG_MAP }}
          />

          {/* Interactive Hover Tooltip */}
          {tooltip && (
            <div
              className="pointer-events-none absolute z-30 w-56 bg-[#0D0F12]/95 backdrop-blur border border-hairline rounded-md p-3 shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
              style={{
                left: Math.min(Math.max(tooltip.x + 12, 10), 220),
                top: Math.max(tooltip.y - 40, 10),
              }}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-divider">
                <span className="text-xs font-semibold text-[#EDEDED] truncate">{tooltip.agg.name}</span>
                <span
                  className="text-[10px] font-mono font-medium uppercase px-1.5 py-0.5 rounded"
                  style={{
                    color: (RISK_TIERS[tooltip.agg.riskTier] || RISK_TIERS.LOW).color,
                    backgroundColor: `${(RISK_TIERS[tooltip.agg.riskTier] || RISK_TIERS.LOW).color}1A`,
                  }}
                >
                  {(RISK_TIERS[tooltip.agg.riskTier] || RISK_TIERS.LOW).label}
                </span>
              </div>
              <div className="mt-2 space-y-1.5 text-[11px]">
                <Row k="Total works" v={formatIndianNumber(tooltip.agg.works || tooltip.agg.totalWorks || 0)} />
                <Row
                  k="Priority-risk works"
                  v={formatIndianNumber(tooltip.agg.highRisk || 0)}
                  accent={tooltip.agg.highRisk > 0 ? '#F59638' : '#52C47E'}
                />
                <Row k="Sanctioned value" v={formatCr(tooltip.agg.sanctioned || 0)} />
                <Row k="Avg risk score" v={tooltip.agg.avgRisk ?? ''} />
                {tooltip.agg.delayed !== undefined && (
                  <Row k="Delayed projects" v={tooltip.agg.delayed} accent="#F3D35E" />
                )}
              </div>
              <div className="mt-2 pt-1.5 border-t border-divider text-[10px] text-brand flex items-center gap-1">
                <span>Click state to inspect posture</span>
                <ExternalLink size={10} />
              </div>
            </div>
          )}

          {/* Selected State Detail Card */}
          {selectedState && (
            <div className="w-full mt-3 p-3 rounded-md bg-[#0D0F12] border border-brand/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: (RISK_TIERS[selectedState.riskTier] || RISK_TIERS.LOW).color }}
                />
                <div>
                  <div className="text-xs font-semibold text-[#EDEDED]">
                    {selectedState.name} · Risk Concentration Analysis
                  </div>
                  <div className="text-[11px] text-[#A0A5B0]">
                    {formatIndianNumber(selectedState.works)} total works · {formatIndianNumber(selectedState.highRisk)} priority-risk · {formatCr(selectedState.sanctioned)} sanctioned
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/risk?state=${selectedState.code}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-brand text-white hover:bg-brand/90 transition-colors shrink-0"
              >
                Inspect in Risk Monitor <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Graceful Fallback: Ranked State Risk Intelligence Table */
        <div className="w-full overflow-x-auto rounded-md border border-divider">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D0F12] text-[#737987] font-medium border-b border-divider">
              <tr>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">Risk Tier</th>
                <th className="py-2.5 px-3 text-right">Total Works</th>
                <th className="py-2.5 px-3 text-right">Priority-Risk</th>
                <th className="py-2.5 px-3 text-right">Sanctioned</th>
                <th className="py-2.5 px-3 text-right">Avg Score</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider bg-[#121417]">
              {states.map((s) => {
                const tier = RISK_TIERS[s.riskTier] || RISK_TIERS.LOW;
                return (
                  <tr key={s.code} className="hover:bg-[#1A1D21] transition-colors">
                    <td className="py-2 px-3 text-[#EDEDED] font-medium">{s.name}</td>
                    <td className="py-2 px-3">
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase"
                        style={{ color: tier.color, backgroundColor: `${tier.color}1A` }}
                      >
                        {tier.label}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[#A0A5B0]">{formatIndianNumber(s.works)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold" style={{ color: tier.color }}>
                      {formatIndianNumber(s.highRisk)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[#A0A5B0]">{formatCr(s.sanctioned)}</td>
                    <td className="py-2 px-3 text-right font-mono text-[#EDEDED]">{s.avgRisk}</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/risk?state=${s.code}`)}
                        className="text-[11px] text-brand hover:underline inline-flex items-center gap-1"
                      >
                        Inspect <ExternalLink size={10} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Row = ({ k, v, accent }) => (
  <div className="flex items-center justify-between">
    <span className="text-[#737987]">{k}</span>
    <span className="font-mono font-medium" style={{ color: accent || '#EDEDED' }}>
      {v}
    </span>
  </div>
);
