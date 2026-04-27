import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import FileUploader from "@/components/app/FileUploader";
import MapColumnsDialog from "@/components/app/MapColumnsDialog";
import {
  getCaseById,
  getCaseFiles,
  addFiles,
  addEvent,
  updateCaseStatus,
  deleteCaseFile,
  getFileBaseName,
  type CaseRecord,
  type CaseFileRecord,
} from "@/api/cases";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { useSecureDownload } from "@/hooks/useSecureDownload";
import { ArrowLeft, Info, AlertCircle, Zap, Wrench, CheckCircle2, Save, AlertTriangle, Loader2, CalendarRange, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import type { RequiredHeader } from "@/utils/headerKeywords";
import JSZip from "jszip";
import { countFilePages } from "@/utils/pageCounter";
import { cn, sanitizeFilename } from "@/lib/utils";
import DateRangePicker from "@/components/app/DateRangePicker";
import {
  buildTimelineConfigFile,
  formatRangeShort,
  isValidRange,
  type TimelineRange,
} from "@/utils/timelineConfig";

interface FileItem {
  name: string;
  size: number;
  file: File;
  pageCount?: number;
  isCountingPages?: boolean;
  needsPassword?: boolean;
  password?: string;
  passwordVerified?: boolean;
  isVerifying?: boolean;
  isPreExisting?: boolean;
  // Header detection fields
  headerStatus?: 'pending' | 'ok' | 'anomaly' | 'no-headers' | 'single-column' | 'mapped';
  parsedRows?: string[][];
  detectedHeaderRow?: number | null;
  columnMapping?: Record<string, string>;
  headerRowIndex?: number;
  accountHolderName?: string;
  dummyColumns?: { balance?: { header: string; defaultValue: string }; date?: { header: string; defaultValue: string } };
  mergeParentName?: string;
}

export default function CaseUpload() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [case_, setCase] = useState<CaseRecord | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPreExisting, setLoadingPreExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [savingForLater, setSavingForLater] = useState(false);
  const [useHitl, setUseHitl] = useState(false);
  const [originalPreExistingFiles, setOriginalPreExistingFiles] = useState<string[]>([]);
  const [originalDbFiles, setOriginalDbFiles] = useState<string[]>([]);
  const [existingGroupingLogic, setExistingGroupingLogic] = useState<string | null>(null);
  const [mapDialogFile, setMapDialogFile] = useState<FileItem | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const { hasAccess, pagesRemaining, loading: subLoading } = useSubscription();
  const { isMaintenanceMode, message: maintenanceMessage } = useMaintenanceMode();
  const { fetchFileForParsing } = useSecureDownload();

  // Timeline state
  const [masterTimeline, setMasterTimeline] = useState<TimelineRange | null>(null);
  // Keyed by sanitized filename (matches what is sent to the backend)
  const [perFileTimeline, setPerFileTimeline] = useState<Record<string, TimelineRange>>({});

  // Check if this is "add files" mode
  const isAddFilesMode = searchParams.get("addFiles") === "true";
  const sourceResultUrl = searchParams.get("sourceResultUrl"); // Legacy URL fallback
  const sourceCaseId = searchParams.get("sourceCaseId"); // Source case for "Add to New Case" flow

  // Calculate total pages from files (pre-existing files count as 0)
  const totalPages = files.reduce((sum, f) => (f.isPreExisting ? sum : sum + (f.pageCount || 0)), 0);
  const allPagesCounted = files.every((f) => f.isPreExisting || (!f.isCountingPages && f.pageCount !== undefined));
  const hasLockedFiles = files.some((f) => f.needsPassword && !f.passwordVerified);
  const canSubmit =
    files.length > 0 &&
    allPagesCounted &&
    hasAccess &&
    totalPages <= pagesRemaining &&
    !hasLockedFiles &&
    !isMaintenanceMode;

  // ─── Header Detection Worker ───
  const isExcelOrCsv = (name: string) => /\.(xlsx|xls|csv)$/i.test(name);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('@/workers/headerDetection.worker.ts', import.meta.url),
      { type: 'module' }
    );
    return () => { workerRef.current?.terminate(); };
  }, []);

  const runHeaderDetection = useCallback((file: FileItem) => {
    if (!workerRef.current || file.isPreExisting || !isExcelOrCsv(file.name)) return;

    // Mark as pending
    setFiles(prev => prev.map(f =>
      f.file === file.file ? { ...f, headerStatus: 'pending' as const } : f
    ));

    const worker = workerRef.current;
    const handler = (e: MessageEvent) => {
      if (e.data.fileName !== file.name) return;
      worker.removeEventListener('message', handler);

      const { status, rows, detectedHeaderRow, detectedMapping } = e.data;
      setFiles(prev => prev.map(f =>
        f.file === file.file
          ? {
              ...f,
              headerStatus: status,
              parsedRows: rows,
              detectedHeaderRow,
              columnMapping: detectedMapping || undefined,
            }
          : f
      ));
    };

    worker.addEventListener('message', handler);
    file.file.arrayBuffer().then(buffer => {
      worker.postMessage({ buffer, fileName: file.name }, [buffer]);
    });
  }, []);

  // Run header detection whenever files change (for new Excel/CSV files without a status)
  useEffect(() => {
    files.forEach(f => {
      if (!f.isPreExisting && isExcelOrCsv(f.name) && !f.headerStatus) {
        runHeaderDetection(f);
      }
    });
  }, [files, runHeaderDetection]);

  const handleMapDialogSave = useCallback((data: {
    headerRowIndex: number;
    columnMapping: Record<RequiredHeader, string>;
    accountHolderName: string;
    dummyColumns?: { balance?: { header: string; defaultValue: string }; date?: { header: string; defaultValue: string } };
  }) => {
    if (!mapDialogFile) return;
    setFiles(prev => prev.map(f =>
      f.file === mapDialogFile.file
        ? {
            ...f,
            headerStatus: 'mapped' as const,
            headerRowIndex: data.headerRowIndex,
            columnMapping: data.columnMapping,
            accountHolderName: data.accountHolderName,
            dummyColumns: data.dummyColumns,
          }
        : f
    ));
    setMapDialogFile(null);
  }, [mapDialogFile]);


  useEffect(() => {
    if (!id) return;
    getCaseById(id)
      .then(async (data) => {
        if (!data) {
          navigate("/app/dashboard");
          return;
        }
        setCase(data);

        // For Draft, Failed, or Timeout cases (not in add files mode), load existing files from database
        if ((data.status === "Draft" || data.status === "Failed" || data.status === "Timeout") && !isAddFilesMode) {
          try {
            const existingFiles = await getCaseFiles(id);
            if (existingFiles.length > 0) {
              // Load files from storage and convert to FileItem
              const loadedFiles = await loadExistingCaseFiles(existingFiles);
              setFiles(loadedFiles);

              // Trigger page counting for each loaded draft file
              for (const loadedFile of loadedFiles) {
                countFilePages(loadedFile.file)
                  .then((result) => {
                    setFiles((prevFiles) =>
                      prevFiles.map((f) =>
                        f.file === loadedFile.file
                          ? {
                              ...f,
                              pageCount: result.pages,
                              isCountingPages: false,
                              needsPassword: result.needsPassword || false,
                            }
                          : f,
                      ),
                    );
                  })
                  .catch((error) => {
                    console.error(`Failed to count pages for ${loadedFile.name}:`, error);
                    setFiles((prevFiles) =>
                      prevFiles.map((f) =>
                        f.file === loadedFile.file ? { ...f, isCountingPages: false, pageCount: 0 } : f,
                      ),
                    );
                  });
              }
            }
          } catch (error) {
            console.error("Failed to load existing files:", error);
          }
        }
      })
      .catch((error) => {
        console.error("Failed to load case:", error);
        toast({
          title: "Failed to load case",
          variant: "destructive",
        });
        navigate("/app/dashboard");
      })
      .finally(() => setLoading(false));
  }, [id, navigate, isAddFilesMode]);

  // Load existing case files from storage for Draft cases
  const loadExistingCaseFiles = async (fileRecords: CaseFileRecord[]): Promise<FileItem[]> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const loadedFiles: FileItem[] = [];

    for (const fileRecord of fileRecords) {
      try {
        const filePath = `${user.id}/${id}/${fileRecord.file_name}`;
        const { data, error } = await supabase.storage.from("case-files").download(filePath);

        if (error || !data) {
          console.error(`Failed to download ${fileRecord.file_name}:`, error);
          continue;
        }

        const file = new File([data], fileRecord.file_name, { type: data.type });

        loadedFiles.push({
          name: fileRecord.file_name,
          size: file.size,
          file: file,
          isCountingPages: true, // Will be counted after loading
          needsPassword: false,
          isPreExisting: false, // Draft files need page counting - not yet processed
        });
      } catch (error) {
        console.error(`Failed to load file ${fileRecord.file_name}:`, error);
      }
    }

    if (loadedFiles.length > 0) {
      toast({
        title: t("upload.previousFilesLoaded"),
        description: `${loadedFiles.length} ${t("upload.filesFromDraft")}`,
      });
    }

    return loadedFiles;
  };

  // Load pre-existing files from result ZIP when in add files mode
  // Use sourceCaseId if available (for "Add to New Case" flow), otherwise use current case id
  useEffect(() => {
    if (isAddFilesMode && !loadingPreExisting && files.length === 0) {
      const caseIdForFetch = sourceCaseId || id;
      if (caseIdForFetch) {
        loadPreExistingFiles(caseIdForFetch, sourceResultUrl || undefined);
      }
    }
  }, [isAddFilesMode, id, sourceCaseId, sourceResultUrl]);

  const loadPreExistingFiles = async (caseId: string, legacyUrl?: string) => {
    setLoadingPreExisting(true);
    try {
      // ALSO fetch actual case_files from database for accurate deletion tracking
      const dbFiles = await getCaseFiles(caseId);
      setOriginalDbFiles(dbFiles.map(f => f.file_name));
      console.log(`📁 Loaded ${dbFiles.length} DB files:`, dbFiles.map(f => f.file_name));

      // Use secure download hook (handles both secure storage and legacy URLs)
      const arrayBuffer = await fetchFileForParsing(caseId, legacyUrl || null, 'result_zip');
      
      if (!arrayBuffer) {
        throw new Error("Failed to fetch result ZIP");
      }

      const zip = new JSZip();
      const zipData = await zip.loadAsync(arrayBuffer);

      // Find all raw_transactions_*.xlsx files
      const rawFiles = Object.keys(zipData.files).filter(
        (name) => name.startsWith("raw_transactions_") && name.endsWith(".xlsx"),
      );

      const preExistingFiles: FileItem[] = [];

      for (const fileName of rawFiles) {
        const file = zipData.file(fileName);
        if (file) {
          const content = await file.async("blob");
          // Remove "raw_transactions_" prefix for display name
          const displayName = fileName.replace("raw_transactions_", "");

          // Create a File object from the blob
          const fileObj = new File([content], displayName, {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          preExistingFiles.push({
            name: displayName,
            size: content.size,
            file: fileObj,
            pageCount: 0, // Pre-existing files don't count toward page usage
            isCountingPages: false,
            isPreExisting: true,
          });
        }
      }

      // Extract grouping_logic.json if it exists (invisible to user, forwarded to backend)
      const groupingFile = zipData.file("grouping_logic.json");
      if (groupingFile) {
        const groupingContent = await groupingFile.async("text");
        setExistingGroupingLogic(groupingContent);
        console.log('📋 Extracted existing grouping_logic.json for forwarding');
      }

      setFiles(preExistingFiles);
      // Store original pre-existing filenames for removal tracking
      setOriginalPreExistingFiles(preExistingFiles.map(f => f.name));

      if (preExistingFiles.length > 0) {
        toast({
          title: t("upload.previousFilesLoaded"),
          description: `${preExistingFiles.length} ${t("upload.filesFromPreviousAnalysis")}`,
        });
      }
    } catch (error) {
      console.error("Failed to load pre-existing files:", error);
      toast({
        title: "Failed to load previous files",
        description: "Could not load files from previous analysis. You can still add new files.",
        variant: "destructive",
      });
    } finally {
      setLoadingPreExisting(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!case_ || files.length === 0 || !canSubmit) return;

    // Synchronous double-click guard (prevents re-entry before React re-renders)
    if (submittingRef.current) {
      console.warn('⚠️ handleStartAnalysis already in progress, ignoring duplicate call');
      return;
    }
    submittingRef.current = true;

    // Check if we have enough pages (only for new files)
    if (totalPages > pagesRemaining) {
      submittingRef.current = false;
      toast({
        title: "Insufficient Pages",
        description: `You need ${totalPages} pages but only have ${pagesRemaining} remaining. Upgrade to continue.`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Authentication required");
      }


      // 1. Create NEW File objects with the sanitized names
      const uploadFiles: File[] = files.map((f) => {
        // We use your utility to get the clean name
        const cleanName = sanitizeFilename(f.name);
        
        // create a new File object with the same content but the NEW name
        return new File([f.file], cleanName, { type: f.file.type });
      });

      // Build config files array (ZIP-only, not uploaded individually or inserted into DB)
      const configFiles: File[] = [];

      // Include existing grouping_logic.json for add-files mode
      if (isAddFilesMode && existingGroupingLogic) {
        const logicBlob = new Blob([existingGroupingLogic], { type: 'application/json' });
        const logicFile = new File([logicBlob], 'grouping_logic.json', { type: 'application/json' });
        configFiles.push(logicFile);
        console.log('📋 Including grouping_logic.json in config files');
      }

      // Include header_mapping.json for files with manual mappings
      const mappedFiles = files.filter(f => f.headerStatus === 'mapped' && f.columnMapping && f.headerRowIndex !== undefined);
      if (mappedFiles.length > 0) {
        const headerMappingJson = {
          files_config: mappedFiles.map(f => ({
            fileName: sanitizeFilename(f.name),
            hasManualMapping: true,
            headerRowIndex: f.headerRowIndex,
            accountHolderName: f.accountHolderName || '',
            columnMapping: f.columnMapping,
            ...(f.dummyColumns ? { dummyColumns: f.dummyColumns } : {}),
          })),
        };
        const mappingBlob = new Blob([JSON.stringify(headerMappingJson, null, 2)], { type: 'application/json' });
        const mappingFile = new File([mappingBlob], 'header_mapping.json', { type: 'application/json' });
        configFiles.push(mappingFile);
        console.log(`📋 Including header_mapping.json with ${mappedFiles.length} file(s)`);
      }

      // Build merges.json from user-defined merge hierarchy
      const primaryToSubs = new Map<string, string[]>();
      for (const f of files) {
        if (f.mergeParentName) {
          const primary = sanitizeFilename(f.mergeParentName);
          const sub = sanitizeFilename(f.name);
          if (!primaryToSubs.has(primary)) primaryToSubs.set(primary, []);
          primaryToSubs.get(primary)!.push(sub);
        }
      }
      // Build merge config (also persisted to cases.merge_config below)
      const mergeConfigJson = primaryToSubs.size > 0
        ? {
            merges: Array.from(primaryToSubs.entries()).map(([primary, sub_files]) => ({
              primary,
              sub_files,
            })),
          }
        : null;
      if (primaryToSubs.size > 0) {
        const mergesBlob = new Blob([JSON.stringify(mergeConfigJson, null, 2)], { type: 'application/json' });
        const mergesFile = new File([mergesBlob], 'merge_config.json', { type: 'application/json' });
        configFiles.push(mergesFile);
        console.log(`📋 Including merge_config.json with ${primaryToSubs.size} primary file(s)`);
      }

      // Build timeline_config.json from master + per-file selections.
      // Per-file entries are filtered to currently uploaded files (sanitized names).
      {
        const sanitizedNames = new Set(files.map((f) => sanitizeFilename(f.name)));
        const perFileEntries = Object.entries(perFileTimeline).filter(
          ([name, range]) => sanitizedNames.has(name) && isValidRange(range),
        );
        const timelineFile = buildTimelineConfigFile({
          master: isValidRange(masterTimeline) ? masterTimeline : null,
          per_file: Object.fromEntries(perFileEntries),
        });
        if (timelineFile) {
          configFiles.push(timelineFile);
          console.log(
            `📋 Including timeline_config.json (master=${
              isValidRange(masterTimeline) ? "set" : "none"
            }, per_file=${perFileEntries.length})`,
          );
        }
      }

      // Persist merge hierarchy to the case row so view pages can render it.
      // Set to null if no merges, to clear stale data on re-analysis.
      try {
        const { error: mcErr } = await supabase
          .from("cases")
          .update({ merge_config: mergeConfigJson as any })
          .eq("id", case_.id);
        if (mcErr) console.error("Failed to persist merge_config:", mcErr);
      } catch (e) {
        console.error("merge_config persistence error:", e);
      }

      // Extract passwords for protected files
      const passwords = files
        .filter((f) => f.needsPassword && f.passwordVerified && f.password)
        .map((f) => ({
          filename: sanitizeFilename(f.name),
          password: f.password!,
        }));

      console.log(`📦 Uploading ${uploadFiles.length} files with ${passwords.length} password(s)`);

      // Determine task type based on HITL mode
      const task = useHitl ? "initial-parse" : "parse-statements";

      // Import the startJobFlow function
      const { startJobFlow } = await import("@/hooks/useStartJob");

      // Separate new files from pre-existing files
      const newFiles = files.filter(f => !f.isPreExisting);

      // Determine skipFileInsertion:
      // - For NEW cases: false → uploadInput.ts inserts all files
      // - For ADD FILES mode: true → we manually insert only new files below
      const skipFileInsertion = isAddFilesMode;

      // ── STEP A: Delete removed pre-existing files FIRST (before additions) ──
      if (isAddFilesMode && originalDbFiles.length > 0) {
        try {
          const currentPreExistingBaseNames = files
            .filter(f => f.isPreExisting)
            .map(f => getFileBaseName(f.name));
          
          const dbFilesToDelete = originalDbFiles.filter(dbFileName => 
            !currentPreExistingBaseNames.includes(getFileBaseName(dbFileName))
          );
          
          if (dbFilesToDelete.length > 0) {
            console.log(`🗑️ Deleting ${dbFilesToDelete.length} removed files BEFORE additions:`, dbFilesToDelete);
            for (const fileName of dbFilesToDelete) {
              await deleteCaseFile(case_.id, fileName);
            }
            console.log(`✅ Deleted ${dbFilesToDelete.length} removed files from database/storage`);
          }
        } catch (deleteError) {
          console.error("Failed to delete removed files:", deleteError);
          throw new Error("Failed to remove files. Please try again.");
        }
      }

      // ── STEP B: Insert NEW file records AFTER deletions (for Add Files mode) ──
      if (isAddFilesMode && newFiles.length > 0) {
        try {
          const fileRecords = newFiles.map(f => ({
            name: sanitizeFilename(f.name),
            url: `${user.id}/${case_.id}/${sanitizeFilename(f.name)}`
          }));
          await addFiles(case_.id, fileRecords);
          console.log(`✅ Inserted ${newFiles.length} new file records into database`);
        } catch (insertError) {
          console.error("Failed to insert new file records:", insertError);
          throw new Error("Failed to add new files. Please try again.");
        }
      }

      // ── STEP B2: Preserve current result for rollback on failure ──
      if (isAddFilesMode && case_.result_zip_url) {
        await supabase
          .from('cases')
          .update({ previous_result_zip_url: case_.result_zip_url })
          .eq('id', case_.id);
      }

      // ── STEP C: Start job flow AFTER file operations complete ──
      const { job_id } = await startJobFlow(
        uploadFiles,
        task,
        case_.id,
        user.id,
        passwords,
        (job) => {
          console.log("Job update:", job);
        },
        (finalJob) => {
          console.log("Job completed:", finalJob);
          if (finalJob.status === "SUCCEEDED") {
            queryClient.removeQueries({ queryKey: ['case-results', case_.id] });
            queryClient.removeQueries({ 
              predicate: (query) => 
                query.queryKey[0] === 'analysis-data' && query.queryKey[1] === case_.id 
            });
            
            toast({
              title: "Analysis Complete!",
              description: useHitl
                ? "Your case is ready for review. Go to your dashboard to continue."
                : "Your results are ready. View them from your dashboard.",
            });
          } else if (finalJob.status === "FAILED") {
            toast({
              title: "Analysis Failed",
              description: finalJob.error || "Please check your dashboard and try again.",
              variant: "destructive",
            });
          }
        },
        skipFileInsertion,
        configFiles,
      );

      // Track page usage ONLY AFTER job successfully started (prevents double-charging on retries)
      if (totalPages > 0) {
        const { error: trackingError } = await supabase.rpc("track_page_usage", {
          p_user_id: user.id,
          p_pages_processed: totalPages,
        });

        if (trackingError) {
          console.error("Failed to track page usage (job already started):", trackingError);
          // Don't throw - job is already running, just log the issue
        } else {
          console.log(`✅ Tracked ${totalPages} pages for user ${user.id}`);
        }
      }

      // Add event for tracking with page count
      await addEvent(case_.id, "analysis_submitted", {
        job_id,
        mode: useHitl ? "hitl" : "direct",
        task,
        file_count: files.length,
        pages_processed: totalPages,
        is_add_files: isAddFilesMode,
        pre_existing_files: files.filter((f) => f.isPreExisting).length,
      });

      toast({
        title: "Analysis started!",
        description: `Processing ${files.length} files. Job ID: ${job_id.slice(0, 8)}...`,
      });

      // Navigate to dashboard immediately
      navigate("/app/dashboard");
    } catch (error) {
      console.error("Failed to submit analysis:", error);
      toast({
        title: "Failed to submit analysis",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  // Save files for later without starting analysis
  const handleSaveForLater = async () => {
    if (!case_ || files.length === 0) return;

    const newFiles = files.filter((f) => !f.isPreExisting);
    if (newFiles.length === 0) {
      toast({
        title: "No new files to save",
        description: "Add new files before saving.",
        variant: "destructive",
      });
      return;
    }

    setSavingForLater(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Authentication required");
      }

      // Import uploadInput to save files to storage
      const { uploadInput } = await import("@/lib/uploadInput");

      // --- START FIX ---
      
      // 1. Create NEW File objects with sanitized names for saving
      const filesToSave = newFiles.map((f) => {
        const cleanName = sanitizeFilename(f.name);
        return new File([f.file], cleanName, { type: f.file.type });
      });

      // 2. Extract passwords using SANITIZED filenames
      const passwords = newFiles
        .filter((f) => f.needsPassword && f.passwordVerified && f.password)
        .map((f) => ({
          filename: sanitizeFilename(f.name), // Use sanitized name
          password: f.password!,
        }));

      // Upload files (pass the sanitized filesToSave instead of newFiles.map...)
      await uploadInput(
        filesToSave, // <--- Use the new file objects here
        user.id,
        case_.id,
        false, 
        passwords,
      );
      
      // --- END FIX ---

      // Add event for tracking
      await addEvent(case_.id, "files_uploaded", {
        file_count: newFiles.length,
        saved_for_later: true,
      });

      toast({
        title: "Files saved successfully",
        description: `${newFiles.length} file(s) saved. You can continue analysis later.`,
      });

      navigate(`/app/cases/${case_.id}`);
    } catch (error) {
      console.error("Failed to save files:", error);
      toast({
        title: "Failed to save files",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingForLater(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">{t("caseUpload.loadingCase")}</div>
        </div>
      </div>
    );
  }
  if (!case_) {
    return null;
  }

  const preExistingCount = files.filter((f) => f.isPreExisting).length;
  const newFilesCount = files.filter((f) => !f.isPreExisting).length;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/app/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("actions.back")}
        </Button>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{
              backgroundColor: case_.color_hex,
            }}
          />
          <h1 className="text-2xl font-semibold">{case_.name}</h1>
          {isAddFilesMode && (
            <Badge variant="secondary" className="ml-2">
              {t("caseUpload.addingFiles")}
            </Badge>
          )}
        </div>
      </div>

      {isMaintenanceMode && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold">{t("caseUpload.scheduledMaintenance")}</AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <p className="mb-2">{maintenanceMessage}</p>
            <p className="text-sm">{t("caseUpload.maintenanceDisabled")}</p>
          </AlertDescription>
        </Alert>
      )}

      {!hasAccess && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("newCase.subscriptionLimitReached")}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{t("newCase.pagesRemaining", { count: pagesRemaining })}</span>
            <Button asChild size="sm" className="ml-4">
              <Link to="/pricing">
                <Zap className="mr-2 h-4 w-4" />
                {t("newCase.upgradeNow")}
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isAddFilesMode && (
        <Alert className="border-primary/50 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-semibold">{t("caseUpload.addingFilesToExisting")}</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            <p>
              {t("caseUpload.addingFilesDesc")}
            </p>
            <p className="text-sm mt-1">
              {t("caseUpload.previousResultsPreserved")}
            </p>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{isAddFilesMode ? t("caseUpload.titleAddFiles") : t("caseUpload.title")}</CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[260px]">
                  <p>HITL adds a manual review step to verify and refine extracted data before analysis.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Label htmlFor="hitl-mode" className="text-sm text-muted-foreground cursor-pointer">
              HITL
            </Label>
            <Switch id="hitl-mode" checked={useHitl} onCheckedChange={setUseHitl} disabled={submitting} className="scale-90" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File naming guidance */}
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-muted-foreground">
              <span className="font-medium text-foreground">{t("caseUpload.tip")}:</span> {t("caseUpload.tipMessage", { example: "Ankush_Kumar.pdf" })}
            </AlertDescription>
          </Alert>

          {loadingPreExisting ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p>{t("caseUpload.loadingPreviousFiles")}</p>
            </div>
          ) : (
            <FileUploader
              files={files}
              onFilesChange={setFiles}
              renderFileActions={(file) => {
                if (file.isPreExisting) return null;
                const key = sanitizeFilename(file.name);
                const range = perFileTimeline[key] ?? null;
                const hasRange = isValidRange(range);
                return (
                  <DateRangePicker
                    value={range}
                    align="end"
                    onSave={(r) => {
                      setPerFileTimeline((prev) => {
                        const next = { ...prev };
                        if (r) next[key] = r;
                        else delete next[key];
                        return next;
                      });
                    }}
                    trigger={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 px-2 gap-1 text-xs",
                          hasRange
                            ? "text-primary hover:text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        title={hasRange ? formatRangeShort(range) : "Set date range for this file"}
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">
                          {hasRange ? formatRangeShort(range) : "Timeline"}
                        </span>
                      </Button>
                    }
                  />
                );
              }}
              renderFileExtra={(file) => {
                // Pre-existing badge
                if (file.isPreExisting) {
                  return (
                    <Badge
                      variant="outline"
                      className="text-xs gap-1 bg-success/10 text-success border-success/30"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {t("caseUpload.alreadyProcessed")}
                    </Badge>
                  );
                }

                // Header detection CTAs for Excel/CSV
                if (file.headerStatus === 'pending') {
                  return (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Detecting headers...
                    </span>
                  );
                }
                if (file.headerStatus === 'anomaly') {
                  return (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1 text-warning hover:text-warning"
                      onClick={(e) => { e.stopPropagation(); setMapDialogFile(file); }}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Map File Columns
                    </Button>
                  );
                }
                if (file.headerStatus === 'mapped') {
                  return (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1 text-success hover:text-success"
                      onClick={(e) => { e.stopPropagation(); setMapDialogFile(file); }}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Header Columns Mapped
                    </Button>
                  );
                }

                return null;
              }}
            />
          )}

          {files.length > 0 && (
            <Alert className={totalPages > pagesRemaining ? "border-destructive" : "border-emerald-500"}>
              <Info className="h-4 w-4" />
              <AlertTitle>{t("caseUpload.pageSummary")}</AlertTitle>
              <AlertDescription>
                <div className="space-y-1 mt-2">
                  {isAddFilesMode && preExistingCount > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("caseUpload.preExistingFiles")}:</span>
                      <span>{preExistingCount}</span>
                    </div>
                  )}
                  {newFilesCount > 0 && (
                    <div className="flex justify-between">
                      <span>{t("caseUpload.newFilesToProcess")}:</span>
                      <span className="font-semibold">{newFilesCount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{t("caseUpload.totalPages")}:</span>
                    <span className="font-semibold">{totalPages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("caseUpload.pagesRemainingPlan")}:</span>
                    <span className={totalPages > pagesRemaining ? "text-destructive font-semibold" : "font-semibold"}>
                      {pagesRemaining}
                    </span>
                  </div>
                  {!allPagesCounted && <p className="text-sm text-muted-foreground mt-2">⏳ {t("caseUpload.countingPages")}</p>}
                  {hasLockedFiles && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                      🔒 {t("caseUpload.passwordProtectedWarning")}
                    </p>
                  )}
                  {totalPages > pagesRemaining && (
                    <p className="text-sm text-destructive mt-2">
                      ⚠️ {t("caseUpload.insufficientPages")}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {files.length === 0 && !loadingPreExisting ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("caseUpload.noFilesYet")}</p>
              <p className="text-sm mt-1">{t("caseUpload.uploadToBegin")}</p>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              {/* Save for Later button - only show for Draft cases (not add files mode) */}
              {!isAddFilesMode && case_.status === "Draft" && files.some((f) => !f.isPreExisting) && (
                <Button
                  variant="outline"
                  onClick={handleSaveForLater}
                  disabled={savingForLater || submitting || loadingPreExisting}
                  size="lg"
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {savingForLater ? t("caseUpload.saving") : t("caseUpload.saveForLater")}
                </Button>
              )}
              <Button
                onClick={handleStartAnalysis}
                disabled={!canSubmit || submitting || savingForLater || loadingPreExisting}
                size="lg"
              >
                {submitting
                  ? t("caseUpload.submitting")
                  : isMaintenanceMode
                    ? t("caseUpload.maintenanceActive")
                    : loadingPreExisting
                      ? t("caseUpload.loadingPreviousFilesBtn")
                      : !allPagesCounted
                        ? t("caseUpload.countingPages")
                        : isAddFilesMode
                          ? t("caseUpload.reRunAnalysis")
                          : useHitl
                            ? t("caseUpload.startInitialParse")
                            : t("caseUpload.startAnalysis")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map Columns Dialog */}
      <MapColumnsDialog
        open={!!mapDialogFile}
        onClose={() => setMapDialogFile(null)}
        fileName={mapDialogFile?.name ?? ''}
        rows={mapDialogFile?.parsedRows ?? []}
        headerStatus={
          (mapDialogFile?.headerStatus === 'mapped'
            ? 'anomaly'
            : mapDialogFile?.headerStatus) as any ?? 'anomaly'
        }
        initialHeaderRow={mapDialogFile?.headerRowIndex ?? mapDialogFile?.detectedHeaderRow}
        initialMapping={
          mapDialogFile?.headerStatus === 'mapped'
            ? (mapDialogFile.columnMapping as Record<RequiredHeader, string>)
            : null
        }
        initialAccountHolder={mapDialogFile?.accountHolderName}
        onSave={handleMapDialogSave}
      />
    </div>
  );
}
