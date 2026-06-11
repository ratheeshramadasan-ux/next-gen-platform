import { TrainingLedgerEntry } from "../types";

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
