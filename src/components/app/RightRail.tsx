
import { Clock, FileText, CheckCircle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function RightRail() {
  const navigate = useNavigate();

  // Mock recent activity data
  const recentActivity = [
    {
      id: 1,
      type: "files_uploaded",
      message: "Files uploaded to 'Market Analysis Q4'",
      user: "You",
      time: "2h ago",
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      id: 2,
      type: "analysis_ready",
      message: "Analysis ready for 'Investment Portfolio'",
      user: "System",
      time: "4h ago",
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400"
    },
    {
      id: 3,
      type: "created",
      message: "Created new case 'Risk Assessment'",
      user: "You",
      time: "1d ago",
      icon: Plus,
      color: "text-purple-600 dark:text-purple-400"
    },
    {
      id: 4,
      type: "files_uploaded",
      message: "Files uploaded to 'Compliance Check'",
      user: "Team Member",
      time: "2d ago",
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      id: 5,
      type: "analysis_ready",
      message: "Analysis ready for 'Due Diligence'",
      user: "System",
      time: "3d ago",
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentActivity.map((activity, index) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${activity.color.replace('text-', 'bg-')}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-5">{activity.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  by {activity.user} • {activity.time}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => navigate("/app/cases/new")}
            className="w-full justify-start"
            variant="default"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
          <Button
            variant="secondary"
            className="w-full justify-start"
            onClick={() => {
              // Navigate to last opened case for upload - placeholder
              navigate("/app/cases/new");
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Upload to Last Case
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
