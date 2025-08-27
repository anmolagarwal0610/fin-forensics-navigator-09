import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, Loader2 } from 'lucide-react';

interface FullscreenVisualizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  htmlContent?: string;
  blobUrl?: string;
  downloadFileName?: string;
  onDownload?: () => void;
}

export default function FullscreenVisualizationModal({
  isOpen,
  onClose,
  title,
  htmlContent,
  blobUrl,
  downloadFileName,
  onDownload
}: FullscreenVisualizationModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(false);
    }
  }, [isOpen, htmlContent, blobUrl]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError(true);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 bg-background">
        <DialogHeader className="px-6 py-4 border-b bg-muted/50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <div className="flex items-center gap-2">
              {onDownload && downloadFileName && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownload}
                  className="h-8"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading visualization...
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center text-muted-foreground">
                <div className="text-lg font-medium mb-2">Unable to load visualization</div>
                <div className="text-sm">The HTML content could not be displayed</div>
              </div>
            </div>
          )}
          
          {htmlContent ? (
            <iframe
              srcDoc={htmlContent}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title={title}
            />
          ) : blobUrl ? (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title={title}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No content available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}