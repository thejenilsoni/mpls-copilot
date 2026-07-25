"use client";

import { useMemo } from "react";

import type { NetworkLink, NetworkNode } from "@/lib/types";

interface NetworkTopologyProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  expanded?: boolean;
}

const statusColors = {
  healthy: "#58d6a5",
  warning: "#f2c14e",
  critical: "#ff6b6b",
  offline: "#6f7885",
};

export function NetworkTopology({
  nodes,
  links,
  selectedNodeId,
  onSelectNode,
  expanded = false,
}: NetworkTopologyProps) {
  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );

  return (
    <div className={`topology-shell ${expanded ? "topology-expanded" : ""}`}>
      <div className="topology-grid" aria-hidden="true" />
      <svg
        aria-label="Interactive MPLS network topology"
        className="topology-svg"
        role="img"
        viewBox="0 0 100 108"
      >
        <defs>
          <filter id="nodeGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker
            id="arrowHealthy"
            markerHeight="4"
            markerWidth="4"
            orient="auto"
            refX="2"
            refY="2"
          >
            <path d="M0,0 L4,2 L0,4 Z" fill="#58d6a5" opacity=".7" />
          </marker>
        </defs>

        {links.map((link) => {
          const source = nodeMap.get(link.source);
          const target = nodeMap.get(link.target);
          if (!source || !target) return null;
          const color = statusColors[link.status];

          return (
            <g key={link.id}>
              <line
                stroke="#14283c"
                strokeWidth="1.6"
                x1={source.x}
                x2={target.x}
                y1={source.y}
                y2={target.y}
              />
              <line
                className={link.status === "critical" ? "critical-link" : "data-link"}
                markerEnd={link.status === "healthy" ? "url(#arrowHealthy)" : undefined}
                stroke={color}
                strokeDasharray={link.status === "critical" ? "2.2 1.8" : undefined}
                strokeOpacity={link.status === "healthy" ? 0.58 : 0.9}
                strokeWidth={Math.max(0.48, link.utilization / 110)}
                x1={source.x}
                x2={target.x}
                y1={source.y}
                y2={target.y}
              />
            </g>
          );
        })}

        {nodes.map((node) => {
          const selected = selectedNodeId === node.id;
          const color = statusColors[node.status];
          const radius = node.role === "core" ? 4.3 : node.role === "provider-edge" ? 3.5 : 3;

          return (
            <g
              className="topology-node"
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  onSelectNode(node.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              {selected ? (
                <circle
                  className="selection-ring"
                  cx={node.x}
                  cy={node.y}
                  fill="none"
                  r={radius + 3.2}
                  stroke={color}
                  strokeWidth=".45"
                />
              ) : null}
              {node.status === "critical" ? (
                <circle
                  className="pulse-ring"
                  cx={node.x}
                  cy={node.y}
                  fill="none"
                  r={radius + 1.5}
                  stroke={color}
                  strokeWidth=".6"
                />
              ) : null}
              <circle
                cx={node.x}
                cy={node.y}
                fill="#07131f"
                filter={node.status !== "healthy" ? "url(#nodeGlow)" : undefined}
                r={radius}
                stroke={color}
                strokeWidth={selected ? 1.2 : 0.75}
              />
              <circle
                cx={node.x}
                cy={node.y}
                fill={color}
                r={radius * 0.28}
              />
              <text
                className="node-name"
                textAnchor="middle"
                x={node.x}
                y={node.y + radius + 4.5}
              >
                {node.name}
              </text>
              <text
                className="node-meta"
                textAnchor="middle"
                x={node.x}
                y={node.y + radius + 7.5}
              >
                {node.region.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="topology-legend">
        {Object.entries(statusColors)
          .slice(0, 3)
          .map(([status, color]) => (
            <span key={status}>
              <i style={{ background: color }} />
              {status}
            </span>
          ))}
      </div>
    </div>
  );
}
