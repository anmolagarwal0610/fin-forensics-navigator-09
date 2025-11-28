
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { X, Upload, FileText, AlertCircle, Lock, CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { countFilePages } from "@/utils/pageCounter";
import { verifyPdfPassword } from "@/utils/passwordVerifier";
import { toast } from "@/hooks/use-toast";

interface FileItem {
  name: string;
  size: number;
  file: File;
  pageCount?: number;
  isCountingPages?: boolean;
  countingError?: boolean;
  needsPassword?: boolean;
  password?: string;
  passwordVerified?: boolean;
  isVerifying?: boolean;
  verifyError?: string;
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
  const [passwordInputs, setPasswordInputs] = useState<Record<number, string>>({});
  const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});

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
              ? { 
                  ...f, 
                  pageCount: result.pages, 
                  isCountingPages: false, 
                  countingError: false,
                  needsPassword: result.needsPassword || false
                }
              : f
          )
        );
        
        if (result.needsPassword) {
          console.log(`🔒 ${newFile.name} requires a password`);
        } else {
          console.log(`✅ Counted ${result.pages} pages in ${newFile.name}`);
        }
        
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
    // Clean up password input
    setPasswordInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[index];
      return newInputs;
    });
  };

  const handlePasswordChange = (index: number, value: string) => {
    setPasswordInputs(prev => ({ ...prev, [index]: value }));
  };

  const togglePasswordVisibility = (index: number) => {
    setShowPassword(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleVerifyPassword = async (index: number) => {
    const file = files[index];
    const password = passwordInputs[index];
    
    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter a password to verify.",
        variant: "destructive"
      });
      return;
    }
    
    // Mark as verifying
    onFilesChange(prev => prev.map((f, i) => 
      i === index ? { ...f, isVerifying: true, verifyError: undefined } : f
    ));
    
    try {
      const result = await verifyPdfPassword(file.file, password);
      
      if (result.valid && result.pageCount !== undefined) {
        // Password is correct - store it and update page count
        onFilesChange(prev => prev.map((f, i) => 
          i === index ? {
            ...f,
            password: password,
            passwordVerified: true,
            isVerifying: false,
            pageCount: result.pageCount,
            needsPassword: true, // Keep this flag to know it WAS protected
            verifyError: undefined
          } : f
        ));
        
        toast({
          title: "Password verified",
          description: `${file.name} password is correct. Ready for analysis.`
        });
      } else {
        // Password is incorrect
        onFilesChange(prev => prev.map((f, i) => 
          i === index ? { ...f, isVerifying: false, verifyError: result.error } : f
        ));
      }
    } catch (error) {
      console.error('Failed to verify password:', error);
      onFilesChange(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          isVerifying: false, 
          verifyError: error instanceof Error ? error.message : 'Failed to verify password' 
        } : f
      ));
    }
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
                      {file.needsPassword && !file.passwordVerified && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          • Password protected
                        </span>
                      )}
                      {file.passwordVerified && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          • Password verified
                        </span>
                      )}
                      {file.pageCount !== undefined && !file.countingError && (!file.needsPassword || file.passwordVerified) && (
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
              
              {file.needsPassword && !file.passwordVerified && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm mb-2">
                    <Lock className="h-4 w-4" />
                    <span className="font-medium">This PDF is password-protected</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword[index] ? "text" : "password"}
                        placeholder="Enter PDF password"
                        value={passwordInputs[index] || ''}
                        onChange={(e) => handlePasswordChange(index, e.target.value)}
                        className="h-9 text-sm pr-10"
                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword(index)}
                        disabled={file.isVerifying}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => togglePasswordVisibility(index)}
                        disabled={file.isVerifying}
                      >
                        {showPassword[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleVerifyPassword(index)}
                      disabled={file.isVerifying || !passwordInputs[index]}
                      className="h-9 px-3"
                    >
                      {file.isVerifying ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Verify
                        </>
                      )}
                    </Button>
                  </div>
                  {file.verifyError && (
                    <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {file.verifyError}
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
