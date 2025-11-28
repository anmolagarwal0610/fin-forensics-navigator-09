import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCaseById, getCaseCsvFiles, updateCsvFile, type CaseRecord, type CaseCsvFileRecord } from "@/api/cases";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Upload, Check, FileText, Eye, Loader2 } from "lucide-react";
import FilePreviewModal from "@/components/app/FilePreviewModal";

export default function CaseReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [case_, setCase] = useState<CaseRecord | null>(null);
  const [csvFiles, setCsvFiles] = useState<CaseCsvFileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ name: string; url: string } | null>(null);
  const [processingStatus, setProcessingStatus] = useState<{
    active: boolean;
    message: string;
  }>({ active: false, message: '' });

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const caseData = await getCaseById(id);
        if (!caseData) {
          navigate("/app/dashboard");
          return;
        }
        setCase(caseData);

        const files = await getCaseCsvFiles(id);
        setCsvFiles(files);
      } catch (error) {
        console.error("Failed to load data:", error);
        toast({ title: "Failed to load data", variant: "destructive" });
        navigate("/app/dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const handleDownloadCsv = async (csvFile: CaseCsvFileRecord) => {
    try {
      const url = csvFile.is_corrected && csvFile.corrected_csv_url
        ? csvFile.corrected_csv_url
        : csvFile.original_csv_url;

      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = csvFile.pdf_file_name.replace('.pdf', '.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({ title: "Download started" });
    } catch (error) {
      console.error("Download error:", error);
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleUploadCorrected = async (csvFile: CaseCsvFileRecord, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !case_) return;

    if (!file.name.endsWith('.csv')) {
      toast({ title: "Please upload a CSV file", variant: "destructive" });
      return;
    }

    setUploadingFor(csvFile.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload corrected CSV to storage
      const correctedPath = `${user.id}/${case_.id}/csv/corrected/${csvFile.pdf_file_name.replace('.pdf', '.csv')}`;
      const { error: uploadError } = await supabase.storage
        .from('case-files')
        .upload(correctedPath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Generate signed URL
      const { data: signedData, error: signedError } = await supabase.storage
        .from('case-files')
        .createSignedUrl(correctedPath, 86400); // 24 hours

      if (signedError || !signedData) throw new Error("Failed to generate signed URL");

      // Update database record
      await updateCsvFile(csvFile.id, signedData.signedUrl);

      // Update local state
      setCsvFiles(prev => prev.map(f => 
        f.id === csvFile.id 
          ? { ...f, is_corrected: true, corrected_csv_url: signedData.signedUrl }
          : f
      ));

      toast({ title: "Corrected file uploaded successfully" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingFor(null);
    }
  };

  const handlePreviewCsv = async (csvFile: CaseCsvFileRecord) => {
    try {
      const url = csvFile.is_corrected && csvFile.corrected_csv_url
        ? csvFile.corrected_csv_url
        : csvFile.original_csv_url;

      setPreviewFile({ 
        name: csvFile.pdf_file_name.replace('.pdf', '.csv'), 
        url 
      });
    } catch (error) {
      console.error("Preview error:", error);
      toast({ title: "Preview failed", variant: "destructive" });
    }
  };

  const handleProceedToFinalAnalysis = async () => {
    if (!case_) return;

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Calculate if any changes were made
      const changesMade = csvFiles.some(f => f.is_corrected);

      // Add review completion event
      const { addEvent } = await import('@/api/cases');
      await addEvent(case_.id, "analysis_submitted", {
        stage: 'review_completed',
        changes_made: changesMade,
        corrected_files: csvFiles.filter(f => f.is_corrected).length,
        total_files: csvFiles.length
      });

      // Download CSV files (corrected or original)
      const csvFilesToProcess: File[] = [];
      
      for (const csvFile of csvFiles) {
        const url = csvFile.is_corrected && csvFile.corrected_csv_url
          ? csvFile.corrected_csv_url
          : csvFile.original_csv_url;
        
        const response = await fetch(url);
        const blob = await response.blob();
        const fileName = csvFile.pdf_file_name.replace('.pdf', '.csv');
        const file = new File([blob], fileName, { type: 'text/csv' });
        csvFilesToProcess.push(file);
      }

      console.log(`Processing ${csvFilesToProcess.length} CSV files for final analysis`);

      // Import the startJobFlow function
      const { startJobFlow } = await import('@/hooks/useStartJob');

      // Start final-analysis job with Realtime tracking (sends ZIP URL)
      await startJobFlow(
        csvFilesToProcess,
        'final-analysis',
        case_.id,
        user.id,
        [], // No passwords for CSV files
        (job) => {
          console.log('Final analysis job update:', job);
        },
        (finalJob) => {
          setProcessing(false);
          if (finalJob.status === 'SUCCEEDED') {
            toast({
              title: "Final analysis complete!",
              description: "Results are ready."
            });
            navigate("/app/dashboard");
          } else if (finalJob.status === 'FAILED') {
            toast({
              title: "Final analysis failed",
              description: finalJob.error || "Please try again.",
              variant: "destructive"
            });
          }
        },
        true  // Skip inserting CSV files into case_files table
      );

      toast({ 
        title: "Starting final analysis...",
        description: "You'll be notified when complete via Realtime updates."
      });

    } catch (error) {
      console.error("Failed to start final analysis:", error);
      toast({
        title: "Failed to start final analysis",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
      setProcessing(false);
    }
  };

  if (loading || processingStatus.active) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-accent" />
          <div className="text-lg font-medium">
            {processingStatus.active ? processingStatus.message : 'Loading review data...'}
          </div>
          {processingStatus.active && (
            <p className="text-sm text-muted-foreground">
              Please wait while we process your files. Do not close this page.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!case_) return null;

  const allReviewed = csvFiles.every(f => f.is_corrected);
  const correctedCount = csvFiles.filter(f => f.is_corrected).length;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: case_.color_hex }}
          />
          <h1 className="text-2xl font-semibold">{case_.name}</h1>
          <Badge variant="outline">Review Phase</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review Extracted Data</CardTitle>
          <p className="text-sm text-muted-foreground">
            Download each CSV file to review the extracted data. If corrections are needed, upload the fixed version.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Review Progress</p>
              <p className="text-xs text-muted-foreground mt-1">
                {correctedCount > 0 
                  ? `${correctedCount} of ${csvFiles.length} files reviewed`
                  : `${csvFiles.length} files to review`}
              </p>
            </div>
            {allReviewed && (
              <Badge className="bg-success text-success-foreground">
                <Check className="h-3 w-3 mr-1" />
                All Reviewed
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            {csvFiles.map((csvFile) => (
              <Card key={csvFile.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {csvFile.pdf_file_name.replace('.pdf', '.csv')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Source: {csvFile.pdf_file_name}
                      </p>
                    </div>
                    {csvFile.is_corrected && (
                      <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                        <Check className="h-3 w-3 mr-1" />
                        Corrected
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreviewCsv(csvFile)}
                      className="h-8 w-8"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownloadCsv(csvFile)}
                      className="h-8 w-8"
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    <label>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => handleUploadCorrected(csvFile, e)}
                        disabled={uploadingFor === csvFile.id}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={uploadingFor === csvFile.id}
                        asChild
                      >
                        <span>
                          <Upload className="h-4 w-4 mr-1" />
                          {uploadingFor === csvFile.id ? "Uploading..." : "Upload Fixed"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleProceedToFinalAnalysis}
              disabled={processing}
              size="lg"
            >
              {processing ? "Starting..." : "Proceed to Final Analysis"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewFile && (
        <FilePreviewModal
          isOpen={true}
          onClose={() => setPreviewFile(null)}
          fileName={previewFile.name}
          fileUrl={previewFile.url}
          onDownload={() => {
            const csvFile = csvFiles.find(f => f.pdf_file_name.replace('.pdf', '.csv') === previewFile.name);
            if (csvFile) handleDownloadCsv(csvFile);
          }}
        />
      )}
    </div>
  );
}
