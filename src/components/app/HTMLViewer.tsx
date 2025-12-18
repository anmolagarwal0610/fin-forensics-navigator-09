import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RotateCcw, Maximize2, Download, Image } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface HTMLViewerProps {
  htmlContent: string;
  title?: string;
  onDownload?: () => void;
  onDownloadPng?: () => void;
  className?: string;
}

export default function HTMLViewer({ htmlContent, title, onDownload, onDownloadPng, className = "" }: HTMLViewerProps) {
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Memoize Blob URL to prevent recreation on every render
  const blobUrl = useMemo(() => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [htmlContent, key]);

  // Clean up Blob URL when it changes or component unmounts
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
    toast({ title: "Graph refreshed" });
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    }
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) {
          // Inject custom styles for better integration
          const style = iframeDoc.createElement('style');
          style.textContent = `
            body { 
              margin: 0; 
              padding: 16px;
              background: #ffffff !important; 
            }
            .plotly-graph-div { 
              height: 100% !important; 
              width: 100% !important; 
            }
          `;
          iframeDoc.head.appendChild(style);

          // Trigger ECharts resize after a short delay to ensure proper dimensions
          const resizeScript = iframeDoc.createElement('script');
          resizeScript.textContent = `
            setTimeout(function() {
              if (typeof echarts !== 'undefined') {
                var charts = document.querySelectorAll('[_echarts_instance_]');
                charts.forEach(function(el) {
                  var chart = echarts.getInstanceByDom(el);
                  if (chart) {
                    chart.resize();
                  }
                });
              }
              // Also handle Plotly charts
              if (typeof Plotly !== 'undefined') {
                var plotlyDivs = document.querySelectorAll('.plotly-graph-div');
                plotlyDivs.forEach(function(el) {
                  Plotly.Plots.resize(el);
                });
              }
            }, 150);
          `;
          iframeDoc.body.appendChild(resizeScript);
        }
      } catch (error) {
        // Ignore cross-origin errors
        console.log('Cross-origin iframe styling skipped');
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [key, blobUrl]);

  return (
    <div className={`relative bg-card border rounded-lg overflow-hidden shadow-sm flex flex-col ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
        <h3 className="text-sm font-medium text-foreground">{title || "Interactive Visualization"}</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-8 w-8 p-0"
            title="Refresh graph"
          >
            <RotateCcw className="h-4 w-4 text-foreground" />
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFullscreen}
                  className="h-8 w-8 p-0"
                  title="View fullscreen"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Use Esc to exit full-screen</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              className="h-8 w-8 p-0"
              title="Download HTML"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {onDownloadPng && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownloadPng}
              className="h-8 w-8 p-0"
              title="Download PNG"
            >
              <Image className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* HTML Content */}
      <div className="relative flex-1">
        <iframe
          key={key}
          ref={iframeRef}
          src={blobUrl}
          className="w-full h-full border-0"
          title={title || "Interactive Visualization"}
          sandbox="allow-scripts allow-same-origin"
        />
        
        {/* Refresh button overlay */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          className="absolute bottom-2 right-2 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-background/90"
          title="Refresh visualization"
        >
          <RotateCcw className="h-3 w-3 text-foreground" />
        </Button>
      </div>
    </div>
  );
}
