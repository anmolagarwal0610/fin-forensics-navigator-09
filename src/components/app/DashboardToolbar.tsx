
import { Grid3X3, List, Filter } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { CaseRecord } from "@/api/cases";

interface DashboardToolbarProps {
  statusFilter: Array<CaseRecord["status"]>;
  onStatusFilterChange: (statuses: Array<CaseRecord["status"]>) => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

const STATUS_OPTIONS: Array<CaseRecord["status"]> = ["Active", "Processing", "Ready", "Archived"];

export default function DashboardToolbar({
  statusFilter,
  onStatusFilterChange,
  tagFilter,
  onTagFilterChange,
  viewMode,
  onViewModeChange,
}: DashboardToolbarProps) {
  const handleStatusToggle = (status: CaseRecord["status"]) => {
    const newFilter = statusFilter.includes(status)
      ? statusFilter.filter(s => s !== status)
      : [...statusFilter, status];
    onStatusFilterChange(newFilter);
  };

  const clearFilters = () => {
    onStatusFilterChange([]);
    onTagFilterChange("");
  };

  const hasActiveFilters = statusFilter.length > 0 || tagFilter.length > 0;

  return (
    <Card className="sticky top-4 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Left side - Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Status Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start gap-2">
                  <Filter className="h-4 w-4" />
                  Status
                  {statusFilter.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5">
                      {statusFilter.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="space-y-2">
                  <div className="text-sm font-medium mb-3">Filter by Status</div>
                  {STATUS_OPTIONS.map((status) => (
                    <label key={status} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={statusFilter.includes(status)}
                        onChange={() => handleStatusToggle(status)}
                        className="rounded"
                      />
                      <span className="text-sm">{status}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Tag Filter */}
            <Input
              placeholder="Filter by tag..."
              value={tagFilter}
              onChange={(e) => onTagFilterChange(e.target.value)}
              className="w-full sm:w-48"
            />

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>

          {/* Right side - Sort and View */}
          <div className="flex items-center gap-3">
            <Select defaultValue="updated">
              <SelectTrigger className="w-32">
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
        </div>
      </CardContent>
    </Card>
  );
}
