"use client";

import { useEffect, useMemo, useState } from "react";

import { CopilotPanel } from "@/components/copilot-panel";
import { Icon, type IconName } from "@/components/icons";
import { NetworkTopology } from "@/components/network-topology";
import { Sparkline } from "@/components/sparkline";
import {
  initialAuditEntries,
  initialIncidents,
  initialTelemetry,
  networkLinks,
  networkNodes,
} from "@/lib/data";
import {
  calculateRisk,
  nextTelemetryPoint,
} from "@/lib/predictive-engine";
import type {
  AuditEntry,
  Incident,
  NetworkNode,
  TelemetryPoint,
} from "@/lib/types";

type ViewId =
  | "overview"
  | "topology"
  | "incidents"
  | "intelligence"
  | "copilot"
  | "audit"
  | "settings";

interface NavItem {
  id: ViewId;
  label: string;
  icon: IconName;
  badge?: string;
}

const primaryNav: NavItem[] = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "topology", label: "Network topology", icon: "network" },
  { id: "incidents", label: "Incidents", icon: "incident", badge: "2" },
  { id: "intelligence", label: "Predictive intel", icon: "trend" },
  { id: "copilot", label: "Operations copilot", icon: "copilot" },
];

const secondaryNav: NavItem[] = [
  { id: "audit", label: "Audit log", icon: "audit" },
  { id: "settings", label: "System settings", icon: "settings" },
];

const pageMeta: Record<ViewId, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: "OPERATIONS / LIVE",
    title: "Network overview",
    description: "Predictive state across the isolated MPLS backbone.",
  },
  topology: {
    eyebrow: "NETWORK / GRAPH",
    title: "Topology intelligence",
    description: "Transport paths, dependencies, and node-level operational state.",
  },
  incidents: {
    eyebrow: "OPERATIONS / INCIDENTS",
    title: "Incident command",
    description: "Evidence, service impact, and response decisions.",
  },
  intelligence: {
    eyebrow: "PREDICTION / ANALYSIS",
    title: "Predictive intelligence",
    description: "Interpretable risk scoring and signal contribution.",
  },
  copilot: {
    eyebrow: "LOCAL / REASONING",
    title: "Operations copilot",
    description: "Evidence-backed analysis without external inference.",
  },
  audit: {
    eyebrow: "SECURITY / AUDIT",
    title: "Immutable audit trail",
    description: "Operator, system, and change-control activity.",
  },
  settings: {
    eyebrow: "SYSTEM / CONFIGURATION",
    title: "Runtime settings",
    description: "Isolation, inference, prediction, and approval controls.",
  },
};

function formatClock(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatPercent(value: number, fractionDigits = 1) {
  return `${value.toFixed(fractionDigits)}%`;
}

function StatCard({
  label,
  value,
  detail,
  tone,
  icon,
  chart,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "cyan" | "green" | "amber" | "red";
  icon: IconName;
  chart: number[];
}) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-card-top">
        <span className="stat-icon">
          <Icon name={icon} size={17} />
        </span>
        <span className="metric-label">{label}</span>
        <Icon className="metric-trend" name="trend" size={15} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
      <Sparkline
        color={`var(--${tone})`}
        height={38}
        label={`${label} trend`}
        values={chart}
      />
    </article>
  );
}

