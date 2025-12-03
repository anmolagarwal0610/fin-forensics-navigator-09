import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Mail } from "lucide-react";
import { format, addMonths, addYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SubscriptionTier } from "@/hooks/useSubscription";

interface GrantAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  onSuccess: () => void;
}

export function GrantAccessDialog({ open, onOpenChange, userId, userEmail, onSuccess }: GrantAccessDialogProps) {
  const [tier, setTier] = useState<SubscriptionTier>('starter');
  const [duration, setDuration] = useState<string>('1-month');
  const [customDate, setCustomDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  const calculateExpiry = () => {
    if (duration === 'custom' && customDate) return customDate;
    
    const today = new Date();
    switch (duration) {
      case '1-month': return addMonths(today, 1);
      case '3-months': return addMonths(today, 3);
      case '6-months': return addMonths(today, 6);
      case '1-year': return addYears(today, 1);
      default: return addMonths(today, 1);
    }
  };

  const handleGrant = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const expiryDate = calculateExpiry();
      
      // Call secure edge function for server-side validation
      const response = await supabase.functions.invoke('grant-subscription', {
        body: {
          userId,
          tier,
          expiresAt: expiryDate.toISOString(),
          sendEmail,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to grant subscription');
      }

      toast.success('Access Granted', {
        description: `${userEmail} now has ${tier} access until ${format(expiryDate, 'PPP')}${sendEmail ? ' (email sent)' : ''}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error granting access:', error);
      toast.error('Failed to grant access', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant Premium Access</DialogTitle>
          <DialogDescription>
            Grant subscription access to {userEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Subscription Tier</Label>
            <Select value={tier} onValueChange={(v) => setTier(v as SubscriptionTier)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter (500 pages/month)</SelectItem>
                <SelectItem value="professional">Professional (2000 pages/month)</SelectItem>
                <SelectItem value="enterprise">Enterprise (10000 pages/month)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-month">1 Month</SelectItem>
                <SelectItem value="3-months">3 Months</SelectItem>
                <SelectItem value="6-months">6 Months</SelectItem>
                <SelectItem value="1-year">1 Year</SelectItem>
                <SelectItem value="custom">Custom Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {duration === 'custom' && (
            <div className="space-y-2">
              <Label>Expiration Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDate ? format(customDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={setCustomDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm text-muted-foreground">
              Access will expire on {format(calculateExpiry(), 'PPP')}
            </p>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-md">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="send-email" className="text-sm font-normal cursor-pointer">
                Send notification email to user
              </Label>
            </div>
            <Switch
              id="send-email"
              checked={sendEmail}
              onCheckedChange={setSendEmail}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGrant} disabled={loading || (duration === 'custom' && !customDate)}>
            {loading ? 'Granting...' : 'Grant Access'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
