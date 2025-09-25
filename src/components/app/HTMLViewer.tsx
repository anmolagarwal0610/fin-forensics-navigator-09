import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
    toast({ title: "Graph refreshed" });
  };

  const handleFullscreen = () => {
    if (iframeRef.current) {
      if (!document.fullscreenElement) {
        iframeRef.current.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    }
  };

  const handleExitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        // Inject custom styles for better integration
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) {
          const style = iframeDoc.createElement('style');
          style.textContent = `
            body { 
              margin: 0; 
              padding: 16px;
              background: transparent !important; 
            }
            .plotly-graph-div { 
              height: 100% !important; 
              width: 100% !important; 
            }
          `;
          iframeDoc.head.appendChild(style);
        }
      } catch (error) {
        // Ignore cross-origin errors
        console.log('Cross-origin iframe styling skipped');
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [key]);

  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const createBlobUrl = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    return URL.createObjectURL(blob);
  };

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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFullscreen}
            className="h-8 w-8 p-0"
            title="View fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
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
      <div className="relative flex-1 min-h-[400px]">
        <iframe
          key={key}
          ref={iframeRef}
          src={createBlobUrl()}
          className="w-full h-full border-0"
          title={title || "Interactive Visualization"}
          sandbox="allow-scripts allow-same-origin"
        />
        
        {/* Fullscreen exit notification */}
        {isFullscreen && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background/95 backdrop-blur-sm border rounded-lg px-4 py-2 shadow-lg z-10">
            <div className="flex items-center gap-2 text-sm">
              <span>Press ESC to exit fullscreen</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExitFullscreen}
                className="h-6 px-2 text-xs"
              >
                Exit
              </Button>
            </div>
          </div>
        )}
        
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