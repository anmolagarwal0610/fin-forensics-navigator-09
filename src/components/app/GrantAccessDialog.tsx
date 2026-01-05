import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Mail, Info } from "lucide-react";
import { format, addMonths, addYears, addDays, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TIER_LIMITS, TIER_PAGES_PER_PERIOD } from "@/hooks/useSubscription";
import type { SubscriptionTier } from "@/hooks/useSubscription";

interface CustomTier {
  id: string;
  name: string;
  pages: number;
  duration: 'monthly' | 'yearly' | 'quarterly' | 'half-yearly' | 'custom';
  customDays?: number;
}

interface GrantAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  onSuccess: () => void;
}

export function GrantAccessDialog({ open, onOpenChange, userId, userEmail, onSuccess }: GrantAccessDialogProps) {
  const [tier, setTier] = useState<string>('starter');
  const [duration, setDuration] = useState<string>('1-month');
  const [customDate, setCustomDate] = useState<Date>();
  const [customDays, setCustomDays] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [customTiers, setCustomTiers] = useState<CustomTier[]>([]);

  // Load custom tiers on mount
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
        console.log('No custom tiers configured');
      }
    };
    if (open) loadCustomTiers();
  }, [open]);

  const isCustomTier = !['free', 'starter', 'professional', 'enterprise', 'monthly', 'yearly_tier', 'yearly_plan'].includes(tier);
  const selectedCustomTier = customTiers.find(t => t.id === tier);

  const calculateExpiry = () => {
    if (duration === 'custom-date' && customDate) return customDate;
    if (duration === 'custom-days' && customDays) {
      const days = parseInt(customDays, 10);
      if (days > 0) return addDays(new Date(), days);
    }
    
    const today = new Date();
    switch (duration) {
      case '1-month': return addMonths(today, 1);
      case '3-months': return addMonths(today, 3);
      case '6-months': return addMonths(today, 6);
      case '1-year': return addYears(today, 1);
      default: return addMonths(today, 1);
    }
  };

  const calculateTotalPages = () => {
    const expiryDate = calculateExpiry();
    const durationDays = differenceInDays(expiryDate, new Date());
    const durationMonths = Math.max(1, Math.round(durationDays / 30));

    if (isCustomTier && selectedCustomTier) {
      // Custom tier - use its pages directly as total
      return {
        total: selectedCustomTier.pages,
        perPeriod: selectedCustomTier.pages,
        period: 'total' as const,
        months: durationMonths,
      };
    }

    // Built-in tier
    const tierKey = tier as SubscriptionTier;
    const tierInfo = TIER_PAGES_PER_PERIOD[tierKey];
    
    if (!tierInfo) {
      return { total: 0, perPeriod: 0, period: 'month' as const, months: durationMonths };
    }

    if (tierInfo.period === 'year') {
      // Yearly tiers - pages are for the full year
      return {
        total: tierInfo.pages,
        perPeriod: tierInfo.pages,
        period: 'year' as const,
        months: durationMonths,
      };
    } else {
      // Monthly tiers - multiply by duration in months
      return {
        total: tierInfo.pages * durationMonths,
        perPeriod: tierInfo.pages,
        period: 'month' as const,
        months: durationMonths,
      };
    }
  };

  const isValidCustomDays = () => {
    if (duration !== 'custom-days') return true;
    const days = parseInt(customDays, 10);
    return days > 0 && days <= 3650; // Max 10 years
  };

  const handleGrant = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const expiryDate = calculateExpiry();
      const pageCalc = calculateTotalPages();
      
      // Prepare tier data for edge function
      const tierData = isCustomTier && selectedCustomTier
        ? {
            tierName: selectedCustomTier.name,
            tierPages: selectedCustomTier.pages,
            isCustom: true,
          }
        : {
            tierName: tier,
            isCustom: false,
          };
      
      // Call secure edge function for server-side validation
      const response = await supabase.functions.invoke('grant-subscription', {
        body: {
          userId,
          tier: isCustomTier ? 'professional' : tier, // Use professional as base for custom tiers
          expiresAt: expiryDate.toISOString(),
          sendEmail,
          totalPagesGranted: pageCalc.total,
          customTierData: isCustomTier ? tierData : undefined,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to grant subscription');
      }

      const tierLabel = isCustomTier && selectedCustomTier 
        ? selectedCustomTier.name 
        : tier;

      toast.success('Access Granted', {
        description: `${userEmail} now has ${tierLabel} access (${pageCalc.total.toLocaleString()} pages) until ${format(expiryDate, 'PPP')}${sendEmail ? ' (email sent)' : ''}`,
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

  const pageCalc = calculateTotalPages();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Grant Premium Access</DialogTitle>
          <DialogDescription>
            Grant subscription access to {userEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Subscription Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter (500 pages/month)</SelectItem>
                <SelectItem value="professional">Professional (2,000 pages/month)</SelectItem>
                <SelectItem value="enterprise">Enterprise (10,000 pages/month)</SelectItem>
                <SelectItem value="monthly">Monthly Tier (22,500 pages/month)</SelectItem>
                <SelectItem value="yearly_tier">Yearly Tier (200,000 pages/year)</SelectItem>
                <SelectItem value="yearly_plan">Yearly Plan (250,000 pages/year)</SelectItem>
                
                {customTiers.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                      Custom Tiers
                    </div>
                    {customTiers.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.name} ({ct.pages.toLocaleString()} pages)
                      </SelectItem>
                    ))}
                  </>
                )}
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
                <SelectItem value="custom-days">Custom Days</SelectItem>
                <SelectItem value="custom-date">Custom Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {duration === 'custom-days' && (
            <div className="space-y-2">
              <Label>Number of Days</Label>
              <Input
                type="number"
                min="1"
                max="3650"
                placeholder="Enter number of days (1-3650)"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
              />
              {customDays && parseInt(customDays, 10) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Approximately {Math.floor(parseInt(customDays, 10) / 30)} months / {(parseInt(customDays, 10) / 365).toFixed(1)} years
                </p>
              )}
            </div>
          )}

          {duration === 'custom-date' && (
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

          {/* Total Pages Preview */}
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4 text-primary" />
              Subscription Summary
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Total Pages</p>
                <p className="text-lg font-semibold">{pageCalc.total.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Expires</p>
                <p className="text-lg font-semibold">{format(calculateExpiry(), 'MMM dd, yyyy')}</p>
              </div>
            </div>
            {pageCalc.period === 'month' && pageCalc.months > 1 && (
              <p className="text-xs text-muted-foreground mt-2">
                {pageCalc.perPeriod.toLocaleString()} pages/month × {pageCalc.months} months = {pageCalc.total.toLocaleString()} total pages
              </p>
            )}
            {isCustomTier && selectedCustomTier && (
              <p className="text-xs text-muted-foreground mt-2">
                Custom tier: {selectedCustomTier.name}
              </p>
            )}
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
          <Button 
            onClick={handleGrant} 
            disabled={loading || (duration === 'custom-date' && !customDate) || !isValidCustomDays()}
          >
            {loading ? 'Granting...' : 'Grant Access'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
