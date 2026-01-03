import { motion } from "framer-motion";
import { Plus, FolderOpen, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function QuickActions() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const actions = [
    {
      icon: Plus,
      labelKey: "dashboard.newCase",
      descriptionKey: "dashboard.startAnalyzing",
      onClick: () => navigate("/app/cases/new"),
      variant: "default" as const,
    },
    {
      icon: FolderOpen,
      labelKey: "dashboard.viewAllCases",
      descriptionKey: "dashboard.browseAllCases",
      onClick: () => navigate("/app/cases"),
      variant: "outline" as const,
    },
    {
      icon: Ticket,
      labelKey: "dashboard.raiseTicket",
      descriptionKey: "dashboard.getSupport",
      onClick: () => navigate("/app/support/raise-ticket"),
      variant: "outline" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.quickActions')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action, index) => (
          <motion.div
            key={action.labelKey}
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
                <div className="font-medium">{t(action.labelKey)}</div>
                <div className="text-xs text-muted-foreground font-normal">
                  {t(action.descriptionKey)}
                </div>
              </div>
            </Button>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
