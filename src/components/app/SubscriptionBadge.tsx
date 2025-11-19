import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SubscriptionTier } from "@/hooks/useSubscription";
import { format } from "date-fns";

interface SubscriptionBadgeProps {
  tier: SubscriptionTier;
  expiresAt?: string | null;
  isActive?: boolean;
}

export function SubscriptionBadge({ tier, expiresAt, isActive = true }: SubscriptionBadgeProps) {
  const tierConfig = {
    free: { label: 'Free', className: 'bg-muted text-muted-foreground' },
    starter: { label: 'Starter', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
    professional: { label: 'Professional', className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
    enterprise: { label: 'Enterprise', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  };

  const config = tierConfig[tier];
  const expiryText = expiresAt ? `Expires ${format(new Date(expiresAt), 'MMM d, yyyy')}` : 'No expiration';
  const statusText = isActive ? 'Active' : 'Expired';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${config.className} ${!isActive ? 'opacity-50' : ''}`}>
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{statusText}</p>
          <p className="text-xs text-muted-foreground">{expiryText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
