import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCopilotResponse,
  calculateRisk,
  clamp,
  nextTelemetryPoint,
} from "../lib/predictive-engine.js";

test("clamp limits values to the configured range", () => {
  assert.equal(clamp(-2, 0, 100), 0);
  assert.equal(clamp(42, 0, 100), 42);
  assert.equal(clamp(108, 0, 100), 100);
});

test("risk increases for degraded network telemetry", () => {
  const nominal = calculateRisk({
    latency: 18,
    packetLoss: 0.1,
    utilization: 42,
    routeFlaps: 0,
    queueGrowth: 4,
  });
  const degraded = calculateRisk({
    latency: 92,
    packetLoss: 4.8,
    utilization: 95,
    routeFlaps: 8,
    queueGrowth: 190,
  });

  assert.ok(degraded.score > nominal.score);
  assert.equal(degraded.level, "critical");
  assert.ok(degraded.confidence >= 90);
});

test("telemetry simulation remains within physical bounds", () => {
  const next = nextTelemetryPoint(
    {
      timestamp: 1_700_000_000_000,
      latency: 44,
      packetLoss: 2.1,
      utilization: 84,
      risk: 70,
    },
    3,
  );

  assert.equal(next.timestamp, 1_700_000_060_000);
  assert.ok(next.latency >= 0 && next.latency <= 120);
  assert.ok(next.packetLoss >= 0 && next.packetLoss <= 6);
  assert.ok(next.utilization >= 0 && next.utilization <= 100);
});

test("copilot responses include traceable local evidence", () => {
  const response = buildCopilotResponse("Explain the root cause", {
    incidentId: "INC-TEST",
    nodeName: "EDGE-01",
    riskScore: 88,
  });

  assert.match(response.content, /INC-TEST/);
  assert.match(response.content, /EDGE-01/);
  assert.ok(response.evidence.length >= 2);
  assert.ok(response.evidence.every((item) => item.includes("://")));
});
