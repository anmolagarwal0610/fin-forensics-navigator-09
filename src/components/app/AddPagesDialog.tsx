import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TIER_LIMITS, TIER_LABELS, type SubscriptionTier } from "@/hooks/useSubscription";
import { Plus } from "lucide-react";

interface AddPagesDialogProps {
  user: {
    user_id: string;
    email: string;
    full_name: string;
    organization_name: string;
    subscription_tier: string;
    current_period_pages_used: number;
    bonus_pages?: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddPagesDialog({ user, open, onOpenChange, onSuccess }: AddPagesDialogProps) {
  const [pagesToAdd, setPagesToAdd] = useState<string>("");
  const queryClient = useQueryClient();

  const tierLimit = TIER_LIMITS[user?.subscription_tier as SubscriptionTier] || 0;
  const currentBonus = user?.bonus_pages || 0;
  const currentTotal = tierLimit + currentBonus;
  const newTotal = currentTotal + (parseInt(pagesToAdd) || 0);

  const addPagesMutation = useMutation({
    mutationFn: async (pages: number) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("add-bonus-pages", {
        body: {
          target_user_id: user.user_id,
          pages_to_add: pages,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Pages Added Successfully",
        description: `Added ${data.pages_added} bonus pages. New total: ${newTotal.toLocaleString()} pages.`,
      });
      onSuccess?.();
      onOpenChange(false);
      setPagesToAdd("");
    },
    onError: (error) => {
      console.error("Failed to add bonus pages:", error);
      toast({
        title: "Failed to Add Pages",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pages = parseInt(pagesToAdd);
    if (!pages || pages <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a positive number of pages.",
        variant: "destructive",
      });
      return;
    }
    addPagesMutation.mutate(pages);
  };

  const quickAdd = (amount: number) => {
    setPagesToAdd(amount.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Bonus Pages</DialogTitle>
          <DialogDescription>
            Add additional pages to this user's subscription beyond their tier limit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* User Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">User</span>
                <span className="text-sm text-muted-foreground">{user?.email || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Organization</span>
                <span className="text-sm text-muted-foreground">{user?.organization_name || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Tier</span>
                <Badge variant="secondary">
                  {TIER_LABELS[user?.subscription_tier as SubscriptionTier] || 'Free'}
                </Badge>
              </div>
            </div>

            {/* Current Usage */}
            <div className="rounded-lg border p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tier Limit</span>
                <span className="font-medium">{tierLimit.toLocaleString()} pages</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Bonus</span>
                <span className="font-medium">{currentBonus.toLocaleString()} pages</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-1">
                <span className="font-medium">Current Total</span>
                <span className="font-semibold">{currentTotal.toLocaleString()} pages</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pages Used</span>
                <span>{(user?.current_period_pages_used || 0).toLocaleString()} pages</span>
              </div>
            </div>

            {/* Pages to Add */}
            <div className="space-y-3">
              <Label htmlFor="pages">Pages to Add</Label>
              <Input
                id="pages"
                type="number"
                min="1"
                placeholder="Enter number of pages"
                value={pagesToAdd}
                onChange={(e) => setPagesToAdd(e.target.value)}
                required
              />
              
              {/* Quick Add Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickAdd(500)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  500
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickAdd(1000)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  1,000
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickAdd(2000)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  2,000
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => quickAdd(5000)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  5,000
                </Button>
              </div>
            </div>

            {/* Preview */}
            {pagesToAdd && parseInt(pagesToAdd) > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">New Total Available</span>
                  <span className="text-lg font-bold text-primary">
                    {newTotal.toLocaleString()} pages
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Tier: {tierLimit.toLocaleString()} + Bonus: {(currentBonus + parseInt(pagesToAdd)).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addPagesMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addPagesMutation.isPending || !pagesToAdd}>
              {addPagesMutation.isPending ? "Adding..." : "Add Pages"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
