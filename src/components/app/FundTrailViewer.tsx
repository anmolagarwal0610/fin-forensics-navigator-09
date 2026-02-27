import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Share2, Loader2, Maximize2, Minimize2, Download, RotateCcw } from "lucide-react";
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
  const [isApplyingView, setIsApplyingView] = useState(true); // NEW: Start as true
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch saved view_data from DB
  const { data: savedViewData, isLoading: loadingView } = useQuery({
    queryKey: ["fund-trail-view", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fund_trail_views")
        .select("view_data, positions, filters, version")
        .eq("case_id", caseId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching saved view:", error);
        return null;
      }

      if (data?.view_data) {
        return data.view_data;
      } else if (data?.positions) {
        return {
          positions: data.positions,
          filters: data.filters,
          version: data.version || "1.0",
        };
      }

      return null;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Save view mutation
  const saveViewMutation = useMutation({
    mutationFn: async (viewData: any) => {
      const payload = {
        case_id: caseId,
        view_data: viewData,
        positions: viewData.positions || {},
        filters: viewData.filters || null,
        version: viewData.version || "3.0",
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("fund_trail_views")
        .upsert(payload, { onConflict: "case_id" })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fund-trail-view", caseId] });
      toast({ title: "View saved successfully" });
    },
    onError: (error: any) => {
      console.error("Save error:", error);
      toast({ title: "Failed to save view", variant: "destructive" });
    },
  });

  // Apply saved view to iframe
  const applySavedView = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      setIsApplyingView(false); // NEW: Hide overlay
      return;
    }

    const cachedData = queryClient.getQueryData<any>(["fund-trail-view", caseId]);
    if (!cachedData) {
      setIsApplyingView(false); // NEW: Hide overlay
      return;
    }

    const win = iframe.contentWindow as any;
    let attempts = 0;
    const maxAttempts = 30;

    const tryApply = () => {
      attempts++;

      if (typeof win.loadFundTrailView === "function") {
        win.loadFundTrailView(cachedData);
        setIsApplyingView(false); // NEW: Hide overlay
        return;
      }

      if (typeof win.applyPositions === "function" && cachedData.positions) {
        win.applyPositions(cachedData.positions);
        if (cachedData.filters && typeof win.applyFilters === "function") {
          win.applyFilters(cachedData.filters);
        }
        setIsApplyingView(false); // NEW: Hide overlay
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(tryApply, 200);
      } else {
        setIsApplyingView(false); // NEW: Hide overlay after max attempts
      }
    };

    setTimeout(tryApply, 500);
  }, [caseId, queryClient]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    applySavedView();
  }, [applySavedView]);

  // Listen for postMessage from iframe
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "fundtrail:save") {
        const viewData = event.data.data;
        if (viewData && !isSaving) {
          setIsSaving(true);
          try {
            await saveViewMutation.mutateAsync(viewData);
          } catch (err) {
            console.error("Error saving from postMessage:", err);
          } finally {
            setIsSaving(false);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [saveViewMutation, isSaving]);

  // Listen for CustomEvent from iframe (backward compatibility)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleIframeSave = (event: Event) => {
      const customEvent = event as CustomEvent;
      const viewData = customEvent.detail;
      if (viewData && !isSaving) {
        setIsSaving(true);
        saveViewMutation
          .mutateAsync(viewData)
          .catch((err) => console.error("Error saving from CustomEvent:", err))
          .finally(() => setIsSaving(false));
      }
    };

    const attachListener = () => {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.addEventListener("fundtrail:save", handleIframeSave);
        }
      } catch (e) {}
    };

    iframe.addEventListener("load", attachListener);
    attachListener();

    return () => {
      iframe.removeEventListener("load", attachListener);
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.removeEventListener("fundtrail:save", handleIframeSave);
        }
      } catch (e) {}
    };
  }, [saveViewMutation, isSaving, iframeKey]);

  // Fullscreen handling
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
    setIsApplyingView(true); // NEW: Show overlay on refresh
    await queryClient.invalidateQueries({ queryKey: ["fund-trail-view", caseId] });
    setIframeKey((prev) => prev + 1);
    toast({ title: "Graph refreshed" });
  }, [queryClient, caseId]);

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
      className={cn("flex flex-col relative", isFullscreen && "fixed inset-0 z-50 bg-background p-4", className)}
    >
      <div className="flex items-center justify-end gap-2 mb-2">
        {isSaving && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}
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

      {/* NEW: Loading overlay while applying saved view */}
      {isApplyingView && savedViewData && (
        <div className="absolute inset-0 top-10 bg-background/90 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading saved view...</span>
          </div>
        </div>
      )}

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
