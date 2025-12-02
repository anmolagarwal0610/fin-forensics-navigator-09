import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RevokeAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  onSuccess: () => void;
}

export function RevokeAccessDialog({ open, onOpenChange, userId, userEmail, onSuccess }: RevokeAccessDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleRevoke = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Call secure edge function for server-side validation
      const response = await supabase.functions.invoke('revoke-subscription', {
        body: { userId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to revoke subscription');
      }

      toast.success('Access Revoked', {
        description: `${userEmail} has been downgraded to free tier`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error revoking access:', error);
      toast.error('Failed to revoke access', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke Premium Access</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to revoke premium access for {userEmail}?
            They will be immediately downgraded to the free tier.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRevoke} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading ? 'Revoking...' : 'Revoke Access'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
