import type JSZip from "jszip";

/**
 * From a result ZIP, return one entry per base name preferring
 * `raw_transactions_overall_<base>.xlsx` over `raw_transactions_<base>.xlsx`.
 *
 * Returned `displayName` is the user-facing base filename (e.g. `Foo.xlsx`),
 * with both prefixes stripped so it matches what was originally uploaded.
 */
export type PreviousRawEntry = {
  zipFileName: string; // raw entry name inside the ZIP
  displayName: string; // base filename to surface to the user / send to backend
  isOverall: boolean;
};

const OVERALL_PREFIX = "raw_transactions_overall_";
const PLAIN_PREFIX = "raw_transactions_";

function stripPrefix(name: string): { base: string; isOverall: boolean } | null {
  if (!name.endsWith(".xlsx")) return null;
  if (name.startsWith(OVERALL_PREFIX)) {
    return { base: name.slice(OVERALL_PREFIX.length), isOverall: true };
  }
  if (name.startsWith(PLAIN_PREFIX)) {
    return { base: name.slice(PLAIN_PREFIX.length), isOverall: false };
  }
  return null;
}

export function listPreviousRawEntries(zip: JSZip): PreviousRawEntry[] {
  // Map<baseName, PreviousRawEntry> — overall variant wins.
  const byBase = new Map<string, PreviousRawEntry>();
  for (const zipFileName of Object.keys(zip.files)) {
    const parsed = stripPrefix(zipFileName);
    if (!parsed) continue;
    const existing = byBase.get(parsed.base);
    if (!existing || (parsed.isOverall && !existing.isOverall)) {
      byBase.set(parsed.base, {
        zipFileName,
        displayName: parsed.base,
        isOverall: parsed.isOverall,
      });
    }
  }
  return Array.from(byBase.values());
}