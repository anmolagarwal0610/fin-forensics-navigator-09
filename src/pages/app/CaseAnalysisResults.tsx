import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getCaseById, getCaseFiles, addEvent, type CaseRecord, type CaseFileRecord } from "@/api/cases";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSecureDownload } from "@/hooks/useSecureDownload";
import { useResultFileStatus } from "@/hooks/useResultFileStatus";
import { useReportGeneration } from "@/hooks/useReportGeneration";
import type { ReportData } from "@/types/reportData";
import type { BatchTraceResponse } from "@/types/traceTransaction";
import {
  ArrowLeft,
  Download,
  FileText,
  TrendingUp,
  Users,
  Eye,
  DollarSign,
  ChevronDown,
  Loader2,
  BarChart3,
  Settings2,
  GitBranch,
} from "lucide-react";
import DocumentHead from "@/components/common/DocumentHead";
import ImageLightbox from "@/components/app/ImageLightbox";
import HTMLViewer from "@/components/app/HTMLViewer";
import POIModal from "@/components/app/POIModal";
import FileSankeyModal from "@/components/app/FileSankeyModal";
import ExcelViewer from "@/components/app/ExcelViewer";
import SummaryTableViewer from "@/components/app/SummaryTableViewer";
import LazySummaryTableViewer from "@/components/app/LazySummaryTableViewer";
import FilePreviewModal from "@/components/app/FilePreviewModal";
import FundTrailViewer from "@/components/app/FundTrailViewer";
import ShareFundTrailDialog from "@/components/app/ShareFundTrailDialog";
import ApplyChangesDialog, { GroupingOverridesState } from "@/components/app/ApplyChangesDialog";
import BatchTraceModal from "@/components/app/BatchTraceModal";
import { parseExcelFile, CellData } from "@/utils/excelParser";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { startJobFlow } from "@/hooks/useStartJob";
import { useAuth } from "@/contexts/AuthContext";
import type { GroupingOverrideResult, PendingClusterState } from "@/components/app/EditGroupedNamesDialog";

// Helper function to truncate long file names while preserving extension
const truncateFileName = (fileName: string, maxLength: number = 30): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    // No extension
    return fileName.length > maxLength ? fileName.slice(0, maxLength) + "..." : fileName;
  }

  const baseName = fileName.slice(0, lastDotIndex);
  const extension = fileName.slice(lastDotIndex); // includes the dot

  if (baseName.length <= maxLength) {
    return fileName; // No truncation needed
  }

  return baseName.slice(0, maxLength) + "..." + extension;
};

interface ParsedAnalysisData {
  beneficiaries: Array<{ [key: string]: any }>;
  beneficiariesExcelData?: any[][];
  beneficiariesFileUrl?: string;
  beneficiariesPreviewUrl?: string;
  beneficiaryHeaders: string[];
  totalBeneficiaryCount: number;
  mainGraphUrl: string | null;
  mainGraphHtml: string | null;
  mainGraphPngUrl?: string | null;
  mainNodeGraphHtml: string | null; // poi_flows_main.html
  mainSankeyGraphHtml: string | null; // poi_flows_sankey.html
  fundTrailHtml: string | null; // fund_trail_main.html - NEW
  egoImages: Array<{ name: string; url: string }>;
  poiHtmlFiles: Array<{ name: string; htmlContent: string; title: string; pngUrl?: string }>;
  poiFileCount: number;
  fileSummaries: Array<{
    originalFile: string;
    rawTransactionsFile: string | null;
    summaryFile: string | null;
    sankeyHtml: string | null; // Per-file sankey HTML content
  }>;
  zipData?: JSZip | null;
  summaryDataMap: Map<string, CellData[][]>;
  rawDataMap: Map<string, CellData[][]>; // Cache for raw transaction data (lazy loaded)
  poiDataMap: Map<string, CellData[][]>; // Cache for POI data (lazy loaded)
  reportData?: ReportData | null; // report_data.json from backend
  fundTracesData?: BatchTraceResponse | null; // fund_traces.json batch traces
}

