import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateCaseStatus, addFiles, addEvent } from "@/api/cases";
import { toast } from "@/hooks/use-toast";
import StatusBadge from "@/components/app/StatusBadge";
import { Upload, Users } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAdminCases } from "@/hooks/useAdminCases";
import AdminUsers from "./AdminUsers";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCases() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { data: cases, isLoading, refetch } = useAdminCases();

  useEffect(() => {
    if (adminLoading) return;

    if (!isAdmin) {
      toast({ title: "Admins only", description: "You are not authorized to access this page.", variant: "destructive" });
      navigate("/app/dashboard", { replace: true });
      return;
    }
  }, [adminLoading, isAdmin, navigate]);

  const handleAttachResult = async (caseId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Basic client-side validation: type and size (<= 50MB)
      const isZipByName = /\.zip$/i.test(file.name);
      const isZipByMime = (file.type || "").includes("zip");
      const MAX_SIZE_BYTES = 50 * 1024 * 1024;

      if (!isZipByName && !isZipByMime) {
        toast({ title: "Invalid file type", description: "Please upload a .zip file.", variant: "destructive" });
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast({ title: "File too large", description: "ZIP must be 50MB or less.", variant: "destructive" });
        return;
      }

      try {
        // Add result file metadata (no storage upload in this app)
        await addFiles(caseId, [{ name: file.name }]);

        // Update case status to Ready
        await updateCaseStatus(caseId, "Ready");

        // Add analysis_ready event
        await addEvent(caseId, "analysis_ready", {
          result_file: file.name,
          completed_at: new Date().toISOString(),
        });

        toast({ title: "Result attached successfully" });
        refetch(); // Refresh the list
      } catch (error) {
        console.error("Failed to attach result:", error);
        toast({ title: "Failed to attach result", variant: "destructive" });
      }
    };

    input.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="pt-6">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> Admin-only page
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="cases" className="space-y-6">
        <TabsList>
          <TabsTrigger value="cases">Cases</TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-6">
          <h1 className="text-2xl font-semibold">Admin - All Cases</h1>
          
          {adminLoading ? (
            <Card><CardContent className="p-6">Checking permissions…</CardContent></Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Cases Management</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : !cases || cases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No cases yet.</div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Case Name</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cases.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: c.color_hex }}
                              />
                              <span className="font-medium">{c.name}</span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{c.user_name}</p>
                                <p className="text-xs text-muted-foreground">{c.organization}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{c.user_email}</TableCell>
                            <TableCell>
                              <StatusBadge status={c.status as any} />
                            </TableCell>
                            <TableCell>
                              {new Date(c.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAttachResult(c.id)}
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                {c.result_zip_url ? "Replace Result ZIP" : "Attach Result ZIP"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users">
          <AdminUsers />
        </TabsContent>
      </Tabs>
    </div>
  );
}
