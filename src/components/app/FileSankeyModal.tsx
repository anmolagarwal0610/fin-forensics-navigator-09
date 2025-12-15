import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import HTMLViewer from "./HTMLViewer";

interface FileSankeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  htmlContent: string;
  onDownload: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  currentIndex: number;
  totalCount: number;
}

export default function FileSankeyModal({
  isOpen,
  onClose,
  fileName,
  htmlContent,
  onDownload,
  onNext,
  onPrevious,
  currentIndex,
  totalCount,
}: FileSankeyModalProps) {
  const hasNext = currentIndex < totalCount - 1;
  const hasPrevious = currentIndex > 0;

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && hasPrevious && onPrevious) {
      onPrevious();
    } else if (e.key === 'ArrowRight' && hasNext && onNext) {
      onNext();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 gap-0"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-4">
            <DialogTitle className="text-lg font-semibold">
              Sankey Graph - {fileName}
            </DialogTitle>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {totalCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 min-h-0 relative">
          <HTMLViewer
            htmlContent={htmlContent}
            title={`Sankey - ${fileName}`}
            className="h-full"
          />
        </div>

        {/* Navigation Footer */}
        {totalCount > 1 && (
          <div className="flex items-center justify-between p-4 border-t bg-muted/30 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Use ← → arrow keys to navigate
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={!hasNext}
              className="gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
