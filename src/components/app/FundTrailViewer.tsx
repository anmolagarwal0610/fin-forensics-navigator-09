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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch saved view_data from DB
  const { data: savedViewData, isLoading: loadingView } = useQuery({
    queryKey: ["fund-trail-view", caseId],
    queryFn: async () => {
      console.log("=== FETCHING SAVED VIEW ===");
      console.log("caseId:", caseId);

      const { data, error } = await supabase
        .from("fund_trail_views")
        .select("view_data")
        .eq("case_id", caseId)
        .maybeSingle();

      if (error) {
        console.error("Fetch error:", error);
        return null;
      }

      console.log("Fetched saved view:", data?.view_data ? "Found" : "Not found");
      return data?.view_data ?? null;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Save view mutation
  const saveViewMutation = useMutation({
    mutationFn: async (viewData: any) => {
      console.log("=== MUTATION FUNCTION CALLED ===");
      console.log("caseId:", caseId);
      console.log("viewData keys:", Object.keys(viewData));

      const payload = {
        case_id: caseId,
        view_data: viewData,
        positions: viewData.positions || {},
        filters: viewData.filters || null,
        version: viewData.version || "3.0",
        updated_at: new Date().toISOString(),
      };

      console.log("Calling supabase.upsert with payload...");

      const { data, error } = await supabase
        .from("fund_trail_views")
        .upsert(payload, { onConflict: "case_id" })
        .select();

      console.log("Supabase response - data:", data, "error:", error);

      if (error) {
        console.error("Supabase error:", JSON.stringify(error));
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      console.log("=== MUTATION SUCCESS ===", data);
      queryClient.invalidateQueries({ queryKey: ["fund-trail-view", caseId] });
      toast({ title: "View saved successfully" });
    },
    onError: (error: any) => {
      console.error("=== MUTATION ERROR ===", error);
      toast({ title: "Failed to save view", variant: "destructive" });
    },
  });

  // Apply saved view to iframe
  const applySavedView = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      console.log("applySavedView: No iframe contentWindow");
      return;
    }

    const cachedData = queryClient.getQueryData<any>(["fund-trail-view", caseId]);

    if (!cachedData) {
      console.log("applySavedView: No cached data to apply");
      return;
    }

    console.log("applySavedView: Applying saved view...");

    const win = iframe.contentWindow as any;
    let attempts = 0;
    const maxAttempts = 30;

    const tryApply = () => {
      attempts++;
      if (typeof win.loadFundTrailView === "function") {
        console.log("applySavedView: Calling loadFundTrailView");
        win.loadFundTrailView(cachedData);
      } else if (attempts < maxAttempts) {
        setTimeout(tryApply, 200);
      } else {
        console.error("applySavedView: loadFundTrailView not found");
      }
    };

    setTimeout(tryApply, 500);
  }, [caseId, queryClient]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    console.log("Iframe loaded");
    applySavedView();
  }, [applySavedView]);

  // Save handler
  const handleSave = useCallback(async () => {
    console.log("=== HANDLE SAVE CALLED ===");

    if (!iframeRef.current?.contentWindow) {
      console.log("No iframe contentWindow");
      toast({ title: "Graph not ready", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const win = iframeRef.current.contentWindow as any;

      if (typeof win.getFundTrailViewData !== "function") {
        console.log("getFundTrailViewData not found");
        toast({ title: "Save not supported", variant: "destructive" });
        setIsSaving(false);
        return;
      }

      console.log("Calling getFundTrailViewData...");
      const viewData = win.getFundTrailViewData();
      console.log("viewData received:", viewData ? "yes" : "no");

      if (!viewData) {
        toast({ title: "No view data", variant: "destructive" });
        setIsSaving(false);
        return;
      }

      console.log("Calling mutateAsync...");
      await saveViewMutation.mutateAsync(viewData);
      console.log("mutateAsync completed");
    } catch (err) {
      console.error("handleSave error:", err);
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [saveViewMutation]);

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
