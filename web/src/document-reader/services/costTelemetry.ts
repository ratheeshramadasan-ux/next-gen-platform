/**
 * Cost & Financial Telemetry Service
 *
 * Tracks per-provider token usage and cost for AI/OCR API calls made during
 * extraction, classification, and validation pipeline stages.
 *
 * Cost model (USD) is intentionally conservative and configurable.
 * Actual billed amounts come from provider invoices; these estimates are for
 * budget forecasting only.
 */

export interface ProviderCostEntry {
  provider: string;
  model: string;
  stage: string;
  document_id: string;
  timestamp: string;
  prompt_tokens: number;
  completion_tokens: number;
  cached_input_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

export interface SessionCostSummary {
  total_cost_usd: number;
  total_tokens: number;
  entries_count: number;
  by_provider: Record<string, { cost_usd: number; tokens: number; calls: number }>;
  by_stage: Record<string, { cost_usd: number; tokens: number }>;
  budget_used_pct: number;
  budget_usd: number;
}

// ─── Pricing tables (USD per 1K tokens) ──────────────────────────────────────

const PRICING: Record<string, { input: number; output: number; cached?: number }> = {
  "claude-sonnet-4-6":        { input: 0.003,   output: 0.015,  cached: 0.0003 },
  "claude-haiku-4-5":         { input: 0.00025, output: 0.00125, cached: 0.00003 },
  "claude-opus-4-8":          { input: 0.015,   output: 0.075,  cached: 0.0015 },
  "gpt-4o":                   { input: 0.005,   output: 0.015 },
  "gpt-4o-mini":              { input: 0.00015, output: 0.0006 },
  "tesseract-ocr-v5":         { input: 0,       output: 0 },       // local, free
  "google-vision":            { input: 0.0015,  output: 0 },
  "aws-textract":             { input: 0.0015,  output: 0 },
  "azure-form-recognizer":    { input: 0.001,   output: 0 },
  "default":                  { input: 0.002,   output: 0.01 },
};

function lookupPricing(model: string) {
  return PRICING[model] || PRICING["default"];
}

export function computeCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
  cachedTokens = 0
): number {
  const p = lookupPricing(model);
  const effectiveInput = promptTokens - cachedTokens;
  const cost =
    (effectiveInput / 1000) * p.input +
    (cachedTokens / 1000) * (p.cached ?? p.input * 0.1) +
    (completionTokens / 1000) * p.output;
  return Math.round(cost * 1_000_000) / 1_000_000; // micro-dollar precision
}

// ─── Session ledger ───────────────────────────────────────────────────────────

const SESSION_BUDGET_USD = 10.0; // default per-session budget

class CostTelemetryLedger {
  private entries: ProviderCostEntry[] = [];
  private budget: number = SESSION_BUDGET_USD;

  setBudget(usd: number) {
    this.budget = usd;
  }

  record(entry: Omit<ProviderCostEntry, "timestamp" | "total_tokens" | "cost_usd">): ProviderCostEntry {
    const full: ProviderCostEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      total_tokens: entry.prompt_tokens + entry.completion_tokens,
      cost_usd: computeCostUsd(
        entry.model,
        entry.prompt_tokens,
        entry.completion_tokens,
        entry.cached_input_tokens
      ),
    };
    this.entries.push(full);
    return full;
  }

  getSummary(): SessionCostSummary {
    const byProvider: Record<string, { cost_usd: number; tokens: number; calls: number }> = {};
    const byStage: Record<string, { cost_usd: number; tokens: number }> = {};
    let total = 0, totalTokens = 0;

    for (const e of this.entries) {
      total += e.cost_usd;
      totalTokens += e.total_tokens;

      if (!byProvider[e.provider]) byProvider[e.provider] = { cost_usd: 0, tokens: 0, calls: 0 };
      byProvider[e.provider].cost_usd += e.cost_usd;
      byProvider[e.provider].tokens += e.total_tokens;
      byProvider[e.provider].calls++;

      if (!byStage[e.stage]) byStage[e.stage] = { cost_usd: 0, tokens: 0 };
      byStage[e.stage].cost_usd += e.cost_usd;
      byStage[e.stage].tokens += e.total_tokens;
    }

    return {
      total_cost_usd: Math.round(total * 1_000_000) / 1_000_000,
      total_tokens: totalTokens,
      entries_count: this.entries.length,
      by_provider: byProvider,
      by_stage: byStage,
      budget_used_pct: this.budget > 0 ? Math.round((total / this.budget) * 10000) / 100 : 0,
      budget_usd: this.budget,
    };
  }

  getEntries(): ProviderCostEntry[] {
    return [...this.entries];
  }

  clear() {
    this.entries = [];
  }
}

/** Singleton session ledger — import this everywhere that makes AI calls. */
export const costLedger = new CostTelemetryLedger();

// ─── Mock data for UI demos ───────────────────────────────────────────────────

export function generateMockCostEntries(documentCount = 10): ProviderCostEntry[] {
  const stages = ["ocr", "classification", "extraction", "validation"];
  const providers = [
    { provider: "Anthropic", model: "claude-sonnet-4-6" },
    { provider: "Anthropic", model: "claude-haiku-4-5" },
    { provider: "Tesseract", model: "tesseract-ocr-v5" },
    { provider: "Google",    model: "google-vision" },
  ];
  const now = Date.now();

  return Array.from({ length: documentCount * 3 }, (_, i) => {
    const p = providers[i % providers.length];
    const stage = stages[i % stages.length];
    const prompt_tokens = 800 + Math.floor(Math.random() * 2000);
    const completion_tokens = 200 + Math.floor(Math.random() * 800);
    const cached_input_tokens = Math.floor(prompt_tokens * 0.3);
    const cost_usd = computeCostUsd(p.model, prompt_tokens, completion_tokens, cached_input_tokens);
    return {
      provider: p.provider,
      model: p.model,
      stage,
      document_id: `doc_${String(Math.floor(i / 3) + 1).padStart(3, "0")}`,
      timestamp: new Date(now - (documentCount * 3 - i) * 60_000).toISOString(),
      prompt_tokens,
      completion_tokens,
      cached_input_tokens,
      total_tokens: prompt_tokens + completion_tokens,
      cost_usd,
    };
  });
}
