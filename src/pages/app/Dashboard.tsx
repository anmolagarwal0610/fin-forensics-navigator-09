
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus } from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { getCases, type CaseRecord } from "@/api/cases";
import { toast } from "@/hooks/use-toast";

// Components
import KPICards from "@/components/app/KPICards";
import DashboardToolbar from "@/components/app/DashboardToolbar";
import ModernCaseCard from "@/components/app/ModernCaseCard";
import CaseListView from "@/components/app/CaseListView";
import DashboardSkeleton from "@/components/app/DashboardSkeleton";
import EmptyState from "@/components/app/EmptyState";

export default function Dashboard() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Array<CaseRecord["status"]>>([]);
  const [tagFilter, setTagFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    return (localStorage.getItem("dashboard-view") as "grid" | "list") || "grid";
  });
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    getCases()
      .then((data) => setCases(data))
      .catch((e) => {
        console.error(e);
        toast({ title: "Failed to load cases" });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard-view", viewMode);
  }, [viewMode]);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const okName = c.name.toLowerCase().includes(search.toLowerCase());
      const okStatus = statusFilter.length ? statusFilter.includes(c.status) : true;
      const okTag = tagFilter ? (c.tags ?? []).some((t) => t.toLowerCase().includes(tagFilter.toLowerCase())) : true;
      return okName && okStatus && okTag;
    });
  }, [cases, search, statusFilter, tagFilter]);

  if (loading) {
    return (
      <AppLayout>
        <div className="w-full max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <DashboardSkeleton />
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
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
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2"
          >
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Dashboard
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold">Active Cases</h1>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[280px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cases..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button onClick={() => navigate("/app/cases/new")} className="whitespace-nowrap">
                <Plus className="h-4 w-4 mr-2" />
                New Case
              </Button>
            </div>
          </motion.div>

          {/* KPI Cards */}
          <KPICards cases={cases} />

          {/* Toolbar */}
          <DashboardToolbar
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            tagFilter={tagFilter}
            onTagFilterChange={setTagFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/* Cases Content */}
          {filtered.length === 0 ? (
            cases.length === 0 ? (
              <EmptyState />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-muted-foreground mb-4">No cases match your filters.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter([]);
                    setTagFilter("");
                  }}
                >
                  Clear Filters
                </Button>
              </motion.div>
            )
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((c, index) => (
                <ModernCaseCard
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  color_hex={c.color_hex}
                  tags={c.tags ?? []}
                  status={c.status}
                  updated_at={c.updated_at}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <CaseListView cases={filtered} />
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
