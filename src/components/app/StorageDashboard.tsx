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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { RefreshCw, HardDrive, FileText, Archive, Database } from "lucide-react";
import { useStorageMetrics } from "@/hooks/useStorageMetrics";
import { formatDistanceToNow } from "date-fns";

const BUCKET_COLORS = {
  "case-files": "hsl(var(--primary))",
  "result-files": "hsl(var(--accent))",
  "support-attachments": "hsl(var(--warning))",
};

const FILE_TYPE_COLORS: Record<string, string> = {
  PDF: "hsl(220, 70%, 50%)",
  ZIP: "hsl(280, 70%, 50%)",
  CSV: "hsl(160, 70%, 45%)",
  Excel: "hsl(120, 60%, 45%)",
  Other: "hsl(var(--muted-foreground))",
};

function formatBytes(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(2)} MB`;
}

export function StorageDashboard() {
  const { metrics, summary, isLoading, refetch, lastUpdated } = useStorageMetrics();

  const pieData = [
    { name: "Case Files", value: summary.byBucket["case-files"].mb, color: BUCKET_COLORS["case-files"] },
    { name: "Result Files", value: summary.byBucket["result-files"].mb, color: BUCKET_COLORS["result-files"] },
    { name: "Support Files", value: summary.byBucket["support-attachments"].mb, color: BUCKET_COLORS["support-attachments"] },
  ].filter((d) => d.value > 0);

  const barData = summary.byFileType.slice(0, 5).map((item) => ({
    name: item.type,
    size: item.mb,
    fill: FILE_TYPE_COLORS[item.type] || FILE_TYPE_COLORS.Other,
  }));

  const chartConfig = {
    "case-files": { label: "Case Files", color: BUCKET_COLORS["case-files"] },
    "result-files": { label: "Result Files", color: BUCKET_COLORS["result-files"] },
    "support-attachments": { label: "Support Files", color: BUCKET_COLORS["support-attachments"] },
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <HardDrive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Storage Usage</CardTitle>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
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
      </CardHeader>
      <CardContent className="space-y-6">
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
              <CardTitle className="text-sm font-medium">File Types</CardTitle>
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

        {/* Detailed Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No storage data available
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.map((metric, idx) => {
                    const percentage = summary.totalMB > 0
                      ? ((metric.total_mb || 0) / summary.totalMB) * 100
                      : 0;
                    return (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {metric.bucket_id}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor:
                                  FILE_TYPE_COLORS[metric.file_type || "Other"] ||
                                  FILE_TYPE_COLORS.Other,
                              }}
                            />
                            {metric.file_type || "Other"}
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
