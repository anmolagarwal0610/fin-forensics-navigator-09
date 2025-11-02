import { motion } from "framer-motion";
import { Plus, FolderOpen, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Plus,
      label: "New Case",
      description: "Start analyzing a new case",
      onClick: () => navigate("/app/cases/new"),
      variant: "default" as const,
    },
    {
      icon: FolderOpen,
      label: "View All Cases",
      description: "Browse all your cases",
      onClick: () => navigate("/app/cases"),
      variant: "outline" as const,
    },
    {
      icon: Ticket,
      label: "Raise Ticket",
      description: "Get support from our team",
      onClick: () => navigate("/app/support/raise-ticket"),
      variant: "outline" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action, index) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Button
              variant={action.variant}
              className="w-full justify-start h-auto py-3"
              onClick={action.onClick}
            >
              <action.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">{action.label}</div>
                <div className="text-xs text-muted-foreground font-normal">
                  {action.description}
                </div>
              </div>
            </Button>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
