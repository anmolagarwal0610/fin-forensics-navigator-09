/**
 * Trace Transaction utilities:
 * - Batch cache check (fund_traces.json)
 * - On-demand cache check (fund_trace_results/ in ZIP)
 * - On-demand API call (via Supabase Edge Function proxy)
 * - LRU in-memory cache for fetched results
 */
import type {
  BatchTraceResponse,
  BatchTraceSeed,
  DebitTraceResponse,
  CreditTraceResponse,
  FundTrailRequest,
} from "@/types/traceTransaction";
import { supabase } from "@/integrations/supabase/client";
import type JSZip from "jszip";

// ---- In-memory LRU cache for on-demand results ----
const MAX_CACHE_SIZE = 50;
const onDemandCache = new Map<string, DebitTraceResponse | CreditTraceResponse>();

function cacheKey(fileName: string, rowIndex: number): string {
  return `${fileName}::${rowIndex}`;
}

function putCache(key: string, value: DebitTraceResponse | CreditTraceResponse) {
  if (onDemandCache.size >= MAX_CACHE_SIZE) {
    const firstKey = onDemandCache.keys().next().value;
    if (firstKey) onDemandCache.delete(firstKey);
  }
  onDemandCache.set(key, value);
}

export function getFromMemoryCache(fileName: string, rowIndex: number): DebitTraceResponse | CreditTraceResponse | null {
  const key = cacheKey(fileName, rowIndex);
  const val = onDemandCache.get(key);
  if (val) {
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

  const baseName = fileName.replace(/\.[^/.]+$/, "");
  const expectedPath = `fund_trace_results/${baseName}_${rowIndex}.json`;

  const file = zipData.file(expectedPath);
  if (!file) return null;

  try {
    const text = await file.async("text");
    // Backend may emit NaN values which are invalid JSON — replace with null
    const sanitized = text.replace(/:\s*NaN\b/g, ": null");
    const parsed = JSON.parse(sanitized);
    putCache(cacheKey(fileName, rowIndex), parsed);
    return parsed;
  } catch {
    return null;
  }
}

// ---- On-demand API call (via Supabase Edge Function) ----
export async function requestOnDemandTrace(
  request: FundTrailRequest,
  caseId: string,
): Promise<(DebitTraceResponse | CreditTraceResponse)[]> {
  const { data, error } = await supabase.functions.invoke('trace-transaction', {
    body: {
      case_id: caseId,
      ...request,
    },
  });

  if (error) {
    throw new Error(`Trace request failed: ${error.message}`);
  }

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
