
import { useEffect, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getCases, updateCaseStatus, addFiles, addEvent, type CaseRecord } from "@/api/cases";
import { toast } from "@/hooks/use-toast";
import StatusBadge from "@/components/app/StatusBadge";
import { Upload } from "lucide-react";

export default function AdminCases() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      const data = await getCases();
      setCases(data);
    } catch (error) {
      console.error("Failed to load cases:", error);
      toast({ title: "Failed to load cases", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAttachResult = async (caseId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip";
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        // Add result file
        await addFiles(caseId, [{ name: file.name }]);
        
        // Update case status to Ready
        await updateCaseStatus(caseId, "Ready");
        
        // Add analysis_ready event
        await addEvent(caseId, "analysis_ready", { 
          result_file: file.name,
          completed_at: new Date().toISOString()
        });

        toast({ title: "Result attached successfully" });
        loadCases(); // Refresh the list
      } catch (error) {
        console.error("Failed to attach result:", error);
        toast({ title: "Failed to attach result", variant: "destructive" });
      }
    };

    input.click();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Admin Notice Banner */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> Admin-only page (stub for future permissions)
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin - All Cases</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cases Management</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading cases...</div>
            ) : cases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No cases pending.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((case_) => (
                    <TableRow key={case_.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: case_.color_hex }}
                          />
                          <span className="font-medium">{case_.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={case_.status} />
                      </TableCell>
                      <TableCell>
                        {new Date(case_.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAttachResult(case_.id)}
                          disabled={case_.status === "Ready"}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Attach Result ZIP
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
