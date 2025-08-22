
import { useState, useEffect } from "react";
import { Search, Grid3X3, List, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CaseRecord } from "@/api/cases";

interface DashboardToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: Array<CaseRecord["status"]>;
  onStatusFilterChange: (statuses: Array<CaseRecord["status"]>) => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

const STATUS_OPTIONS: Array<CaseRecord["status"]> = ["Active", "Processing", "Ready", "Archived"];

export default function DashboardToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  tagFilter,
  onTagFilterChange,
  viewMode,
  onViewModeChange,
}: DashboardToolbarProps) {
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(debouncedSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [debouncedSearch, onSearchChange]);

  const handleStatusToggle = (status: CaseRecord["status"]) => {
    const newFilter = statusFilter.includes(status)
      ? statusFilter.filter(s => s !== status)
      : [...statusFilter, status];
    onStatusFilterChange(newFilter);
  };

  return (
    <div className="sticky top-0 z-10">
      <Card className="w-full backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cases..."
                value={debouncedSearch}
                onChange={(e) => setDebouncedSearch(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Status:</span>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map((status) => {
                  const active = statusFilter.includes(status);
                  return (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusToggle(status)}
                      className={`h-8 text-[13px] font-medium ${active ? "bg-primary/10 border-primary text-primary" : ""}`}
                    >
                      {status}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Tag Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Tags:</span>
              <Input
                placeholder="Filter by tag..."
                value={tagFilter}
                onChange={(e) => onTagFilterChange(e.target.value)}
                className="min-w-[180px]"
              />
            </div>

            {/* Sort */}
            <Select defaultValue="updated">
              <SelectTrigger className="min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange("grid")}
                className="h-8 w-8 p-0"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewModeChange("list")}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
