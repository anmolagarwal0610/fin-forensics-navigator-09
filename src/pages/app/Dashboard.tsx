import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getCases, type CaseRecord } from "@/api/cases";
import { toast } from "@/hooks/use-toast";

// Components
import KPICards from "@/components/app/KPICards";
import RecentActivity from "@/components/app/RecentActivity";
import QuickActions from "@/components/app/QuickActions";
import DashboardSkeleton from "@/components/app/DashboardSkeleton";
export default function Dashboard() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load cases
  useEffect(() => {
    setLoading(true);
    getCases().then(data => setCases(data)).catch(e => {
      console.error(e);
      toast({
        title: "Failed to load cases"
      });
    }).finally(() => setLoading(false));
  }, []);
  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <DashboardSkeleton />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-2"
        >
          <h1 className="text-2xl md:text-3xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your case management system
          </p>
        </motion.div>

        {/* KPI Cards */}
        <KPICards cases={cases} />

        {/* Recent Activity and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <RecentActivity cases={cases} />
          </div>
          <div>
            <QuickActions />
          </div>
        </div>
      </motion.div>
    </div>
  );
}