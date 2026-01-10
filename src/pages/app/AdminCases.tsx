import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AdminPasswordGate from "@/components/auth/AdminPasswordGate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import StatusBadge from "@/components/app/StatusBadge";
import { Download, Link as LinkIcon, Users, Settings, Plus, Trash2, HardDrive } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { StorageDashboard } from "@/components/app/StorageDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCases } from "@/hooks/useAdminCases";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { useUpdateMaintenanceMode } from "@/hooks/useUpdateMaintenanceMode";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminUsers from "./AdminUsers";
import { Skeleton } from "@/components/ui/skeleton";
import UpdateResultUrlDialog from "@/components/app/UpdateResultUrlDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CustomTier {
  id: string;
  name: string;
  pages: number;
  duration: 'monthly' | 'yearly' | 'quarterly' | 'half-yearly' | 'custom';
  customDays?: number;
}

export default function AdminCases() {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { data: cases, isLoading, refetch } = useAdminCases();
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenanceMode();
  const { updateMaintenanceMode, isUpdating } = useUpdateMaintenanceMode();
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    caseId: string;
    caseName: string;
    currentUrl: string | null;
  }>({
    isOpen: false,
    caseId: "",
    caseName: "",
    currentUrl: null,
  });

  // Custom subscription tiers state
  const [customTiers, setCustomTiers] = useState<CustomTier[]>([]);
  const [newTier, setNewTier] = useState<{ name: string; pages: string; duration: 'monthly' | 'yearly' | 'quarterly' | 'half-yearly' | 'custom'; customDays: string }>({ name: '', pages: '', duration: 'monthly', customDays: '' });
  const [loadingTiers, setLoadingTiers] = useState(true);

  // Load custom tiers from app_settings
  useEffect(() => {
    const loadCustomTiers = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'custom_subscription_tiers')
          .single();
        
        if (data && !error) {
          setCustomTiers((data.value as any) || []);
        }
      } catch (err) {
        console.log('No custom tiers configured yet');
      } finally {
        setLoadingTiers(false);
      }
    };
    loadCustomTiers();
  }, []);

  // Save custom tiers
  const saveCustomTiers = async (tiers: CustomTier[]) => {
    try {
      // First try to update
      const { data: existing } = await supabase
        .from('app_settings')
        .select('key')
        .eq('key', 'custom_subscription_tiers')
        .single();
      
      // Convert to JSON-compatible format
      const jsonValue = JSON.parse(JSON.stringify(tiers));
      
      let error;
      if (existing) {
        const result = await supabase
          .from('app_settings')
          .update({ 
            value: jsonValue,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'custom_subscription_tiers');
        error = result.error;
      } else {
        const result = await supabase
          .from('app_settings')
          .insert([{ 
            key: 'custom_subscription_tiers', 
            value: jsonValue,
            updated_at: new Date().toISOString()
          }]);
        error = result.error;
      }
      
      if (error) throw error;
      setCustomTiers(tiers);
      return true;
    } catch (err) {
      console.error('Failed to save custom tiers:', err);
      return false;
    }
  };

  const handleAddTier = async () => {
    if (!newTier.name.trim() || !newTier.pages) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    
    if (newTier.duration === 'custom' && (!newTier.customDays || parseInt(newTier.customDays) <= 0)) {
      toast({ title: "Please enter valid number of days", variant: "destructive" });
      return;
    }
    
    const tier: CustomTier = {
      id: crypto.randomUUID(),
      name: newTier.name.trim(),
      pages: parseInt(newTier.pages),
      duration: newTier.duration,
      ...(newTier.duration === 'custom' && { customDays: parseInt(newTier.customDays) })
    };
    
    const success = await saveCustomTiers([...customTiers, tier]);
    if (success) {
      toast({ title: "Tier added successfully" });
      setNewTier({ name: '', pages: '', duration: 'monthly', customDays: '' });
    } else {
      toast({ title: "Failed to add tier", variant: "destructive" });
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    const filtered = customTiers.filter(t => t.id !== tierId);
    const success = await saveCustomTiers(filtered);
    if (success) {
      toast({ title: "Tier deleted" });
    } else {
      toast({ title: "Failed to delete tier", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (adminLoading) return;

    if (!isAdmin) {
      toast({ title: "Admins only", description: "You are not authorized to access this page.", variant: "destructive" });
      navigate("/app/dashboard", { replace: true });
      return;
    }
  }, [adminLoading, isAdmin, navigate]);

  const handleDownloadInput = async (storagePath: string | null, caseName: string) => {
    try {
      if (!storagePath) {
        toast({ 
          title: "No Files Available", 
          description: "Input files were not stored for this case (uploaded before storage tracking was implemented).",
          variant: "default"
        });
        return;
      }

      console.log('[Admin Download] Raw input_zip_url:', storagePath);
      let pathToSign = storagePath;

      // Handle different URL formats
      if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
        // Try multiple regex patterns for different URL formats
        const patterns = [
          /\/case-files\/([^?]+)/,                    // Standard format
          /\/object\/(?:sign|public)\/case-files\/([^?]+)/, // Sign/public format
          /case-files\/(.+?)(?:\?|$)/                 // Direct bucket path
        ];
        
        let extracted = null;
        for (const pattern of patterns) {
          const match = storagePath.match(pattern);
          if (match && match[1]) {
            extracted = decodeURIComponent(match[1]);
            console.log('[Admin Download] Extracted path using pattern:', pattern, '->', extracted);
            break;
          }
        }
        
        if (extracted) {
          pathToSign = extracted;
        } else {
          // Last resort: try to use the URL directly if it's still valid
          console.warn('[Admin Download] Could not extract path, attempting direct access');
          try {
            const testResponse = await fetch(storagePath, { method: 'HEAD' });
            if (testResponse.ok) {
              window.open(storagePath, '_blank');
              toast({ title: "Opening input ZIP", description: `Downloading files for ${caseName}` });
              return;
            }
          } catch {
            // URL is expired/invalid, continue with error
          }
          
          toast({ 
            title: "Download Unavailable", 
            description: "This file URL has expired and cannot be recovered. The file was uploaded before storage path tracking.",
            variant: "destructive"
          });
          return;
        }
      }

      console.log('[Admin Download] Generating signed URL for path:', pathToSign);
      
      // Generate fresh signed URL from storage path (valid for 1 hour)
      const { data: signedData, error } = await supabase.storage
        .from('case-files')
        .createSignedUrl(pathToSign, 60 * 60);

      if (error || !signedData) {
        console.error('[Admin Download] Signed URL generation failed:', error);
        toast({ title: "Error", description: `Failed to generate download URL: ${error?.message || 'Unknown error'}`, variant: "destructive" });
        return;
      }

      console.log('[Admin Download] Success, opening URL');
      window.open(signedData.signedUrl, '_blank');
      toast({ title: "Opening input ZIP", description: `Downloading files for ${caseName}` });
    } catch (err) {
      console.error('[Admin Download] Error:', err);
      toast({ title: "Error", description: "Download failed", variant: "destructive" });
    }
  };

  const handleUpdateResultUrl = (caseId: string, caseName: string, currentUrl: string | null) => {
    setDialogState({
      isOpen: true,
      caseId,
      caseName,
      currentUrl,
    });
  };

  const handleMaintenanceToggle = (checked: boolean) => {
    if (checked) {
      // Show confirmation dialog when enabling maintenance mode
      setShowMaintenanceDialog(true);
    } else {
      // Disable directly without confirmation
      updateMaintenanceMode(false);
    }
  };

  const confirmEnableMaintenance = () => {
    updateMaintenanceMode(true);
    setShowMaintenanceDialog(false);
  };

  return (
    <AdminPasswordGate>
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
          <TabsTrigger value="storage">
            <HardDrive className="h-4 w-4 mr-2" />
            Storage
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
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
                          <TableHead>Input Files</TableHead>
                          <TableHead>Result URL</TableHead>
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
                              {c.input_zip_url ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadInput(c.input_zip_url!, c.name)}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">No files</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateResultUrl(c.id, c.name, c.result_zip_url)}
                              >
                                <LinkIcon className="mr-2 h-4 w-4" />
                                {c.result_zip_url ? "Update URL" : "Set URL"}
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

        <TabsContent value="storage">
          <StorageDashboard />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <h1 className="text-2xl font-semibold">System Settings</h1>
          
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="maintenance-toggle" className="text-base font-medium cursor-pointer">
                      Maintenance Mode
                    </Label>
                    <Badge variant={isMaintenanceMode ? "error" : "secondary"}>
                      {isMaintenanceMode ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When enabled, users will see a maintenance message and cannot submit files for analysis.
                  </p>
                </div>
                <Switch
                  id="maintenance-toggle"
                  checked={isMaintenanceMode}
                  onCheckedChange={handleMaintenanceToggle}
                  disabled={maintenanceLoading || isUpdating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Custom Subscription Tiers */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Subscription Tiers</CardTitle>
              <CardDescription>
                Define custom subscription tiers with specific page limits and durations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Tier Form */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="font-medium mb-4">Add New Tier</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="tier-name">Tier Name</Label>
                    <Input
                      id="tier-name"
                      placeholder="e.g. Enterprise Plus"
                      value={newTier.name}
                      onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tier-pages">Number of Pages</Label>
                    <Input
                      id="tier-pages"
                      type="number"
                      placeholder="e.g. 50000"
                      value={newTier.pages}
                      onChange={(e) => setNewTier({ ...newTier, pages: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tier-duration">Duration</Label>
                    <Select
                      value={newTier.duration}
                      onValueChange={(value: 'monthly' | 'yearly' | 'quarterly' | 'half-yearly' | 'custom') => setNewTier({ ...newTier, duration: value, customDays: value === 'custom' ? newTier.customDays : '' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly (30 days)</SelectItem>
                        <SelectItem value="quarterly">Quarterly (90 days)</SelectItem>
                        <SelectItem value="half-yearly">Half-Yearly (180 days)</SelectItem>
                        <SelectItem value="yearly">Yearly (365 days)</SelectItem>
                        <SelectItem value="custom">Custom Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newTier.duration === 'custom' && (
                    <div>
                      <Label htmlFor="tier-custom-days">Number of Days</Label>
                      <Input
                        id="tier-custom-days"
                        type="number"
                        placeholder="e.g. 45"
                        value={newTier.customDays}
                        onChange={(e) => setNewTier({ ...newTier, customDays: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="flex items-end">
                    <Button onClick={handleAddTier} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tier
                    </Button>
                  </div>
                </div>
              </div>

              {/* Existing Tiers List */}
              {loadingTiers ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : customTiers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No custom tiers defined yet. Add one above.
                </p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tier Name</TableHead>
                        <TableHead>Pages</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customTiers.map((tier) => (
                        <TableRow key={tier.id}>
                          <TableCell className="font-medium">{tier.name}</TableCell>
                          <TableCell>{tier.pages.toLocaleString()} pages</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {tier.duration === 'monthly' ? '30 days' : 
                               tier.duration === 'quarterly' ? '90 days' : 
                               tier.duration === 'half-yearly' ? '180 days' : 
                               tier.duration === 'yearly' ? '365 days' : 
                               `${tier.customDays} days`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteTier(tier.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* SQL Reference */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">SQL Reference: Update User Pages</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  To manually update a user's page usage in SQL Editor:
                </p>
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
{`-- Update pages used for a specific user
UPDATE profiles 
SET current_period_pages_used = 1000 
WHERE user_id = 'USER_UUID_HERE';

-- Verify the change
SELECT user_id, current_period_pages_used, bonus_pages 
FROM profiles 
WHERE user_id = 'USER_UUID_HERE';`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>

        <UpdateResultUrlDialog
          isOpen={dialogState.isOpen}
          onClose={() => setDialogState({ ...dialogState, isOpen: false })}
          caseId={dialogState.caseId}
          caseName={dialogState.caseName}
          currentUrl={dialogState.currentUrl}
          onSuccess={refetch}
        />

        <AlertDialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enable Maintenance Mode?</AlertDialogTitle>
              <AlertDialogDescription>
                This will affect all users on the platform. When maintenance mode is enabled:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Users will see a maintenance message on the upload page</li>
                  <li>File submission for analysis will be disabled</li>
                  <li>Existing cases will remain accessible</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmEnableMaintenance}>
                Enable Maintenance Mode
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminPasswordGate>
  );
}
