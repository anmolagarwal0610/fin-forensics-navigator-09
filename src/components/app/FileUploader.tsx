
import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { X, Upload, FileText, AlertCircle, Lock, CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { countFilePages } from "@/utils/pageCounter";
import { verifyPdfPassword } from "@/utils/passwordVerifier";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  isSubMismatched,
  type OwnerMismatchAlerts,
} from "@/utils/ownerMismatchAlerts";

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
  isPreExisting?: boolean;
  // Header detection fields (Excel/CSV only)
  headerStatus?: 'pending' | 'ok' | 'anomaly' | 'no-headers' | 'single-column' | 'mapped';
  parsedRows?: string[][];
  detectedHeaderRow?: number | null;
  columnMapping?: Record<string, string>;
  headerRowIndex?: number;
  accountHolderName?: string;
  mergeParentName?: string;
}

interface FileUploaderProps {
  files: FileItem[];
  onFilesChange: (files: FileItem[] | ((prevFiles: FileItem[]) => FileItem[])) => void;
  maxFileSize?: number;
  acceptedTypes?: string[];
  renderFileExtra?: (file: FileItem) => React.ReactNode;
  /** Optional extra actions rendered in the right-side action cluster of each row. */
  renderFileActions?: (file: FileItem) => React.ReactNode;
  /** Optional actions rendered to the right of the "Selected Files (N)" header. */
  renderListHeaderActions?: () => React.ReactNode;
  /**
   * Optional set of file display names that are "locked" — for those files we
   * hide the X (remove) and Unmerge buttons, disable drag start, and refuse
   * inbound drops. Used by the Add Files flow to render the previous merge
   * hierarchy read-only.
   */
  lockedFileNames?: Set<string>;
  /**
   * Optional backend-provided alerts for account-owner name mismatches between
   * a primary file and its merged sub-files. When present, mismatched sub-files
   * are surfaced inside the existing Merged hover tooltip with red text.
   */
  ownerMismatchAlerts?: OwnerMismatchAlerts | null;
}

