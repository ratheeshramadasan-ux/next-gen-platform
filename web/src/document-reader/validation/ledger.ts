import { TrainingLedgerEntry, CorrectionTypeBreakdown, CorrectionType, FieldIntelligenceProfile } from "../types";

const LEDGER_KEY = "documentReader.trainingLedger";

export function loadTrainingLedger(): TrainingLedgerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LEDGER_KEY) || "[]");
  } catch {
    return [];
  }
}

export function appendTrainingLedgerEntry(entry: Omit<TrainingLedgerEntry, "training_sample_id">): TrainingLedgerEntry {
  const fullEntry: TrainingLedgerEntry = {
    ...entry,
    training_sample_id: `smpl_${new Date().getFullYear()}_${Math.random().toString(36).slice(2, 8)}`,
  };
  if (typeof window !== "undefined") {
    const existing = loadTrainingLedger();
    existing.unshift(fullEntry);
    window.localStorage.setItem(LEDGER_KEY, JSON.stringify(existing.slice(0, 500)));
  }
  return fullEntry;
}

export function aggregateCorrectionTypes(entries: TrainingLedgerEntry[], limit = 3): CorrectionTypeBreakdown[] {
  const corrected = entries.filter(e => e.correction_type != null);
  if (corrected.length === 0) return [];
  const counts = new Map<CorrectionType, number>();
  for (const e of corrected) {
    const type = e.correction_type as CorrectionType;
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([correction_type, count]) => ({
      correction_type,
      count,
      percentage: Math.round((count / corrected.length) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function aggregateByField(entries: TrainingLedgerEntry[], limit = 5): FieldIntelligenceProfile[] {
  const corrected = entries.filter(e => e.correction_type != null);
  const byField = new Map<string, { field_name: string; entries: TrainingLedgerEntry[] }>();
  for (const e of corrected) {
    if (!byField.has(e.field_id)) byField.set(e.field_id, { field_name: e.field_name, entries: [] });
    byField.get(e.field_id)!.entries.push(e);
  }
  return [...byField.entries()]
    .map(([field_id, { field_name, entries }]) => ({
      field_id,
      field_name,
      totalCorrections: entries.length,
      dominantIssue: aggregateCorrectionTypes(entries, 1)[0] ?? null,
    }))
    .sort((a, b) => b.totalCorrections - a.totalCorrections)
    .slice(0, limit);
}
