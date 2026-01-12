import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Share2, Save, Loader2, Maximize2, Minimize2, Download } from "lucide-react";
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
  const queryClient = useQueryClient();

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
  });

  // Save view mutation
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund-trail-view', caseId] });
      toast({ title: "View saved successfully" });
    },
    onError: (error) => {
      console.error('Error saving view:', error);
      toast({ title: "Failed to save view", variant: "destructive" });
    }
  });

  // Inject saved positions into HTML before rendering
  const modifiedHtml = useMemo(() => {
    if (!htmlContent) return '';
    
    // Create injection script with saved positions
    const positionsJson = savedView?.positions ? JSON.stringify(savedView.positions) : 'null';
    const filtersJson = savedView?.filters ? JSON.stringify(savedView.filters) : 'null';
    
    const injection = `
      <script>
        window.SAVED_POSITIONS = ${positionsJson};
        window.SAVED_FILTERS = ${filtersJson};
        window.IS_EMBEDDED = true;
        
        // Override saveView to post message to parent
        window.addEventListener('DOMContentLoaded', function() {
          // Check if the original saveView function exists and wrap it
          if (typeof window.saveView === 'function') {
            const originalSaveView = window.saveView;
            window.saveView = function() {
              const data = originalSaveView.apply(this, arguments);
              // Post to parent window
              window.parent.postMessage({
                type: 'FUNDTRAIL_SAVE',
                payload: data
              }, '*');
              return data;
            };
          }
        });
      </script>
    `;
    
    // Insert before </head> if exists, otherwise before </html>
    if (htmlContent.includes('</head>')) {
      return htmlContent.replace('</head>', `${injection}</head>`);
    } else if (htmlContent.includes('</html>')) {
      return htmlContent.replace('</html>', `${injection}</html>`);
    }
    return injection + htmlContent;
  }, [htmlContent, savedView]);

  // Listen for save events from iframe
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'FUNDTRAIL_SAVE') {
        setIsSaving(true);
        const { positions, filters } = event.data.payload;
        
        try {
          await saveViewMutation.mutateAsync({ positions, filters });
        } finally {
          setIsSaving(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [saveViewMutation]);

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
      {/* Header with controls */}
      <div className={cn(
        "flex items-center justify-between gap-2 mb-2 px-1",
        isFullscreen && "absolute top-2 left-2 right-2 z-10"
      )}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Fund Trail Analysis
          </h3>
          {isSaving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleDownload} 
            variant="outline" 
            size="sm"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button 
            onClick={onShare} 
            variant="outline" 
            size="sm"
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button
            onClick={toggleFullscreen}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Iframe with Fund Trail */}
      <iframe
        ref={iframeRef}
        srcDoc={modifiedHtml}
        className={cn(
          "w-full border rounded-lg bg-white",
          isFullscreen ? "h-[calc(100%-48px)]" : "h-[80vh]"
        )}
        sandbox="allow-scripts allow-same-origin"
        title="Fund Trail Analysis"
      />
    </div>
  );
}