"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/icons";
import type { CopilotMessage } from "@/lib/types";

interface CopilotPanelProps {
  incidentId: string;
  nodeName: string;
  riskScore: number;
  fullPage?: boolean;
}

const suggestions = [
  "Explain the root cause",
  "What services are affected?",
  "Prepare a remediation plan",
];

const initialMessage: CopilotMessage = {
  id: "welcome",
  role: "copilot",
  content:
    "Local operations reasoning is ready. Ask about the active incident, affected services, or a safe remediation plan.",
  timestamp: "LOCAL",
  evidence: ["runtime://air-gap/verified"],
};

export function CopilotPanel({
  incidentId,
  nodeName,
  riskScore,
  fullPage = false,
}: CopilotPanelProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isThinking]);

  async function submitMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || isThinking) return;

    const operatorMessage: CopilotMessage = {
      id: `operator-${Date.now()}`,
      role: "operator",
      content: message,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((current) => [...current, operatorMessage]);
    setInput("");
    setIsThinking(true);

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: { incidentId, nodeName, riskScore },
        }),
      });

      if (!response.ok) throw new Error("Local reasoning request failed.");
      const result = (await response.json()) as {
        content: string;
        evidence: string[];
      };

      setMessages((current) => [
        ...current,
        {
          id: `copilot-${Date.now()}`,
          role: "copilot",
          content: result.content,
          timestamp: "LOCAL",
          evidence: result.evidence,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `copilot-error-${Date.now()}`,
          role: "copilot",
          content:
            "The local reasoning adapter did not respond. Telemetry collection and predictive monitoring remain active.",
          timestamp: "LOCAL",
          evidence: ["runtime://copilot/adapter-unavailable"],
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <section className={`copilot-panel ${fullPage ? "copilot-full" : ""}`}>
      <header className="panel-heading">
        <div>
          <span className="eyebrow">ISOLATED REASONING</span>
          <h2>
            <Icon name="copilot" size={18} />
            Operations copilot
          </h2>
        </div>
        <span className="local-model-badge">
          <i />
          LOCAL
        </span>
      </header>

      <div className="copilot-messages" ref={scrollRef}>
        {messages.map((message) => (
          <article
            className={`message ${message.role === "operator" ? "message-operator" : ""}`}
            key={message.id}
          >
            <div className="message-avatar">
              <Icon name={message.role === "operator" ? "user" : "copilot"} size={15} />
            </div>
            <div className="message-body">
              <div className="message-meta">
                <strong>{message.role === "operator" ? "Operator" : "Sentinel"}</strong>
                <span>{message.timestamp}</span>
              </div>
              <p>{message.content}</p>
              {message.evidence?.length ? (
                <details className="evidence-list">
                  <summary>{message.evidence.length} evidence sources</summary>
                  {message.evidence.map((item) => (
                    <code key={item}>{item}</code>
                  ))}
                </details>
              ) : null}
            </div>
          </article>
        ))}
        {isThinking ? (
          <div className="thinking-indicator" role="status">
            <i />
            <i />
            <i />
            Correlating local evidence
          </div>
        ) : null}
      </div>

      <div className="prompt-suggestions">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => void submitMessage(suggestion)}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="copilot-input"
        onSubmit={(event) => {
          event.preventDefault();
          void submitMessage(input);
        }}
      >
        <input
          aria-label="Ask the operations copilot"
          maxLength={2000}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about network state, evidence, or remediation..."
          value={input}
        />
        <button
          aria-label="Send message"
          disabled={!input.trim() || isThinking}
          type="submit"
        >
          <Icon name="send" size={17} />
        </button>
      </form>
      <footer className="copilot-footer">
        <Icon name="lock" size={12} />
        No external inference · Evidence attached
      </footer>
    </section>
  );
}
