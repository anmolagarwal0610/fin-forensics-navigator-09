import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useState, useEffect } from "react";
import ExcelViewer from "./ExcelViewer";
import * as XLSX from "xlsx";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileUrl: string;
  onDownload?: () => void;
}

export default function FilePreviewModal({
  isOpen,
  onClose,
  fileName,
  fileUrl,
  onDownload
}: FilePreviewModalProps) {
  const [fileType, setFileType] = useState<'pdf' | 'excel' | 'csv' | 'image' | 'unknown'>('unknown');
  const [excelData, setExcelData] = useState<any[][]>([]);

  useEffect(() => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'pdf') setFileType('pdf');
    else if (['xlsx', 'xls'].includes(ext || '')) setFileType('excel');
    else if (ext === 'csv') setFileType('csv');
    else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) setFileType('image');
    else setFileType('unknown');
  }, [fileName]);

  useEffect(() => {
    if ((fileType === 'excel' || fileType === 'csv') && fileUrl) {
      loadExcelData();
    }
  }, [fileType, fileUrl]);

  const loadExcelData = async () => {
    try {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
      
      // Convert to CellData format
      const cellData = (jsonData as any[][]).map(row => 
        row.map(cell => ({ value: cell }))
      );
      
      setExcelData(cellData);
    } catch (error) {
      console.error("Failed to load Excel data:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-8">{fileName}</DialogTitle>
            <div className="flex items-center gap-2">
              {onDownload && (
                <Button onClick={onDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <Button onClick={onClose} variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {fileType === 'pdf' && (
            <iframe
              src={fileUrl}
              className="w-full h-[75vh] border-0"
              title={fileName}
            />
          )}
          
          {fileType === 'image' && (
            <div className="flex items-center justify-center p-4">
              <img src={fileUrl} alt={fileName} className="max-w-full max-h-[70vh] object-contain" />
            </div>
          )}
          
          {(fileType === 'excel' || fileType === 'csv') && excelData.length > 0 && (
            <div className="p-4">
              <ExcelViewer
                title=""
                data={excelData}
                maxRows={50}
              />
            </div>
          )}
          
          {fileType === 'unknown' && (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Preview not available for this file type</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
