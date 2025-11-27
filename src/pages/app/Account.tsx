import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription, TIER_LIMITS, TIER_LABELS } from "@/hooks/useSubscription";
import { UsageIndicator } from "@/components/app/UsageIndicator";
import ChangePassword from "@/components/auth/ChangePassword";
import { format } from "date-fns";
import { CreditCard, Calendar, FileText, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export default function Account() {
  const { user } = useAuth();
  const { tier, pagesRemaining, expiresAt, loading } = useSubscription();
  const totalPages = TIER_LIMITS[tier];
  const pagesUsed = totalPages - pagesRemaining;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-sm">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription & Usage
              </CardTitle>
              <Badge variant="outline" className="text-sm">
                {TIER_LABELS[tier]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading subscription details...
              </div>
            ) : (
              <>
                {/* Usage Indicator */}
                <UsageIndicator 
                  tier={tier}
                  pagesUsed={pagesUsed}
                  className="mb-6"
                />

                {/* Subscription Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Total Allocation</p>
                      <p className="text-2xl font-semibold mt-1">
                        {totalPages.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        pages per month
                      </p>
                    </div>
                  </div>

                  {expiresAt && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Renews On</p>
                        <p className="text-lg font-semibold mt-1">
                          {format(new Date(expiresAt), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Next billing date
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upgrade CTA for Free Tier */}
                {tier === 'free' && (
                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold mb-1">Need More Pages?</h4>
                        <p className="text-sm text-muted-foreground">
                          Upgrade to a paid plan for higher monthly limits and priority support.
                        </p>
                      </div>
                      <Button asChild size="sm" variant="hero">
                        <Link to="/pricing">
                          <Zap className="mr-2 h-4 w-4" />
                          Upgrade
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <ChangePassword />
      </motion.div>
    </motion.div>
  );
}
