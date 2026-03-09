import { useState, useCallback, useEffect } from "react";
import type { ReportData } from "@/types/reportData";
import { supabase } from "@/integrations/supabase/client";

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
  caseId,
  userId,
}: UseReportGenerationOptions) {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);

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

  // Upload PDF to backend in background
  useEffect(() => {
    if (!pdfBlob || !caseId || !userId || hasUploaded) return;

    const upload = async () => {
      try {
        const file = new File([pdfBlob], `case_report_${caseName}.pdf`, {
          type: "application/pdf",
        });

        const formData = new FormData();
        formData.append("file", file);
        formData.append("case_id", caseId);
        formData.append("user_id", userId);
        formData.append("file_type", "case_report_pdf");

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/upload-result-file`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
          },
        );

        if (response.ok) {
          console.log("[Report] ✓ PDF uploaded to backend");
          setHasUploaded(true);
        } else {
          console.warn("[Report] PDF upload failed:", response.status);
        }
      } catch (error) {
        console.warn("[Report] PDF upload error:", error);
      }
    };

    upload();
  }, [pdfBlob, caseId, userId, caseName, hasUploaded]);

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
