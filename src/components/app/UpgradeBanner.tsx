import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { differenceInDays } from "date-fns";

export function UpgradeBanner() {
  const { tier, expiresAt, pagesRemaining, isActive } = useSubscription();

  const shouldShow = () => {
    if (!isActive) return true;
    if (tier === 'free' && pagesRemaining < 10) return true;
    if (expiresAt) {
      const daysUntilExpiry = differenceInDays(new Date(expiresAt), new Date());
      if (daysUntilExpiry <= 7) return true;
    }
    return false;
  };

  if (!shouldShow()) return null;

  const getMessage = () => {
    if (!isActive) return {
      title: "Subscription Expired",
      description: "Your subscription has expired. Upgrade to continue processing files.",
      variant: "destructive" as const,
    };
    
    if (tier === 'free' && pagesRemaining < 10) return {
      title: "Running Low on Pages",
      description: `You have ${pagesRemaining} pages remaining in your free tier. Upgrade for more capacity.`,
      variant: "default" as const,
    };

    if (expiresAt) {
      const daysUntilExpiry = differenceInDays(new Date(expiresAt), new Date());
      return {
        title: "Subscription Expiring Soon",
        description: `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Renew now to avoid interruption.`,
        variant: "default" as const,
      };
    }

    return null;
  };

  const message = getMessage();
  if (!message) return null;

  return (
    <Alert variant={message.variant} className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{message.title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{message.description}</span>
        <Button asChild size="sm" className="ml-4">
          <Link to="/pricing">
            <Zap className="mr-2 h-4 w-4" />
            Upgrade Now
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
