import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface UpdateResultUrlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseName: string;
  currentUrl: string | null;
  onSuccess: () => void;
}

export default function UpdateResultUrlDialog({
  isOpen,
  onClose,
  caseId,
  caseName,
  currentUrl,
  onSuccess,
}: UpdateResultUrlDialogProps) {
  const [url, setUrl] = useState(currentUrl || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic URL validation
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      toast({ title: "URL required", description: "Please enter a result ZIP URL.", variant: "destructive" });
      return;
    }

    // Validate HTTPS URL
    try {
      const urlObj = new URL(trimmedUrl);
      if (urlObj.protocol !== 'https:') {
        toast({ title: "Invalid URL", description: "URL must use HTTPS protocol.", variant: "destructive" });
        return;
      }
    } catch {
      toast({ title: "Invalid URL", description: "Please enter a valid URL.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update result_zip_url and set status to Ready
      const { error: updateError } = await supabase
        .from('cases')
        .update({ 
          result_zip_url: trimmedUrl,
          status: 'Ready'
        })
        .eq('id', caseId);

      if (updateError) throw updateError;

      // Add event
      await supabase
        .from('events')
        .insert({
          case_id: caseId,
          type: 'analysis_ready',
          payload: {
            result_url: trimmedUrl,
            updated_by_admin: true,
            completed_at: new Date().toISOString(),
          }
        });

      toast({ title: "Result URL updated successfully" });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update result URL:", error);
      toast({ title: "Failed to update result URL", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Update Result ZIP URL</DialogTitle>
            <DialogDescription>
              Enter the URL for the analysis result ZIP file for case: <strong>{caseName}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="result-url">Result ZIP URL *</Label>
              <Input
                id="result-url"
                type="url"
                placeholder="https://example.com/results.zip"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Must be a valid HTTPS URL pointing to the result ZIP file
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update & Mark Ready
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
