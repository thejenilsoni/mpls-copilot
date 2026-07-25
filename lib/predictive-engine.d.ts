import type { RiskAssessment, TelemetryPoint } from "@/lib/types";

export function clamp(value: number, min: number, max: number): number;

export function calculateRisk(telemetry: {
  latency: number;
  packetLoss: number;
  utilization: number;
  routeFlaps?: number;
  queueGrowth?: number;
}): RiskAssessment;

export function nextTelemetryPoint(
  previous: TelemetryPoint,
  tick: number,
): TelemetryPoint;

export function buildCopilotResponse(
  input: string,
  context?: {
    incidentId?: string;
    nodeName?: string;
    riskScore?: number;
  },
): {
  content: string;
  evidence: string[];
};