function RiskDial({ score }: { score: number }) {
  const radius = 44;
  const circumference = Math.PI * radius;
  const dash = (score / 100) * circumference;
  const tone = score >= 80 ? "red" : score >= 60 ? "amber" : "green";

  return (
    <div className={`risk-dial risk-${tone}`}>
      <svg aria-label={`Risk score ${score} out of 100`} role="img" viewBox="0 0 120 70">
        <path
          d="M16 62a44 44 0 0 1 88 0"
          fill="none"
          pathLength={circumference}
          stroke="var(--line)"
          strokeLinecap="round"
          strokeWidth="9"
        />
        <path
          d="M16 62a44 44 0 0 1 88 0"
          fill="none"
          pathLength={circumference}
          stroke="currentColor"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          strokeWidth="9"
        />
      </svg>
      <div className="risk-dial-value">
        <strong>{score}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}

function SeverityBadge({ incident }: { incident: Incident }) {
  return (
    <span className={`severity-badge severity-${incident.severity}`}>
      <i />
      {incident.severity}
    </span>
  );
}

export function OperationsConsole() {
  const [view, setView] = useState<ViewId>("overview");
  const [clock, setClock] = useState("--:--:--");
  const [simulationRunning, setSimulationRunning] = useState(true);
  const [tick, setTick] = useState(0);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>(initialTelemetry);
  const [selectedNodeId, setSelectedNodeId] = useState("pe-lko-03");
  const [selectedIncidentId, setSelectedIncidentId] = useState("INC-2047");
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(initialAuditEntries);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalState, setApprovalState] = useState<"idle" | "approved" | "rejected">("idle");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setClock(formatClock(new Date()));
    const clockTimer = window.setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => window.clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    if (!simulationRunning) return undefined;

    const simulationTimer = window.setInterval(() => {
      setTick((current) => current + 1);
      setTelemetry((current) => {
        const last = current.at(-1);
        if (!last) return current;
        return [...current.slice(-39), nextTelemetryPoint(last, tick + 1)];
      });
    }, 3500);

    return () => window.clearInterval(simulationTimer);
  }, [simulationRunning, tick]);

  const latest = telemetry.at(-1) ?? initialTelemetry.at(-1)!;
  const risk = useMemo(
    () =>
      calculateRisk({
        latency: latest.latency,
        packetLoss: latest.packetLoss,
        utilization: latest.utilization,
        routeFlaps: 6,
        queueGrowth: 184,
      }),
    [latest],
  );

  const selectedNode =
    networkNodes.find((node) => node.id === selectedNodeId) ?? networkNodes[0];
  const selectedIncident =
    incidents.find((incident) => incident.id === selectedIncidentId) ?? incidents[0];
  const activeCount = incidents.filter((incident) => incident.status !== "contained").length;
  const healthyNodes = networkNodes.filter((node) => node.status === "healthy").length;
  const currentMeta = pageMeta[view];

  function navigate(nextView: ViewId) {
    setView(nextView);
    setSidebarOpen(false);
  }

  function addAuditEntry(
    action: string,
    target: string,
    result: AuditEntry["result"],
  ) {
    setAuditEntries((current) => [
      {
        id: `AUD-${8712 + current.length}`,
        timestamp: formatClock(new Date()),
        actor: "operator.jsoni",
        action,
        target,
        result,
      },
      ...current,
    ]);
  }

  function approvePlan() {
    setApprovalState("approved");
    setIncidents((current) =>
      current.map((incident) =>
        incident.id === selectedIncident.id
          ? { ...incident, status: "investigating" }
          : incident,
      ),
    );
    addAuditEntry(
      "Approved staged remediation plan",
      selectedIncident.id,
      "approved",
    );
  }

  function rejectPlan() {
    setApprovalState("rejected");
    addAuditEntry(
      "Rejected staged remediation plan",
      selectedIncident.id,
      "blocked",
    );
  }

  function exportIncident() {
    const payload = {
      exportedAt: new Date().toISOString(),
      runtime: "air-gapped",
      incident: selectedIncident,
      risk,
      affectedTopology: networkLinks.filter(
        (link) =>
          selectedIncident.affectedNodes.some((name) =>
            [link.source, link.target]
              .map((id) => networkNodes.find((node) => node.id === id)?.name)
              .includes(name),
          ),
      ),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedIncident.id.toLowerCase()}-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    addAuditEntry("Exported incident report", selectedIncident.id, "recorded");
  }

  function SidebarNav({ items }: { items: NavItem[] }) {
    return (
      <nav>
        {items.map((item) => (
          <button
            className={view === item.id ? "nav-item nav-item-active" : "nav-item"}
            key={item.id}
            onClick={() => navigate(item.id)}
            type="button"
          >
            <Icon name={item.icon} size={18} />
            <span>{item.label}</span>
            {item.badge ? <b>{item.badge}</b> : null}
          </button>
        ))}
      </nav>
    );
  }

  function NodeInspector({ node }: { node: NetworkNode }) {
    const gauges = [
      { label: "CPU load", value: node.cpu, unit: "%" },
      { label: "Packet loss", value: node.packetLoss * 10, unit: `${node.packetLoss}%` },
      { label: "Temperature", value: node.temperature, unit: `${node.temperature}°C` },
    ];

    return (
      <aside className="node-inspector">
        <div className="inspector-header">
          <div className={`node-status-orb status-${node.status}`}>
            <Icon name="network" size={17} />
          </div>
          <div>
            <span className="eyebrow">{node.role.replace("-", " ")}</span>
            <h3>{node.name}</h3>
          </div>
          <span className={`status-text status-${node.status}`}>{node.status}</span>
        </div>
        <dl className="node-facts">
          <div><dt>Region</dt><dd>{node.region}</dd></div>
          <div><dt>Latency</dt><dd>{node.latency} ms</dd></div>
          <div><dt>Interfaces</dt><dd>{node.interfaces} active</dd></div>
          <div><dt>Uptime</dt><dd>{node.uptime}</dd></div>
        </dl>
        <div className="node-gauges">
          {gauges.map((gauge) => (
            <div key={gauge.label}>
              <span><b>{gauge.label}</b><em>{gauge.unit}</em></span>
              <div className="mini-progress">
                <i
                  className={gauge.value >= 80 ? "progress-critical" : ""}
                  style={{ width: `${Math.min(100, gauge.value)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <button className="secondary-button wide-button" onClick={() => setView("copilot")} type="button">
          <Icon name="copilot" size={15} />
          Analyze this node
        </button>
      </aside>
    );
  }

  function OverviewView() {
    return (
      <>
        <section className="stats-grid">
          <StatCard
            chart={telemetry.map((point) => 99.95 + (100 - point.risk) / 2000)}
            detail={`${healthyNodes} of ${networkNodes.length} nodes nominal`}
            icon="activity"
            label="SERVICE AVAILABILITY"
            tone="green"
            value="99.982%"
          />
          <StatCard
            chart={telemetry.map((point) => point.latency)}
            detail="↑ 14 ms over baseline"
            icon="clock"
            label="BACKBONE LATENCY"
            tone="amber"
            value={`${Math.round(latest.latency)} ms`}
          />
          <StatCard
            chart={telemetry.map((point) => point.utilization)}
            detail="LSP-LKO-DEL-03 at 94%"
            icon="network"
            label="PEAK UTILIZATION"
            tone="cyan"
            value={formatPercent(latest.utilization, 0)}
          />
          <StatCard
            chart={telemetry.map((point) => point.risk)}
            detail={`${risk.confidence}% model confidence`}
            icon="alert"
            label="PREDICTIVE RISK"
            tone="red"
            value={`${risk.score} / 100`}
          />
        </section>

        <section className="dashboard-grid">
          <article className="panel topology-card">
            <header className="panel-heading">
              <div>
                <span className="eyebrow">BACKBONE / LIVE STATE</span>
                <h2>Network topology</h2>
              </div>
              <button
                aria-label="Open expanded topology"
                className="icon-button"
                onClick={() => setView("topology")}
                type="button"
              >
                <Icon name="expand" size={17} />
              </button>
            </header>
            <NetworkTopology
              links={networkLinks}
              nodes={networkNodes}
              onSelectNode={setSelectedNodeId}
              selectedNodeId={selectedNodeId}
            />
          </article>

          <article className="panel risk-card">
            <header className="panel-heading">
              <div>
                <span className="eyebrow">NEXT 30 MINUTES</span>
                <h2>Failure forecast</h2>
              </div>
              <span className="prediction-badge">PREDICTED</span>
            </header>
            <RiskDial score={risk.score} />
            <div className="risk-summary">
              <strong>{risk.level.toUpperCase()} RISK</strong>
              <span>Estimated threshold crossing in {risk.leadTimeMinutes} min</span>
            </div>
            <div className="risk-contributors">
              {risk.contributors.slice(0, 4).map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <div><i style={{ width: `${Math.min(100, item.weight * 4)}%` }} /></div>
                  <b>{item.weight}</b>
                </div>
              ))}
            </div>
            <button className="secondary-button wide-button" onClick={() => setView("intelligence")} type="button">
              View predictive evidence
              <Icon name="arrow" size={15} />
            </button>
          </article>

          <article className="panel incidents-card">
            <header className="panel-heading">
              <div>
                <span className="eyebrow">ACTIVE / RECENT</span>
                <h2>Incident queue</h2>
              </div>
              <button className="text-button" onClick={() => setView("incidents")} type="button">
                View all
                <Icon name="chevron" size={14} />
              </button>
            </header>
            <div className="incident-list">
              {incidents.map((incident) => (
                <button
                  className={incident.id === selectedIncidentId ? "incident-row selected" : "incident-row"}
                  key={incident.id}
                  onClick={() => {
                    setSelectedIncidentId(incident.id);
                    setView("incidents");
                  }}
                  type="button"
                >
                  <span className={`incident-marker severity-${incident.severity}`} />
                  <span className="incident-main">
                    <b>{incident.title}</b>
                    <small>{incident.id} · {incident.detectedAt}</small>
                  </span>
                  <SeverityBadge incident={incident} />
                  <Icon name="chevron" size={14} />
                </button>
              ))}
            </div>
          </article>

          <CopilotPanel
            incidentId={selectedIncident.id}
            nodeName={selectedNode.name}
            riskScore={risk.score}
          />
        </section>
      </>
    );
  }

  function TopologyView() {
    return (
      <section className="split-view">
        <article className="panel topology-page-card">
          <header className="panel-heading">
            <div>
              <span className="eyebrow">8 NODES / 9 PATHS</span>
              <h2>National transport backbone</h2>
            </div>
            <div className="panel-actions">
              <span className="live-indicator"><i /> TELEMETRY LIVE</span>
              <button className="icon-button" type="button"><Icon name="search" size={17} /></button>
            </div>
          </header>
          <NetworkTopology
            expanded
            links={networkLinks}
            nodes={networkNodes}
            onSelectNode={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        </article>
        <NodeInspector node={selectedNode} />
      </section>
    );
  }

  function IncidentsView() {
    return (
      <section className="incident-command-grid">
        <article className="panel incident-index">
          <header className="panel-heading">
            <div>
              <span className="eyebrow">{activeCount} REQUIRE ATTENTION</span>
              <h2>Incident queue</h2>
            </div>
          </header>
          <div className="incident-list">
            {incidents.map((incident) => (
              <button
                className={incident.id === selectedIncidentId ? "incident-row selected" : "incident-row"}
                key={incident.id}
                onClick={() => {
                  setSelectedIncidentId(incident.id);
                  setApprovalState("idle");
                }}
                type="button"
              >
                <span className={`incident-marker severity-${incident.severity}`} />
                <span className="incident-main">
                  <b>{incident.title}</b>
                  <small>{incident.id} · {incident.status}</small>
                </span>
                <SeverityBadge incident={incident} />
              </button>
            ))}
          </div>
        </article>

        <article className="panel incident-detail">
          <header className="incident-detail-heading">
            <div>
              <div className="incident-id-line">
                <SeverityBadge incident={selectedIncident} />
                <span>{selectedIncident.id}</span>
                <span>{selectedIncident.detectedAt}</span>
              </div>
              <h2>{selectedIncident.title}</h2>
              <p>{selectedIncident.summary}</p>
            </div>
            <button className="secondary-button" onClick={exportIncident} type="button">
              <Icon name="download" size={15} />
              Export
            </button>
          </header>

          <div className="incident-kpis">
            <div><span>Confidence</span><strong>{selectedIncident.confidence}%</strong></div>
            <div><span>Forecast lead</span><strong>{selectedIncident.predictedIn || "—"} min</strong></div>
            <div><span>Affected nodes</span><strong>{selectedIncident.affectedNodes.length}</strong></div>
            <div><span>Status</span><strong>{selectedIncident.status}</strong></div>
          </div>

          <div className="incident-sections">
            <section>
              <span className="eyebrow">CORRELATED EVIDENCE</span>
              <h3>Why this alert was raised</h3>
              <ol className="signal-list">
                {selectedIncident.signals.map((signal, index) => (
                  <li key={signal}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {signal}
                  </li>
                ))}
              </ol>
            </section>
            <section>
              <span className="eyebrow">DEPENDENCY GRAPH</span>
              <h3>Potential service impact</h3>
              <div className="affected-chips">
                {selectedIncident.affectedNodes.map((node) => <span key={node}>{node}</span>)}
              </div>
              <p className="section-copy">
                Priority services remain recoverable through the Hyderabad backup path. Best-effort traffic is exposed to elevated latency.
              </p>
            </section>
          </div>

          <div className="remediation-callout">
            <div className="remediation-icon"><Icon name="shield" size={19} /></div>
            <div>
              <span className="eyebrow">RECOMMENDED RESPONSE</span>
              <p>{selectedIncident.recommendedAction}</p>
            </div>
            <button
              className="primary-button"
              disabled={selectedIncident.status === "contained"}
              onClick={() => {
                setApprovalOpen(true);
                setApprovalState("idle");
              }}
              type="button"
            >
              Review plan
              <Icon name="arrow" size={15} />
            </button>
          </div>
        </article>
      </section>
    );
  }

  function IntelligenceView() {
    return (
      <section className="intel-grid">
        <article className="panel forecast-chart-card">
          <header className="panel-heading">
            <div>
              <span className="eyebrow">ROLLING 40-MINUTE WINDOW</span>
              <h2>Failure probability</h2>
            </div>
            <span className="prediction-badge">{risk.confidence}% CONFIDENCE</span>
          </header>
          <div className="large-chart">
            <div className="chart-y-axis"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
            <div className="chart-plot">
              <div className="threshold-line"><span>CRITICAL THRESHOLD</span></div>
              <Sparkline
                color="var(--red)"
                height={240}
                label="Failure probability over time"
                values={telemetry.map((point) => point.risk)}
              />
              <div className="chart-x-axis"><span>-40m</span><span>-30m</span><span>-20m</span><span>-10m</span><span>NOW</span></div>
            </div>
          </div>
        </article>
        <article className="panel contributor-card">
          <header className="panel-heading">
            <div>
              <span className="eyebrow">INTERPRETABLE MODEL</span>
              <h2>Signal contribution</h2>
            </div>
          </header>
          <RiskDial score={risk.score} />
          <div className="contributor-list">
            {risk.contributors.map((item, index) => (
              <div key={item.label}>
                <span className="contributor-rank">{String(index + 1).padStart(2, "0")}</span>
                <span>{item.label}</span>
                <div><i style={{ width: `${Math.min(100, item.weight * 4)}%` }} /></div>
                <strong>+{item.weight}</strong>
              </div>
            ))}
          </div>
        </article>
        <article className="panel model-card">
          <header className="panel-heading">
            <div>
              <span className="eyebrow">MODEL INTEGRITY</span>
              <h2>Prediction pipeline</h2>
            </div>
            <span className="integrity-badge"><Icon name="check" size={13} /> VERIFIED</span>
          </header>
          <div className="pipeline">
            {[
              ["01", "Collect", "SNMP · syslog · tunnel state"],
              ["02", "Normalize", "Windowed features · baseline"],
              ["03", "Score", "Inspectable weighted risk"],
              ["04", "Validate", "Topology dependency check"],
              ["05", "Explain", "Evidence-bound response"],
            ].map(([number, title, detail], index) => (
              <div className="pipeline-step" key={number}>
                <span>{number}</span>
                <div><strong>{title}</strong><small>{detail}</small></div>
                {index < 4 ? <Icon name="chevron" size={15} /> : null}
              </div>
            ))}
          </div>
        </article>
      </section>
    );
  }

  function AuditView() {
    return (
      <article className="panel audit-page-card">
        <header className="panel-heading">
          <div>
            <span className="eyebrow">SIGNED LOCAL RECORDS</span>
            <h2>System and operator activity</h2>
          </div>
          <button className="secondary-button" type="button">
            <Icon name="download" size={15} />
            Export log
          </button>
        </header>
        <div className="audit-table" role="table" aria-label="Audit activity">
          <div className="audit-row audit-header" role="row">
            <span>Record</span><span>Time</span><span>Actor</span><span>Action</span><span>Target</span><span>Result</span>
          </div>
          {auditEntries.map((entry) => (
            <div className="audit-row" key={entry.id} role="row">
              <code>{entry.id}</code>
              <span>{entry.timestamp}</span>
              <span>{entry.actor}</span>
              <strong>{entry.action}</strong>
              <span>{entry.target}</span>
              <span className={`audit-result result-${entry.result}`}>{entry.result}</span>
            </div>
          ))}
        </div>
      </article>
    );
  }

  function SettingsView() {
    const settings = [
      {
        icon: "wifi-off" as IconName,
        title: "Air-gap enforcement",
        description: "Block all non-loopback runtime connections.",
        value: "ENFORCED",
        enabled: true,
      },
      {
        icon: "copilot" as IconName,
        title: "Local reasoning adapter",
        description: "Use deterministic fallback when no local model is available.",
        value: "READY",
        enabled: true,
      },
      {
        icon: "shield" as IconName,
        title: "Operator approval",
        description: "Require approval before every proposed network change.",
        value: "REQUIRED",
        enabled: true,
      },
      {
        icon: "activity" as IconName,
        title: "Predictive telemetry",
        description: "Score route, queue, loss, latency, and utilization signals.",
        value: simulationRunning ? "STREAMING" : "PAUSED",
        enabled: simulationRunning,
      },
    ];

    return (
      <section className="settings-grid">
        <article className="panel settings-card">
          <header className="panel-heading">
            <div>
              <span className="eyebrow">SECURITY POSTURE</span>
              <h2>Runtime controls</h2>
            </div>
          </header>
          <div className="settings-list">
            {settings.map((setting) => (
              <div className="setting-row" key={setting.title}>
                <span className="setting-icon"><Icon name={setting.icon} size={18} /></span>
                <div><strong>{setting.title}</strong><p>{setting.description}</p></div>
                <span className="setting-value">{setting.value}</span>
                <button
                  aria-label={`Toggle ${setting.title}`}
                  className={`toggle ${setting.enabled ? "toggle-on" : ""}`}
                  onClick={() => {
                    if (setting.title === "Predictive telemetry") {
                      setSimulationRunning((current) => !current);
                    }
                  }}
                  type="button"
                >
                  <i />
                </button>
              </div>
            ))}
          </div>
        </article>
        <article className="panel integrity-card">
          <span className="integrity-shield"><Icon name="shield" size={38} /></span>
          <span className="eyebrow">ISOLATION STATUS</span>
          <h2>Runtime verified</h2>
          <p>No external model, CDN, font, image, analytics, or telemetry dependency is required at runtime.</p>
          <dl>
            <div><dt>External endpoints</dt><dd>0</dd></div>
            <div><dt>Local services</dt><dd>3</dd></div>
            <div><dt>Last integrity check</dt><dd>{clock}</dd></div>
          </dl>
        </article>
      </section>
    );
  }

  function CurrentView() {
    switch (view) {
      case "topology":
        return <TopologyView />;
      case "incidents":
        return <IncidentsView />;
      case "intelligence":
        return <IntelligenceView />;
      case "copilot":
        return (
          <div className="copilot-page">
            <CopilotPanel
              fullPage
              incidentId={selectedIncident.id}
              nodeName={selectedNode.name}
              riskScore={risk.score}
            />
            <aside className="copilot-context panel">
              <span className="eyebrow">BOUND CONTEXT</span>
              <h2>{selectedIncident.id}</h2>
              <p>{selectedIncident.title}</p>
              <dl>
                <div><dt>Risk</dt><dd>{risk.score}/100</dd></div>
                <div><dt>Confidence</dt><dd>{selectedIncident.confidence}%</dd></div>
                <div><dt>Lead time</dt><dd>{selectedIncident.predictedIn} min</dd></div>
                <div><dt>Primary node</dt><dd>{selectedNode.name}</dd></div>
              </dl>
              <button className="secondary-button wide-button" onClick={() => setView("incidents")} type="button">
                Open incident record
                <Icon name="arrow" size={15} />
              </button>
            </aside>
          </div>
        );
      case "audit":
        return <AuditView />;
      case "settings":
        return <SettingsView />;
      default:
        return <OverviewView />;
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Icon name="network" size={20} />
          </span>
          <div>
            <strong>MPLS <em>SENTINEL</em></strong>
            <span>PREDICTIVE OPERATIONS</span>
          </div>
          <button
            aria-label="Close navigation"
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            type="button"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="sidebar-section">
          <span className="nav-label">COMMAND</span>
          <SidebarNav items={primaryNav} />
        </div>

        <div className="sidebar-section sidebar-section-bottom">
          <span className="nav-label">SYSTEM</span>
          <SidebarNav items={secondaryNav} />
        </div>

        <div className="airgap-card">
          <div className="airgap-card-icon">
            <Icon name="wifi-off" size={19} />
          </div>
          <div>
            <strong>AIR-GAP SECURE</strong>
            <span>Zero external egress</span>
          </div>
          <Icon name="check" size={16} />
        </div>

        <div className="operator-card">
          <span className="operator-avatar">JS</span>
          <div>
            <strong>Network Operator</strong>
            <span>Level 3 clearance</span>
          </div>
          <span className="online-dot" />
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          aria-label="Close menu overlay"
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          type="button"
        />
      ) : null}

      <main className="main-content">
        <header className="topbar">
          <button
            aria-label="Open navigation"
            className="mobile-menu"
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            <Icon name="overview" size={19} />
          </button>
          <div className="system-scope">
            <span>DOMAIN</span>
            <strong>NATIONAL MPLS BACKBONE</strong>
            <Icon name="chevron" size={13} />
          </div>
          <div className="topbar-divider" />
          <div className="environment-chip">
            <i />
            PRODUCTION MIRROR
          </div>
          <div className="topbar-spacer" />
          <button
            className="simulation-control"
            onClick={() => setSimulationRunning((current) => !current)}
            type="button"
          >
            <Icon name={simulationRunning ? "pause" : "play"} size={14} />
            {simulationRunning ? "PAUSE STREAM" : "RESUME STREAM"}
          </button>
          <div className="clock-block">
            <span>LOCAL SYSTEM TIME</span>
            <strong>{clock}</strong>
          </div>
          <button aria-label="Operator account" className="icon-button account-button" type="button">
            <Icon name="user" size={17} />
          </button>
        </header>

        <div className="content-wrapper">
          <header className="page-heading">
            <div>
              <span className="eyebrow">{currentMeta.eyebrow}</span>
              <h1>{currentMeta.title}</h1>
              <p>{currentMeta.description}</p>
            </div>
            <div className="heading-status">
              <span className="system-health">
                <i />
                SYSTEM OPERATIONAL
              </span>
              <span className="last-sync">Last local sync · {clock}</span>
            </div>
          </header>

          <CurrentView />
        </div>
      </main>

      {approvalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-labelledby="approval-title"
            aria-modal="true"
            className="approval-modal"
            role="dialog"
          >
            <header>
              <div>
                <span className="eyebrow">HUMAN-IN-THE-LOOP CONTROL</span>
                <h2 id="approval-title">Review remediation plan</h2>
              </div>
              <button
                aria-label="Close approval dialog"
                className="icon-button"
                onClick={() => setApprovalOpen(false)}
                type="button"
              >
                <Icon name="close" size={17} />
              </button>
            </header>

            {approvalState === "idle" ? (
              <>
                <div className="change-warning">
                  <Icon name="alert" size={19} />
                  This is an approval record. The demonstration never changes a real network.
                </div>
                <ol className="plan-steps">
                  <li><span>01</span><div><strong>Validate backup capacity</strong><p>PW-PAT-HYD-BK has 68% available headroom.</p></div><Icon name="check" size={16} /></li>
                  <li><span>02</span><div><strong>Shift priority traffic</strong><p>Apply the staged service-class routing policy.</p></div><Icon name="arrow" size={16} /></li>
                  <li><span>03</span><div><strong>Dampen unstable route</strong><p>Limit repeated control-plane churn for 10 minutes.</p></div><Icon name="arrow" size={16} /></li>
                  <li><span>04</span><div><strong>Observe and verify</strong><p>Require packet loss below 0.5% before closure.</p></div><Icon name="eye" size={16} /></li>
                </ol>
                <div className="approval-policy">
                  <Icon name="lock" size={16} />
                  Policy CC-04 · Operator approval required · Full rollback prepared
                </div>
                <footer>
                  <button className="danger-button" onClick={rejectPlan} type="button">Reject plan</button>
                  <button className="primary-button" onClick={approvePlan} type="button">
                    <Icon name="shield" size={16} />
                    Approve staged plan
                  </button>
                </footer>
              </>
            ) : (
              <div className={`approval-result approval-${approvalState}`}>
                <span><Icon name={approvalState === "approved" ? "check" : "close"} size={30} /></span>
                <h3>Plan {approvalState}</h3>
                <p>
                  The decision was written to the local audit trail. No network configuration was changed.
                </p>
                <button className="primary-button" onClick={() => setApprovalOpen(false)} type="button">
                  Return to incident
                </button>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
