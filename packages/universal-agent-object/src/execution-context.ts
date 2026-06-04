/**
 * ============================================================
 * EXECUTION CONTEXT BUILDER
 * ============================================================
 * Creates and manages the runtime context that flows through
 * every workflow step execution.
 *
 * Handles:
 *   - Variable scoping (global / local / step-level)
 *   - Session state persistence
 *   - Variable pattern detection (email, ID, date, file path)
 *   - {{variable}} template resolution
 * ============================================================
 */

import { v4 as uuidv4 } from "uuid";
import { ExecutionContext, ExecutionContextSchema } from "./types";

// ─────────────────────────────────────────────
// Variable pattern registry (auto-detection)
// ─────────────────────────────────────────────
const VARIABLE_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  suggest: string;
}> = [
  { name: "Email",    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,   suggest: "{{Email}}" },
  { name: "UUID",     pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, suggest: "{{ID}}" },
  { name: "Date",     pattern: /\b\d{4}-\d{2}-\d{2}\b|\b\d{2}\/\d{2}\/\d{4}\b/,    suggest: "{{Date}}" },
  { name: "FilePath", pattern: /([A-Z]:\\|\/)[^\s"'<>|*?]+/i,                         suggest: "{{FilePath}}" },
  { name: "URL",      pattern: /https?:\/\/[^\s]+/,                                   suggest: "{{URL}}" },
  { name: "Number",   pattern: /\b\d{5,}\b/,                                          suggest: "{{ID}}" },
  { name: "Phone",    pattern: /\+?[1-9]\d{1,14}/,                                    suggest: "{{Phone}}" },
];

// ─────────────────────────────────────────────
// Execution Context Builder
// ─────────────────────────────────────────────
export class ExecutionContextBuilder {
  /**
   * Create a fresh context for a new execution run.
   */
  static create(params: {
    workflowId: string;
    tenantId: string;
    agentId: string;
    totalSteps: number;
    initialVariables?: Record<string, unknown>;
    timeoutMs?: number;
  }): ExecutionContext {
    return ExecutionContextSchema.parse({
      executionId: uuidv4(),
      workflowId: params.workflowId,
      runId: uuidv4(),
      tenantId: params.tenantId,
      agentId: params.agentId,
      stepIndex: 0,
      totalSteps: params.totalSteps,
      variables: params.initialVariables ?? {},
      sessionState: {},
      startedAt: new Date().toISOString(),
      timeoutMs: params.timeoutMs ?? 30_000,
    });
  }

  /**
   * Advance context to the next step.
   * Immutable — returns a new context object.
   */
  static advance(ctx: ExecutionContext): ExecutionContext {
    return { ...ctx, stepIndex: ctx.stepIndex + 1 };
  }

  /**
   * Set a variable in the context. Immutable.
   */
  static setVariable(
    ctx: ExecutionContext,
    name: string,
    value: unknown
  ): ExecutionContext {
    return {
      ...ctx,
      variables: { ...ctx.variables, [name]: value },
    };
  }

  /**
   * Merge session state. Immutable.
   */
  static mergeSession(
    ctx: ExecutionContext,
    patch: Record<string, unknown>
  ): ExecutionContext {
    return {
      ...ctx,
      sessionState: { ...ctx.sessionState, ...patch },
    };
  }

  // ─────────────────────────────────────────
  // Variable resolution — {{VariableName}}
  // ─────────────────────────────────────────
  /**
   * Resolves all {{VariableName}} tokens in a string
   * against the current execution context.
   *
   * Example:
   *   resolve("Hello {{Name}}!", { Name: "World" }) → "Hello World!"
   */
  static resolve(value: unknown, ctx: ExecutionContext): unknown {
    if (typeof value !== "string") return value;

    return value.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
      const trimmed = key.trim();
      const resolved = ctx.variables[trimmed];
      return resolved !== undefined ? String(resolved) : `{{${trimmed}}}`;
    });
  }

  // ─────────────────────────────────────────
  // Auto variable detection
  // ─────────────────────────────────────────
  /**
   * Scan a string value and suggest variable names
   * for detected patterns (email, date, ID, etc.)
   *
   * Returns an array of suggestions.
   */
  static detectVariables(value: string): Array<{
    original: string;
    suggestedVariable: string;
    patternName: string;
  }> {
    const suggestions: Array<{
      original: string;
      suggestedVariable: string;
      patternName: string;
    }> = [];

    for (const { name, pattern, suggest } of VARIABLE_PATTERNS) {
      const match = value.match(pattern);
      if (match) {
        suggestions.push({
          original: match[0],
          suggestedVariable: suggest,
          patternName: name,
        });
      }
    }

    return suggestions;
  }

  /**
   * Auto-replace detected patterns with variable tokens.
   *
   * Example:
   *   "Login as john@acme.com" → "Login as {{Email}}"
   */
  static autoParameterize(value: string): string {
    let result = value;
    for (const { pattern, suggest } of VARIABLE_PATTERNS) {
      result = result.replace(pattern, suggest);
    }
    return result;
  }
}
