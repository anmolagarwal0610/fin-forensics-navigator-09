import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getCaseById, getCaseFiles, getCaseEvents, deleteCase, type CaseRecord, type CaseFileRecord, type EventRecord } from "@/api/cases";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import StatusBadge from "@/components/app/StatusBadge";
import { ArrowLeft, FileText, Clock, CheckCircle, Upload, Trash2, Download } from "lucide-react";
import DocumentHead from "@/components/common/DocumentHead";
import DeleteCaseModal from "@/components/modals/DeleteCaseModal";
import CaseStatusMessage from "@/components/app/CaseStatusMessage";
export default function CaseDetail() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const [case_, setCase] = useState<CaseRecord | null>(null);
  const [files, setFiles] = useState<CaseFileRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  useEffect(() => {
    if (!id) return;
    Promise.all([getCaseById(id), getCaseFiles(id), getCaseEvents(id)]).then(([caseData, filesData, eventsData]) => {
      if (!caseData) {
        navigate("/app/dashboard");
        return;
      }
      setCase(caseData);
      setFiles(filesData);
      setEvents(eventsData);
    }).catch(error => {
      console.error("Failed to load case:", error);
      toast({
        title: "Failed to load case",
        variant: "destructive"
      });
      navigate("/app/dashboard");
    }).finally(() => setLoading(false));
  }, [id, navigate]);
  const getEventIcon = (type: EventRecord['type']) => {
    switch (type) {
      case 'created':
        return <CheckCircle className="h-4 w-4" />;
      case 'files_uploaded':
        return <Upload className="h-4 w-4" />;
      case 'analysis_submitted':
        return <Clock className="h-4 w-4" />;
      case 'analysis_ready':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  const getEventTitle = (type: EventRecord['type']) => {
    switch (type) {
      case 'created':
        return 'Case Created';
      case 'files_uploaded':
        return 'Files Uploaded';
      case 'analysis_submitted':
        return 'Analysis Started';
      case 'analysis_ready':
        return 'Results Ready';
      case 'note_added':
        return 'Note Added';
      default:
        return type;
    }
  };
  const handleDeleteCase = async () => {
    if (!case_) return;
    try {
      await deleteCase(case_.id);
      toast({
        title: "Case deleted successfully"
      });
      navigate("/app/dashboard");
    } catch (error) {
      console.error("Failed to delete case:", error);
      toast({
        title: "Failed to delete case",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadFile = async (file: CaseFileRecord) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Authentication required");
      }

      // Extract the storage path from the file URL or use a constructed path
      const filePath = `${user.id}/${case_?.id}/${file.file_name}`;
      
      const { data, error } = await supabase.storage
        .from('case-files')
        .download(filePath);
      
      if (error) {
        throw new Error(`Failed to download file: ${error.message}`);
      }

      // Create a download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "File downloaded successfully"
      });
    } catch (error) {
      console.error("Failed to download file:", error);
      toast({
        title: "Failed to download file",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive"
      });
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
  return <>
      <DocumentHead title={`${case_.name} - FinNavigator`} />
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/app/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Case Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="inline-block h-4 w-4 rounded-full" style={{
            backgroundColor: case_.color_hex
          }} />
            <h1 className="text-2xl font-semibold">{case_.name}</h1>
            <StatusBadge status={case_.status} />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="opacity-60 hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Case</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {case_.description && <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">{case_.description}</p>
            </CardContent>
          </Card>}

        {/* Tags */}
        {case_.tags && case_.tags.length > 0 && <div className="flex flex-wrap gap-2">
            {case_.tags.map(tag => <Badge key={tag} variant="outline">
                {tag}
              </Badge>)}
          </div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Files */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Files ({files.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="mb-2">No files uploaded yet.</p>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/app/cases/${case_.id}/upload`)}>
                    Upload Files
                  </Button>
                </div> : <div className="space-y-2">
                  {files.map(file => <div key={file.id} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{file.file_name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadFile(file)}
                        className="h-8 px-3"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>)}
                </div>}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No events yet.</p>
                </div> : <div className="space-y-4">
                  {events.map(event => <div key={event.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {getEventTitle(event.type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </div>

        {/* Status-specific Messages */}
        {(case_.status === 'Failed' || case_.status === 'Timeout') && <CaseStatusMessage status={case_.status} onRetry={() => navigate(`/app/cases/${case_.id}/upload`)} onContactSupport={() => window.open('mailto:support@finnavigator.com?subject=Case Analysis Issue&body=Case ID: ' + case_.id, '_blank')} />}

        {/* Results Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            {case_.status === 'Ready' ? <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success" />
                <p className="font-medium mb-2">Analysis Complete</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Results are ready for review.
                </p>
                <Button disabled={!case_.result_zip_url} onClick={() => case_.result_zip_url && navigate(`/app/cases/${case_.id}/results`)}>
                  {case_.result_zip_url ? 'View Results' : 'View Results (Coming Soon)'}
                </Button>
              </div> : case_.status === 'Failed' || case_.status === 'Timeout' ? <div className="text-center py-8 text-muted-foreground">
                <p>Analysis encountered an issue. See the message above for details.</p>
              </div> : <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Results will appear here once analysis is complete.</p>
              </div>}
          </CardContent>
        </Card>
      </div>
      
      <DeleteCaseModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteCase} caseName={case_.name} />
    </>;
}