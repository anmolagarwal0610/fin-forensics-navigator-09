export type MergeConfig = {
  merges: Array<{ primary: string; sub_files: string[] }>;
};

const norm = (s: string) => (s || "").toLowerCase().trim();

/** Set of all sub-file names (lowercased) across the merge config. */
export function getSubFileNames(mc: MergeConfig | null | undefined): Set<string> {
  const set = new Set<string>();
  if (!mc || !Array.isArray(mc.merges)) return set;
  for (const m of mc.merges) {
    for (const sub of m.sub_files || []) set.add(norm(sub));
  }
  return set;
}

/** Returns the sub-file names merged into a given primary, or [] if none. */
export function getSubFilesFor(
  mc: MergeConfig | null | undefined,
  primaryName: string,
): string[] {
  if (!mc || !Array.isArray(mc.merges)) return [];
  const target = norm(primaryName);
  for (const m of mc.merges) {
    if (norm(m.primary) === target) return m.sub_files || [];
  }
  return [];
}

/** True if the given file name is a sub-file (i.e. merged into a primary). */
export function isSubFile(
  mc: MergeConfig | null | undefined,
  fileName: string,
): boolean {
  return getSubFileNames(mc).has(norm(fileName));
}

/** True if the given file name is a primary that has at least one sub-file merged into it. */
export function isMergedPrimary(
  mc: MergeConfig | null | undefined,
  fileName: string,
): boolean {
  return getSubFilesFor(mc, fileName).length > 0;
}