export default function FileUploader({ 
  files, 
  onFilesChange, 
  maxFileSize = 250 * 1024 * 1024, // 250MB
  acceptedTypes = ['.pdf', '.zip'],
  renderFileExtra,
  renderFileActions,
  renderListHeaderActions,
  lockedFileNames,
  ownerMismatchAlerts,
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [passwordInputs, setPasswordInputs] = useState<Record<number, string>>({});
  const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});
  const isLocked = useCallback(
    (name: string) => !!lockedFileNames && lockedFileNames.has(name),
    [lockedFileNames],
  );

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Check for duplicate file names (case-insensitive)
    const existingNames = new Set(files.map(f => f.name.toLowerCase()));
    const duplicates: string[] = [];
    const uniqueFiles: File[] = [];
    
    for (const file of acceptedFiles) {
      if (existingNames.has(file.name.toLowerCase())) {
        duplicates.push(file.name);
      } else {
        uniqueFiles.push(file);
        existingNames.add(file.name.toLowerCase()); // Prevent duplicates within the same drop
      }
    }
    
    // Notify user about skipped duplicates
    if (duplicates.length > 0) {
      toast({
        title: "Duplicate files skipped",
        description: `The following files already exist: ${duplicates.join(', ')}`,
        variant: "destructive"
      });
    }
    
    // If no unique files to add, return early
    if (uniqueFiles.length === 0) return;
    
    const newFiles: FileItem[] = uniqueFiles.map(file => ({
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
      return combinedFiles.length > 200 ? combinedFiles.slice(0, 200) : combinedFiles;
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
  }, [files, onFilesChange]);

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
    const removed = files[index];
    // Promote any sub-files of the removed primary back to top-level
    const updatedFiles = files
      .filter((_, i) => i !== index)
      .map((f) => (f.mergeParentName === removed.name ? { ...f, mergeParentName: undefined } : f));
    onFilesChange(updatedFiles);
    // Clean up password input
    setPasswordInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[index];
      return newInputs;
    });
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(removed.name);
      return next;
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

  // ── Selection + Drag/Drop merge state ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragOverName, setDragOverName] = useState<string | null>(null);

  const toggleSelect = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // ── Marquee (rubber-band) selection ──
  const listRef = useRef<HTMLDivElement | null>(null);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const baseSelectionRef = useRef<Set<string>>(new Set());
  const [marqueeRect, setMarqueeRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const handleListMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't start marquee on a row, button, or input
    if (target.closest('[data-file-row]') || target.closest('button') || target.closest('input')) return;
    const wrap = listRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    marqueeStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    baseSelectionRef.current = new Set(selected);
    setMarqueeRect({ left: marqueeStartRef.current.x, top: marqueeStartRef.current.y, width: 0, height: 0 });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!marqueeStartRef.current || !listRef.current) return;
      const rect = listRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const sx = marqueeStartRef.current.x;
      const sy = marqueeStartRef.current.y;
      const left = Math.min(sx, cx);
      const top = Math.min(sy, cy);
      const width = Math.abs(cx - sx);
      const height = Math.abs(cy - sy);
      setMarqueeRect({ left, top, width, height });
      // Compute hit test against rows
      const rowEls = listRef.current.querySelectorAll<HTMLElement>('[data-file-row]');
      const hits = new Set(baseSelectionRef.current);
      const mLeft = left + rect.left;
      const mTop = top + rect.top;
      const mRight = mLeft + width;
      const mBottom = mTop + height;
      rowEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right >= mLeft && r.left <= mRight && r.bottom >= mTop && r.top <= mBottom) {
          const name = el.getAttribute('data-file-name');
          if (name) hits.add(name);
        }
      });
      setSelected(hits);
    };
    const onUp = () => {
      if (!marqueeStartRef.current) return;
      const r = marqueeRect;
      const moved = r ? r.width > 4 || r.height > 4 : false;
      if (moved) suppressClickRef.current = true;
      marqueeStartRef.current = null;
      setMarqueeRect(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [marqueeRect]);

  const handleDragStart = (name: string, e: React.DragEvent) => {
    // Locked files cannot initiate a merge drag.
    if (isLocked(name)) {
      e.preventDefault();
      return;
    }
    // If dragging an unselected file, drag just it; otherwise drag the whole selection
    let names: string[];
    if (selected.has(name)) {
      names = Array.from(selected);
    } else {
      names = [name];
      setSelected(new Set([name]));
    }
    e.dataTransfer.setData('application/x-merge-files', JSON.stringify(names));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (targetName: string, e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/x-merge-files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverName(targetName);
  };

  const handleDrop = (targetName: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverName(null);
    const raw = e.dataTransfer.getData('application/x-merge-files');
    if (!raw) return;
    let dragged: string[] = [];
    try { dragged = JSON.parse(raw); } catch { return; }

    // Resolve target — if target is a sub-file, use its parent
    const targetItem = files.find((f) => f.name === targetName);
    if (!targetItem) return;
    const primaryName = targetItem.mergeParentName || targetItem.name;

    // If the resolved primary is locked, refuse inbound merges.
    if (isLocked(primaryName) || isLocked(targetName)) return;

    // Filter: cannot merge into self; cannot merge a primary that has children
    const childNames = new Set(
      files.filter((f) => f.mergeParentName).map((f) => f.name)
    );
    const validDragged = dragged.filter((n) => {
      if (n === primaryName) return false;
      const item = files.find((f) => f.name === n);
      if (!item) return false;
      // If this dragged file is itself a primary with sub-files, block it
      const hasChildren = files.some((f) => f.mergeParentName === n);
      if (hasChildren) return false;
      return true;
    });

    if (validDragged.length === 0) return;

    onFilesChange((prev) =>
      prev.map((f) =>
        validDragged.includes(f.name) ? { ...f, mergeParentName: primaryName } : f
      )
    );
    setSelected(new Set());
    void childNames;
  };

  const handleUnmerge = (name: string) => {
    onFilesChange((prev) =>
      prev.map((f) => (f.name === name ? { ...f, mergeParentName: undefined } : f))
    );
  };

  // Build display order: each top-level (no parent) followed by its sub-files
  type Row = { file: FileItem; index: number; isSub: boolean };
  const rows: Row[] = [];
  files.forEach((f, i) => {
    if (f.mergeParentName) return;
    rows.push({ file: f, index: i, isSub: false });
    files.forEach((sub, j) => {
      if (sub.mergeParentName === f.name) {
        rows.push({ file: sub, index: j, isSub: true });
      }
    });
  });
  // Append any orphans (parent missing — defensive)
  files.forEach((f, i) => {
    if (f.mergeParentName && !files.some((p) => p.name === f.mergeParentName)) {
      rows.push({ file: f, index: i, isSub: false });
    }
  });

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
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">Selected Files ({files.length})</h3>
            {renderListHeaderActions && (
              <div className="flex items-center gap-2">{renderListHeaderActions()}</div>
            )}
          </div>
          <TooltipProvider delayDuration={300}>
          <div ref={listRef} className="relative space-y-2 select-none px-4 -mx-4 py-2 -my-2" onMouseDown={handleListMouseDown}>
          {rows.map(({ file, index, isSub }, rowPos) => {
            const isSelected = selected.has(file.name);
            const isDropTarget = dragOverName === file.name;
            const mergedSubsForRow = !isSub
              ? files.filter((f) => f.mergeParentName === file.name).map((f) => f.name)
              : [];
            const isMergedParent = mergedSubsForRow.length > 0;
            const card = (
              <Card
                key={`${file.name}-${index}`}
                draggable={!isLocked(file.name)}
                data-file-row
                data-file-name={file.name}
                onDragStart={(e) => handleDragStart(file.name, e)}
                onDragOver={(e) => handleDragOver(file.name, e)}
                onDragLeave={() => setDragOverName((cur) => (cur === file.name ? null : cur))}
                onDrop={(e) => handleDrop(file.name, e)}
                onClick={(e) => toggleSelect(file.name, e)}
                className={cn(
                  "p-3 cursor-pointer transition-all",
                  isSub && "ml-8 border-l-2 border-l-primary/30",
                  isSelected && "ring-2 ring-primary bg-primary/5",
                  isDropTarget && "ring-2 ring-accent bg-accent/10",
                )}
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className={cn("h-5 w-5 text-muted-foreground", isSub && "h-4 w-4")} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={cn("font-medium", isSub ? "text-xs" : "text-sm")}>{file.name}</p>
                      {isMergedParent && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-muted-foreground cursor-help hover:underline flex-shrink-0"
                            >
                              Merged
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start" className="max-w-sm p-2">
                            <p className="text-xs font-medium mb-1.5">Merged files:</p>
                            <ul className="space-y-1">
                              {mergedSubsForRow.map((sub, idx) => (
                                <li key={sub} className="flex items-center gap-2 text-xs">
                                  <span className="font-mono text-muted-foreground w-5 text-right flex-shrink-0">
                                    {idx + 1}.
                                  </span>
                                  <span className="break-all flex-1">{sub}</span>
                                  {isSubMismatched(ownerMismatchAlerts, file.name, sub) && (
                                    <span className="text-[10px] text-destructive font-medium flex-shrink-0">
                                      Account Name Mismatch
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className={cn("flex items-center gap-2 text-muted-foreground", isSub ? "text-[11px]" : "text-xs")}>
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
                      {file.pageCount !== undefined && !file.countingError && (!file.needsPassword || file.passwordVerified) && !file.isPreExisting && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          • {file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}
                        </span>
                      )}
                      {renderFileExtra && renderFileExtra(file)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {renderFileActions && (
                    <span
                      onClick={(e) => e.stopPropagation()}
                      onPointerEnter={(e) => e.stopPropagation()}
                      onPointerMove={(e) => e.stopPropagation()}
                      className="flex items-center"
                    >
                      {renderFileActions(file)}
                    </span>
                  )}
                  {isSub && !isLocked(file.name) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnmerge(file.name);
                      }}
                      className="h-7 px-2 text-[11px] text-muted-foreground/70 hover:text-foreground font-normal"
                    >
                      Unmerge
                    </Button>
                  )}
                  {!isLocked(file.name) && (
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
                  )}
                </div>
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
            );

            return (
              <Tooltip key={`${file.name}-${index}-tt`}>
                <TooltipTrigger asChild>{card}</TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Select, Drag &amp; Drop if you want to merge statements.
                </TooltipContent>
              </Tooltip>
            );
          })}
          {marqueeRect && (
            <div
              className="absolute border border-primary bg-primary/10 pointer-events-none rounded-sm"
              style={{
                left: marqueeRect.left,
                top: marqueeRect.top,
                width: marqueeRect.width,
                height: marqueeRect.height,
              }}
            />
          )}
          </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}
