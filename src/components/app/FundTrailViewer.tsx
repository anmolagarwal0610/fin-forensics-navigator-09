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

  // Fetch saved positions from DB (only on initial load)
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
    staleTime: Infinity, // Never refetch automatically
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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

  // Create modified HTML with injected positions - only uses initial saved view
  const modifiedHtml = useMemo(() => {
    if (!htmlContent) return '';
    
    // Use ref for positions if available, otherwise use query data
    const viewData = savedPositionsRef.current || savedView;
    const positionsJson = viewData?.positions ? JSON.stringify(viewData.positions) : 'null';
    const filtersJson = viewData?.filters ? JSON.stringify(viewData.filters) : 'null';
    
    // Injection script that patches DATA object and overrides saveView
    const injection = `
      <script>
        (function() {
          var savedPos = ${positionsJson};
          var savedFilters = ${filtersJson};
          
          // Wait for DOM and then patch DATA object
          document.addEventListener('DOMContentLoaded', function() {
            // Patch DATA.savedPositions if DATA exists
            if (typeof DATA !== 'undefined') {
              if (savedPos) {
                DATA.savedPositions = savedPos;
              }
              if (savedFilters) {
                DATA.savedFilters = savedFilters;
              }
            }
            
            // Also set on window as fallback
            window.SAVED_POSITIONS = savedPos;
            window.SAVED_FILTERS = savedFilters;
            
            // Override saveView to post message instead of alert
            if (typeof window.saveView === 'function') {
              var originalSaveView = window.saveView;
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
    if (htmlContent.includes('</head>')) {
      return htmlContent.replace('</head>', `${injection}</head>`);
    } else if (htmlContent.includes('</html>')) {
      return htmlContent.replace('</html>', `${injection}</html>`);
    }
    return injection + htmlContent;
  }, [htmlContent, savedView]); // Only recalculate when htmlContent or initial savedView changes

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
        "relative",
        isFullscreen && "fixed inset-0 z-50 bg-background",
        className
      )}
    >
      {/* Action buttons overlay - positioned in top-right */}
      <div className={cn(
        "absolute top-2 right-2 z-10 flex items-center gap-2",
        isFullscreen && "top-4 right-4"
      )}>
        {isSaving && (
          <span className="flex items-center gap-1 text-xs bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}
        <Button 
          onClick={handleDownload} 
          variant="outline" 
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button 
          onClick={onShare} 
          variant="outline" 
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <Button
          onClick={toggleFullscreen}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Iframe with Fund Trail - full height, no header */}
      <iframe
        ref={iframeRef}
        srcDoc={modifiedHtml}
        className={cn(
          "w-full border rounded-lg bg-white",
          isFullscreen ? "h-full" : "h-[75vh]"
        )}
        sandbox="allow-scripts allow-same-origin"
        title="Fund Trail Analysis"
      />
    </div>
  );
}