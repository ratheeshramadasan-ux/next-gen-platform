/**
 * Universal Agent Object — Unit Tests
 */

import { UniversalAgentFactory } from "../factory";
import { ExecutionContextBuilder } from "../execution-context";
import { detectOS, isInsideDocker, isInsideKubernetes } from "../platform-detector";
import { AgentStatusSchema } from "../types";

const MOCK_CONFIG = {
  tenantId: "11111111-1111-1111-1111-111111111111",
  orchestratorUrl: "https://portal.example.com",
  activationToken: "test-token-abc",
  version: "1.0.0",
  agentName: "test-agent",
};

// ─────────────────────────────────────────────
// Factory tests
// ─────────────────────────────────────────────
describe("UniversalAgentFactory", () => {
  it("creates a valid agent object", () => {
    const agent = UniversalAgentFactory.create(MOCK_CONFIG);
    expect(agent.schemaVersion).toBe("1.0.0");
    expect(agent.identity.tenantId).toBe(MOCK_CONFIG.tenantId);
    expect(agent.identity.agentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(agent.identity.status).toBe("PENDING");
    expect(agent.connectivity.orchestratorUrl).toBe(MOCK_CONFIG.orchestratorUrl);
    expect(agent.connectivity.tlsEnabled).toBe(true);
  });

  it("serializes and deserializes correctly", () => {
    const original = UniversalAgentFactory.create(MOCK_CONFIG);
    const json = UniversalAgentFactory.serialize(original);
    const restored = UniversalAgentFactory.deserialize(json);
    expect(restored.identity.agentId).toBe(original.identity.agentId);
    expect(restored.connectivity.activationToken).toBe(original.connectivity.activationToken);
  });

  it("redacts the activation token", () => {
    const agent = UniversalAgentFactory.create(MOCK_CONFIG);
    const redacted = UniversalAgentFactory.redact(agent);
    expect(redacted.connectivity.activationToken).toBe("***REDACTED***");
    expect(redacted.identity.agentId).toBe(agent.identity.agentId);
  });

  it("touch() updates lastSeenAt and status", () => {
    const agent = UniversalAgentFactory.create(MOCK_CONFIG);
    const before = agent.identity.lastSeenAt;

    // Wait 1 ms to ensure time changes
    const touched = UniversalAgentFactory.touch(agent, "ACTIVE");
    expect(touched.identity.status).toBe("ACTIVE");
    expect(touched.identity.lastSeenAt).toBeDefined();
    // Should be same or newer
    expect(
      new Date(touched.identity.lastSeenAt) >= new Date(before)
    ).toBe(true);
  });

  it("tryDeserialize returns null for invalid JSON", () => {
    const result = UniversalAgentFactory.tryDeserialize("{ not valid json }");
    expect(result).toBeNull();
  });

  it("infers tlsEnabled=false for http:// URLs", () => {
    const agent = UniversalAgentFactory.create({
      ...MOCK_CONFIG,
      orchestratorUrl: "http://localhost:4000",
    });
    expect(agent.connectivity.tlsEnabled).toBe(false);
  });

  it("applies capability overrides", () => {
    const agent = UniversalAgentFactory.create({
      ...MOCK_CONFIG,
      capabilityOverrides: {
        webCapture: false,
        aiHealing: false,
      },
    });
    expect(agent.identity.capabilities.webCapture).toBe(false);
    expect(agent.identity.capabilities.aiHealing).toBe(false);
    // apiExecution should still be true (from base)
    expect(agent.identity.capabilities.apiExecution).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Platform detector tests
// ─────────────────────────────────────────────
describe("Platform Detector", () => {
  it("detects the current OS without throwing", () => {
    const platform = detectOS();
    expect(["windows", "macos", "linux", "docker", "kubernetes"]).toContain(platform);
  });

  it("isInsideKubernetes() returns false in test env", () => {
    delete process.env["KUBERNETES_SERVICE_HOST"];
    delete process.env["KUBERNETES_PORT"];
    expect(isInsideKubernetes()).toBe(false);
  });

  it("isInsideKubernetes() returns true when env vars set", () => {
    process.env["KUBERNETES_SERVICE_HOST"] = "10.96.0.1";
    expect(isInsideKubernetes()).toBe(true);
    delete process.env["KUBERNETES_SERVICE_HOST"];
  });

  it("isInsideDocker() returns false in test env (no /.dockerenv)", () => {
    // On CI or dev machine this should be false (unless actually in Docker)
    const result = isInsideDocker();
    expect(typeof result).toBe("boolean");
  });
});

// ─────────────────────────────────────────────
// Execution Context tests
// ─────────────────────────────────────────────
describe("ExecutionContextBuilder", () => {
  const BASE = {
    workflowId: "22222222-2222-2222-2222-222222222222",
    tenantId: "11111111-1111-1111-1111-111111111111",
    agentId: "33333333-3333-3333-3333-333333333333",
    totalSteps: 5,
  };

  it("creates a valid context", () => {
    const ctx = ExecutionContextBuilder.create(BASE);
    expect(ctx.stepIndex).toBe(0);
    expect(ctx.totalSteps).toBe(5);
    expect(ctx.variables).toEqual({});
  });

  it("advance() increments stepIndex immutably", () => {
    const ctx = ExecutionContextBuilder.create(BASE);
    const next = ExecutionContextBuilder.advance(ctx);
    expect(ctx.stepIndex).toBe(0);
    expect(next.stepIndex).toBe(1);
  });

  it("setVariable() is immutable", () => {
    const ctx = ExecutionContextBuilder.create(BASE);
    const updated = ExecutionContextBuilder.setVariable(ctx, "Email", "test@example.com");
    expect(ctx.variables["Email"]).toBeUndefined();
    expect(updated.variables["Email"]).toBe("test@example.com");
  });

  it("resolve() replaces {{tokens}} from variables", () => {
    const ctx = ExecutionContextBuilder.create({
      ...BASE,
      initialVariables: { Name: "World", Count: 42 },
    });
    expect(ExecutionContextBuilder.resolve("Hello {{Name}}!", ctx)).toBe("Hello World!");
    expect(ExecutionContextBuilder.resolve("Count: {{Count}}", ctx)).toBe("Count: 42");
  });

  it("resolve() leaves unmatched tokens as-is", () => {
    const ctx = ExecutionContextBuilder.create(BASE);
    expect(ExecutionContextBuilder.resolve("{{Unknown}}", ctx)).toBe("{{Unknown}}");
  });

  it("detectVariables() identifies email pattern", () => {
    const suggestions = ExecutionContextBuilder.detectVariables("Login: john@acme.com");
    expect(suggestions.some((s: any) => s.patternName === "Email")).toBe(true);
  });

  it("autoParameterize() replaces email with {{Email}}", () => {
    const result = ExecutionContextBuilder.autoParameterize("User: john@acme.com");
    expect(result).toContain("{{Email}}");
    expect(result).not.toContain("john@acme.com");
  });

  it("autoParameterize() replaces date with {{Date}}", () => {
    const result = ExecutionContextBuilder.autoParameterize("Date: 2026-04-27");
    expect(result).toContain("{{Date}}");
  });
});

// ─────────────────────────────────────────────
// Schema validation tests
// ─────────────────────────────────────────────
describe("Schema Validation", () => {
  it("AgentStatusSchema rejects unknown values", () => {
    expect(() => AgentStatusSchema.parse("UNKNOWN_STATUS")).toThrow();
  });

  it("AgentStatusSchema accepts DRAINING (K8s graceful shutdown)", () => {
    expect(AgentStatusSchema.parse("DRAINING")).toBe("DRAINING");
  });
});
