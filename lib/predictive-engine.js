/**
 * Clamp a number to an inclusive range.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Calculate a deterministic operational risk assessment from current telemetry.
 * The weights intentionally remain inspectable for air-gapped environments where
 * operators need to understand why an alert was raised.
 *
 * @param {{latency: number, packetLoss: number, utilization: number, routeFlaps?: number, queueGrowth?: number}} telemetry
 */
export function calculateRisk(telemetry) {
  const latencyWeight = clamp((telemetry.latency - 20) / 80, 0, 1) * 24;
  const lossWeight = clamp(telemetry.packetLoss / 5, 0, 1) * 28;
  const utilizationWeight = clamp((telemetry.utilization - 45) / 55, 0, 1) * 20;
  const flapWeight = clamp((telemetry.routeFlaps ?? 0) / 8, 0, 1) * 18;
  const queueWeight = clamp((telemetry.queueGrowth ?? 0) / 200, 0, 1) * 10;
  const score = Math.round(
    clamp(latencyWeight + lossWeight + utilizationWeight + flapWeight + queueWeight, 0, 100),
  );

  const level = score >= 80
    ? "critical"
    : score >= 60
      ? "high"
      : score >= 35
        ? "elevated"
        : "nominal";

  const leadTimeMinutes = score >= 80
    ? 12
    : score >= 60
      ? 24
      : score >= 35
        ? 45
        : 90;

  return {
    score,
    level,
    confidence: Math.round(clamp(68 + score * 0.28, 68, 96)),
    leadTimeMinutes,
    contributors: [
      { label: "Packet loss", weight: Math.round(lossWeight) },
      { label: "Latency drift", weight: Math.round(latencyWeight) },
      { label: "Link utilization", weight: Math.round(utilizationWeight) },
      { label: "Route instability", weight: Math.round(flapWeight) },
      { label: "Queue growth", weight: Math.round(queueWeight) },
    ].sort((a, b) => b.weight - a.weight),
  };
}

/**
 * Produce the next seeded telemetry value.
 * @param {{latency: number, packetLoss: number, utilization: number, risk: number, timestamp: number}} previous
 * @param {number} tick
 */
export function nextTelemetryPoint(previous, tick) {
  const pressure = Math.sin(tick / 3.4);
  const latency = clamp(previous.latency + pressure * 1.6 - 0.25, 14, 120);
  const packetLoss = clamp(previous.packetLoss + pressure * 0.08 - 0.018, 0, 6);
  const utilization = clamp(previous.utilization + pressure * 1.2 - 0.15, 28, 98);
  const assessment = calculateRisk({
    latency,
    packetLoss,
    utilization,
    routeFlaps: 6,
    queueGrowth: 184,
  });

  return {
    timestamp: previous.timestamp + 60_000,
    latency: Number(latency.toFixed(1)),
    packetLoss: Number(packetLoss.toFixed(2)),
    utilization: Number(utilization.toFixed(1)),
    risk: assessment.score,
  };
}

/**
 * Return a deterministic evidence-backed response for local demo operation.
 * A local language model can replace this adapter without changing the UI contract.
 *
 * @param {string} input
 * @param {{incidentId?: string, nodeName?: string, riskScore?: number}} context
 */
export function buildCopilotResponse(input, context = {}) {
  const query = input.toLowerCase();
  const incident = context.incidentId ?? "INC-2047";
  const node = context.nodeName ?? "LKO-PE-03";
  const risk = context.riskScore ?? 86;

  if (query.includes("why") || query.includes("cause") || query.includes("explain")) {
    return {
      content: `${incident} is most likely caused by congestion-driven route instability at ${node}. The risk score is ${risk}/100. Queue depth rose 184%, packet loss crossed 4.5%, and six route-flap events occurred in the same twelve-minute window. The temporal overlap makes a shared egress-path failure more likely than independent device faults.`,
      evidence: [
        "telemetry://LSP-LKO-DEL-03/queue-depth",
        "syslog://LKO-PE-03/route-flap-window",
        "runbook://MPLS-OPS-14/congestion-failover",
      ],
    };
  }

  if (query.includes("impact") || query.includes("affected")) {
    return {
      content: `The primary exposure is traffic traversing LSP-LKO-DEL-03. ${node}, DEL-CORE-01, and PAT-CE-07 are affected. Priority services have a viable backup through Hyderabad, while best-effort traffic may experience 70–110 ms latency if the current trend continues.`,
      evidence: [
        "topology://dependency-graph/LSP-LKO-DEL-03",
        "telemetry://PW-PAT-HYD-BK/headroom",
      ],
    };
  }

  if (query.includes("plan") || query.includes("remed") || query.includes("fix")) {
    return {
      content: `Recommended staged response: (1) move priority traffic to PW-PAT-HYD-BK, which has 68% spare capacity; (2) apply route dampening to the unstable LSP; (3) inspect the ${node} egress interface; and (4) observe loss and queue depth for ten minutes. No change should be executed without operator approval.`,
      evidence: [
        "runbook://MPLS-OPS-14/steps-3-7",
        "simulation://reroute/PW-PAT-HYD-BK",
        "policy://change-control/two-person-rule",
      ],
    };
  }

  if (query.includes("status") || query.includes("summary")) {
    return {
      content: `Eight nodes and nine transport paths are under observation. One critical predictive incident is active. Overall service availability is 99.982%, but ${node} is forecast to cross the service-impact threshold within 18 minutes if queue growth continues.`,
      evidence: [
        "inventory://network/current",
        "forecast://INC-2047/18m",
      ],
    };
  }

  return {
    content: `I can analyze ${incident}, explain its evidence, estimate service impact, or prepare an approval-gated remediation plan. All reasoning uses the local topology, telemetry, audit records, and runbooks available in this isolated runtime.`,
    evidence: [
      "runtime://air-gap/verified",
      "knowledge://local-index/healthy",
    ],
  };
}
