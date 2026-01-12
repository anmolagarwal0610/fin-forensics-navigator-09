import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Share2, Loader2, Maximize2, Minimize2, Download } from "lucide-react";
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const savedPositionsRef = useRef<{ positions: any; filters: any } | null>(null);
  const hasLoadedInitialRef = useRef(false);

  // Fetch saved positions from DB
  const { data: savedView, isLoading: loadingView } = useQuery({
    queryKey: ["fund-trail-view", caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fund_trail_views")
        .select("positions, filters")
        .eq("case_id", caseId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching saved view:", error);
        return null;
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (savedView && !hasLoadedInitialRef.current) {
      savedPositionsRef.current = savedView;
      hasLoadedInitialRef.current = true;
    }
  }, [savedView]);

  const saveViewMutation = useMutation({
    mutationFn: async ({ positions, filters }: { positions: any; filters: any }) => {
      const { error } = await supabase.from("fund_trail_views").upsert(
        {
          case_id: caseId,
          positions,
          filters,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "case_id" },
      );

      if (error) throw error;
      savedPositionsRef.current = { positions, filters };
    },
    onSuccess: () => {
      toast({ title: "View saved successfully" });
    },
    onError: (error) => {
      console.error("Error saving view:", error);
      toast({ title: "Failed to save view", variant: "destructive" });
    },
  });

  // FIXED: Proper HTML injection for saved positions
  const modifiedHtml = useMemo(() => {
    if (!htmlContent) return "";

    const viewData = savedPositionsRef.current || savedView;
    let modified = htmlContent;

    // Inject saved positions by replacing the variable initialization
    if (viewData?.positions && Object.keys(viewData.positions).length > 0) {
      const positionsJson = JSON.stringify(viewData.positions);

      // Pattern 1: Replace "let savedPositions = DATA.savedPositions || null;"
      modified = modified.replace(
        /let\s+savedPositions\s*=\s*DATA\.savedPositions\s*\|\|\s*null\s*;/,
        `let savedPositions = ${positionsJson};`,
      );

      // Pattern 2: Also try "let savedPositions = null;" if DATA.savedPositions pattern not found
      if (modified.includes("let savedPositions = null;")) {
        modified = modified.replace(/let\s+savedPositions\s*=\s*null\s*;/, `let savedPositions = ${positionsJson};`);
      }

      // Set hasSavedView to true
      modified = modified.replace(/let\s+hasSavedView\s*=\s*!!savedPositions\s*;/, `let hasSavedView = true;`);

      // Also try direct false replacement
      modified = modified.replace(/let\s+hasSavedView\s*=\s*false\s*;/, `let hasSavedView = true;`);
    }

    // Inject saved filters
    if (viewData?.filters) {
      const { selectedOwners, topN: savedTopN } = viewData.filters;

      if (selectedOwners && Array.isArray(selectedOwners) && selectedOwners.length > 0) {
        const ownersJson = JSON.stringify(selectedOwners);
        // Replace the selectedOwners initialization
        modified = modified.replace(
          /let\s+selectedOwners\s*=\s*new\s+Set\(DATA\.owners\.map\(\s*i\s*=>\s*DATA\.nodes\[i\]\.id\s*\)\);/,
          `let selectedOwners = new Set(${ownersJson});`,
        );
      }

      if (savedTopN && typeof savedTopN === "number") {
        modified = modified.replace(/let\s+topN\s*=\s*25\s*;/, `let topN = ${savedTopN};`);
      }
    }

    // Override saveView function to post message instead of alert
    const injection = `
      <script>
        (function() {
          var originalSaveView;
          
          function setupSaveViewOverride() {
            if (typeof window.saveView === 'function' && window.saveView !== overriddenSaveView) {
              originalSaveView = window.saveView;
              window.saveView = overriddenSaveView;
            }
          }
          
          function overriddenSaveView() {
            var positions = {};
            if (typeof d3 !== 'undefined') {
              d3.selectAll('.node').each(function(d) {
                if (d && d.id) {
                  positions[d.id] = { x: d.x, y: d.y };
                }
              });
            }
            
            var filters = {
              selectedOwners: typeof selectedOwners !== 'undefined' ? Array.from(selectedOwners) : [],
              topN: typeof topN !== 'undefined' ? topN : 25
            };
            
            var data = {
              positions: positions,
              filters: filters,
              timestamp: new Date().toISOString(),
              version: '1.0'
            };
            
            window.parent.postMessage({
              type: 'FUNDTRAIL_SAVE',
              payload: data
            }, '*');
            
            if (typeof savedPositions !== 'undefined') {
              savedPositions = positions;
            }
            if (typeof hasSavedView !== 'undefined') {
              hasSavedView = true;
            }
            if (typeof hasUnsavedChanges !== 'undefined') {
              hasUnsavedChanges = false;
            }
            if (typeof updateUIState === 'function') {
              updateUIState();
            }
            
            console.log('Fund Trail View Saved:', data);
            return data;
          }
          
          // Try to setup immediately
          setupSaveViewOverride();
          
          // Also setup after DOM ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupSaveViewOverride);
          }
          
          // And after a short delay to catch late definitions
          setTimeout(setupSaveViewOverride, 100);
          setTimeout(setupSaveViewOverride, 500);
        })();
      </script>
    `;

    if (modified.includes("</body>")) {
      return modified.replace("</body>", `${injection}</body>`);
    } else if (modified.includes("</html>")) {
      return modified.replace("</html>", `${injection}</html>`);
    }
    return modified + injection;
  }, [htmlContent, savedView]);

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      if (event.data?.type === "FUNDTRAIL_SAVE") {
        setIsSaving(true);
        const { positions, filters } = event.data.payload;

        try {
          await saveViewMutation.mutateAsync({ positions, filters });
        } finally {
          setIsSaving(false);
        }
      }
    },
    [saveViewMutation],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
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
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>
        <Button onClick={onShare} variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-1.5" />
          Share
        </Button>
        <Button onClick={toggleFullscreen} variant="outline" size="sm">
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      <iframe
        ref={iframeRef}
        srcDoc={modifiedHtml}
        className={cn("w-full border rounded-lg bg-white flex-1", isFullscreen ? "h-full" : "h-[72vh]")}
        sandbox="allow-scripts allow-same-origin"
        title="Fund Trail Analysis"
      />
    </div>
  );
}
