import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_PREFIX = "stale-alert-sent:";
const THRESHOLD_HOURS = 3;
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

interface StuckCase {
  id: string;
  name: string;
  updated_at: string;
  creator_id: string;
}

/**
 * UI-only stale-processing alert watcher.
 * Detects user's own cases stuck in Processing >= 3h and sends a single
 * email per case (deduped via localStorage). No DB writes.
 */
export function useStaleProcessingWatcher() {
  const { user } = useAuth();
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const check = async () => {
      try {
        const cutoff = new Date(Date.now() - THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from("cases")
          .select("id, name, updated_at, creator_id")
          .eq("creator_id", user.id)
          .eq("status", "Processing")
          .lt("updated_at", cutoff);

        if (error || !data || cancelled) return;

        for (const c of data as StuckCase[]) {
          const key = `${STORAGE_PREFIX}${c.id}`;
          if (localStorage.getItem(key)) continue;
          if (inFlightRef.current.has(c.id)) continue;

          inFlightRef.current.add(c.id);

          // Best-effort file count
          let fileCount = 0;
          try {
            const { count } = await supabase
              .from("case_files")
              .select("id", { count: "exact", head: true })
              .eq("case_id", c.id);
            fileCount = count ?? 0;
          } catch {
            // ignore
          }

          const hoursStuck = Math.floor(
            (Date.now() - new Date(c.updated_at).getTime()) / (60 * 60 * 1000)
          );

          try {
            const { error: invokeError } = await supabase.functions.invoke(
              "send-stale-processing-alert",
              {
                body: {
                  caseId: c.id,
                  caseName: c.name,
                  hoursStuck,
                  fileCount,
                  processingStarted: c.updated_at,
                  userEmail: user.email ?? null,
                },
              }
            );

            if (!invokeError) {
              localStorage.setItem(key, new Date().toISOString());
            }
          } catch (e) {
            console.warn("[stale-watcher] alert send failed", e);
          } finally {
            inFlightRef.current.delete(c.id);
          }
        }
      } catch (e) {
        console.warn("[stale-watcher] check failed", e);
      }
    };

    // Initial check (delay slightly to let app settle)
    const initialTimer = setTimeout(check, 5000);
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id, user?.email]);
}