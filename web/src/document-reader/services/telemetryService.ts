/**
 * Processing Performance Telemetry Service
 *
 * Tracks start/end times, duration, and resource utilisation for each
 * pipeline stage (OCR, classification, extraction, validation, export).
 *
 * Keeps an in-memory ring buffer of the last 200 events, queryable per
 * document or per stage.
 */

export type PipelineStageId =
  | "document_intake"
  | "iqa"
  | "ocr"
  | "classification"
  | "extraction"
  | "validation"
  | "training_review"
  | "export";

export interface StageMetrics {
  stage: PipelineStageId;
  document_id: string;
  page_count: number;
  start_time: string;          // ISO-8601
  end_time: string | null;     // null while in-flight
  duration_ms: number | null;  // null while in-flight
  cpu_pct: number | null;      // optional, browser limitation may leave null
  memory_mb: number | null;
  status: "running" | "completed" | "failed";
  error?: string;
  metadata?: Record<string, unknown>;
}

// ─── Ring buffer ──────────────────────────────────────────────────────────────

const MAX_ENTRIES = 200;

class TelemetryStore {
  private entries: StageMetrics[] = [];

  /** Begin tracking a stage. Returns a handle to end/fail it. */
  start(stage: PipelineStageId, document_id: string, page_count = 1, metadata?: Record<string, unknown>): string {
    const entry: StageMetrics = {
      stage,
      document_id,
      page_count,
      start_time: new Date().toISOString(),
      end_time: null,
      duration_ms: null,
      cpu_pct: null,
      memory_mb: sampleMemoryMb(),
      status: "running",
      metadata,
    };
    this.entries.push(entry);
    if (this.entries.length > MAX_ENTRIES) this.entries.shift();
    return `${stage}::${document_id}::${entry.start_time}`;
  }

  /** Mark a stage as completed. */
  complete(handle: string, metadata?: Record<string, unknown>) {
    this.closeEntry(handle, "completed", undefined, metadata);
  }

  /** Mark a stage as failed. */
  fail(handle: string, error: string) {
    this.closeEntry(handle, "failed", error);
  }

  private closeEntry(handle: string, status: "completed" | "failed", error?: string, extra?: Record<string, unknown>) {
    const [stage, document_id, start_time] = handle.split("::");
    const entry = this.entries.findLast(
      e => e.stage === stage && e.document_id === document_id && e.start_time === start_time
    );
    if (!entry) return;
    const end = new Date();
    entry.end_time = end.toISOString();
    entry.duration_ms = end.getTime() - new Date(entry.start_time).getTime();
    entry.status = status;
    if (error) entry.error = error;
    if (extra) entry.metadata = { ...entry.metadata, ...extra };
    entry.memory_mb = sampleMemoryMb();
  }

  getAll(): StageMetrics[] { return [...this.entries]; }

  getByDocument(document_id: string): StageMetrics[] {
    return this.entries.filter(e => e.document_id === document_id);
  }

  getByStage(stage: PipelineStageId): StageMetrics[] {
    return this.entries.filter(e => e.stage === stage);
  }

  /** Average duration for completed entries of a stage (ms). */
  avgDuration(stage: PipelineStageId): number | null {
    const completed = this.entries.filter(e => e.stage === stage && e.status === "completed" && e.duration_ms !== null);
    if (completed.length === 0) return null;
    return completed.reduce((s, e) => s + e.duration_ms!, 0) / completed.length;
  }

  /** Stage-level summary for dashboard display. */
  summary(): Array<{ stage: PipelineStageId; calls: number; avg_ms: number | null; errors: number }> {
    const stages: PipelineStageId[] = ["document_intake", "iqa", "ocr", "classification", "extraction", "validation", "training_review", "export"];
    return stages.map(stage => ({
      stage,
      calls: this.entries.filter(e => e.stage === stage).length,
      avg_ms: this.avgDuration(stage),
      errors: this.entries.filter(e => e.stage === stage && e.status === "failed").length,
    }));
  }

  clear() { this.entries = []; }
}

function sampleMemoryMb(): number | null {
  // Available only in Chrome/Edge via non-standard performance.memory
  const perf = performance as unknown as { memory?: { usedJSHeapSize: number } };
  if (perf?.memory?.usedJSHeapSize) {
    return Math.round(perf.memory.usedJSHeapSize / 1_048_576);
  }
  return null;
}

/** Singleton telemetry store — import this in any pipeline file. */
export const telemetryStore = new TelemetryStore();

// ─── Convenience wrapper ──────────────────────────────────────────────────────

/**
 * Wrap an async function with automatic telemetry start/complete/fail tracking.
 *
 * @example
 *   const result = await withTelemetry("ocr", doc.documentId, () => runOcr(doc));
 */
export async function withTelemetry<T>(
  stage: PipelineStageId,
  document_id: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const handle = telemetryStore.start(stage, document_id, 1, metadata);
  try {
    const result = await fn();
    telemetryStore.complete(handle);
    return result;
  } catch (err) {
    telemetryStore.fail(handle, String(err));
    throw err;
  }
}

// ─── Mock data for dashboard ──────────────────────────────────────────────────

export function generateMockTelemetry(): StageMetrics[] {
  const stages: PipelineStageId[] = ["document_intake", "iqa", "ocr", "classification", "extraction", "validation"];
  const docs = Array.from({ length: 8 }, (_, i) => `doc_${String(i + 1).padStart(3, "0")}`);
  const now = Date.now();
  const baseDurations: Record<string, number> = {
    document_intake: 120, iqa: 45, ocr: 3200, classification: 850,
    extraction: 1400, validation: 220, training_review: 500, export: 80,
  };

  return docs.flatMap((doc_id, di) =>
    stages.map((stage, si) => {
      const start = new Date(now - (docs.length - di) * 120_000 + si * 5000);
      const dur = baseDurations[stage] + Math.floor(Math.random() * baseDurations[stage] * 0.4);
      return {
        stage,
        document_id: doc_id,
        page_count: 1 + Math.floor(Math.random() * 3),
        start_time: start.toISOString(),
        end_time: new Date(start.getTime() + dur).toISOString(),
        duration_ms: dur,
        cpu_pct: null,
        memory_mb: 180 + Math.floor(Math.random() * 60),
        status: "completed" as const,
      };
    })
  );
}
