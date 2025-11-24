
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Upload, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { countFilePages } from "@/utils/pageCounter";
import { toast } from "@/hooks/use-toast";

interface FileItem {
  name: string;
  size: number;
  file: File;
  pageCount?: number;
  isCountingPages?: boolean;
  countingError?: boolean;
}

interface FileUploaderProps {
  files: FileItem[];
  onFilesChange: (files: FileItem[] | ((prevFiles: FileItem[]) => FileItem[])) => void;
  maxFileSize?: number;
  acceptedTypes?: string[];
}

export default function FileUploader({ 
  files, 
  onFilesChange, 
  maxFileSize = 250 * 1024 * 1024, // 250MB
  acceptedTypes = ['.pdf', '.zip']
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: FileItem[] = acceptedFiles.map(file => ({
      name: file.name,
      size: file.size,
      file: file,
      isCountingPages: true,
      pageCount: undefined,
      countingError: false
    }));
    
    // Immediately add files with "counting" status using functional update
    onFilesChange(prevFiles => {
      const combinedFiles = [...prevFiles, ...newFiles];
      return combinedFiles.length > 25 ? combinedFiles.slice(0, 25) : combinedFiles;
    });
    
    // Count pages for each file individually using functional state updates
    for (const newFile of newFiles) {
      try {
        const result = await countFilePages(newFile.file);
        
        // Use functional state update to avoid stale closure
        onFilesChange(prevFiles => 
          prevFiles.map(f => 
            f.file === newFile.file 
              ? { ...f, pageCount: result.pages, isCountingPages: false, countingError: false }
              : f
          )
        );
        
        console.log(`✅ Counted ${result.pages} pages in ${newFile.name}`);
        
      } catch (error) {
        console.error(`❌ Failed to count pages for ${newFile.name}:`, error);
        
        // Show error to user with toast
        toast({
          title: "Page counting failed",
          description: `Could not count pages in ${newFile.name}. ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        });
        
        // Mark as failed with error flag
        onFilesChange(prevFiles => 
          prevFiles.map(f => 
            f.file === newFile.file 
              ? { ...f, pageCount: undefined, isCountingPages: false, countingError: true }
              : f
          )
        );
      }
    }
  }, [onFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxSize: maxFileSize,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    onDropAccepted: () => setDragActive(false),
    onDropRejected: () => setDragActive(false)
  });

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    onFilesChange(updatedFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
          isDragActive || dragActive 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <div className="space-y-2">
          <p className="text-lg font-medium">
            {isDragActive ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse files
          </p>
          <p className="text-xs text-muted-foreground">
            Accepts PDF, Images (PNG, JPG), Excel, and CSV files • Max {Math.round(maxFileSize / (1024 * 1024))}MB per file
          </p>
        </div>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Selected Files ({files.length})</h3>
          {files.map((file, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      {file.isCountingPages && (
                        <span className="text-blue-600 dark:text-blue-400">• Counting pages...</span>
                      )}
                      {file.countingError && (
                        <span className="text-destructive font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          • Failed to count pages
                        </span>
                      )}
                      {file.pageCount !== undefined && !file.countingError && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          • {file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
