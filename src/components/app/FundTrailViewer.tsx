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

  // Fetch saved view_data from DB
  const {
    data: savedViewData,
    isLoading: loadingView,
    refetch: refetchSavedView,
  } = useQuery({
    queryKey: ["fund-trail-view", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fund_trail_views")
        .select("view_data")
        .eq("case_id", caseId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching saved view:", error);
        return null;
      }
      return data?.view_data ?? null;
    },
    staleTime: 0, // Always fetch fresh
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Save view mutation using view_data column
  const saveViewMutation = useMutation({
    mutationFn: async (viewData: any) => {
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
      // Invalidate and refetch the saved view query
      queryClient.invalidateQueries({ queryKey: ["fund-trail-view", caseId] });
      toast({ title: "View saved successfully" });
    },
    onError: (error) => {
      console.error("Error saving view:", error);
      toast({ title: "Failed to save view", variant: "destructive" });
    },
  });

  // Function to apply saved view to iframe
  const applySavedViewToIframe = useCallback((viewData: any) => {
    if (!viewData || !iframeRef.current?.contentWindow) {
      console.log("Cannot apply view: no viewData or iframe not ready");
      return;
    }

    try {
      const win = iframeRef.current.contentWindow as any;

      const tryLoad = (attempts: number) => {
        if (typeof win.loadFundTrailView === "function") {
          console.log("Applying saved Fund Trail view...");
          win.loadFundTrailView(viewData);
          console.log("Fund Trail view loaded successfully");
        } else if (attempts > 0) {
          console.log(`Waiting for loadFundTrailView... (${attempts} attempts left)`);
          setTimeout(() => tryLoad(attempts - 1), 300);
        } else {
          console.warn("loadFundTrailView not available on iframe after all attempts");
        }
      };

      // Give the iframe time to initialize
      tryLoad(20);
    } catch (err) {
      console.error("Error loading fund trail view:", err);
    }
  }, []);

  // Handle iframe load event
  const handleIframeLoad = useCallback(() => {
    console.log("Iframe loaded, setting ready state");
    setIframeReady(true);
  }, []);

  // Apply saved view when iframe is ready AND savedViewData is available
  useEffect(() => {
    if (iframeReady && savedViewData) {
      console.log("Both iframe ready and savedViewData available, applying view...");
      applySavedViewToIframe(savedViewData);
    }
  }, [iframeReady, savedViewData, applySavedViewToIframe]);

  // Reset iframe ready state when iframe key changes (refresh)
  useEffect(() => {
    setIframeReady(false);
  }, [iframeKey]);

  // Save handler: call getFundTrailViewData() on the iframe
  const handleSave = useCallback(async () => {
    if (!iframeRef.current?.contentWindow) {
      toast({ title: "Graph not ready", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const win = iframeRef.current.contentWindow as any;
      if (typeof win.getFundTrailViewData !== "function") {
        toast({ title: "Save not supported by this graph version", variant: "destructive" });
        return;
      }
      const viewData = win.getFundTrailViewData();
      if (!viewData) {
        toast({ title: "No view data returned", variant: "destructive" });
        return;
      }
      console.log("Saving view data:", viewData);
      await saveViewMutation.mutateAsync(viewData);
    } catch (err) {
      console.error("Error saving view:", err);
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
    // First refetch the saved view data
    await refetchSavedView();
    // Then reset the iframe (this will trigger handleIframeLoad when it loads)
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
