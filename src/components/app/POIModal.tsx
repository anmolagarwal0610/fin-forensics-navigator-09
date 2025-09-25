import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import HTMLViewer from "./HTMLViewer";
import { useEffect } from "react";

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
  currentIndex,
  totalCount
}: POIModalProps) {
  if (!poi) return null;

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' && onNext) {
        onNext();
      } else if (event.key === 'ArrowLeft' && onPrevious) {
        onPrevious();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onNext, onPrevious]);

  const showNavigation = totalCount && totalCount > 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
        <DialogHeader className="flex-shrink-0 p-6 pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex-1">{poi.title}</DialogTitle>
            {showNavigation && (
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                  disabled={currentIndex === 0}
                  className="h-8 w-8 p-0"
                  title="Previous POI (Left Arrow)"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {(currentIndex || 0) + 1} of {totalCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNext}
                  disabled={currentIndex === (totalCount - 1)}
                  className="h-8 w-8 p-0"
                  title="Next POI (Right Arrow)"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 px-6 pb-6 min-h-0 min-h-[600px]">
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