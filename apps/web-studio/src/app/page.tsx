"use client";

import Link from "next/link";
import { useState } from "react";
import type { RunIntentResponse } from "@rpa/shared-contracts";

const defaultIntent =
  "Watch an inbox for invoices, extract totals, and post approved records to SAP.";

export default function HomePage() {
  const [intent, setIntent] = useState(defaultIntent);
  const [tenantId, setTenantId] = useState("tenant-demo");
  const [result, setResult] = useState<RunIntentResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAutomation() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/run-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ intent, tenantId })
      });

      const data = (await response.json()) as RunIntentResponse & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to run automation");
      }

      setResult(data);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unexpected error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        display: "grid",
        minHeight: "100vh",
        padding: "32px",
        gap: "24px",
        gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)"
      }}
    >
      <section
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "28px",
          padding: "32px",
          boxShadow: "var(--shadow)",
          backdropFilter: "blur(18px)"
        }}
      >
        <p style={{ letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent-strong)", margin: 0 }}>
          Automation Studio
        </p>
        <h1 style={{ fontSize: "clamp(2.6rem, 4vw, 4.6rem)", lineHeight: 1.02, margin: "12px 0" }}>
          Turn plain-language intent into queued bot workflows.
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 680, fontSize: "1.05rem" }}>
          Design once, route through the orchestrator, and dispatch the same
          runtime to VM, container, or Kubernetes agents.
        </p>

        <div style={{ display: "grid", gap: "16px", marginTop: "28px" }}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span>Tenant ID</span>
            <input
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              style={fieldStyle}
            />
          </label>
          <label style={{ display: "grid", gap: "8px" }}>
            <span>Automation intent</span>
            <textarea
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              rows={10}
              style={{ ...fieldStyle, resize: "vertical", minHeight: "220px" }}
            />
          </label>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={runAutomation}
              disabled={submitting}
              style={{
                border: 0,
                borderRadius: "999px",
                padding: "14px 24px",
                background: "linear-gradient(135deg, var(--accent), #de7c2f)",
                color: "white",
                cursor: "pointer"
              }}
            >
              {submitting ? "Planning..." : "Run Automation"}
            </button>
            {error ? <span style={{ color: "#a12626" }}>{error}</span> : null}
          </div>
        </div>

        <section
          style={{
            marginTop: "28px",
            borderTop: "1px solid var(--line)",
            paddingTop: "24px",
            display: "grid",
            gap: "14px"
          }}
        >
          <div>
            <p
              style={{
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--accent-strong)",
                margin: 0
              }}
            >
              VM Agent
            </p>
            <h2 style={{ margin: "8px 0 6px", fontSize: "1.8rem" }}>
              Download the Bot Runner for virtual machines.
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", maxWidth: 680 }}>
              Grab a Windows or Linux starter package for the universal .NET
              runner and install it as a service on your VM fleet.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap"
            }}
          >
            <Link
              href="/downloads"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                borderRadius: "999px",
                padding: "14px 22px",
                background: "#1f1b18",
                color: "#fff6e9"
              }}
            >
              Open Downloads Page
            </Link>
          </div>
        </section>
      </section>

      <aside
        style={{
          display: "grid",
          gap: "18px"
        }}
      >
        <StatusCard
          title="Runtime Modes"
          value="VM, Docker, K8s"
          detail="One agent core, multiple deployment wrappers."
        />
        <StatusCard
          title="Queue"
          value={result ? `${result.queuedJobs} jobs queued` : "Awaiting run"}
          detail="Redis-backed dispatch with typed job envelopes."
        />
        <section
          style={{
            background: "#1f1b18",
            color: "#f8f0e5",
            borderRadius: "24px",
            padding: "24px",
            minHeight: "320px"
          }}
        >
          <h2 style={{ marginTop: 0 }}>Workflow DAG</h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: "0.9rem",
              lineHeight: 1.5
            }}
          >
            {JSON.stringify(result?.workflow ?? { steps: [] }, null, 2)}
          </pre>
        </section>
      </aside>
    </main>
  );
}

function StatusCard(props: { title: string; value: string; detail: string }) {
  return (
    <section
      style={{
        background: "rgba(255,255,255,0.7)",
        border: "1px solid var(--line)",
        borderRadius: "24px",
        padding: "20px"
      }}
    >
      <p style={{ margin: 0, color: "var(--muted)" }}>{props.title}</p>
      <h2 style={{ margin: "8px 0 6px", fontSize: "1.6rem" }}>{props.value}</h2>
      <p style={{ margin: 0, color: "var(--muted)" }}>{props.detail}</p>
    </section>
  );
}

const fieldStyle = {
  width: "100%",
  border: "1px solid var(--line)",
  borderRadius: "18px",
  padding: "14px 16px",
  background: "rgba(255,255,255,0.76)"
} satisfies React.CSSProperties;
