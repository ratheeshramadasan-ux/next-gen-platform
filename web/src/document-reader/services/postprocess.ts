/**
 * Standard normalizer for date inputs.
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    // Attempt standard ISO parsing or basic digit grouping
    const cleaned = dateStr.replace(/[^0-9\-\/]/g, "");
    if (cleaned.length === 8) {
      // YYYYMMDD to YYYY-MM-DD
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Standard normalizer for currency values.
 */
export function normalizeCurrency(amtStr: string | number): number {
  if (amtStr === undefined || amtStr === null) return 0;
  if (typeof amtStr === "number") return amtStr;
  try {
    const cleaned = amtStr.replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  } catch {
    return 0;
  }
}

/**
 * Universal Post-processor pipeline to sanitize, mask, and validate
 * the raw extracted capability fields.
 */
export function normalizeFields(data: any) {
  return {
    ...data,
    confidence: Math.min(Math.max(data.confidence || 0, 0), 1.0),
    normalizedDate: normalizeDate(data.date),
    cleanedAmount: normalizeCurrency(data.amount)
  };
}
