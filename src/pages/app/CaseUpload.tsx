import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FileUploader from "@/components/app/FileUploader";
import { getCaseById, addFiles, addEvent, updateCaseStatus, type CaseRecord } from "@/api/cases";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

interface FileItem {
  name: string;
  size: number;
  file: File;
}

export default function CaseUpload() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [case_, setCase] = useState<CaseRecord | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    getCaseById(id)
      .then((data) => {
        if (!data) {
          navigate("/app/dashboard");
          return;
        }
        setCase(data);
      })
      .catch((error) => {
        console.error("Failed to load case:", error);
        toast({ title: "Failed to load case", variant: "destructive" });
        navigate("/app/dashboard");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleStartAnalysis = async () => {
    if (!case_ || files.length === 0) return;

    setSubmitting(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Authentication required");
      }
      console.log('User authenticated for upload:', user.id);

      // Upload files to Supabase storage
      const uploadedFiles = [];
      for (const file of files) {
        const filePath = `${user.id}/${case_.id}/${file.name}`;
        console.log('Uploading to storage path:', filePath, 'size:', file.size);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('case-files')
          .upload(filePath, file.file);
        
        if (uploadError) {
          console.error('Upload error for', file.name, uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }
        console.log('Upload success:', uploadData);
        
        const { data: urlData } = supabase.storage
          .from('case-files')
          .getPublicUrl(filePath);
        console.log('Public URL (may require auth if bucket is private):', urlData.publicUrl);
        
        uploadedFiles.push({
          name: file.name,
          url: urlData.publicUrl
        });
      }

      // Add files to database with storage URLs
      const inserted = await addFiles(case_.id, uploadedFiles.map(f => ({ 
        name: f.name, 
        url: f.url 
      })));
      console.log('Inserted case_files records:', inserted?.length);
      
      // Add files_uploaded event
      await addEvent(case_.id, "files_uploaded", {
        file_count: files.length,
        files: files.map(f => ({ name: f.name, size: f.size }))
      });
      console.log('Event logged: files_uploaded');
      
      // Add analysis_submitted event
      await addEvent(case_.id, "analysis_submitted", {
        submitted_at: new Date().toISOString(),
        file_count: files.length
      });
      console.log('Event logged: analysis_submitted');

      // Update case status to Processing
      await updateCaseStatus(case_.id, "Processing");
      console.log('Case status updated to Processing');
      
      // Small delay to avoid race conditions with DB commits
      await new Promise((res) => setTimeout(res, 1200));
      console.log('Invoking edge function process-case-files with caseId:', case_.id);
      const { data: processResult, error: processError } = await supabase.functions
        .invoke('process-case-files', {
          body: { caseId: case_.id }
        });
      console.log('Edge function result:', processResult, 'error:', processError);

      if (processError) {
        console.error("Processing error:", processError);
        toast({
          title: "Processing started with warnings",
          description: "Files uploaded successfully. Processing may take some time.",
        });
      } else {
        toast({
          title: "Analysis started!",
          description: `Uploaded ${files.length} files. Analysis is now in progress.`,
        });
      }
      
      navigate("/app/dashboard");
    } catch (error) {
      console.error("Failed to submit analysis:", error);
      toast({ 
        title: "Failed to submit analysis", 
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading case...</div>
        </div>
      </div>
    );
  }

  if (!case_) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
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
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Files for Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileUploader
            files={files}
            onFilesChange={setFiles}
          />

          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No files uploaded yet.</p>
              <p className="text-sm mt-1">Upload files to begin analysis</p>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button 
                onClick={handleStartAnalysis}
                disabled={submitting}
                size="lg"
              >
                {submitting ? "Submitting..." : "Start Analysis"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
