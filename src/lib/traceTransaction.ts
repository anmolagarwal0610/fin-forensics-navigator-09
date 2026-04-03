/**
 * Trace Transaction utilities:
 * - Batch cache check (fund_traces.json)
 * - On-demand cache check (fund_trace_results/ in ZIP)
 * - On-demand API call
 * - LRU in-memory cache for fetched results
 */
import type {
  BatchTraceResponse,
  BatchTraceSeed,
  DebitTraceResponse,
  CreditTraceResponse,
  FundTrailRequest,
} from "@/types/traceTransaction";
import { getBackendApiUrl, clearBackendUrlCache } from "@/lib/runtime-config";
import type JSZip from "jszip";

// ---- In-memory LRU cache for on-demand results ----
const MAX_CACHE_SIZE = 50;
const onDemandCache = new Map<string, DebitTraceResponse | CreditTraceResponse>();

function cacheKey(fileName: string, rowIndex: number): string {
  return `${fileName}::${rowIndex}`;
}

function putCache(key: string, value: DebitTraceResponse | CreditTraceResponse) {
  if (onDemandCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entry
    const firstKey = onDemandCache.keys().next().value;
    if (firstKey) onDemandCache.delete(firstKey);
  }
  onDemandCache.set(key, value);
}

export function getFromMemoryCache(fileName: string, rowIndex: number): DebitTraceResponse | CreditTraceResponse | null {
  const key = cacheKey(fileName, rowIndex);
  const val = onDemandCache.get(key);
  if (val) {
    // Move to end (most recently used)
    onDemandCache.delete(key);
    onDemandCache.set(key, val);
    return val;
  }
  return null;
}

// ---- Batch cache check ----
export function checkBatchCache(
  fundTracesData: BatchTraceResponse | null,
  fileName: string,
  rowIndex: number,
): BatchTraceSeed | null {
  if (!fundTracesData) return null;
  return (
    fundTracesData.seeds.find(
      (s) => s.seed_file === fileName && s.seed_row_index === rowIndex,
    ) || null
  );
}

// ---- On-demand cache check (ZIP) ----
export async function checkOnDemandCacheZip(
  zipData: JSZip | null | undefined,
  fileName: string,
  rowIndex: number,
): Promise<DebitTraceResponse | CreditTraceResponse | null> {
  if (!zipData) return null;

  // Construct expected filename: {filename_without_extension}_{row_index}.json
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  const expectedPath = `fund_trace_results/${baseName}_${rowIndex}.json`;

  const file = zipData.file(expectedPath);
  if (!file) return null;

  try {
    const text = await file.async("text");
    const parsed = JSON.parse(text);
    // Cache it in memory too
    putCache(cacheKey(fileName, rowIndex), parsed);
    return parsed;
  } catch {
    return null;
  }
}

// ---- On-demand API call ----
export async function requestOnDemandTrace(
  request: FundTrailRequest,
  caseId: string,
): Promise<(DebitTraceResponse | CreditTraceResponse)[]> {
  let backendUrl: string;
  try {
    backendUrl = await getBackendApiUrl();
  } catch {
    clearBackendUrlCache();
    backendUrl = await getBackendApiUrl();
  }

  const response = await fetch(`${backendUrl}/trace-transaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      case_id: caseId,
      ...request,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Trace request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // The API may return a single trace or an array
  const results: (DebitTraceResponse | CreditTraceResponse)[] = Array.isArray(data) ? data : [data];

  // Cache each result
  for (const result of results) {
    const req = result.metadata?.request;
    if (req) {
      putCache(cacheKey(req.file_name, req.row_index), result);
    }
  }

  return results;
}

// ---- Clear all caches ----
export function clearTraceCache() {
  onDemandCache.clear();
}
