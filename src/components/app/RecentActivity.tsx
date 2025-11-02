import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "./StatusBadge";
import type { CaseRecord } from "@/api/cases";

interface RecentActivityProps {
  cases: CaseRecord[];
}

export default function RecentActivity({ cases }: RecentActivityProps) {
  const navigate = useNavigate();
  
  // Get the 10 most recent cases
  const recentCases = cases
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return "Just now";
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (recentCases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No recent activity yet. Create your first case to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/cases")}
            className="text-muted-foreground hover:text-foreground"
          >
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentCases.map((caseItem, index) => (
          <motion.div
            key={caseItem.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => navigate(`/app/cases/${caseItem.id}`)}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span
                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: caseItem.color_hex }}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{caseItem.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTimeAgo(caseItem.updated_at)}
                </p>
              </div>
            </div>
            <StatusBadge status={caseItem.status} />
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
