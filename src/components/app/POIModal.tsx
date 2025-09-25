import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import HTMLViewer from "./HTMLViewer";

interface POIModalProps {
  isOpen: boolean;
  onClose: () => void;
  poi: {
    name: string;
    htmlContent: string;
    title: string;
    pngUrl?: string;
  } | null;
  onDownloadHtml?: () => void;
  onDownloadPng?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  currentIndex?: number;
  totalCount?: number;
}

export default function POIModal({ 
  isOpen, 
  onClose, 
  poi, 
  onDownloadHtml, 
  onDownloadPng,
  onNext,
  onPrevious,
  currentIndex = 0,
  totalCount = 0
}: POIModalProps) {
  if (!poi) return null;

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && onPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isOpen, onNext, onPrevious]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">{poi.title}</DialogTitle>
            <div className="flex items-center gap-2">
              {totalCount > 1 && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {currentIndex + 1} of {totalCount}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onPrevious}
                    disabled={currentIndex === 0}
                    className="h-8 w-8 p-0"
                    title="Previous POI (←)"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onNext}
                    disabled={currentIndex === totalCount - 1}
                    className="h-8 w-8 p-0"
                    title="Next POI (→)"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 p-4 overflow-hidden">
          <HTMLViewer
            htmlContent={poi.htmlContent}
            title={poi.title}
            onDownload={onDownloadHtml}
            onDownloadPng={onDownloadPng}
            className="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}