
import { motion } from "framer-motion";
import { Activity, Clock, CheckCircle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CaseRecord } from "@/api/cases";

interface KPICardsProps {
  cases: CaseRecord[];
}

export default function KPICards({ cases }: KPICardsProps) {
  const activeCount = cases.filter(c => c.status === "Active").length;
  const processingCount = cases.filter(c => c.status === "Processing").length;
  const readyCount = cases.filter(c => c.status === "Ready").length;
  const filesCount = cases.length * 3; // Placeholder

  const kpis = [
    {
      icon: Activity,
      value: activeCount,
      label: "Active",
      trend: "+12%",
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      icon: Clock,
      value: processingCount,
      label: "Processing",  
      trend: "+5%",
      color: "text-orange-600 dark:text-orange-400"
    },
    {
      icon: CheckCircle,
      value: readyCount,
      label: "Ready",
      trend: "+8%",
      color: "text-green-600 dark:text-green-400"
    },
    {
      icon: FileText,
      value: filesCount,
      label: "Files (7d)",
      trend: "+24%",
      color: "text-purple-600 dark:text-purple-400"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.label}
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
                    <div className="text-sm text-muted-foreground">{kpi.label}</div>
                  </div>
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                  {kpi.trend}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
