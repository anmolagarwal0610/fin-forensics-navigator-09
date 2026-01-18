import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Copy, Loader2, Link as LinkIcon, Trash2, ExternalLink, Clock, Eye } from "lucide-react";
import { format } from "date-fns";

interface ShareFundTrailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  fundTrailHtml: string;
}

interface SharedFundTrail {
  id: string;
  short_code: string;
  expires_at: string | null;
  is_revoked: boolean;
  created_at: string;
  view_count: number;
  storage_path: string;
}

export default function ShareFundTrailDialog({
  open,
  onOpenChange,
  caseId,
  fundTrailHtml
}: ShareFundTrailDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expiryType, setExpiryType] = useState<'none' | 'custom'>('none');
  const [expiryDays, setExpiryDays] = useState<string>('7');
  const [isCreating, setIsCreating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  // Fetch existing shares
  const { data: existingShares, isLoading: loadingShares } = useQuery({
    queryKey: ['fund-trail-shares', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_fund_trails')
        .select('*')
        .eq('case_id', caseId)
        .eq('is_revoked', false)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching shares:', error);
        return [];
      }
      return data as SharedFundTrail[];
    },
    enabled: open,
  });

  // Create share mutation
  const createShareMutation = useMutation({
    mutationFn: async () => {
      const expiresAt = expiryType === 'custom' && expiryDays
        ? new Date(Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase.functions.invoke('create-fund-trail-share', {
        body: { 
          caseId, 
          expiresAt, 
          htmlContent: fundTrailHtml 
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setGeneratedUrl(data.shareUrl);
      queryClient.invalidateQueries({ queryKey: ['fund-trail-shares', caseId] });
      toast({ title: "Share link created successfully" });
    },
    onError: (error) => {
      console.error('Error creating share:', error);
      toast({ title: "Failed to create share link", variant: "destructive" });
    }
  });

  // Revoke share mutation - deletes storage file and database record immediately
  const revokeShareMutation = useMutation({
    mutationFn: async (share: { id: string; storage_path: string }) => {
      // First delete the storage file
      const { error: storageError } = await supabase.storage
        .from('shared-fund-trails')
        .remove([share.storage_path]);
      
      if (storageError) {
        console.warn('Failed to delete storage file:', storageError);
        // Continue anyway - will be cleaned up by cron
      }
      
      // Then delete the database record completely (not just revoke)
      const { error } = await supabase
        .from('shared_fund_trails')
        .delete()
        .eq('id', share.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund-trail-shares', caseId] });
      toast({ title: "Share link deleted" });
    },
    onError: (error) => {
      console.error('Error deleting share:', error);
      toast({ title: "Failed to delete share link", variant: "destructive" });
    }
  });

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createShareMutation.mutateAsync();
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const getShareUrl = (shortCode: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/s/${shortCode}`;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Share Fund Trail
          </DialogTitle>
          <DialogDescription>
            Create a public link to share this Fund Trail visualization with anyone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Create new share */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Link Expiry</Label>
            <RadioGroup 
              value={expiryType} 
              onValueChange={(v) => setExpiryType(v as 'none' | 'custom')}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="font-normal cursor-pointer">
                  No expiry (permanent link)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  Set expiry duration
                </Label>
              </div>
            </RadioGroup>

            {expiryType === 'custom' && (
              <Select value={expiryDays} onValueChange={setExpiryDays}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select expiry duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">1 week</SelectItem>
                  <SelectItem value="14">2 weeks</SelectItem>
                  <SelectItem value="30">1 month</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button 
              onClick={handleCreate} 
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Link...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Generate Share Link
                </>
              )}
            </Button>
          </div>

          {/* Display generated URL */}
          {generatedUrl && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-green-600">Link Generated!</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Input 
                  value={generatedUrl} 
                  readOnly 
                  className="text-sm font-mono"
                />
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => handleCopyUrl(generatedUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => window.open(generatedUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Existing Shares */}
          {existingShares && existingShares.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Active Share Links</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {existingShares.map((share) => {
                  const shareUrl = getShareUrl(share.short_code);
                  const expired = isExpired(share.expires_at);
                  
                  return (
                    <div 
                      key={share.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        expired ? 'bg-muted/50 opacity-60' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-background px-1.5 py-0.5 rounded">
                            {share.short_code}
                          </code>
                          {expired && (
                            <span className="text-xs text-destructive font-medium">
                              Expired
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {share.expires_at ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expires: {format(new Date(share.expires_at), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              No expiry
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {share.view_count} views
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleCopyUrl(shareUrl)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => revokeShareMutation.mutate({ 
                            id: share.id, 
                            storage_path: share.storage_path 
                          })}
                          disabled={revokeShareMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loadingShares && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}