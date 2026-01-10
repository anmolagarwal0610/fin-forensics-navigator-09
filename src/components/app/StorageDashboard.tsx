import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  RefreshCw,
  HardDrive,
  FileText,
  Archive,
  Database,
  ChevronDown,
  ChevronRight,
  Trash2,
  ArrowUpDown,
  Loader2,
  FolderOpen,
  Mail,
  Calendar,
  FileIcon,
} from "lucide-react";
import { useStorageMetrics, StorageMetric } from "@/hooks/useStorageMetrics";
import { useStorageFiles, useDeleteStorageFiles, StorageFile } from "@/hooks/useStorageFiles";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

const BUCKET_COLORS: Record<string, string> = {
  "case-files": "hsl(var(--primary))",
  "result-files": "hsl(var(--accent))",
  "support-attachments": "hsl(var(--warning))",
};

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: "hsl(220, 70%, 50%)",
  zip: "hsl(280, 70%, 50%)",
  csv: "hsl(160, 70%, 45%)",
  xlsx: "hsl(120, 60%, 45%)",
  xls: "hsl(120, 60%, 45%)",
  other: "hsl(var(--muted-foreground))",
};

function formatBytes(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(2)} MB`;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

interface ExpandedRowProps {
  bucket: string;
  fileType: string;
  sortBy: "created_at" | "size";
  sortOrder: "asc" | "desc";
  selectedFiles: Set<string>;
  onToggleFile: (file: StorageFile) => void;
  onSelectAll: (files: StorageFile[]) => void;
}

function ExpandedFileList({
  bucket,
  fileType,
  sortBy,
  sortOrder,
  selectedFiles,
  onToggleFile,
  onSelectAll,
}: ExpandedRowProps) {
  const { data, isLoading, error } = useStorageFiles({
    bucket,
    fileType,
    sortBy,
    sortOrder,
    limit: 50,
  });

  const files = data?.files || [];
  const allSelected = files.length > 0 && files.every((f) => selectedFiles.has(`${f.bucket_id}:${f.path}`));

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="bg-muted/30">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">Loading files...</span>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (error) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="bg-muted/30">
          <div className="flex items-center justify-center py-4 text-destructive">
            Failed to load files: {(error as Error).message}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (files.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="bg-muted/30">
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <FolderOpen className="h-4 w-4 mr-2" />
            No files found
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell colSpan={6} className="p-0 bg-muted/20">
        <div className="border-y border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => onSelectAll(files)}
                  />
                </TableHead>
                <TableHead className="text-xs">File Name</TableHead>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs">Case</TableHead>
                <TableHead className="text-xs text-right">Created</TableHead>
                <TableHead className="text-xs text-right">Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => {
                const fileKey = `${file.bucket_id}:${file.path}`;
                const isSelected = selectedFiles.has(fileKey);
                return (
                  <TableRow
                    key={file.id}
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <TableCell className="w-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleFile(file)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-mono text-xs truncate max-w-[200px]" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {file.user_email ? (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs truncate max-w-[150px]" title={file.user_email}>
                            {file.user_email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {file.case_name ? (
                        <Badge variant="outline" className="text-xs font-normal truncate max-w-[120px]">
                          {file.case_name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(file.created_at), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatFileSize(file.size_bytes)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function StorageDashboard() {
  const { metrics, summary, isLoading, refetch, lastUpdated } = useStorageMetrics();
  const { mutate: deleteFiles, isPending: isDeleting } = useDeleteStorageFiles();

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Map<string, StorageFile>>(new Map());
  const [sortBy, setSortBy] = useState<"created_at" | "size">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const toggleFileSelection = (file: StorageFile) => {
    const key = `${file.bucket_id}:${file.path}`;
    const newSelected = new Map(selectedFiles);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.set(key, file);
    }
    setSelectedFiles(newSelected);
  };

  const toggleSelectAll = (files: StorageFile[]) => {
    const newSelected = new Map(selectedFiles);
    const allSelected = files.every((f) => newSelected.has(`${f.bucket_id}:${f.path}`));

    if (allSelected) {
      files.forEach((f) => newSelected.delete(`${f.bucket_id}:${f.path}`));
    } else {
      files.forEach((f) => newSelected.set(`${f.bucket_id}:${f.path}`, f));
    }
    setSelectedFiles(newSelected);
  };

  const handleDeleteSelected = () => {
    const filesToDelete = Array.from(selectedFiles.values()).map((f) => ({
      bucket_id: f.bucket_id,
      path: f.path,
    }));

    deleteFiles(
      { files: filesToDelete },
      {
        onSuccess: () => {
          setSelectedFiles(new Map());
          setShowDeleteDialog(false);
          refetch();
        },
      }
    );
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const pieData = [
    { name: "Case Files", value: summary.byBucket["case-files"].mb, color: BUCKET_COLORS["case-files"] },
    { name: "Result Files", value: summary.byBucket["result-files"].mb, color: BUCKET_COLORS["result-files"] },
    { name: "Support Files", value: summary.byBucket["support-attachments"].mb, color: BUCKET_COLORS["support-attachments"] },
  ].filter((d) => d.value > 0);

  const barData = summary.byFileType.slice(0, 5).map((item) => ({
    name: item.type.toUpperCase(),
    size: item.mb,
    fill: FILE_TYPE_COLORS[item.type.toLowerCase()] || FILE_TYPE_COLORS.other,
  }));

  const chartConfig = {
    "case-files": { label: "Case Files", color: BUCKET_COLORS["case-files"] },
    "result-files": { label: "Result Files", color: BUCKET_COLORS["result-files"] },
    "support-attachments": { label: "Support Files", color: BUCKET_COLORS["support-attachments"] },
  };

  // Group metrics by bucket for rendering
  const groupedMetrics = useMemo(() => {
    const groups: Record<string, StorageMetric[]> = {};
    metrics.forEach((m) => {
      const bucket = m.bucket_id || "unknown";
      if (!groups[bucket]) groups[bucket] = [];
      groups[bucket].push(m);
    });
    return groups;
  }, [metrics]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <HardDrive className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Storage Management</h1>
            {lastUpdated && (
              <p className="text-sm text-muted-foreground">
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedFiles.size > 0 && (
            <Button
              variant="error"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedFiles.size})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Storage */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Storage</p>
                <p className="text-2xl font-bold text-foreground">{formatBytes(summary.totalMB)}</p>
                <p className="text-sm text-muted-foreground">{summary.totalFiles.toLocaleString()} files</p>
              </div>
              <Database className="h-8 w-8 text-primary/60" />
            </div>
            <Progress value={100} className="mt-3 h-2" />
          </CardContent>
        </Card>

        {/* Case Files */}
        <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Case Files</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatBytes(summary.byBucket["case-files"].mb)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {summary.byBucket["case-files"].files.toLocaleString()} files
                </p>
              </div>
              <FileText className="h-8 w-8 text-accent/60" />
            </div>
            <Progress
              value={summary.byBucket["case-files"].percentage}
              className="mt-3 h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {summary.byBucket["case-files"].percentage.toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        {/* Result Files */}
        <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Result Files</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatBytes(summary.byBucket["result-files"].mb)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {summary.byBucket["result-files"].files.toLocaleString()} files
                </p>
              </div>
              <Archive className="h-8 w-8 text-success/60" />
            </div>
            <Progress
              value={summary.byBucket["result-files"].percentage}
              className="mt-3 h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {summary.byBucket["result-files"].percentage.toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Storage by Bucket</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatBytes(data.value)}
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top File Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)} MB`} />
                  <YAxis type="category" dataKey="name" width={50} />
                  <ChartTooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatBytes(data.size)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="size" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table with Expandable Rows */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Detailed Breakdown</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "created_at" | "size")}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={toggleSortOrder}>
                <ArrowUpDown className="h-4 w-4" />
                <span className="ml-1 text-xs">{sortOrder === "asc" ? "Asc" : "Desc"}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead>File Type</TableHead>
                  <TableHead className="text-right">Files</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No storage data available
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.map((metric, idx) => {
                    const rowKey = `${metric.bucket_id}-${metric.file_type}`;
                    const isExpanded = expandedRows.has(rowKey);
                    const percentage =
                      summary.totalMB > 0 ? ((metric.total_mb || 0) / summary.totalMB) * 100 : 0;

                    return (
                      <>
                        <TableRow
                          key={idx}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50 transition-colors",
                            isExpanded && "bg-muted/30"
                          )}
                          onClick={() => toggleRow(rowKey)}
                        >
                          <TableCell className="w-10">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                              style={{
                                borderColor: BUCKET_COLORS[metric.bucket_id || ""] || undefined,
                              }}
                            >
                              {metric.bucket_id}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    FILE_TYPE_COLORS[(metric.file_type || "other").toLowerCase()] ||
                                    FILE_TYPE_COLORS.other,
                                }}
                              />
                              {(metric.file_type || "Other").toUpperCase()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(metric.file_count || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatBytes(metric.total_mb || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={percentage} className="w-16 h-1.5" />
                              <span className="text-xs text-muted-foreground w-12 text-right">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <ExpandedFileList
                            key={`${rowKey}-expanded`}
                            bucket={metric.bucket_id || ""}
                            fileType={metric.file_type || ""}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            selectedFiles={new Set(selectedFiles.keys())}
                            onToggleFile={toggleFileSelection}
                            onSelectAll={toggleSelectAll}
                          />
                        )}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedFiles.size} Files?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The following files will be permanently deleted:
              <div className="mt-2 max-h-40 overflow-y-auto">
                <ul className="text-xs space-y-1">
                  {Array.from(selectedFiles.values())
                    .slice(0, 10)
                    .map((f) => (
                      <li key={`${f.bucket_id}:${f.path}`} className="font-mono truncate">
                        {f.bucket_id}/{f.name}
                      </li>
                    ))}
                  {selectedFiles.size > 10 && (
                    <li className="text-muted-foreground">...and {selectedFiles.size - 10} more</li>
                  )}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Files
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
