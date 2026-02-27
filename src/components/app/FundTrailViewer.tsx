import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Share2, Loader2, Maximize2, Minimize2, Download, RotateCcw, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface FundTrailViewerProps {
  htmlContent: string;
  caseId: string;
  onShare: () => void;
  className?: string;
}

export default function FundTrailViewer({ htmlContent, caseId, onShare, className }: FundTrailViewerProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Track if we've already applied the saved view (prevent double-apply)
  const hasAppliedView = useRef(false);

  // Fetch saved view_data from DB
  const {
    data: savedViewData,
    isLoading: loadingView,
    refetch: refetchSavedView,
  } = useQuery({
    queryKey: ["fund-trail-view", caseId],
    queryFn: async () => {
      console.log("[FundTrailViewer] Fetching saved view for case:", caseId);
      const { data, error } = await supabase
        .from("fund_trail_views")
        .select("view_data")
        .eq("case_id", caseId)
        .maybeSingle();

      if (error) {
        console.error("[FundTrailViewer] Error fetching saved view:", error);
        return null;
      }

      console.log("[FundTrailViewer] Fetched view_data:", data?.view_data ? "Found" : "Not found");
      return data?.view_data ?? null;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Save view mutation
  const saveViewMutation = useMutation({
    mutationFn: async (viewData: any) => {
      console.log("[FundTrailViewer] Saving view data to Supabase...");
      const { error } = await supabase.from("fund_trail_views").upsert(
        {
          case_id: caseId,
          view_data: viewData,
          positions: viewData.positions || {},
          filters: viewData.filters || null,
          version: viewData.version || "3.0",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "case_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fund-trail-view", caseId] });
      toast({ title: "View saved successfully" });
    },
    onError: (error) => {
      console.error("[FundTrailViewer] Error saving view:", error);
      toast({ title: "Failed to save view", variant: "destructive" });
    },
  });

  // Function to apply saved view to iframe
  const applySavedViewToIframe = useCallback((viewData: any) => {
    if (!viewData) {
      console.log("[FundTrailViewer] No viewData to apply");
      return;
    }

    if (!iframeRef.current?.contentWindow) {
      console.log("[FundTrailViewer] Iframe not ready");
      return;
    }

    const win = iframeRef.current.contentWindow as any;

    const tryLoad = (attempts: number) => {
      try {
        // Check if the function exists
        if (typeof win.loadFundTrailView === "function") {
          console.log("[FundTrailViewer] Calling loadFundTrailView...");
          const result = win.loadFundTrailView(viewData);
          console.log("[FundTrailViewer] loadFundTrailView result:", result);
          hasAppliedView.current = true;
        } else if (typeof win.getFundTrailViewData === "function" && attempts > 10) {
          // getFundTrailViewData exists but loadFundTrailView doesn't
          // This means the HTML might be an older version
          console.warn(
            "[FundTrailViewer] getFundTrailViewData exists but loadFundTrailView doesn't. HTML may need updating.",
          );
          if (attempts > 0) {
            setTimeout(() => tryLoad(attempts - 1), 300);
          }
        } else if (attempts > 0) {
          console.log(`[FundTrailViewer] Waiting for iframe JS... (${attempts} attempts left)`);
          setTimeout(() => tryLoad(attempts - 1), 300);
        } else {
          console.error("[FundTrailViewer] loadFundTrailView not available after all attempts");
          // Log what IS available
          console.log(
            "[FundTrailViewer] Available window functions:",
            Object.keys(win)
              .filter((k) => typeof win[k] === "function")
              .slice(0, 20),
          );
        }
      } catch (err) {
        console.error("[FundTrailViewer] Error in tryLoad:", err);
        if (attempts > 0) {
          setTimeout(() => tryLoad(attempts - 1), 300);
        }
      }
    };

    // Start trying after a short delay
    setTimeout(() => tryLoad(25), 500);
  }, []);

  // Handle iframe load event
  const handleIframeLoad = useCallback(() => {
    console.log("[FundTrailViewer] Iframe onLoad fired");
    setIframeReady(true);
    hasAppliedView.current = false; // Reset for new iframe
  }, []);

  // Apply saved view when iframe is ready AND savedViewData is available
  useEffect(() => {
    if (iframeReady && savedViewData && !hasAppliedView.current) {
      console.log("[FundTrailViewer] Conditions met, applying saved view...");
      applySavedViewToIframe(savedViewData);
    } else {
      console.log("[FundTrailViewer] Conditions not met:", {
        iframeReady,
        hasSavedViewData: !!savedViewData,
        hasAppliedView: hasAppliedView.current,
      });
    }
  }, [iframeReady, savedViewData, applySavedViewToIframe]);

  // Reset iframe ready state when iframe key changes (refresh)
  useEffect(() => {
    setIframeReady(false);
    hasAppliedView.current = false;
  }, [iframeKey]);

  // Save handler
  const handleSave = useCallback(async () => {
    if (!iframeRef.current?.contentWindow) {
      toast({ title: "Graph not ready", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const win = iframeRef.current.contentWindow as any;

      if (typeof win.getFundTrailViewData !== "function") {
        console.error("[FundTrailViewer] getFundTrailViewData not found on window");
        toast({ title: "Save not supported by this graph version", variant: "destructive" });
        return;
      }

      const viewData = win.getFundTrailViewData();
      console.log("[FundTrailViewer] Got view data:", viewData);

      if (!viewData) {
        toast({ title: "No view data returned", variant: "destructive" });
        return;
      }

      await saveViewMutation.mutateAsync(viewData);
    } catch (err) {
      console.error("[FundTrailViewer] Error in handleSave:", err);
      toast({ title: "Failed to save view", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [saveViewMutation]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fund_trail_main.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefresh = useCallback(async () => {
    console.log("[FundTrailViewer] Refreshing...");
    // Refetch saved data first
    await refetchSavedView();
    // Then reset iframe
    setIframeKey((prev) => prev + 1);
    toast({ title: "Graph refreshed" });
  }, [refetchSavedView]);

  if (loadingView) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-col", isFullscreen && "fixed inset-0 z-50 bg-background p-4", className)}
    >
      <div className="flex items-center justify-end gap-2 mb-2">
        {isSaving && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}
        <Button onClick={handleSave} variant="outline" size="sm" disabled={isSaving}>
          <Save className="h-4 w-4 mr-1.5" />
          Save View
        </Button>
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>
        <Button onClick={onShare} variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-1.5" />
          Share
        </Button>
        <Button onClick={handleRefresh} variant="outline" size="sm" title="Refresh graph">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button onClick={toggleFullscreen} variant="outline" size="sm">
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      <iframe
        key={iframeKey}
        ref={iframeRef}
        srcDoc={htmlContent}
        onLoad={handleIframeLoad}
        className={cn("w-full border rounded-lg bg-white flex-1", isFullscreen ? "h-full" : "h-[72vh]")}
        sandbox="allow-scripts allow-same-origin"
        title="Fund Trail Analysis"
      />
    </div>
  );
}
