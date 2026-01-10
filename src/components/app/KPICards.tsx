import { motion } from "framer-motion";
import { FileSearch, Clock, CheckCircle, Files } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { useFilesProcessed } from "@/hooks/useFilesProcessed";
import type { CaseRecord } from "@/api/cases";

interface KPICardsProps {
  cases: CaseRecord[];
}

export default function KPICards({
  cases
}: KPICardsProps) {
  const { t } = useTranslation();
  const { data: filesProcessed = 0 } = useFilesProcessed();
  
  const reviewCount = cases.filter(c => c.status === "Review").length;
  const processingCount = cases.filter(c => c.status === "Processing").length;
  const readyCount = cases.filter(c => c.status === "Ready").length;
  
  const kpis = [{
    icon: CheckCircle,
    value: readyCount,
    labelKey: "status.ready",
    color: "text-green-600 dark:text-green-400"
  }, {
    icon: FileSearch,
    value: reviewCount,
    labelKey: "status.review",
    color: "text-purple-600 dark:text-purple-400"
  }, {
    icon: Clock,
    value: processingCount,
    labelKey: "status.processing",
    color: "text-orange-600 dark:text-orange-400"
  }, {
    icon: Files,
    value: filesProcessed,
    labelKey: "stats.filesProcessed",
    color: "text-blue-600 dark:text-blue-400"
  }];
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <motion.div 
          key={kpi.labelKey} 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted/50`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{kpi.value}</div>
                    <div className="text-sm text-muted-foreground">{t(kpi.labelKey)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
