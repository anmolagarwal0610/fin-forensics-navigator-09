import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RotateCcw, Maximize2, Download, Image, Loader2 } from "lucide-react";
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
  const [isCapturing, setIsCapturing] = useState(false);
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

  // Handle postMessage for PNG capture response
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CHART_PNG_DATA' && event.data?.imageData) {
        // Create download link
        const link = document.createElement('a');
        link.href = event.data.imageData;
        link.download = `${title?.replace(/[^a-zA-Z0-9]/g, '_') || 'chart'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsCapturing(false);
        toast({ title: "Chart downloaded as PNG" });
      } else if (event.data?.type === 'CHART_PNG_ERROR') {
        setIsCapturing(false);
        toast({ 
          title: "Unable to capture chart", 
          description: event.data.error || "Unknown error",
          variant: "destructive" 
        });
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [title]);

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

  // Capture chart as PNG by injecting script into iframe
  const captureChartAsPng = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) {
        setIsCapturing(false);
        toast({ title: "Cannot access chart content", variant: "destructive" });
        return;
      }
      
      // Inject capture script
      const captureScript = iframeDoc.createElement('script');
      captureScript.textContent = `
        (function() {
          try {
            // Try ECharts first
            if (typeof echarts !== 'undefined') {
              var chartContainers = document.querySelectorAll('[_echarts_instance_]');
              if (chartContainers.length > 0) {
                var chart = echarts.getInstanceByDom(chartContainers[0]);
                if (chart) {
                  var dataURL = chart.getDataURL({
                    pixelRatio: 2,
                    backgroundColor: '#fff'
                  });
                  window.parent.postMessage({ 
                    type: 'CHART_PNG_DATA', 
                    imageData: dataURL 
                  }, '*');
                  return;
                }
              }
            }
            
            // Try Plotly
            if (typeof Plotly !== 'undefined') {
              var plotlyDiv = document.querySelector('.plotly-graph-div');
              if (plotlyDiv) {
                Plotly.toImage(plotlyDiv, { 
                  format: 'png', 
                  width: 1920, 
                  height: 1080,
                  scale: 2 
                }).then(function(dataURL) {
                  window.parent.postMessage({ 
                    type: 'CHART_PNG_DATA', 
                    imageData: dataURL 
                  }, '*');
                }).catch(function(err) {
                  window.parent.postMessage({ 
                    type: 'CHART_PNG_ERROR', 
                    error: 'Plotly capture failed: ' + err.message 
                  }, '*');
                });
                return;
              }
            }
            
            // Fallback: Try to find any canvas element
            var canvas = document.querySelector('canvas');
            if (canvas) {
              var dataURL = canvas.toDataURL('image/png');
              window.parent.postMessage({ 
                type: 'CHART_PNG_DATA', 
                imageData: dataURL 
              }, '*');
              return;
            }
            
            window.parent.postMessage({ 
              type: 'CHART_PNG_ERROR', 
              error: 'No chart found to capture' 
            }, '*');
          } catch (e) {
            window.parent.postMessage({ 
              type: 'CHART_PNG_ERROR', 
              error: e.message 
            }, '*');
          }
        })();
      `;
      iframeDoc.body.appendChild(captureScript);
      
      // Timeout fallback
      setTimeout(() => {
        setIsCapturing(prev => {
          if (prev) {
            toast({ title: "Capture timed out. Try again.", variant: "destructive" });
          }
          return false;
        });
      }, 5000);
    } catch (error) {
      setIsCapturing(false);
      toast({ 
        title: "Cannot capture chart", 
        description: "Cross-origin restriction or access denied",
        variant: "destructive" 
      });
    }
  }, [isCapturing]);

  // Function to resize charts when entering/exiting fullscreen
  const resizeChartsInIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    try {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) return;

      // Override inline styles on chart containers and trigger resize
      const resizeScript = iframeDoc.createElement('script');
      resizeScript.textContent = `
        (function() {
          // Find all chart containers with fixed inline styles
          var chartContainers = document.querySelectorAll('[_echarts_instance_]');
          chartContainers.forEach(function(el) {
            // Override fixed width/height to 100%
            el.style.width = '100%';
            el.style.height = '100%';
            
            // Trigger ECharts resize
            if (typeof echarts !== 'undefined') {
              var chart = echarts.getInstanceByDom(el);
              if (chart) {
                setTimeout(function() { chart.resize(); }, 50);
              }
            }
          });
          
          // Also handle Plotly charts
          if (typeof Plotly !== 'undefined') {
            var plotlyDivs = document.querySelectorAll('.plotly-graph-div');
            plotlyDivs.forEach(function(el) {
              el.style.width = '100%';
              el.style.height = '100%';
              setTimeout(function() { Plotly.Plots.resize(el); }, 50);
            });
          }
        })();
      `;
      iframeDoc.body.appendChild(resizeScript);
    } catch (error) {
      console.log('Cross-origin iframe styling skipped');
    }
  }, []);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Small delay to allow fullscreen transition to complete
      setTimeout(() => {
        resizeChartsInIframe();
      }, 100);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [resizeChartsInIframe]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) {
          // Inject custom styles for better integration and fullscreen support
          const style = iframeDoc.createElement('style');
          style.textContent = `
            html, body { 
              margin: 0; 
              padding: 16px;
              background: #ffffff !important;
              width: 100% !important;
              height: 100% !important;
              overflow: auto;
            }
            :fullscreen body,
            :-webkit-full-screen body {
              padding: 0;
            }
            .plotly-graph-div { 
              height: 100% !important; 
              width: 100% !important; 
            }
            /* Override fixed width/height on ECharts containers in fullscreen */
            :fullscreen [_echarts_instance_],
            :-webkit-full-screen [_echarts_instance_] {
              width: 100% !important;
              height: 100% !important;
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

  // Determine which PNG handler to use
  const handlePngDownload = onDownloadPng || captureChartAsPng;

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
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePngDownload}
            disabled={isCapturing}
            className="h-8 w-8 p-0"
            title="Download PNG"
          >
            {isCapturing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Image className="h-4 w-4" />
            )}
          </Button>
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