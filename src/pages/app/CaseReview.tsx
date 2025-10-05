import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCaseById, getCaseCsvFiles, updateCsvFile, type CaseRecord, type CaseCsvFileRecord } from "@/api/cases";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Upload, Check, FileText } from "lucide-react";

export default function CaseReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [case_, setCase] = useState<CaseRecord | null>(null);
  const [csvFiles, setCsvFiles] = useState<CaseCsvFileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

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

  const handleProceedToFinalAnalysis = async () => {
    if (!case_) return;

    setProcessing(true);
    try {
      toast({ title: "Starting final analysis..." });

      const { error } = await supabase.functions.invoke('final-analysis-files', {
        body: { caseId: case_.id }
      });

      if (error) throw error;

      toast({
        title: "Final analysis started!",
        description: "You'll be notified when results are ready."
      });

      navigate("/app/dashboard");
    } catch (error) {
      console.error("Failed to start final analysis:", error);
      toast({
        title: "Failed to start final analysis",
        variant: "destructive"
      });
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading review data...</div>
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
          onClick={() => navigate("/app/dashboard")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
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
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadCsv(csvFile)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
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
    </div>
  );
}
