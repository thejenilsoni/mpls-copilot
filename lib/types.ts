export type NodeStatus = "healthy" | "warning" | "critical" | "offline";
export type Severity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "active" | "investigating" | "contained";

export interface NetworkNode {
  id: string;
  name: string;
  role: "core" | "provider-edge" | "customer-edge";
  region: string;
  x: number;
  y: number;
  status: NodeStatus;
  latency: number;
  packetLoss: number;
  cpu: number;
  temperature: number;
  uptime: string;
  interfaces: number;
}

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  utilization: number;
  capacityGbps: number;
  status: NodeStatus;
  label: string;
}

export interface Incident {
  id: string;
  title: string;
  summary: string;
  severity: Severity;
  status: IncidentStatus;
  confidence: number;
  predictedIn: number;
  detectedAt: string;
  affectedNodes: string[];
  signals: string[];
  recommendedAction: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  result: "recorded" | "approved" | "blocked";
}

export interface TelemetryPoint {
  timestamp: number;
  latency: number;
  packetLoss: number;
  utilization: number;
  risk: number;
}

export interface RiskAssessment {
  score: number;
  level: "nominal" | "elevated" | "high" | "critical";
  confidence: number;
  contributors: Array<{ label: string; weight: number }>;
  leadTimeMinutes: number;
}

export interface CopilotMessage {
  id: string;
  role: "operator" | "copilot";
  content: string;
  timestamp: string;
  evidence?: string[];
}