export default function CaseAnalysisResults() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedPOI, setSelectedPOI] = useState<ParsedAnalysisData["poiHtmlFiles"][0] | null>(null);
  const [poiModalOpen, setPOIModalOpen] = useState(false);
  const [currentPOIIndex, setCurrentPOIIndex] = useState(0);
  const [expandedSummaries, setExpandedSummaries] = useState<Set<number>>(new Set());
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);

  // State for per-file sankey modal
  const [fileSankeyModalOpen, setFileSankeyModalOpen] = useState(false);
  const [currentFileSankeyIndex, setCurrentFileSankeyIndex] = useState(0);

  // State for batch trace modal
  const [batchTraceModalOpen, setBatchTraceModalOpen] = useState(false);
  const [batchTraceInitialFile, setBatchTraceInitialFile] = useState<string | undefined>(undefined);

  // State for viewing previous results - auto-set from query param for failed cases
  const searchParams = new URLSearchParams(window.location.search);
  const [viewingPreviousResults, setViewingPreviousResults] = useState(searchParams.get('previous') === 'true');

  // State for Fund Trail share dialog
  const [shareFundTrailOpen, setShareFundTrailOpen] = useState(false);

  // Grouping overrides state for name merge/demerge
  const [groupingOverrides, setGroupingOverrides] = useState<{
    cross_file: Record<string, PendingClusterState>;
    individual: Record<string, Record<string, PendingClusterState>>;
  }>({ cross_file: {}, individual: {} });

  const handleSaveGroupingOverride = useCallback(
    (
      context: "cross_file" | "individual",
      targetCluster: string,
      overrides: GroupingOverrideResult,
      fileName?: string,
    ) => {
      setGroupingOverrides((prev) => {
        const next = { ...prev };
        const key = targetCluster.toLowerCase();
        if (context === "cross_file") {
          next.cross_file = { ...prev.cross_file, [key]: overrides };
          // Process auto-demerges: create demerge entries on source clusters
          if (overrides.autoDemerges) {
            for (const ad of overrides.autoDemerges) {
              const sourceKey = ad.sourceCluster.toLowerCase();
              const existing = prev.cross_file[sourceKey] || { demerged: [], merged: [] };
              next.cross_file[sourceKey] = {
                ...existing,
                demerged: [...existing.demerged, ...ad.names],
              };
            }
          }
        } else if (fileName) {
          const fileOverrides = { ...(prev.individual[fileName] || {}) };
          fileOverrides[key] = overrides;
          // Process auto-demerges for individual file context
          if (overrides.autoDemerges) {
            for (const ad of overrides.autoDemerges) {
              const sourceKey = ad.sourceCluster.toLowerCase();
              const existing = fileOverrides[sourceKey] || { demerged: [], merged: [] };
              fileOverrides[sourceKey] = {
                ...existing,
                demerged: [...existing.demerged, ...ad.names],
              };
            }
          }
          next.individual = { ...prev.individual, [fileName]: fileOverrides };
        }
        return next;
      });
    },
    [],
  );

  const hasGroupingChanges = useMemo(() => {
    if (Object.keys(groupingOverrides.cross_file).length > 0) return true;
    return Object.values(groupingOverrides.individual).some((f) => Object.keys(f).length > 0);
  }, [groupingOverrides]);

  // Apply Changes dialog state
  const [applyChangesOpen, setApplyChangesOpen] = useState(false);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);

  const handleRemoveChange = useCallback(
    (entry: {
      context: "cross_file" | "individual";
      targetCluster: string;
      action: "demerge" | "merge_into";
      fileName?: string;
    }) => {
      setGroupingOverrides((prev) => {
        const next = { ...prev };
        const key = entry.targetCluster;
        if (entry.context === "cross_file") {
          const state = { ...(prev.cross_file[key] || { demerged: [], merged: [] }) };
          if (entry.action === "demerge") state.demerged = [];
          else state.merged = [];
          // Remove entry if both empty
          if (state.demerged.length === 0 && state.merged.length === 0) {
            const { [key]: _, ...rest } = prev.cross_file;
            next.cross_file = rest;
          } else {
            next.cross_file = { ...prev.cross_file, [key]: state };
          }
        } else if (entry.fileName) {
          const fileOverrides = { ...(prev.individual[entry.fileName] || {}) };
          const state = { ...(fileOverrides[key] || { demerged: [], merged: [] }) };
          if (entry.action === "demerge") state.demerged = [];
          else state.merged = [];
          if (state.demerged.length === 0 && state.merged.length === 0) {
            const { [key]: _, ...rest } = fileOverrides;
            if (Object.keys(rest).length === 0) {
              const { [entry.fileName]: __, ...restFiles } = prev.individual;
              next.individual = restFiles;
            } else {
              next.individual = { ...prev.individual, [entry.fileName]: rest };
            }
          } else {
            fileOverrides[key] = state;
            next.individual = { ...prev.individual, [entry.fileName]: fileOverrides };
          }
        }
        return next;
      });
    },
    [],
  );

  // State for sharing individual graphs (Sankey/Node)
  const [shareGraphOpen, setShareGraphOpen] = useState(false);
  const [shareGraphHtml, setShareGraphHtml] = useState<string>("");

  // Check for secure result files (new flow)
  const { hasResultFile: hasSecureResultFile, isLoading: resultStatusLoading } = useResultFileStatus(id);

  // Secure download hook for new storage + legacy URL fallback
  const { fetchFileForParsing, downloadResultFile, isDownloading } = useSecureDownload();

  const toggleSummary = (index: number) => {
    setExpandedSummaries((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Fetch case and files with caching
  const {
    data: caseData,
    isLoading: caseLoading,
    error: caseError,
  } = useQuery({
    queryKey: ["case-results", id],
    queryFn: async () => {
      const [caseResult, filesResult] = await Promise.all([getCaseById(id!), getCaseFiles(id!)]);
      if (!caseResult) throw new Error("Case not found");
      return { case_: caseResult, files: filesResult };
    },
    enabled: !!id,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  const case_ = caseData?.case_ || null;
  const files = caseData?.files || [];

  // Determine which result URL to use based on viewing state
  const activeResultUrl = useMemo(() => {
    if (viewingPreviousResults && (case_ as any)?.previous_result_zip_url) {
      return (case_ as any).previous_result_zip_url;
    }
    return case_?.result_zip_url;
  }, [case_, viewingPreviousResults]);

  // Determine if we have any results to load (legacy URL OR secure storage)
  const hasAnyResults = !!(activeResultUrl || hasSecureResultFile);

  // Fetch and parse analysis data with caching - uses secure storage with legacy fallback
  // Include case_.updated_at in queryKey to auto-refresh when new results arrive
  const {
    data: analysisData,
    isLoading: analysisLoading,
    error: analysisError,
  } = useQuery({
    queryKey: ["analysis-data", id, activeResultUrl, hasSecureResultFile, viewingPreviousResults, case_?.updated_at],
    queryFn: async () => {
      console.log("[Analysis] Fetching analysis files for case:", id);
      console.log("[Analysis] Legacy URL:", activeResultUrl ? "available" : "none");
      console.log("[Analysis] Secure file:", hasSecureResultFile ? "available" : "none");

      // Try secure storage first, fall back to legacy URL
      const arrayBuffer = await fetchFileForParsing(id!, activeResultUrl, "result_zip");
      if (!arrayBuffer) {
        console.error("[Analysis] Failed to fetch analysis files");
        throw new Error("Failed to fetch analysis files. Please try again.");
      }
      console.log("[Analysis] ✓ Loaded", (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), "MB");
      return loadAnalysisFiles(arrayBuffer, files);
    },
    enabled: !!id && (case_?.status === "Ready" || ((case_?.status === "Failed" || case_?.status === "Timeout") && (!!case_?.previous_result_zip_url || hasSecureResultFile))) && !resultStatusLoading && hasAnyResults,
    staleTime: 30 * 60 * 1000, // 30 minutes - cache parsed results
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1, // Only retry once to avoid long waits
  });

  const loading = caseLoading || analysisLoading || resultStatusLoading;

  // PDF Report generation hook
  const {
    pdfUrl: reportPdfUrl,
    isGenerating: isReportGenerating,
    downloadPdf: downloadPdfReport,
    isReady: isReportReady,
  } = useReportGeneration({
    reportData: analysisData?.reportData ?? null,
    caseName: case_?.name || "",
    caseCreatedDate: case_?.created_at
      ? new Date(case_.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "",
    totalFiles: files.length,
    caseId: id || "",
    userId: user?.id,
  });

  const handleApplyChanges = async () => {
    if (!analysisData?.zipData || !id || !user) return;

    setIsApplyingChanges(true);
    try {
      // 1. Build grouping_logic.json (versioned format)
      let existingVersions: any[] = [];

      // Load existing versions from ZIP (if any)
      const existingFile = analysisData.zipData.file("grouping_logic.json");
      if (existingFile) {
        try {
          const existingData = JSON.parse(await existingFile.async("text"));
          if (existingData.versions) {
            existingVersions = existingData.versions;
          }
        } catch (e) {
          console.warn("Failed to parse existing grouping_logic.json:", e);
        }
      }

      // Build new version from current user changes
      const newVersion: any = {
        version: existingVersions.length + 1,
        timestamp: new Date().toISOString(),
        overrides: {
          individual: {} as Record<string, any[]>,
          cross_file: [] as any[],
        },
      };

      // Add cross_file overrides
      for (const [cluster, state] of Object.entries(groupingOverrides.cross_file)) {
        if (state.demerged.length > 0)
          newVersion.overrides.cross_file.push({ action: "demerge", target_cluster: cluster, names: state.demerged });
        if (state.merged.length > 0)
          newVersion.overrides.cross_file.push({ action: "merge_into", target_cluster: cluster, names: state.merged });
      }

      // Add individual overrides
      for (const [fileName, clusters] of Object.entries(groupingOverrides.individual)) {
        if (!newVersion.overrides.individual[fileName]) newVersion.overrides.individual[fileName] = [];
        for (const [cluster, state] of Object.entries(clusters)) {
          if (state.demerged.length > 0)
            newVersion.overrides.individual[fileName].push({
              action: "demerge",
              target_cluster: cluster,
              names: state.demerged,
            });
          if (state.merged.length > 0)
            newVersion.overrides.individual[fileName].push({
              action: "merge_into",
              target_cluster: cluster,
              names: state.merged,
            });
        }
      }

      // Append new version to existing versions
      const overridesPayload = {
        versions: [...existingVersions, newVersion],
      };

      // 2. Extract raw_transactions_*.xlsx and build new ZIP
      const newZip = new JSZip();
      const rawFiles = Object.keys(analysisData.zipData.files).filter(
        (n) => n.startsWith("raw_transactions_") && n.endsWith(".xlsx"),
      );
      for (const rawFile of rawFiles) {
        const file = analysisData.zipData.file(rawFile);
        if (file) {
          const content = await file.async("arraybuffer");
          newZip.file(rawFile.replace("raw_transactions_", ""), content);
        }
      }
      newZip.file("grouping_logic.json", JSON.stringify(overridesPayload, null, 2));

      const zipBlob = await newZip.generateAsync({ type: "blob" });
      const zipFile = new File([zipBlob], "reanalysis.zip", { type: "application/zip" });

      // 3. Store current result_zip_url in previous_result_zip_url
      await supabase.from("cases").update({ previous_result_zip_url: case_?.result_zip_url }).eq("id", id);

      // 4. Submit job
      const { job_id } = await startJobFlow([zipFile], "parse-statements", id, user.id, [], () => {}, undefined, true);

      // 5. Log timeline event
      await addEvent(id, "analysis_submitted", {
        job_id,
        mode: "parse-statements",
        task: "parse-statements",
        stage: "grouping_reanalysis",
        file_count: rawFiles.length,
      });

      // 6. Clear state and navigate
      setGroupingOverrides({ cross_file: {}, individual: {} });
      setApplyChangesOpen(false);
      queryClient.removeQueries({ queryKey: ["case-results", id] });
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === "analysis-data" && q.queryKey[1] === id });
      toast({ title: "Re-analysis started", description: "Navigating to dashboard..." });
      navigate("/app/dashboard");
    } catch (error) {
      console.error("Failed to apply changes:", error);
      toast({
        title: "Failed to apply changes",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsApplyingChanges(false);
    }
  };

  // Handle case not found error
  useEffect(() => {
    if (caseError) {
      toast({ title: "Case not found", variant: "destructive" });
      navigate("/app/dashboard");
    }
  }, [caseError, navigate]);

  // Silent mismatch detection - runs once per result version using localStorage
  useEffect(() => {
    if (!analysisData?.zipData || !case_ || !user?.email) return;

    const storageKey = `mismatch_checked_${id}_${case_.updated_at}`;
    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, "1");

    const timer = setTimeout(async () => {
      try {

        const rawFiles = Object.keys(analysisData.zipData!.files).filter(
          (n) => n.startsWith("raw_transactions_") && n.endsWith(".xlsx")
        );

        for (const rawFileName of rawFiles) {
          try {
            const file = analysisData.zipData!.file(rawFileName);
            if (!file) continue;

            const content = await file.async("arraybuffer");
            const parsed = await parseExcelFile(content);
            if (!parsed || parsed.length < 2) continue;

            // Find transaction_flag column in header row
            const headerRow = parsed[0];
            let flagColIndex = -1;
            for (let i = 0; i < headerRow.length; i++) {
              const val = String(headerRow[i]?.value || "").toLowerCase().trim();
              if (val === "transaction_flag") {
                flagColIndex = i;
                break;
              }
            }
            if (flagColIndex === -1) continue;

            // Check data rows for "mismatch" or "amount_mismatch"
            let hasMismatch = false;
            for (let r = 1; r < parsed.length; r++) {
              const cellVal = String(parsed[r]?.[flagColIndex]?.value || "").toLowerCase().trim();
              if (cellVal === "mismatch" || cellVal === "amount_mismatch") {
                hasMismatch = true;
                break;
              }
            }
            if (!hasMismatch) continue;

            // Send alert silently
            const base64 = await file.async("base64");

            // Try to find and attach the original PDF
            const baseName = rawFileName.replace("raw_transactions_", "").replace(".xlsx", "");
            const pdfName = `${baseName}.pdf`;
            let pdfFileBase64: string | undefined;
            let pdfFileName: string | undefined;

            const matchingFile = files.find(
              (f: CaseFileRecord) => f.file_name.toLowerCase() === pdfName.toLowerCase()
            );
            if (matchingFile?.file_url) {
              try {
                const { data: pdfBlob } = await supabase.storage
                  .from('case-files')
                  .download(matchingFile.file_url);
                if (pdfBlob) {
                  const pdfBuf = await pdfBlob.arrayBuffer();
                  pdfFileBase64 = btoa(
                    new Uint8Array(pdfBuf).reduce((s, b) => s + String.fromCharCode(b), "")
                  );
                  pdfFileName = matchingFile.file_name;
                }
              } catch {
                // Silent - skip PDF attachment
              }
            }

            supabase.functions.invoke('send-mismatch-alert', {
              body: {
                case_name: case_.name,
                user_email: user.email,
                file_name: rawFileName,
                file_base64: base64,
                ...(pdfFileBase64 && pdfFileName ? { pdf_file_base64: pdfFileBase64, pdf_file_name: pdfFileName } : {}),
              },
            }).catch(() => {});
          } catch {
            // Silent - no logging
          }
        }
      } catch {
        // Silent - no logging
      }
    }, 7000);

    return () => clearTimeout(timer);
  }, [analysisData, case_, user, id, files]);

  const loadAnalysisFiles = async (
    arrayBuffer: ArrayBuffer,
    originalFiles: CaseFileRecord[],
  ): Promise<ParsedAnalysisData | null> => {
    try {
      const zip = new JSZip();
      const zipData = await zip.loadAsync(arrayBuffer);

      // Log ZIP file listing for debugging
      const allZipFiles = Object.keys(zipData.files).filter(f => !f.endsWith('/'));
      console.log("[Analysis] ZIP contains", allZipFiles.length, "files:", allZipFiles.join(", "));

      const parsedData: ParsedAnalysisData = {
        beneficiaries: [],
        beneficiaryHeaders: [],
        totalBeneficiaryCount: 0,
        beneficiariesPreviewUrl: undefined,
        mainGraphUrl: null,
        mainGraphHtml: null,
        mainGraphPngUrl: null,
        mainNodeGraphHtml: null, // poi_flows_main.html
        mainSankeyGraphHtml: null, // poi_flows_sankey.html
        fundTrailHtml: null, // fund_trail_main.html - NEW
        egoImages: [],
        poiHtmlFiles: [],
        poiFileCount: 0,
        fileSummaries: [],
        summaryDataMap: new Map(),
        rawDataMap: new Map(), // Initialize empty - will be lazily populated
        poiDataMap: new Map(), // Initialize empty - will be lazily populated
      };

      // Process fund_trail_main.html first (highest priority)
      const fundTrailFile = zipData.file("fund_trail_main.html");
      if (fundTrailFile) {
        parsedData.fundTrailHtml = await fundTrailFile.async("text");
        console.log("[Analysis] ✓ Fund Trail HTML extracted");
      }

      // Parse poi_summary.json FIRST (preferred source for counts)
      let poiSummaryFile = zipData.file("poi_summary.json");
      if (!poiSummaryFile) {
        const allFiles = Object.keys(zipData.files);
        const poiSummaryPath = allFiles.find((name) => name.endsWith("poi_summary.json") && !name.includes("__MACOSX"));
        if (poiSummaryPath) {
          poiSummaryFile = zipData.file(poiSummaryPath);
          console.log("[Analysis] Found poi_summary.json at nested path:", poiSummaryPath);
        }
      }

      if (poiSummaryFile) {
        try {
          const jsonContent = await poiSummaryFile.async("text");
          const poiSummary = JSON.parse(jsonContent);
          if (typeof poiSummary.total_pois === "number") {
            parsedData.poiFileCount = poiSummary.total_pois;
            console.log("[Analysis] POI count from poi_summary.json:", poiSummary.total_pois);
          }
          if (typeof poiSummary.total_beneficiaries === "number") {
            parsedData.totalBeneficiaryCount = poiSummary.total_beneficiaries;
            console.log("[Analysis] Beneficiary count from poi_summary.json:", poiSummary.total_beneficiaries);
          }
          // If total_pois missing, fall back to file count
          if (typeof poiSummary.total_pois !== "number") {
            parsedData.poiFileCount = Object.keys(zipData.files).filter(
              (name) => name.startsWith("POI_") && name.endsWith(".xlsx"),
            ).length;
            console.log("[Analysis] poi_summary.json missing total_pois, using file count:", parsedData.poiFileCount);
          }
        } catch (error) {
          console.warn("[Analysis] Failed to parse poi_summary.json, using file count:", error);
          parsedData.poiFileCount = Object.keys(zipData.files).filter(
            (name) => name.startsWith("POI_") && name.endsWith(".xlsx"),
          ).length;
        }
      } else {
        parsedData.poiFileCount = Object.keys(zipData.files).filter(
          (name) => name.startsWith("POI_") && name.endsWith(".xlsx"),
        ).length;
        console.log("[Analysis] No poi_summary.json, using file count:", parsedData.poiFileCount);
      }

      // Process beneficiaries_by_file.xlsx with enhanced formatting
      const beneficiariesFile = zipData.file("beneficiaries_by_file.xlsx");
      if (beneficiariesFile) {
        const content = await beneficiariesFile.async("arraybuffer");
        // Copy buffer so SheetJS gets an independent copy (ExcelJS can detach the original on Chrome)
        const contentForSheetJS = content.slice(0);

        // Create blob URL for the beneficiaries file
        const beneficiariesBlob = new Blob([content], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        parsedData.beneficiariesFileUrl = URL.createObjectURL(beneficiariesBlob);

        // Extract preview JSON for styling
        const previewJsonFile = zipData.file("beneficiaries_by_file.preview.json");
        if (previewJsonFile) {
          const previewContent = await previewJsonFile.async("text");
          const previewBlob = new Blob([previewContent], { type: "application/json" });
          parsedData.beneficiariesPreviewUrl = URL.createObjectURL(previewBlob);
          console.log("✅ Preview JSON extracted from ZIP and blob URL created");
        } else {
          // Fallback logic for test/missing files
          try {
            const testPreviewResponse = await fetch("/test-files/beneficiaries_by_file.preview.json");
            if (testPreviewResponse.ok) {
              const testPreviewContent = await testPreviewResponse.text();
              const testPreviewBlob = new Blob([testPreviewContent], { type: "application/json" });
              parsedData.beneficiariesPreviewUrl = URL.createObjectURL(testPreviewBlob);
            }
          } catch (error) {
            console.warn("⚠️ Failed to fetch static test preview JSON:", error);
          }
        }

        try {
          parsedData.beneficiariesExcelData = await parseExcelFile(content);
        } catch (error) {
          console.error("Enhanced parsing failed, falling back to basic parsing:", error);
        }

        // Keep existing XLSX parsing for backward compatibility (truncated for brevity, logic unchanged)
        const workbook = XLSX.read(contentForSheetJS, { type: "array", cellStyles: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length > 2) {
          parsedData.beneficiaryHeaders = jsonData[0] as string[];
          // Only set from Excel if poi_summary.json didn't already provide the count
          if (parsedData.totalBeneficiaryCount === 0) {
            const totalBeneficiaries = jsonData.length - 2;
            parsedData.totalBeneficiaryCount = Math.max(0, totalBeneficiaries);
          }

          parsedData.beneficiaries = jsonData.slice(2, 27).map((row, rowIndex) => {
            const obj: { [key: string]: any } = {};
            parsedData.beneficiaryHeaders.forEach((header, index) => {
              const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 2, c: index });
              const cell = worksheet[cellAddress];

              // Enhanced color parsing
              let backgroundColor, color;
              if (cell?.s) {
                if (cell.s.fgColor) {
                  if (cell.s.fgColor.rgb) backgroundColor = `#${cell.s.fgColor.rgb}`;
                  else if (cell.s.fgColor.theme !== undefined) {
                    const themeColors = [
                      "#000000",
                      "#FFFFFF",
                      "#1F497D",
                      "#4F81BD",
                      "#9CBB58",
                      "#F79646",
                      "#C0504D",
                      "#8064A2",
                    ];
                    backgroundColor = themeColors[cell.s.fgColor.theme] || "#FFFFFF";
                  }
                }
                if (cell.s.font?.color) {
                  if (cell.s.font.color.rgb) color = `#${cell.s.font.color.rgb}`;
                  else if (cell.s.font.color.theme !== undefined) {
                    const themeColors = [
                      "#000000",
                      "#FFFFFF",
                      "#1F497D",
                      "#4F81BD",
                      "#9CBB58",
                      "#F79646",
                      "#C0504D",
                      "#8064A2",
                    ];
                    color = themeColors[cell.s.font.color.theme] || "#000000";
                  }
                }
                if (cell.s.patternType && cell.s.bgColor && cell.s.bgColor.rgb) {
                  backgroundColor = `#${cell.s.bgColor.rgb}`;
                }
              }

              obj[header] = {
                value: row[index] || "",
                style: backgroundColor || color ? { backgroundColor, color } : undefined,
              };
            });
            return obj;
          });
        }
      }

      // Process main graphs (new format: poi_flows_main.html and poi_flows_sankey.html)
      const mainNodeGraphFile = zipData.file("poi_flows_main.html");
      if (mainNodeGraphFile) {
        parsedData.mainNodeGraphHtml = await mainNodeGraphFile.async("text");
      }

      const mainSankeyGraphFile = zipData.file("poi_flows_sankey.html");
      if (mainSankeyGraphFile) {
        parsedData.mainSankeyGraphHtml = await mainSankeyGraphFile.async("text");
      }

      // Fallback to old format (poi_flows.html)
      const mainGraphHtmlFile = zipData.file("poi_flows.html");
      if (mainGraphHtmlFile) {
        parsedData.mainGraphHtml = await mainGraphHtmlFile.async("text");
        // Use as node graph if new format doesn't exist
        if (!parsedData.mainNodeGraphHtml) {
          parsedData.mainNodeGraphHtml = parsedData.mainGraphHtml;
        }
      } else {
        const mainGraphFile = zipData.file("poi_flows.png");
        if (mainGraphFile) {
          const content = await mainGraphFile.async("blob");
          parsedData.mainGraphUrl = URL.createObjectURL(content);
        }
      }

      const mainGraphPngFile = zipData.file("poi_flows.png");
      if (mainGraphPngFile) {
        const content = await mainGraphPngFile.async("blob");
        parsedData.mainGraphPngUrl = URL.createObjectURL(content);
      }

      // Parse per-file sankey graphs from poi_flows_per_file_sankeys folder
      const sankeyPerFileMap = new Map<string, string>();
      const sankeyFolderPrefix = "poi_flows_per_file_sankeys/";
      const sankeyFiles = Object.keys(zipData.files).filter(
        (name) => name.startsWith(sankeyFolderPrefix) && name.endsWith(".html"),
      );

      // PARALLEL extraction of all sankey HTML files
      // Helper to normalize strings (needed for pre-indexing)
      const normalizeForSankey = (str: string) => {
        const cleanExt = str
          .replace(/\.csv\.xlsx$/, "")
          .replace(/\.xlsx$/, "")
          .replace(/\.pdf$/, "");
        return cleanExt.toLowerCase().replace(/[^a-z0-9]/g, "");
      };

      const sankeyResults = await Promise.all(
        sankeyFiles.map(async (sankeyPath) => {
          const file = zipData.file(sankeyPath);
          if (!file) return null;

          const htmlContent = await file.async("text");
          // Extract original filename from sankey_*.html
          // e.g., "poi_flows_per_file_sankeys/sankey_AGARWAL_BROTHERS.xlsx.html" -> "AGARWAL_BROTHERS"
          const key = sankeyPath
            .replace(sankeyFolderPrefix, "")
            .replace("sankey_", "")
            .replace(".html", "")
            .replace(/\.(xlsx|pdf|csv)$/i, "");

          return { key, content: htmlContent };
        }),
      );

      // Populate map from parallel results
      sankeyResults.filter(Boolean).forEach((r) => {
        sankeyPerFileMap.set(r!.key, r!.content);
      });
      console.log("[Analysis] ✓ Loaded", sankeyPerFileMap.size, "sankey files");

      // Build normalized lookup index for O(1) matching
      const normalizedSankeyIndex = new Map<string, string>();
      for (const key of sankeyPerFileMap.keys()) {
        normalizedSankeyIndex.set(normalizeForSankey(key), key);
      }

      // Process POI HTML files
      const poiHtmlFiles = Object.keys(zipData.files).filter(
        (name) => name.startsWith("name_") && name.endsWith(".html"),
      );
      for (const fileName of poiHtmlFiles) {
        const file = zipData.file(fileName);
        if (file) {
          const htmlContent = await file.async("text");
          const poiName = fileName.replace("name_", "").replace(".html", "").replace(/_/g, " ");

          const pngFileName = fileName.replace(".html", ".png");
          const pngFile = zipData.file(pngFileName);
          let pngUrl;
          if (pngFile) {
            const pngContent = await pngFile.async("blob");
            pngUrl = URL.createObjectURL(pngContent);
          }

          parsedData.poiHtmlFiles.push({
            name: fileName,
            htmlContent,
            title: `POI Analysis - ${poiName}`,
            pngUrl,
          });
        }
      }

      // Fallback: Process ego images
      if (parsedData.poiHtmlFiles.length === 0) {
        const egoFiles = Object.keys(zipData.files).filter((name) => name.startsWith("ego_") && name.endsWith(".png"));
        for (const fileName of egoFiles) {
          const file = zipData.file(fileName);
          if (file) {
            const content = await file.async("blob");
            parsedData.egoImages.push({
              name: fileName,
              url: URL.createObjectURL(content),
            });
          }
        }
      }

      // poi_summary.json already parsed earlier (before Excel parsing)

      // --- FIX START: Robust Normalized File Matching ---

      const analysisFileNames = Object.keys(zipData.files);

      // Helper to normalize strings: remove extension, lowercase, remove non-alphanumerics
      const normalizeString = (str: string) => {
        // Remove known extensions first to avoid keeping "csv" or "xlsx" in the comparison string
        const cleanExt = str
          .replace(/\.csv\.xlsx$/, "")
          .replace(/\.xlsx$/, "")
          .replace(/\.pdf$/, "");
        // Remove all non-alphanumeric characters (spaces, underscores, dashes, dots) and lowercase
        return cleanExt.toLowerCase().replace(/[^a-z0-9]/g, "");
      };

      for (const originalFile of originalFiles) {
        const originalNormalized = normalizeString(originalFile.file_name);
        // Also create a version with underscores for sankey matching
        const originalWithUnderscores = originalFile.file_name
          .replace(/\.pdf$/i, "")
          .replace(/\.xlsx$/i, "")
          .replace(/\.csv$/i, "")
          .replace(/\s+/g, "_");

        // Extract base filename without extension for exact matching
        // Backend creates: raw_transactions_{base}.xlsx and summary_{base}.xlsx
        const originalBaseName = originalFile.file_name.replace(/\.(pdf|csv|xlsx?)$/i, "");

        // Find Raw Transactions (Pattern: raw_transactions_[base].xlsx) - EXACT MATCH ONLY
        const rawTransactionsFile = analysisFileNames.find((zipFileName) => {
          if (!zipFileName.startsWith("raw_transactions_")) return false;

          // Extract base name: "raw_transactions_SHIVAM_AGARWAL_2024-25.xlsx" -> "SHIVAM_AGARWAL_2024-25"
          const zipBaseName = zipFileName.replace("raw_transactions_", "").replace(/\.xlsx$/i, "");

          // Exact case-insensitive match
          return zipBaseName.toLowerCase() === originalBaseName.toLowerCase();
        });

        // Find Summary (Pattern: summary_[base].xlsx) - EXACT MATCH ONLY
        const summaryFile = analysisFileNames.find((zipFileName) => {
          if (!zipFileName.startsWith("summary_")) return false;

          // Extract base name: "summary_SHIVAM_AGARWAL_2024-25.xlsx" -> "SHIVAM_AGARWAL_2024-25"
          const zipBaseName = zipFileName.replace("summary_", "").replace(/\.xlsx$/i, "");

          // Exact case-insensitive match
          return zipBaseName.toLowerCase() === originalBaseName.toLowerCase();
        });

        // Find Sankey HTML for this file from sankeyPerFileMap
        // Sankey files are named: sankey_[filename_with_underscores].html
        let sankeyHtml: string | null = null;

        // Try exact match with underscores first
        if (sankeyPerFileMap.has(originalWithUnderscores)) {
          sankeyHtml = sankeyPerFileMap.get(originalWithUnderscores)!;
        } else if (sankeyPerFileMap.has(originalBaseName)) {
          // Try with original base name (handles case differences)
          sankeyHtml = sankeyPerFileMap.get(originalBaseName)!;
        } else {
          // O(1) lookup using pre-indexed normalized map
          const matchedKey = normalizedSankeyIndex.get(normalizeForSankey(originalFile.file_name));
          if (matchedKey) {
            sankeyHtml = sankeyPerFileMap.get(matchedKey)!;
          }
        }

        parsedData.fileSummaries.push({
          originalFile: originalFile.file_name,
          rawTransactionsFile: rawTransactionsFile || null,
          summaryFile: summaryFile || null,
          sankeyHtml: sankeyHtml,
        });
        // Summary data is lazy-loaded by SummaryTableViewer when user expands
      }

      // --- FIX END ---

      // Parse report_data.json for PDF report generation
      const reportDataFile = zipData.file("report_data.json");
      if (reportDataFile) {
        try {
          const reportJsonContent = await reportDataFile.async("text");
          parsedData.reportData = JSON.parse(reportJsonContent) as ReportData;
          console.log("[Analysis] ✓ report_data.json extracted for PDF report");
        } catch (error) {
          console.warn("[Analysis] Failed to parse report_data.json:", error);
          parsedData.reportData = null;
        }
      } else {
        console.log("[Analysis] No report_data.json found in ZIP");
        parsedData.reportData = null;
      }

      // Parse fund_traces.json for batch transaction tracing
      const fundTracesFile = zipData.file("fund_traces.json");
      if (fundTracesFile) {
        try {
          const ftContent = await fundTracesFile.async("text");
          // Backend may emit NaN values which are invalid JSON — replace with null
          const sanitizedFt = ftContent.replace(/:\s*NaN\b/g, ": null");
          parsedData.fundTracesData = JSON.parse(sanitizedFt) as BatchTraceResponse;
          console.log("[Analysis] ✓ fund_traces.json extracted —", parsedData.fundTracesData.seeds?.length || 0, "seeds");
        } catch (error) {
          console.warn("[Analysis] Failed to parse fund_traces.json:", error);
          parsedData.fundTracesData = null;
        }
      } else {
        console.log("[Analysis] No fund_traces.json found in ZIP");
        parsedData.fundTracesData = null;
      }

      parsedData.zipData = zip;
      return parsedData;
    } catch (error) {
      console.error("Failed to parse ZIP file:", error);
      toast({ title: "Failed to parse analysis results", variant: "destructive" });
      return null;
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  };

  const downloadAllPOIFiles = () => {
    if (!case_) return;
    downloadResultFile(case_.id, case_.result_zip_url, "result_zip", `POI_files_${case_.name}.zip`);
  };

  const downloadCompleteReport = () => {
    if (!case_) return;
    downloadResultFile(case_.id, case_.result_zip_url, "result_zip", `analysis_report_${case_.name}.zip`);
  };

  const downloadIndividualFile = async (fileName: string) => {
    if (!analysisData?.zipData) return;

    const file = analysisData.zipData.file(fileName);
    if (file) {
      let content: Blob;
      if (fileName.endsWith(".html")) {
        const htmlContent = await file.async("text");
        content = new Blob([htmlContent], { type: "text/html" });
      } else {
        content = await file.async("blob");
      }
      const url = URL.createObjectURL(content);
      handleDownload(url, fileName);
      toast({ title: `Downloading ${fileName}` });
    }
  };

  const downloadBeneficiariesFile = async () => {
    if (!analysisData?.zipData) return;
    const file = analysisData.zipData.file("beneficiaries_by_file.xlsx");
    if (file) {
      const content = await file.async("blob");
      const url = URL.createObjectURL(content);
      handleDownload(url, "beneficiaries_by_file.xlsx");
      toast({ title: "Downloading beneficiaries file" });
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const openPOIModal = (poi: (typeof analysisData.poiHtmlFiles)[0], index?: number) => {
    setSelectedPOI(poi);
    setCurrentPOIIndex(index ?? analysisData?.poiHtmlFiles.findIndex((p) => p.name === poi.name) ?? 0);
    setPOIModalOpen(true);
  };

  const navigateToPreviousPOI = () => {
    if (!analysisData || currentPOIIndex <= 0) return;
    const newIndex = currentPOIIndex - 1;
    setCurrentPOIIndex(newIndex);
    setSelectedPOI(analysisData.poiHtmlFiles[newIndex]);
  };

  const navigateToNextPOI = () => {
    if (!analysisData || currentPOIIndex >= analysisData.poiHtmlFiles.length - 1) return;
    const newIndex = currentPOIIndex + 1;
    setCurrentPOIIndex(newIndex);
    setSelectedPOI(analysisData.poiHtmlFiles[newIndex]);
  };

  const downloadPOIPng = () => {
    if (selectedPOI?.pngUrl) {
      handleDownload(selectedPOI.pngUrl, selectedPOI.name.replace(".html", ".png"));
      toast({ title: `Downloading ${selectedPOI.name.replace(".html", ".png")}` });
    }
  };

  const downloadMainFlowPng = () => {
    if (analysisData?.mainGraphPngUrl) {
      handleDownload(analysisData.mainGraphPngUrl, "poi_flows.png");
      toast({ title: "Downloading poi_flows.png" });
    }
  };

  // Lazy load raw transaction data for a specific file
  const loadRawTransactionsData = async (rawFileName: string): Promise<CellData[][] | null> => {
    if (!analysisData?.zipData || !rawFileName) return null;

    // Check if already cached in analysisData
    if (analysisData.rawDataMap.has(rawFileName)) {
      return analysisData.rawDataMap.get(rawFileName)!;
    }

    try {
      const rawFile = analysisData.zipData.file(rawFileName);
      if (!rawFile) {
        console.warn(`Raw file not found in ZIP: ${rawFileName}`);
        return null;
      }

      const content = await rawFile.async("arraybuffer");
      const parsed = await parseExcelFile(content);

      // Cache the parsed data
      analysisData.rawDataMap.set(rawFileName, parsed);

      return parsed;
    } catch (error) {
      console.error(`Failed to parse raw file ${rawFileName}:`, error);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate(`/app/cases/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Case
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
              <h3 className="text-lg font-medium mb-2">Securely Loading Results</h3>
              <p className="text-muted-foreground text-sm">
                {caseLoading
                  ? "Fetching case data..."
                  : resultStatusLoading
                    ? "Checking file availability..."
                    : "Downloading encrypted files..."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!case_ || (case_.status !== "Ready" && case_.status !== "Failed" && case_.status !== "Timeout")) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/app/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Analysis Not Ready</h3>
              <p className="text-muted-foreground">
                The analysis for this case is not yet complete. Please check back later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state - failed to load analysis
  if (analysisError || !analysisData) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
           <Button variant="outline" size="sm" onClick={() => navigate(`/app/cases/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Case
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h3 className="text-lg font-medium mb-2">Failed to Load Results</h3>
              <p className="text-muted-foreground mb-4">
                {analysisError instanceof Error
                  ? analysisError.message
                  : "Unable to load analysis files. Please try again."}
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <DocumentHead title={`Analysis Results - ${case_.name} - FinNavigator`} />
      <div className="p-4 md:p-6 space-y-6 md:space-y-8">
        {/* Back to Case Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(`/app/cases/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("analysisResults.backToCase")}
          </Button>
          {(case_ as any).previous_result_zip_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewingPreviousResults(!viewingPreviousResults)}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {viewingPreviousResults
                ? t("analysisResults.viewLatestResults")
                : t("analysisResults.viewPreviousResults")}
            </Button>
          )}
          {viewingPreviousResults && (
            <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-3 py-1.5 rounded-md text-sm font-medium">
              {t("analysisResults.viewingPreviousResults")}
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {t("analysisResults.title")}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground">{case_.name}</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {hasGroupingChanges && (
              <Button
                onClick={() => setApplyChangesOpen(true)}
                size="default"
                variant="outline"
                className="gap-2 w-full sm:w-auto border-primary text-primary hover:bg-primary/10"
              >
                <Settings2 className="h-4 w-4" />
                Apply Changes
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="default" className="shadow-lg w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  {t("analysisResults.downloadReport")}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={downloadPdfReport}
                  disabled={!isReportReady}
                  className="flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {isReportGenerating ? "Generating..." : "Download PDF Report"}
                  </span>
                  {isReportReady && reportPdfUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReportPreviewOpen(true);
                      }}
                      className="p-1 rounded hover:bg-accent"
                    >
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadCompleteReport} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download All Case Files
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("analysisResults.totalBeneficiaries")}
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysisData.totalBeneficiaryCount}</div>
              <p className="text-xs text-muted-foreground">{t("analysisResults.identifiedInAnalysis")}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("analysisResults.personOfInterest")}
              </CardTitle>
              <FileText className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysisData.poiFileCount}</div>
              <p className="text-xs text-muted-foreground">{t("analysisResults.presentInMultipleFiles")}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("analysisResults.analysisFiles")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysisData.fileSummaries.length}</div>
              <p className="text-xs text-muted-foreground">{t("analysisResults.originalFilesProcessed")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Beneficiaries Preview */}
        {(analysisData.beneficiariesExcelData || analysisData.beneficiaries.length > 0) && (
          <ExcelViewer
            title={t("analysisResults.topBeneficiaries", { count: Math.min(100, analysisData.totalBeneficiaryCount) })}
            data={analysisData.beneficiariesExcelData || []}
            onDownload={downloadBeneficiariesFile}
            maxRows={102}
            fileUrl={analysisData.beneficiariesPreviewUrl || analysisData.beneficiariesFileUrl}
            enableBeneficiaryClick={true}
            zipData={analysisData.zipData}
            rawDataCache={analysisData.rawDataMap}
            poiDataCache={analysisData.poiDataMap}
            onCacheRawData={(fileName, data) => {
              analysisData.rawDataMap.set(fileName, data);
            }}
            onCachePOIData={(fileName, data) => {
              analysisData.poiDataMap.set(fileName, data);
            }}
            onSaveGroupingOverride={handleSaveGroupingOverride}
            pendingOverrides={groupingOverrides.cross_file}
            fundTracesData={analysisData.fundTracesData || null}
            caseId={id}
          />
        )}

        {/* Main Flow Graph - with Tabs for Fund Trail, Sankey and Node graphs */}
        {(analysisData.fundTrailHtml ||
          analysisData.mainSankeyGraphHtml ||
          analysisData.mainNodeGraphHtml ||
          analysisData.mainGraphHtml ||
          analysisData.mainGraphUrl) && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t("analysisResults.transactionFlowAnalysis")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("analysisResults.interactiveVisualization")}</p>
            </CardHeader>
            <CardContent className="p-6 relative">
              {/* Determine available tabs */}
              {(() => {
                const hasFundTrail = !!analysisData.fundTrailHtml;
                const hasSankey = !!analysisData.mainSankeyGraphHtml;
                const hasNode = !!analysisData.mainNodeGraphHtml;
                const hasLegacy = !!analysisData.mainGraphHtml || !!analysisData.mainGraphUrl;
                const tabCount = [hasFundTrail, hasSankey, hasNode, hasLegacy].filter(Boolean).length;

                // Default to fundtrail if available, otherwise sankey
                const defaultTab = hasFundTrail ? "fundtrail" : hasSankey ? "sankey" : "node";

                if (tabCount > 1) {
                  return (
                    <Tabs defaultValue={defaultTab} className="w-full">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <TabsList className="bg-muted/60">
                          {hasFundTrail && (
                            <TabsTrigger value="fundtrail" className="data-[state=active]:bg-background">
                              {t("analysisResults.fundTrail")}
                            </TabsTrigger>
                          )}
                          {hasSankey && (
                            <TabsTrigger value="sankey" className="data-[state=active]:bg-background">
                              {t("analysisResults.sankeyGraph")}
                            </TabsTrigger>
                          )}
                          {hasNode && (
                            <TabsTrigger value="node" className="data-[state=active]:bg-background">
                              {t("analysisResults.nodeGraph")}
                            </TabsTrigger>
                          )}
                        </TabsList>
                        {/* Toolbar slot - FundTrailViewer will render here via portal */}
                        <div id="fund-trail-toolbar-slot" />
                      </div>
                      {hasFundTrail && (
                        <TabsContent value="fundtrail">
                          <FundTrailViewer
                            htmlContent={analysisData.fundTrailHtml!}
                            caseId={id!}
                            onShare={() => setShareFundTrailOpen(true)}
                            className="h-[80vh]"
                            renderToolbar={(toolbar) => toolbar}
                          />
                        </TabsContent>
                      )}
                      {hasSankey && (
                        <TabsContent value="sankey">
                          <HTMLViewer
                            htmlContent={analysisData.mainSankeyGraphHtml!}
                            title="Sankey Graph"
                            onDownload={() => downloadIndividualFile("poi_flows_sankey.html")}
                            onShare={() => {
                              setShareGraphHtml(analysisData.mainSankeyGraphHtml!);
                              setShareGraphOpen(true);
                            }}
                            className="h-[70vh]"
                          />
                        </TabsContent>
                      )}
                      {hasNode && (
                        <TabsContent value="node">
                          <HTMLViewer
                            htmlContent={analysisData.mainNodeGraphHtml!}
                            title="Node Graph"
                            onDownload={() => downloadIndividualFile("poi_flows_main.html")}
                            onDownloadPng={analysisData.mainGraphPngUrl ? downloadMainFlowPng : undefined}
                            onShare={() => {
                              setShareGraphHtml(analysisData.mainNodeGraphHtml!);
                              setShareGraphOpen(true);
                            }}
                            className="h-[70vh]"
                          />
                        </TabsContent>
                      )}
                    </Tabs>
                  );
                }

                // Single graph - show directly
                if (hasFundTrail) {
                  return (
                    <FundTrailViewer
                      htmlContent={analysisData.fundTrailHtml!}
                      caseId={id!}
                      onShare={() => setShareFundTrailOpen(true)}
                      className="h-[80vh]"
                    />
                  );
                }
                if (hasSankey) {
                  return (
                    <HTMLViewer
                      htmlContent={analysisData.mainSankeyGraphHtml!}
                      title="Sankey Graph"
                      onDownload={() => downloadIndividualFile("poi_flows_sankey.html")}
                      onShare={() => {
                        setShareGraphHtml(analysisData.mainSankeyGraphHtml!);
                        setShareGraphOpen(true);
                      }}
                      className="h-[70vh]"
                    />
                  );
                }
                if (hasNode) {
                  return (
                    <HTMLViewer
                      htmlContent={analysisData.mainNodeGraphHtml!}
                      title="Node Graph"
                      onDownload={() => downloadIndividualFile("poi_flows_main.html")}
                      onDownloadPng={analysisData.mainGraphPngUrl ? downloadMainFlowPng : undefined}
                      onShare={() => {
                        setShareGraphHtml(analysisData.mainNodeGraphHtml!);
                        setShareGraphOpen(true);
                      }}
                      className="h-[70vh]"
                    />
                  );
                }
                if (analysisData.mainGraphHtml) {
                  return (
                    <HTMLViewer
                      htmlContent={analysisData.mainGraphHtml}
                      title="Transaction Flow Analysis"
                      onDownload={() => downloadIndividualFile("poi_flows.html")}
                      onDownloadPng={analysisData.mainGraphPngUrl ? downloadMainFlowPng : undefined}
                      className="h-[70vh]"
                    />
                  );
                }
                if (analysisData.mainGraphUrl) {
                  return (
                    <div className="relative group">
                      <img
                        src={analysisData.mainGraphUrl}
                        alt="POI Flow Analysis"
                        className="w-full h-auto rounded-lg border shadow-sm"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={() => handleDownload(analysisData.mainGraphUrl!, "poi_flows.png")}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                }
                return null;
              })()}
            </CardContent>
          </Card>
        )}

        {/* Person of Interest Raw Data */}
        <Card className="shadow-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t("analysisResults.poiRawData")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t("analysisResults.downloadDetailedAnalysis")}</p>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadAllPOIFiles} variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              {t("analysisResults.downloadAllPOI")} ({analysisData.poiFileCount} files)
            </Button>
          </CardContent>
        </Card>

        {/* POI Interactive Visualizations */}
        {analysisData.poiHtmlFiles.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50 rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {t("analysisResults.interactivePOIAnalysis")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("analysisResults.individualNetworkAnalysis")}</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                  <div className="flex gap-4 p-4">
                    {analysisData.poiHtmlFiles.map((poiFile, index) => (
                      <div
                        key={index}
                        className="flex-shrink-0 cursor-pointer group relative"
                        onClick={() => openPOIModal(poiFile, index)}
                      >
                        <div className="relative w-64 h-40 rounded-lg overflow-hidden border shadow-md hover:shadow-lg transition-all transform hover:scale-105">
                          {poiFile.pngUrl ? (
                            <div className="relative h-full">
                              <img src={poiFile.pngUrl} alt={poiFile.title} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-sm font-medium text-white truncate">{poiFile.title}</p>
                                <p className="text-xs text-white/80 mt-1">Click to view interactive graph</p>
                              </div>
                              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="h-8 w-8 text-white drop-shadow-lg" />
                              </div>
                            </div>
                          ) : (
                            <div className="h-full bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50 p-4 flex flex-col justify-center items-center">
                              <Eye className="h-8 w-8 text-violet-600 dark:text-violet-400 mb-2" />
                              <h4 className="text-sm font-medium text-center text-violet-800 dark:text-violet-200">
                                {poiFile.title}
                              </h4>
                              <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                                Click to view interactive graph
                              </p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center truncate font-medium w-64">
                          {poiFile.name.replace("name_", "").replace(".html", "").replace(/_/g, " ")}
                        </p>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ego Network Images (Fallback) */}
        {analysisData.egoImages.length > 0 && analysisData.poiHtmlFiles.length === 0 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Network Analysis Visualizations
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Individual ego networks showing relationship patterns for each person of interest.
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <div className="flex gap-4 p-4">
                  {analysisData.egoImages.map((image, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 cursor-pointer group relative"
                      onClick={() => openLightbox(index)}
                    >
                      <div className="relative w-48 h-32 bg-muted rounded-lg overflow-hidden border shadow-md hover:shadow-lg transition-all transform hover:scale-105">
                        <img
                          src={image.url}
                          alt={`Ego network for ${image.name}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center truncate font-medium w-48">
                        {image.name.replace("ego_", "").replace(".png", "")}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* File Analysis Summary */}
        {analysisData.fileSummaries.length > 0 && (
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-t-lg">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("analysisResults.fileAnalysisSummary")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("analysisResults.fileAnalysisSummaryDesc")}</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {analysisData.fileSummaries.map((summary, index) => (
                  <Collapsible
                    key={index}
                    open={expandedSummaries.has(index)}
                    onOpenChange={() => toggleSummary(index)}
                  >
                    <div className="border rounded-lg p-4 bg-gradient-to-r from-muted/30 to-muted/50 hover:from-muted/50 hover:to-muted/70 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h4 className="font-semibold text-sm flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="text-muted-foreground text-xs font-medium">{index + 1}.</span>
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-muted-foreground">{t("analysisResults.originalFile")}:</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-primary font-mono cursor-default">
                                  {truncateFileName(summary.originalFile, 30)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{summary.originalFile}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-1 hover:bg-primary/10"
                            onClick={async () => {
                              // Find matching file by name (with flexible matching)
                              const file = files.find(
                                (f) =>
                                  f.file_name === summary.originalFile ||
                                  f.file_name.replace(/\s+/g, "_") === summary.originalFile ||
                                  summary.originalFile.replace(/\s+/g, "_") === f.file_name,
                              );

                              if (file) {
                                try {
                                  // Get current user and construct path like CaseDetail does
                                  const {
                                    data: { user },
                                    error: authError,
                                  } = await supabase.auth.getUser();
                                  if (authError || !user) {
                                    throw new Error("Authentication required");
                                  }

                                  // Construct path: userId/caseId/filename
                                  const filePath = `${user.id}/${id}/${file.file_name}`;

                                  const { data: signedData, error } = await supabase.storage
                                    .from("case-files")
                                    .createSignedUrl(filePath, 3600);

                                  if (signedData?.signedUrl) {
                                    setPreviewFile({ name: summary.originalFile, url: signedData.signedUrl });
                                  } else {
                                    throw new Error(error?.message || "Failed to generate signed URL");
                                  }
                                } catch (error) {
                                  console.error("Preview error:", error);
                                  toast({
                                    title: "Preview not available",
                                    description: "Could not load file",
                                    variant: "destructive",
                                  });
                                }
                              } else {
                                toast({
                                  title: "Preview not available",
                                  description: "Source file not found in case files",
                                  variant: "destructive",
                                });
                              }
                            }}
                            title="Preview file"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </h4>
                        {summary.summaryFile && (
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-muted-foreground hover:text-foreground"
                            >
                              <span className="text-xs">{t("actions.viewSummary")}</span>
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 transition-transform duration-200",
                                  expandedSummaries.has(index) && "rotate-180",
                                )}
                              />
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {summary.rawTransactionsFile && (
                          <div className="flex items-center gap-2 text-sm bg-blue-50 dark:bg-blue-950/30 px-3 py-2 rounded-lg">
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            <span className="text-muted-foreground">{t("analysisResults.rawTransactions")}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadIndividualFile(summary.rawTransactionsFile!)}
                              className="h-7 gap-1.5"
                            >
                              <Download className="h-3 w-3" />
                              {t("analysisResults.download")}
                            </Button>
                          </div>
                        )}
                        {summary.summaryFile && (
                          <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            <span className="text-muted-foreground">{t("analysisResults.summary")}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadIndividualFile(summary.summaryFile!)}
                              className="h-7 gap-1.5"
                            >
                              <Download className="h-3 w-3" />
                              {t("analysisResults.download")}
                            </Button>
                          </div>
                        )}
                        {summary.sankeyHtml && (
                          <div className="flex items-center gap-2 text-sm bg-violet-50 dark:bg-violet-950/30 px-3 py-2 rounded-lg">
                            <div className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0"></div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Find the index among files that have sankey graphs
                                const filesWithSankey = analysisData.fileSummaries.filter((s) => s.sankeyHtml);
                                const sankeyIndex = filesWithSankey.findIndex(
                                  (s) => s.originalFile === summary.originalFile,
                                );
                                setCurrentFileSankeyIndex(sankeyIndex >= 0 ? sankeyIndex : 0);
                                setFileSankeyModalOpen(true);
                              }}
                              className="h-7 gap-1.5 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/50"
                            >
                              <BarChart3 className="h-3 w-3" />
                              {t("analysisResults.graph")}
                            </Button>
                          </div>
                        )}
                        {(() => {
                          // Check if this file has batch trace data
                          const baseName = summary.originalFile.replace(/\.(pdf|csv|xlsx?)$/i, "");
                          const fileIdx = analysisData.fundTracesData?.file_index;
                          const hasTraces = fileIdx && Object.keys(fileIdx).some((key) => {
                            const keyBase = key.replace(/\.(pdf|csv|xlsx?)$/i, "");
                            return keyBase.toLowerCase() === baseName.toLowerCase();
                          });
                          if (!hasTraces || !analysisData.fundTracesData) return null;
                          const matchedKey = Object.keys(fileIdx!).find((key) => {
                            const keyBase = key.replace(/\.(pdf|csv|xlsx?)$/i, "");
                            return keyBase.toLowerCase() === baseName.toLowerCase();
                          });
                          return (
                            <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">
                              <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setBatchTraceInitialFile(matchedKey);
                                  setBatchTraceModalOpen(true);
                                }}
                                className="h-7 gap-1.5 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                              >
                                <GitBranch className="h-3 w-3" />
                                Transaction Tree
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    {summary.summaryFile && (
                      <CollapsibleContent className="pt-4 px-1">
                        <LazySummaryTableViewer
                          summaryFileName={summary.summaryFile}
                          rawTransactionsFileName={summary.rawTransactionsFile}
                          zipData={analysisData.zipData || null}
                          isExpanded={expandedSummaries.has(index)}
                          cachedData={analysisData.summaryDataMap.get(summary.summaryFile)}
                          onCacheData={(fileName, data) => {
                            analysisData.summaryDataMap.set(fileName, data);
                          }}
                          onLoadRawData={
                            summary.rawTransactionsFile
                              ? () => loadRawTransactionsData(summary.rawTransactionsFile!)
                              : undefined
                          }
                          onSaveGroupingOverride={handleSaveGroupingOverride}
                          pendingOverrides={
                            groupingOverrides.individual[
                              summary.summaryFile.replace(/^summary_/i, "").replace(/\.xlsx$/i, "")
                            ] || {}
                          }
                          fundTracesData={analysisData.fundTracesData || null}
                          caseId={id}
                        />
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        images={analysisData.egoImages}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        initialIndex={lightboxIndex}
      />

      {/* POI Modal */}
      <POIModal
        isOpen={poiModalOpen}
        onClose={() => setPOIModalOpen(false)}
        poi={selectedPOI}
        onDownloadHtml={() => selectedPOI && downloadIndividualFile(selectedPOI.name)}
        onDownloadPng={downloadPOIPng}
        onNext={navigateToNextPOI}
        onPrevious={navigateToPreviousPOI}
        currentIndex={currentPOIIndex}
        totalCount={analysisData?.poiHtmlFiles.length || 0}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        fileName={previewFile?.name || ""}
        fileUrl={previewFile?.url || ""}
        onDownload={() => {
          if (previewFile?.url) {
            const link = document.createElement("a");
            link.href = previewFile.url;
            link.download = previewFile.name;
            link.click();
            toast({ title: `Downloading ${previewFile.name}` });
          }
        }}
      />

      {/* Per-File Sankey Modal */}
      {(() => {
        const filesWithSankey = analysisData.fileSummaries.filter((s) => s.sankeyHtml);
        const currentSankey = filesWithSankey[currentFileSankeyIndex];

        if (!currentSankey) return null;

        return (
          <FileSankeyModal
            isOpen={fileSankeyModalOpen}
            onClose={() => setFileSankeyModalOpen(false)}
            fileName={currentSankey.originalFile}
            htmlContent={currentSankey.sankeyHtml!}
            onDownload={() => {
              if (currentSankey.sankeyHtml) {
                const blob = new Blob([currentSankey.sankeyHtml], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                handleDownload(url, `sankey_${currentSankey.originalFile.replace(/\.[^/.]+$/, "")}.html`);
                toast({ title: `Downloading sankey graph` });
              }
            }}
            onPrevious={currentFileSankeyIndex > 0 ? () => setCurrentFileSankeyIndex((prev) => prev - 1) : undefined}
            onNext={
              currentFileSankeyIndex < filesWithSankey.length - 1
                ? () => setCurrentFileSankeyIndex((prev) => prev + 1)
                : undefined
            }
            currentIndex={currentFileSankeyIndex}
            totalCount={filesWithSankey.length}
          />
        );
      })()}

      {/* Share Fund Trail Dialog */}
      {analysisData.fundTrailHtml && (
        <ShareFundTrailDialog
          open={shareFundTrailOpen}
          onOpenChange={setShareFundTrailOpen}
          caseId={id!}
          fundTrailHtml={analysisData.fundTrailHtml}
        />
      )}

      {/* Share Individual Graph Dialog */}
      {shareGraphHtml && (
        <ShareFundTrailDialog
          open={shareGraphOpen}
          onOpenChange={(open) => {
            setShareGraphOpen(open);
            if (!open) setShareGraphHtml("");
          }}
          caseId={id!}
          fundTrailHtml={shareGraphHtml}
        />
      )}

      {/* Apply Changes Dialog */}
      <ApplyChangesDialog
        open={applyChangesOpen}
        onClose={() => setApplyChangesOpen(false)}
        overrides={groupingOverrides}
        onRemoveChange={handleRemoveChange}
        onApply={handleApplyChanges}
        isApplying={isApplyingChanges}
      />

      {/* PDF Report Preview Modal */}
      {reportPdfUrl && (
        <FilePreviewModal
          isOpen={reportPreviewOpen}
          onClose={() => setReportPreviewOpen(false)}
          fileName={`case_report_${case_?.name || "report"}.pdf`}
          fileUrl={reportPdfUrl}
          onDownload={downloadPdfReport}
        />
      )}

      {/* Batch Trace Modal */}
      {analysisData.fundTracesData && (
        <BatchTraceModal
          open={batchTraceModalOpen}
          onClose={() => setBatchTraceModalOpen(false)}
          batchData={analysisData.fundTracesData}
          initialFile={batchTraceInitialFile}
        />
      )}
    </>
  );
}
