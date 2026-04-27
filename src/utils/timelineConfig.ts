export type TimelineRange = { start_date: string; end_date: string };

export type TimelineConfig = {
  master: TimelineRange | null;
  per_file: Record<string, TimelineRange>;
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(s: string | undefined | null): s is string {
  if (!s || !ISO_RE.test(s)) return false;
  const d = new Date(s + "T00:00:00");
  return !isNaN(d.getTime());
}

export function isValidRange(r: Partial<TimelineRange> | null | undefined): r is TimelineRange {
  if (!r || !r.start_date || !r.end_date) return false;
  if (!isValidIsoDate(r.start_date) || !isValidIsoDate(r.end_date)) return false;
  return r.start_date <= r.end_date;
}

export function toIsoDate(d: Date | undefined | null): string | null {
  if (!d || isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromIsoDate(s: string | undefined | null): Date | undefined {
  if (!isValidIsoDate(s)) return undefined;
  return new Date(s + "T00:00:00");
}

/**
 * Build a `timeline_config.json` File from the given config, or null if both
 * master is empty and per_file is empty.
 */
export function buildTimelineConfigFile(cfg: TimelineConfig): File | null {
  const hasMaster = isValidRange(cfg.master);
  const perFileEntries = Object.entries(cfg.per_file).filter(([, r]) => isValidRange(r));
  if (!hasMaster && perFileEntries.length === 0) return null;
  const payload: TimelineConfig = {
    master: hasMaster ? (cfg.master as TimelineRange) : null,
    per_file: Object.fromEntries(perFileEntries),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  return new File([blob], "timeline_config.json", { type: "application/json" });
}

/** Format a range for compact display: "Jan 15 → Jan 22, 2024". */
export function formatRangeShort(r: TimelineRange | null | undefined): string {
  if (!isValidRange(r)) return "";
  const start = fromIsoDate(r.start_date)!;
  const end = fromIsoDate(r.end_date)!;
  const fmtMD = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) {
    return `${fmtMD(start)} → ${fmtMD(end)}, ${end.getFullYear()}`;
  }
  const fmtMDY = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmtMDY(start)} → ${fmtMDY(end)}`;
}