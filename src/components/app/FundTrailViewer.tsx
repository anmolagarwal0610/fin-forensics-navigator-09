import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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

  // Fetch saved view_data from DB
  const { data: savedViewData, isLoading: loadingView } = useQuery({
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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Save view mutation using view_data column
  const saveViewMutation = useMutation({
    mutationFn: async (viewData: any) => {
      // We need to provide a value for the required `positions` column for backward compat
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
      toast({ title: "View saved successfully" });
    },
    onError: (error) => {
      console.error("Error saving view:", error);
      toast({ title: "Failed to save view", variant: "destructive" });
    },
  });

  // Load saved view into iframe after it loads
  const handleIframeLoad = useCallback(() => {
    if (!savedViewData || !iframeRef.current?.contentWindow) return;
    try {
      const win = iframeRef.current.contentWindow as any;
      // Wait for the HTML's JS to initialize, then call loadFundTrailView
      const tryLoad = (attempts: number) => {
        if (typeof win.loadFundTrailView === "function") {
          win.loadFundTrailView(savedViewData);
          console.log("Fund Trail view loaded from saved data");
        } else if (attempts > 0) {
          setTimeout(() => tryLoad(attempts - 1), 200);
        } else {
          console.warn("loadFundTrailView not available on iframe");
        }
      };
      // Give the iframe time to initialize
      setTimeout(() => tryLoad(15), 300);
    } catch (err) {
      console.error("Error loading fund trail view:", err);
    }
  }, [savedViewData]);

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

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
    toast({ title: "Graph refreshed" });
  };

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
