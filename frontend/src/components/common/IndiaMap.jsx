import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INDIA_SVG_MAP } from '../../data/indiaSvg';
import { RISK_TIERS } from '../../data/constants';
import { formatCr } from '../../lib/format';

// Interactive India choropleth. States are colored by risk tier and reveal a
// tooltip on hover; clicking a mapped state routes to the Risk Monitor filtered
// by that state.
export const IndiaMap = ({ states = [], onSelectState }) => {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const navigate = useNavigate();

  const byCode = useMemo(() => {
    const m = {};
    states.forEach((s) => { m[s.code] = s; });
    return m;
  }, [states]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const svg = root.querySelector('svg');
    if (svg) {
      svg.removeAttribute('height');
      svg.removeAttribute('width');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }
    const paths = root.querySelectorAll('path');
    const handlers = [];

    paths.forEach((path) => {
      const code = path.getAttribute('id');
      const agg = byCode[code];
      if (agg) {
        const t = RISK_TIERS[agg.riskTier] || RISK_TIERS.LOW;
        path.style.fill = t.color;
        path.style.fillOpacity = '0.72';
      } else {
        path.style.fill = '#1A1D21';
        path.style.fillOpacity = '1';
        path.style.cursor = 'default';
      }

      const enter = (e) => {
        if (!agg) return;
        path.style.fillOpacity = '1';
        setTooltip({ agg });
        move(e);
      };
      const move = (e) => {
        if (!agg) return;
        const rect = root.getBoundingClientRect();
        setTooltip((prev) => (prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : prev));
      };
      const leave = () => {
        if (!agg) return;
        path.style.fillOpacity = '0.72';
        setTooltip(null);
      };
      const click = () => {
        if (!agg) return;
        if (onSelectState) onSelectState(agg);
        else navigate(`/risk?state=${agg.code}`);
      };
      path.addEventListener('mouseenter', enter);
      path.addEventListener('mousemove', move);
      path.addEventListener('mouseleave', leave);
      path.addEventListener('click', click);
      handlers.push([path, enter, move, leave, click]);
    });

    return () => {
      handlers.forEach(([p, e, m, l, c]) => {
        p.removeEventListener('mouseenter', e);
        p.removeEventListener('mousemove', m);
        p.removeEventListener('mouseleave', l);
        p.removeEventListener('click', c);
      });
    };
  }, [byCode, navigate, onSelectState]);

  return (
    <div className="relative w-full" ref={containerRef} data-testid="india-risk-map">
      <div className="india-map-svg mx-auto max-w-[420px]" dangerouslySetInnerHTML={{ __html: INDIA_SVG_MAP }} />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-30 w-52 bg-[#0D0F12] border border-hairline rounded-md p-3 shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
          style={{ left: Math.min(tooltip.x + 14, 300), top: tooltip.y + 14 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#EDEDED]">{tooltip.agg.name}</span>
            <span className="text-[10px] font-mono uppercase" style={{ color: (RISK_TIERS[tooltip.agg.riskTier] || RISK_TIERS.LOW).color }}>
              {(RISK_TIERS[tooltip.agg.riskTier] || RISK_TIERS.LOW).label}
            </span>
          </div>
          <div className="mt-2 space-y-1 text-[11px]">
            <Row k="Total works" v={tooltip.agg.works.toLocaleString('en-IN')} />
            <Row k="High-risk works" v={tooltip.agg.highRisk} accent="#F59638" />
            <Row k="Sanctioned" v={formatCr(tooltip.agg.sanctioned)} />
            <Row k="Avg risk score" v={tooltip.agg.avgRisk} />
          </div>
          <div className="mt-2 pt-2 border-t border-divider text-[10px] text-[#737987]">Click to open Risk Monitor →</div>
        </div>
      )}
    </div>
  );
};

const Row = ({ k, v, accent }) => (
  <div className="flex items-center justify-between">
    <span className="text-[#737987]">{k}</span>
    <span className="font-mono" style={{ color: accent || '#EDEDED' }}>{v}</span>
  </div>
);
