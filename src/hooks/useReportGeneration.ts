import { useState, useCallback, useEffect } from "react";
import type { ReportData } from "@/types/reportData";

interface UseReportGenerationOptions {
  reportData: ReportData | null;
  caseName: string;
  caseCreatedDate: string;
  totalFiles: number;
  caseId: string;
  userId: string | undefined;
}

export function useReportGeneration({
  reportData,
  caseName,
  caseCreatedDate,
  totalFiles,
}: UseReportGenerationOptions) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate PDF when reportData becomes available
  useEffect(() => {
    if (!reportData || pdfBlob) return;

    const generate = async () => {
      setIsGenerating(true);
      try {
        // Dynamic import to avoid loading jsPDF until needed
        const { generateCaseReport } = await import("@/lib/reportGenerator");
        const blob = generateCaseReport(reportData, {
          caseName,
          caseCreatedDate,
          totalFiles,
        });
        setPdfBlob(blob);
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        console.log("[Report] ✓ PDF generated successfully");
      } catch (error) {
        console.error("[Report] PDF generation failed:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    // Use requestIdleCallback to avoid blocking the main thread
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => generate());
    } else {
      setTimeout(generate, 100);
    }
  }, [reportData, caseName, caseCreatedDate, totalFiles, pdfBlob]);

  const downloadPdf = useCallback(() => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `case_report_${caseName}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [pdfBlob, caseName]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  return {
    pdfBlob,
    pdfUrl,
    isGenerating,
    downloadPdf,
    isReady: !!pdfBlob,
  };
}
