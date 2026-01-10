import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StorageMetric {
  bucket_id: string | null;
  file_type: string | null;
  file_count: number | null;
  total_mb: number | null;
}

interface BucketSummary {
  files: number;
  mb: number;
  percentage: number;
}

interface StorageSummary {
  totalFiles: number;
  totalMB: number;
  byBucket: {
    "case-files": BucketSummary;
    "result-files": BucketSummary;
    "support-attachments": BucketSummary;
  };
  byFileType: Array<{
    type: string;
    files: number;
    mb: number;
    percentage: number;
  }>;
}

export function useStorageMetrics() {
  const query = useQuery({
    queryKey: ["storage-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storage_metrics")
        .select("*")
        .order("bucket_id")
        .order("file_type");

      if (error) throw error;
      return data as StorageMetric[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate summary from metrics
  const summary: StorageSummary = {
    totalFiles: 0,
    totalMB: 0,
    byBucket: {
      "case-files": { files: 0, mb: 0, percentage: 0 },
      "result-files": { files: 0, mb: 0, percentage: 0 },
      "support-attachments": { files: 0, mb: 0, percentage: 0 },
    },
    byFileType: [],
  };

  if (query.data) {
    const fileTypeMap = new Map<string, { files: number; mb: number }>();

    query.data.forEach((metric) => {
      const files = metric.file_count || 0;
      const mb = metric.total_mb || 0;

      summary.totalFiles += files;
      summary.totalMB += mb;

      // By bucket
      const bucketId = metric.bucket_id as keyof typeof summary.byBucket;
      if (bucketId && summary.byBucket[bucketId]) {
        summary.byBucket[bucketId].files += files;
        summary.byBucket[bucketId].mb += mb;
      }

      // By file type
      const fileType = metric.file_type || "Other";
      const existing = fileTypeMap.get(fileType) || { files: 0, mb: 0 };
      fileTypeMap.set(fileType, {
        files: existing.files + files,
        mb: existing.mb + mb,
      });
    });

    // Calculate percentages for buckets
    Object.keys(summary.byBucket).forEach((key) => {
      const bucket = summary.byBucket[key as keyof typeof summary.byBucket];
      bucket.percentage = summary.totalMB > 0 ? (bucket.mb / summary.totalMB) * 100 : 0;
    });

    // Convert file type map to array with percentages
    summary.byFileType = Array.from(fileTypeMap.entries())
      .map(([type, data]) => ({
        type,
        files: data.files,
        mb: data.mb,
        percentage: summary.totalMB > 0 ? (data.mb / summary.totalMB) * 100 : 0,
      }))
      .sort((a, b) => b.mb - a.mb);
  }

  return {
    metrics: query.data || [],
    summary,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  };
}
