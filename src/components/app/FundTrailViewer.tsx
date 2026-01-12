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

export default function FundTrailViewer({ 
  htmlContent, 
  caseId, 
  onShare,
  className 
}: FundTrailViewerProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use ref to store positions locally without triggering re-render
  const savedPositionsRef = useRef<{ positions: any; filters: any } | null>(null);
  const hasLoadedInitialRef = useRef(false);

  // Fetch saved positions from DB
  const { data: savedView, isLoading: loadingView } = useQuery({
    queryKey: ['fund-trail-view', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fund_trail_views')
        .select('positions, filters')
        .eq('case_id', caseId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching saved view:', error);
        return null;
      }
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Refetch on mount to get latest saved view
  });

  // Store initial saved view in ref
  useEffect(() => {
    if (savedView && !hasLoadedInitialRef.current) {
      savedPositionsRef.current = savedView;
      hasLoadedInitialRef.current = true;
    }
  }, [savedView]);

  // Save view mutation - NO query invalidation to prevent re-render
  const saveViewMutation = useMutation({
    mutationFn: async ({ positions, filters }: { positions: any; filters: any }) => {
      const { error } = await supabase
        .from('fund_trail_views')
        .upsert({
          case_id: caseId,
          positions,
          filters,
          updated_at: new Date().toISOString()
        }, { onConflict: 'case_id' });
      
      if (error) throw error;
      
      // Update local ref without re-render
      savedPositionsRef.current = { positions, filters };
    },
    onSuccess: () => {
      toast({ title: "View saved successfully" });
    },
    onError: (error) => {
      console.error('Error saving view:', error);
      toast({ title: "Failed to save view", variant: "destructive" });
    }
  });

  // Create modified HTML with injected positions - SYNCHRONOUS injection
  const modifiedHtml = useMemo(() => {
    if (!htmlContent) return '';
    
    // Use ref for positions if available, otherwise use query data
    const viewData = savedPositionsRef.current || savedView;
    const positionsJson = viewData?.positions ? JSON.stringify(viewData.positions) : 'null';
    const filtersJson = viewData?.filters ? JSON.stringify(viewData.filters) : 'null';
    
    let modified = htmlContent;
    
    // SYNCHRONOUS injection - modify DATA object directly where it's defined
    // This ensures savedPositions is set BEFORE line 898 reads it
    if (viewData?.positions) {
      // Find the DATA object definition and inject savedPositions into it
      // Pattern: const DATA = { ... savedPositions: null ... };
      modified = modified.replace(
        /(const\s+DATA\s*=\s*\{[^}]*savedPositions\s*:\s*)null/,
        `$1${positionsJson}`
      );
      
      // Also patch savedPositions variable if it exists separately
      modified = modified.replace(
        /(let\s+savedPositions\s*=\s*)null/,
        `$1${positionsJson}`
      );
    }
    
    if (viewData?.filters) {
      // Patch savedFilters if exists in DATA
      modified = modified.replace(
        /(savedFilters\s*:\s*)null/,
        `$1${filtersJson}`
      );
    }
    
    // Additional script for saveView override (runs after DOM ready)
    const injection = `
      <script>
        (function() {
          // Override saveView to post message instead of alert
          document.addEventListener('DOMContentLoaded', function() {
            if (typeof window.saveView === 'function') {
              window.saveView = function() {
                // Collect current positions from d3 nodes
                var positions = {};
                if (typeof d3 !== 'undefined') {
                  d3.selectAll('.node').each(function(d) {
                    if (d && d.id) {
                      positions[d.id] = { x: d.x, y: d.y };
                    }
                  });
                }
                
                // Get current filter state
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
                
                // Post to parent window for saving
                window.parent.postMessage({
                  type: 'FUNDTRAIL_SAVE',
                  payload: data
                }, '*');
                
                // Update internal state without alert
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
              };
            }
          });
        })();
      </script>
    `;
    
    // Insert before </head> if exists, otherwise before </html>
    if (modified.includes('</head>')) {
      return modified.replace('</head>', `${injection}</head>`);
    } else if (modified.includes('</html>')) {
      return modified.replace('</html>', `${injection}</html>`);
    }
    return injection + modified;
  }, [htmlContent, savedView]);

  // Listen for save events from iframe
  const handleMessage = useCallback(async (event: MessageEvent) => {
    if (event.data?.type === 'FUNDTRAIL_SAVE') {
      setIsSaving(true);
      const { positions, filters } = event.data.payload;
      
      try {
        await saveViewMutation.mutateAsync({ positions, filters });
      } finally {
        setIsSaving(false);
      }
    }
  }, [saveViewMutation]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Handle fullscreen toggle
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

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Download HTML file
  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fund_trail_main.html';
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
      className={cn(
        "flex flex-col",
        isFullscreen && "fixed inset-0 z-50 bg-background p-4",
        className
      )}
    >
      {/* Toolbar - positioned ABOVE iframe */}
      <div className="flex items-center justify-end gap-2 mb-2">
        {isSaving && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}
        <Button 
          onClick={handleDownload} 
          variant="outline" 
          size="sm"
        >
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>
        <Button 
          onClick={onShare} 
          variant="outline" 
          size="sm"
        >
          <Share2 className="h-4 w-4 mr-1.5" />
          Share
        </Button>
        <Button
          onClick={toggleFullscreen}
          variant="outline"
          size="sm"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Iframe with Fund Trail - takes remaining height */}
      <iframe
        ref={iframeRef}
        srcDoc={modifiedHtml}
        className={cn(
          "w-full border rounded-lg bg-white flex-1",
          isFullscreen ? "h-full" : "h-[72vh]"
        )}
        sandbox="allow-scripts allow-same-origin"
        title="Fund Trail Analysis"
      />
    </div>
  );
}