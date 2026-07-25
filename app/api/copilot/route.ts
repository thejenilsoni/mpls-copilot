import { NextResponse } from "next/server";

import { buildCopilotResponse } from "@/lib/predictive-engine";

interface CopilotRequest {
  message?: string;
  context?: {
    incidentId?: string;
    nodeName?: string;
    riskScore?: number;
  };
}

export async function POST(request: Request) {
  let payload: CopilotRequest;

  try {
    payload = (await request.json()) as CopilotRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const message = payload.message?.trim();
  if (!message) {
    return NextResponse.json(
      { error: "A non-empty message is required." },
      { status: 400 },
    );
  }

  if (message.length > 2_000) {
    return NextResponse.json(
      { error: "Message exceeds the 2,000 character local safety limit." },
      { status: 413 },
    );
  }

  const response = buildCopilotResponse(message, payload.context);

  return NextResponse.json({
    ...response,
    model: "local-deterministic-adapter",
    airGap: true,
    generatedAt: new Date().toISOString(),
  });
}
