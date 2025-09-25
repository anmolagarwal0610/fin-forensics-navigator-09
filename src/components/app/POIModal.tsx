import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
}

export default function POIModal({ 
  isOpen, 
  onClose, 
  poi, 
  onDownloadHtml, 
  onDownloadPng 
}: POIModalProps) {
  if (!poi) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-semibold">{poi.title}</DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-0">
          <HTMLViewer
            htmlContent={poi.htmlContent}
            title={poi.title}
            onDownload={onDownloadHtml}
            onDownloadPng={onDownloadPng}
            className="min-h-[70vh]"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}