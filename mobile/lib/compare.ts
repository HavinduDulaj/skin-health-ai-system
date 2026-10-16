export const PROGRESS_DISCLAIMER =
  "AI predictions are not a medical diagnosis. Changes between scans do not prove that a product caused improvement. Seek professional medical advice for concerning or worsening symptoms.";

const RISK_RANK: Record<string, number> = { low: 1, medium: 2, high: 3 };

export interface ScanSnapshot {
  decision?: string | null;
  condition?: string | null;
  risk?: string | null;
  bodyArea?: string | null;
}

export function compareScans(prev: ScanSnapshot, next: ScanSnapshot): {
  kind: "lower" | "higher" | "same" | "uncertain";
  summary: string;
  notes: string[];
} {
  const notes: string[] = [];
  const prevCond = (prev?.condition || "").trim().toLowerCase();
  const nextCond = (next?.condition || "").trim().toLowerCase();
  const prevArea = (prev?.bodyArea || "").trim().toLowerCase();
  const nextArea = (next?.bodyArea || "").trim().toLowerCase();
  if (prevCond && nextCond && prevCond !== nextCond) {
    notes.push("The detected condition differs, so these scans may not be directly comparable.");
  }
  if (prevArea && nextArea && prevArea !== nextArea) {
    notes.push("The recorded body area differs, so these scans may not be directly comparable.");
  }
  const graded = prev?.decision === "grade" && next?.decision === "grade" && prev?.risk && next?.risk;
  if (!graded) {
    return {
      kind: "uncertain",
      summary: "There is not a clear risk grade on both scans, so this comparison is uncertain.",
      notes,
    };
  }
  const before = RISK_RANK[String(prev.risk).toLowerCase()];
  const after = RISK_RANK[String(next.risk).toLowerCase()];
  if (before == null || after == null) {
    return {
      kind: "uncertain",
      summary: "There is not a clear risk grade on both scans, so this comparison is uncertain.",
      notes,
    };
  }
  if (after < before) {
    return {
      kind: "lower",
      summary: "Your latest scan shows a lower predicted risk than your previous scan.",
      notes,
    };
  }
  if (after > before) {
    return {
      kind: "higher",
      summary: "Your latest scan shows a higher predicted risk than your previous scan.",
      notes,
    };
  }
  return {
    kind: "same",
    summary: "Your latest scan shows the same predicted risk as your previous scan.",
    notes,
  };
}

export function dueFromChoice(choice: string, customValue?: string): string | null {
  if (!choice) return null;
  if (choice === "custom") {
    if (!customValue) return null;
    const when = new Date(customValue);
    if (Number.isNaN(when.getTime())) return null;
    return when.toISOString();
  }
  const days = Number(choice);
  if (!Number.isFinite(days) || days <= 0) return null;
  const when = new Date();
  when.setDate(when.getDate() + days);
  when.setHours(9, 0, 0, 0);
  return when.toISOString();
}
