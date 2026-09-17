import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network, Search, ZoomIn, ZoomOut, RotateCcw, Filter,
  Building2, FileText, ArrowUpRight, ShieldAlert, Users,
} from 'lucide-react';
import { formatINR } from '../../lib/format';
import { useNavigate } from 'react-router-dom';

const NODE_COLORS = {
  VENDOR: '#4D8CFF',
  DEPARTMENT: '#8B5CF6',
  TENDER: '#F15252',
};

export const RelationshipGraph = ({ data, onSelectNode, selectedId = null, height = 520 }) => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [zoom, setZoom] = useState(1.0);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [activeNode, setActiveNode] = useState(null);

  const rawNodes = useMemo(() => data?.nodes || [], [data?.nodes]);
  const rawLinks = useMemo(() => data?.links || [], [data?.links]);

  // Filter nodes based on type and search query
  const filteredNodes = useMemo(() => {
    return rawNodes.filter((n) => {
      const matchType = filterType === 'ALL' || n.type === filterType;
      const matchSearch = !searchTerm || n.label.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
    });
  }, [rawNodes, filterType, searchTerm]);

  const activeNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredLinks = useMemo(() => {
    return rawLinks.filter((l) => activeNodeIds.has(l.source) && activeNodeIds.has(l.target));
  }, [rawLinks, activeNodeIds]);

  // Compute deterministic coordinates (Force-radial layout)
  const nodePositions = useMemo(() => {
    const width = 840;
    const h = height;
    const centerX = width / 2;
    const centerY = h / 2;
    const positions = {};

    const deptNodes = filteredNodes.filter((n) => n.type === 'DEPARTMENT');
    const vendorNodes = filteredNodes.filter((n) => n.type === 'VENDOR');
    const tenderNodes = filteredNodes.filter((n) => n.type === 'TENDER');

    // Inner ring: Departments
    deptNodes.forEach((node, i) => {
      const angle = (i / Math.max(1, deptNodes.length)) * 2 * Math.PI;
      const radius = 110;
      positions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        ...node,
      };
    });

    // Middle ring: Vendors
    vendorNodes.forEach((node, i) => {
      const angle = (i / Math.max(1, vendorNodes.length)) * 2 * Math.PI;
      const radius = 220;
      positions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        ...node,
      };
    });

    // Outer ring: High-Risk Tenders
    tenderNodes.forEach((node, i) => {
      const angle = (i / Math.max(1, tenderNodes.length)) * 2 * Math.PI + 0.2;
      const radius = 320;
      positions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        ...node,
      };
    });

    return positions;
  }, [filteredNodes, height]);

  const handleNodeClick = (node) => {
    setActiveNode(node);
    if (onSelectNode) onSelectNode(node);
  };

  return (
    <div className="relative rounded-lg border border-hairline bg-[#0D0F12] overflow-hidden">
      {/* Graph Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-hairline bg-[#121417]/80 backdrop-blur-sm z-10 relative">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-[#090A0C] border border-hairline text-xs text-[#EDEDED] min-w-[200px]">
            <Search size={13} className="text-[#737987]" />
            <input
              type="text"
              placeholder="Search vendor, department, tender..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-[#EDEDED] placeholder:text-[#5C616D] w-full"
            />
          </div>

          <div className="flex items-center rounded-md bg-[#090A0C] border border-hairline p-0.5 text-xs">
            {['ALL', 'VENDOR', 'DEPARTMENT', 'TENDER'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                  filterType === t
                    ? 'bg-[#1C2028] text-[#EDEDED] shadow-sm'
                    : 'text-[#737987] hover:text-[#A0A5B0]'
                }`}
              >
                {t === 'ALL' ? 'All Entities' : t.charAt(0) + t.slice(1).toLowerCase() + 's'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-3 text-[11px] text-[#A0A5B0] mr-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#4D8CFF]" /> Vendor
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" /> Department
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#F15252]" /> Priority Tender
            </span>
          </div>

          <button
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.15))}
            className="w-7 h-7 rounded border border-hairline bg-[#16191E] flex items-center justify-center text-[#A0A5B0] hover:text-white"
            title="Zoom in"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            className="w-7 h-7 rounded border border-hairline bg-[#16191E] flex items-center justify-center text-[#A0A5B0] hover:text-white"
            title="Zoom out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={() => { setZoom(1.0); setSearchTerm(''); setFilterType('ALL'); setActiveNode(null); }}
            className="w-7 h-7 rounded border border-hairline bg-[#16191E] flex items-center justify-center text-[#A0A5B0] hover:text-white"
            title="Reset layout"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="overflow-hidden relative flex items-center justify-center" style={{ height }}>
        <svg
          viewBox="0 0 840 520"
          className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Subtle grid pattern */}
          <defs>
            <pattern id="graph-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.6" fill="#272A30" />
            </pattern>
          </defs>
          <rect width="840" height="520" fill="url(#graph-grid)" />

          {/* Links / Edges */}
          <g className="links">
            {filteredLinks.map((link, idx) => {
              const src = nodePositions[link.source];
              const tgt = nodePositions[link.target];
              if (!src || !tgt) return null;

              const isHighlighted =
                activeNode && (activeNode.id === link.source || activeNode.id === link.target);

              return (
                <line
                  key={`link-${idx}`}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={isHighlighted ? '#EDEDED' : link.color || '#272A30'}
                  strokeWidth={isHighlighted ? 2.2 : 0.9}
                  strokeDasharray={link.type === 'CO_BIDDING_PATTERN' ? '3 3' : undefined}
                  opacity={isHighlighted ? 0.9 : 0.35}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {Object.values(nodePositions).map((node) => {
              const isSelected = activeNode?.id === node.id || selectedId === node.id;
              const isHovered = hoveredNode?.id === node.id;
              const radius = node.type === 'DEPARTMENT' ? 14 : node.type === 'VENDOR' ? 10 : 8;
              const color = NODE_COLORS[node.type] || '#4D8CFF';

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => handleNodeClick(node)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer group"
                >
                  {/* Glow halo */}
                  {(isSelected || isHovered) && (
                    <circle r={radius + 7} fill={color} opacity={0.25} />
                  )}

                  <circle
                    r={radius}
                    fill="#121417"
                    stroke={isSelected ? '#FFFFFF' : color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="transition-all duration-150"
                  />

                  {/* Inner indicator */}
                  <circle r={radius - 4} fill={color} opacity={0.85} />

                  {/* Label on hover / selected */}
                  {(isSelected || isHovered || node.type === 'DEPARTMENT') && (
                    <text
                      y={radius + 12}
                      textAnchor="middle"
                      className="text-[9px] font-mono select-none fill-[#EDEDED]"
                      style={{ pointerEvents: 'none', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
                    >
                      {node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Tooltip */}
        {hoveredNode && (
          <div
            className="absolute bottom-4 left-4 z-20 pointer-events-none rounded-md border border-hairline bg-[#16191E]/95 p-3 shadow-xl backdrop-blur max-w-xs"
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: NODE_COLORS[hoveredNode.type] || '#4D8CFF' }}
              />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#737987]">
                {hoveredNode.type}
              </span>
            </div>
            <div className="text-xs font-semibold text-[#EDEDED] leading-tight">{hoveredNode.label}</div>
            <div className="text-[10px] text-[#A0A5B0] mt-1">Click node to inspect relationships</div>
          </div>
        )}

        {/* Selected Entity Inspector Panel */}
        <AnimatePresence>
          {activeNode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-16 right-4 bottom-4 w-80 rounded-lg border border-hairline bg-[#141821]/95 backdrop-blur-md p-4 shadow-2xl z-30 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: NODE_COLORS[activeNode.type] || '#4D8CFF' }}
                    />
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#737987]">
                      {activeNode.type} Dossier
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveNode(null)}
                    className="text-xs text-[#737987] hover:text-[#EDEDED]"
                  >
                    ✕
                  </button>
                </div>

                <h3 className="text-sm font-semibold text-[#EDEDED] mb-2 leading-snug">
                  {activeNode.label}
                </h3>

                {activeNode.meta ? (
                  <div className="space-y-2 text-xs text-[#A0A5B0] mb-4">
                    <div className="p-2 rounded bg-[#0D0F12] border border-hairline">
                      <div className="text-[10px] text-[#737987]">Procurement Title</div>
                      <div className="text-xs text-[#EDEDED] font-medium mt-0.5">{activeNode.meta.title}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-[#0D0F12] border border-hairline">
                        <div className="text-[10px] text-[#737987]">Awarded Sum</div>
                        <div className="text-xs font-mono text-[#EDEDED] font-semibold">{formatINR(activeNode.meta.value)}</div>
                      </div>
                      <div className="p-2 rounded bg-[#0D0F12] border border-hairline">
                        <div className="text-[10px] text-[#737987]">Authority</div>
                        <div className="text-xs text-[#EDEDED] truncate">{activeNode.meta.department}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded bg-[#0D0F12] border border-hairline mb-4 text-xs text-[#A0A5B0]">
                    Connected across the procurement graph through awards, tenders, and co-bidding patterns.
                    <div className="text-[10px] text-[#737987] mt-1.5 italic">
                      Observable relationship in the synthetic demonstration dataset.
                    </div>
                  </div>
                )}
              </div>

              <div>
                {activeNode.type === 'TENDER' && (
                  <button
                    onClick={() => navigate(`/tenders/${activeNode.label}`)}
                    className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md bg-[#EDEDED] text-[#0D0F12] text-xs font-medium hover:bg-white transition-colors"
                  >
                    Open Tender Dossier <ArrowUpRight size={13} />
                  </button>
                )}
                {activeNode.type === 'VENDOR' && (
                  <button
                    onClick={() => navigate(`/vendors`)}
                    className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md bg-[#EDEDED] text-[#0D0F12] text-xs font-medium hover:bg-white transition-colors"
                  >
                    Inspect Vendor Profile <ArrowUpRight size={13} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
