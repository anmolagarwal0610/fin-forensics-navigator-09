import type JSZip from "jszip";

export type OwnerMismatchExtractedName = {
  file: string;
  role: "primary" | "sub" | string;
  extracted_name?: string;
  normalized?: string;
};

export type OwnerMismatchAlert = {
  primary_file: string;
  resolved_owner?: string;
  resolution_reason?: string;
  extracted_names?: OwnerMismatchExtractedName[];
};

export type OwnerMismatchAlerts = {
  generated_at?: string;
  alert_count?: number;
  alerts: OwnerMismatchAlert[];
};

const norm = (s: string) => (s || "").toLowerCase().trim();

/**
 * Find the alert (if any) whose primary_file matches the given parent name
 * (case-insensitive base-name compare).
 */
function findAlertForPrimary(
  alerts: OwnerMismatchAlerts | null | undefined,
  primaryName: string,
): OwnerMismatchAlert | null {
  if (!alerts || !Array.isArray(alerts.alerts)) return null;
  const target = norm(primaryName);
  for (const a of alerts.alerts) {
    if (norm(a.primary_file) === target) return a;
  }
  return null;
}

/**
 * Set of sub-file names (lowercased) that the backend flagged as a mismatch
 * for a given primary. Subs not present in the alert are not mismatched.
 */
export function getMismatchedSubsFor(
  alerts: OwnerMismatchAlerts | null | undefined,
  primaryName: string,
): Set<string> {
  const out = new Set<string>();
  const a = findAlertForPrimary(alerts, primaryName);
  if (!a || !Array.isArray(a.extracted_names)) return out;
  for (const en of a.extracted_names) {
    if (en && en.role === "sub" && en.file) out.add(norm(en.file));
  }
  return out;
}

/** True iff this sub-file is flagged as mismatched under the given primary. */
export function isSubMismatched(
  alerts: OwnerMismatchAlerts | null | undefined,
  primaryName: string,
  subName: string,
): boolean {
  return getMismatchedSubsFor(alerts, primaryName).has(norm(subName));
}

/**
 * Try to load `owner_mismatch_alerts.json` from a result ZIP. Returns null if
 * the file is missing or unparseable — never throws.
 */
export async function loadOwnerMismatchAlerts(
  zip: JSZip,
): Promise<OwnerMismatchAlerts | null> {
  try {
    const entry = zip.file("owner_mismatch_alerts.json");
    if (!entry) return null;
    const raw = await entry.async("text");
    const sanitized = raw.replace(/:\s*NaN\b/g, ": null");
    const parsed = JSON.parse(sanitized) as OwnerMismatchAlerts;
    if (!parsed || !Array.isArray(parsed.alerts)) return null;
    return parsed;
  } catch (e) {
    console.warn("[ownerMismatchAlerts] Failed to load/parse:", e);
    return null;
  }
}