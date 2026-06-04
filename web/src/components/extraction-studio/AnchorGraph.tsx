import React, { useRef, useState, useEffect } from "react";
import { Anchor } from "lucide-react";

interface AnchorNode {
  id: string;
  type: string;
  value: string;
  confidence: number;
  x: number; // percentage
  y: number;
  width: number;
  height: number;
}

interface AnchorLink {
  fieldId: string;
  anchorId: string;
  relationship: string;
  confidence: number;
}

interface AnchorGraphProps {
  anchors: AnchorNode[];
  links: AnchorLink[];
  fields: Array<{ id: string; name: string; x: number; y: number; width: number; height: number }>;
  activeFieldId: string | null;
  onSelectAnchor?: (id: string) => void;
}

export function AnchorGraph({ anchors, links, fields, activeFieldId }: AnchorGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    // Set initial size
    setDimensions({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // If no fields or no anchors, we can't draw anything
  if (fields.length === 0 && anchors.length === 0) return null;

  const toPxX = (percent: number) => (percent / 100) * dimensions.width;
  const toPxY = (percent: number) => (percent / 100) * dimensions.height;
  const getRelationshipStyle = (link: AnchorLink, index: number) => {
    const text = `${link.relationship || ""}`.toLowerCase();
    if (text.includes("broken")) return { color: "#ef4444", arrow: "arrow-red", label: "Broken Anchor" };
    if (text.includes("ocr") || text.includes("ai")) return { color: "#8b5cf6", arrow: "arrow-purple", label: "AI Anchor" };
    if (text.includes("pattern") || text.includes("fallback")) return { color: "#f59e0b", arrow: "arrow-amber", label: "Fallback Anchor" };
    if (text.includes("relative") || text.includes("secondary") || index === 1) return { color: "#10b981", arrow: "arrow-emerald", label: "Secondary Anchor" };
    return { color: "#3b82f6", arrow: "arrow-blue", label: "Primary Anchor" };
  };

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none select-none z-20">
      {/* SVG Canvas to Draw Lines between Field BBox and Anchor BBoxes */}
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        <defs>
          {/* Directional Arrow Markers for different anchor type colors */}
          <marker id="arrow-orange" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f97316" />
          </marker>
          <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
          </marker>
          <marker id="arrow-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8b5cf6" />
          </marker>
          <marker id="arrow-pink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ec4899" />
          </marker>
          <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3b82f6" />
          </marker>
          <marker id="arrow-emerald" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
          </marker>
          <marker id="arrow-gray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
          </marker>
          <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ef4444" />
          </marker>

          {/* Glowing Neon Line Gradients */}
          <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#fb923c" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.8" />
          </linearGradient>
          
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {dimensions.width > 0 && dimensions.height > 0 && links.map((link, idx) => {
          const field = fields.find(f => f.id === link.fieldId);
          const anchor = anchors.find(a => a.id === link.anchorId);
          if (!field || !anchor) return null;

          // Determine if this specific connection is active
          const isActive = activeFieldId ? (activeFieldId === link.fieldId || activeFieldId === link.anchorId) : false;

          // Calculate center positions in pixels
          const fCenterX = toPxX(field.x + field.width / 2);
          const fCenterY = toPxY(field.y + field.height / 2);
          const aCenterX = toPxX(anchor.x + anchor.width / 2);
          const aCenterY = toPxY(anchor.y + anchor.height / 2);

          // Bezier control points for smooth visual connector curves (Anchor to Field)
          const ctrlX1 = aCenterX;
          const ctrlY1 = (aCenterY + fCenterY) / 2;
          const ctrlX2 = fCenterX;
          const ctrlY2 = (aCenterY + fCenterY) / 2;

          // Path starting from Anchor and ending at Field (so animated dashes flow toward the field)
          const pathD = `M ${aCenterX} ${aCenterY} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${fCenterX} ${fCenterY}`;

          const style = getRelationshipStyle(link, idx);
          const pathColor = style.color;
          const arrowId = style.arrow;

          return (
            <g key={idx}>
              {isActive && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={pathColor}
                  strokeOpacity="0.18"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
              )}
              <path
                d={pathD}
                fill="none"
                stroke={pathColor}
                strokeDasharray={isActive ? "7 5" : "3 5"}
                strokeOpacity={isActive ? 0.95 : 0.45}
                strokeWidth={isActive ? 2.1 : 1.2}
                markerEnd={`url(#${arrowId})`}
                className={isActive ? "animate-flow" : undefined}
              />
              {isActive && (
                <foreignObject
                  x={(fCenterX + aCenterX) / 2 - 50}
                  y={(fCenterY + aCenterY) / 2 - 8}
                  width="100"
                  height="16"
                  className="overflow-visible"
                >
                  <div 
                    style={{ borderColor: pathColor, color: pathColor }}
                    className="bg-white/95 border rounded-full px-2 py-0.5 flex items-center justify-center gap-1 shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-[6.5px] font-black uppercase whitespace-nowrap"
                  >
                    <Anchor size={6} />
                    <span className="truncate">{style.label} &rarr; {field.name}</span>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default AnchorGraph;
