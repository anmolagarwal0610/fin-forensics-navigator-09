import { motion } from "framer-motion";
import { Activity, Clock, CheckCircle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CaseRecord } from "@/api/cases";
interface KPICardsProps {
  cases: CaseRecord[];
}
export default function KPICards({
  cases
}: KPICardsProps) {
  const activeCount = cases.filter(c => c.status === "Active").length;
  const processingCount = cases.filter(c => c.status === "Processing").length;
  const readyCount = cases.filter(c => c.status === "Ready").length;

  // Fetch actual file count from the database
  const {
    data: fileCount = 0
  } = useQuery({
    queryKey: ['file-count', cases.map(c => c.id)],
    queryFn: async () => {
      if (cases.length === 0) return 0;
      const {
        count,
        error
      } = await supabase.from('case_files').select('*', {
        count: 'exact',
        head: true
      }).in('case_id', cases.map(c => c.id));
      if (error) {
        console.error('Error fetching file count:', error);
        return 0;
      }
      return count || 0;
    },
    enabled: cases.length > 0
  });
  const kpis = [{
    icon: CheckCircle,
    value: readyCount,
    label: "Ready",
    trend: "+8%",
    color: "text-green-600 dark:text-green-400"
  }, {
    icon: Activity,
    value: activeCount,
    label: "Active",
    trend: "+12%",
    color: "text-blue-600 dark:text-blue-400"
  }, {
    icon: Clock,
    value: processingCount,
    label: "Processing",
    trend: "+5%",
    color: "text-orange-600 dark:text-orange-400"
  }, {
    icon: FileText,
    value: fileCount,
    label: "Files",
    trend: "+24%",
    color: "text-purple-600 dark:text-purple-400"
  }];
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => <motion.div key={kpi.label} initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: index * 0.05,
      duration: 0.3
    }}>
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
                
              </div>
            </CardContent>
          </Card>
        </motion.div>)}
    </div>;
}