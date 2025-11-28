import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import FileUploader from "@/components/app/FileUploader";
import { getCaseById, addFiles, addEvent, updateCaseStatus, type CaseRecord } from "@/api/cases";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { ArrowLeft, Info, AlertCircle, Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface FileItem {
  name: string;
  size: number;
  file: File;
  pageCount?: number;
  isCountingPages?: boolean;
  needsPassword?: boolean;
  isDecrypting?: boolean;
}

export default function CaseUpload() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [case_, setCase] = useState<CaseRecord | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [useHitl, setUseHitl] = useState(true);
  const { hasAccess, pagesRemaining, loading: subLoading } = useSubscription();

  // Calculate total pages from files
  const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 0), 0);
  const allPagesCounted = files.every(f => !f.isCountingPages && f.pageCount !== undefined);
  const hasLockedFiles = files.some(f => f.needsPassword);
  const canSubmit = files.length > 0 && allPagesCounted && hasAccess && totalPages <= pagesRemaining && !hasLockedFiles;
  useEffect(() => {
    if (!id) return;
    getCaseById(id).then(data => {
      if (!data) {
        navigate("/app/dashboard");
        return;
      }
      setCase(data);
    }).catch(error => {
      console.error("Failed to load case:", error);
      toast({
        title: "Failed to load case",
        variant: "destructive"
      });
      navigate("/app/dashboard");
    }).finally(() => setLoading(false));
  }, [id, navigate]);
  const handleStartAnalysis = async () => {
    if (!case_ || files.length === 0 || !canSubmit) return;

    // Check if we have enough pages
    if (totalPages > pagesRemaining) {
      toast({
        title: "Insufficient Pages",
        description: `You need ${totalPages} pages but only have ${pagesRemaining} remaining. Upgrade to continue.`,
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Authentication required");
      }

      // 🔥 Track page usage IMMEDIATELY before starting job
      const { error: trackingError } = await supabase.rpc('track_page_usage', {
        p_user_id: user.id,
        p_pages_processed: totalPages
      });

      if (trackingError) {
        console.error('Failed to track page usage:', trackingError);
        throw new Error('Failed to update page usage. Please try again.');
      }

      console.log(`✅ Tracked ${totalPages} pages for user ${user.id}`);

      // Convert FileItem[] to File[]
      const uploadFiles = files.map(f => f.file);
      
      // Determine task type based on HITL mode
      const task = useHitl ? 'initial-parse' : 'parse-statements';

      // Import the startJobFlow function
      const { startJobFlow } = await import('@/hooks/useStartJob');
      
      // Start job flow with Realtime tracking (now sends ZIP URL)
      const { job_id } = await startJobFlow(
        uploadFiles,
        task,
        case_.id,
        user.id,
        (job) => {
          console.log('Job update:', job);
        },
        async (finalJob) => {
          console.log('Job completed:', finalJob);
          if (finalJob.status === 'SUCCEEDED') {
            toast({
              title: "Analysis complete!",
              description: useHitl 
                ? "Review the extracted data." 
                : "Results are ready."
            });
            if (useHitl) {
              navigate(`/app/cases/${case_.id}/review`);
            } else {
              navigate("/app/dashboard");
            }
          } else if (finalJob.status === 'FAILED') {
            toast({
              title: "Analysis failed",
              description: finalJob.error || "Please try again.",
              variant: "destructive"
            });
          }
        }
      );

      // Add event for tracking with page count
      await addEvent(case_.id, "analysis_submitted", {
        job_id,
        mode: useHitl ? 'hitl' : 'direct',
        task,
        file_count: files.length,
        pages_processed: totalPages
      });

      toast({
        title: "Analysis started!",
        description: `Processing ${totalPages} pages. Job ID: ${job_id.slice(0, 8)}...`
      });

      // Navigate to dashboard immediately
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
    return <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading case...</div>
        </div>
      </div>;
  }
  if (!case_) {
    return null;
  }
  return <div className="space-y-6">
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{
          backgroundColor: case_.color_hex
        }} />
          <h1 className="text-2xl font-semibold">{case_.name}</h1>
        </div>
      </div>

      {!hasAccess && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Subscription Limit Reached</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              You have {pagesRemaining} pages remaining. Upgrade your plan to start analysis.
            </span>
            <Button asChild size="sm" className="ml-4">
              <Link to="/pricing">
                <Zap className="mr-2 h-4 w-4" />
                Upgrade Now
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files for Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="hitl-mode" className="text-base font-medium cursor-pointer">HITL (Human-In-The-Loop) Flow</Label>
                <p className="text-sm text-muted-foreground">
                  {useHitl ? "Review and correct extracted data before final analysis" : "Direct analysis without review step"}
                </p>
              </div>
            </div>
            <Switch id="hitl-mode" checked={useHitl} onCheckedChange={setUseHitl} disabled={submitting} />
          </div>

          <FileUploader files={files} onFilesChange={setFiles} />

          {files.length > 0 && (
            <Alert className={totalPages > pagesRemaining ? 'border-destructive' : 'border-emerald-500'}>
              <Info className="h-4 w-4" />
              <AlertTitle>Page Summary</AlertTitle>
              <AlertDescription>
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between">
                    <span>Total pages to process:</span>
                    <span className="font-semibold">{totalPages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pages remaining in plan:</span>
                    <span className={totalPages > pagesRemaining ? 'text-destructive font-semibold' : 'font-semibold'}>
                      {pagesRemaining}
                    </span>
                  </div>
                  {!allPagesCounted && (
                    <p className="text-sm text-muted-foreground mt-2">
                      ⏳ Counting pages...
                    </p>
                  )}
                  {hasLockedFiles && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                      🔒 Some files are password-protected. Please unlock them to continue.
                    </p>
                  )}
                  {totalPages > pagesRemaining && (
                    <p className="text-sm text-destructive mt-2">
                      ⚠️ Insufficient pages. Please upgrade or remove files.
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {files.length === 0 ? <div className="text-center py-8 text-muted-foreground">
              <p>No files uploaded yet.</p>
              <p className="text-sm mt-1">Upload files to begin analysis</p>
            </div> : <div className="flex justify-end">
              <Button 
                onClick={handleStartAnalysis} 
                disabled={!canSubmit || submitting} 
                size="lg"
              >
                {submitting ? "Submitting..." : 
                 !allPagesCounted ? "Counting pages..." :
                 useHitl ? "Start Initial Parse" : "Start Analysis"}
              </Button>
            </div>}
        </CardContent>
      </Card>
    </div>;
}