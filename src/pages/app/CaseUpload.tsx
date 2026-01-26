import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import FileUploader from "@/components/app/FileUploader";
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
import { ArrowLeft, Info, AlertCircle, Zap, Wrench, CheckCircle2, Save } from "lucide-react";
import { Link } from "react-router-dom";
import JSZip from "jszip";
import { countFilePages } from "@/utils/pageCounter";
import { sanitizeFilename } from "@/lib/utils";

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
  isPreExisting?: boolean; // Files loaded from previous results
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
  const [savingForLater, setSavingForLater] = useState(false);
  const [useHitl, setUseHitl] = useState(false);
  const [originalPreExistingFiles, setOriginalPreExistingFiles] = useState<string[]>([]); // Track original pre-existing filenames (from ZIP)
  const [originalDbFiles, setOriginalDbFiles] = useState<string[]>([]); // Track actual DB file names for accurate deletion
  const { hasAccess, pagesRemaining, loading: subLoading } = useSubscription();
  const { isMaintenanceMode, message: maintenanceMessage } = useMaintenanceMode();
  const { fetchFileForParsing } = useSecureDownload();

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

    // Check if we have enough pages (only for new files)
    if (totalPages > pagesRemaining) {
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
      const uploadFiles = files.map((f) => {
        // We use your utility to get the clean name
        const cleanName = sanitizeFilename(f.name);
        
        // create a new File object with the same content but the NEW name
        return new File([f.file], cleanName, { type: f.file.type });
      });

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

      // Start job flow with Realtime tracking - do this FIRST before tracking pages
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
            // Remove cached data completely to force fresh fetch on Results page
            // This is critical for Add Files flow where new results replace old ones
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
            // No auto-navigation - user navigates manually from dashboard
          } else if (finalJob.status === "FAILED") {
            toast({
              title: "Analysis Failed",
              description: finalJob.error || "Please check your dashboard and try again.",
              variant: "destructive",
            });
          }
        },
        skipFileInsertion,
      );

      // Insert ONLY NEW file records into database (for Add Files mode)
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
          // Don't throw - job is already running, just log the issue
        }
      }

      // Delete removed pre-existing files from database/storage (for Add Files mode)
      if (isAddFilesMode && originalDbFiles.length > 0) {
        try {
          // Get current pre-existing files in the file list (by base name)
          const currentPreExistingBaseNames = files
            .filter(f => f.isPreExisting)
            .map(f => getFileBaseName(f.name));
          
          // Find which ORIGINAL DB files should be deleted
          // A DB file should be deleted if its base name is NOT in current pre-existing list
          const dbFilesToDelete = originalDbFiles.filter(dbFileName => 
            !currentPreExistingBaseNames.includes(getFileBaseName(dbFileName))
          );
          
          if (dbFilesToDelete.length > 0) {
            console.log(`🗑️ Will delete ${dbFilesToDelete.length} files:`, dbFilesToDelete);
            // Delete by EXACT file name (not base name) for precision
            for (const fileName of dbFilesToDelete) {
              await deleteCaseFile(case_.id, fileName);
            }
            console.log(`✅ Deleted ${dbFilesToDelete.length} removed files from database/storage`);
          }
        } catch (deleteError) {
          console.error("Failed to delete removed files:", deleteError);
          // Don't throw - job is already running, just log the issue
        }
      }

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
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
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
        <CardHeader>
          <CardTitle>{isAddFilesMode ? t("caseUpload.titleAddFiles") : t("caseUpload.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File naming guidance */}
          <Alert className="border-primary/30 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-muted-foreground">
              <span className="font-medium text-foreground">{t("caseUpload.tip")}:</span> {t("caseUpload.tipMessage", { example: "Ankush_Kumar.pdf" })}
            </AlertDescription>
          </Alert>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="hitl-mode" className="text-base font-medium cursor-pointer">
                  {t("caseUpload.hitlTitle")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {useHitl
                    ? t("caseUpload.hitlEnabled")
                    : t("caseUpload.hitlDisabled")}
                </p>
              </div>
            </div>
            <Switch id="hitl-mode" checked={useHitl} onCheckedChange={setUseHitl} disabled={submitting} />
          </div>

          {loadingPreExisting ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p>{t("caseUpload.loadingPreviousFiles")}</p>
            </div>
          ) : (
            <FileUploader
              files={files}
              onFilesChange={setFiles}
              renderFileExtra={(file) =>
                file.isPreExisting ? (
                  <Badge
                    variant="outline"
                    className="text-xs gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {t("caseUpload.alreadyProcessed")}
                  </Badge>
                ) : null
              }
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
    </div>
  );
}
