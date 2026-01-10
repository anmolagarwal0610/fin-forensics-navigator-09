import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SUPABASE_URL = "https://rwzpffsaivgjuuthvkfa.supabase.co";

export interface StorageFile {
  id: string;
  name: string;
  path: string;
  bucket_id: string;
  file_type: string;
  size_bytes: number;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
  case_name: string | null;
  case_id: string | null;
}

interface FetchFilesParams {
  bucket?: string;
  fileType?: string;
  sortBy?: "created_at" | "size";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

interface DeleteFilesParams {
  files: Array<{ bucket_id: string; path: string }>;
}

export function useStorageFiles(params: FetchFilesParams = {}) {
  const { bucket, fileType, sortBy = "created_at", sortOrder = "desc", limit = 100, offset = 0 } = params;

  return useQuery({
    queryKey: ["storage-files", bucket, fileType, sortBy, sortOrder, limit, offset],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const queryParams = new URLSearchParams();
      if (bucket) queryParams.set("bucket", bucket);
      if (fileType) queryParams.set("file_type", fileType);
      queryParams.set("sort_by", sortBy);
      queryParams.set("sort_order", sortOrder);
      queryParams.set("limit", limit.toString());
      queryParams.set("offset", offset.toString());

      const functionUrl = `${SUPABASE_URL}/functions/v1/admin-storage-files?${queryParams.toString()}`;
      
      const res = await fetch(functionUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch storage files");
      }

      const data = await res.json();
      return data as { files: StorageFile[]; total: number };
    },
    enabled: true,
  });
}

export function useDeleteStorageFiles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DeleteFilesParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const functionUrl = `${SUPABASE_URL}/functions/v1/admin-delete-files`;
      
      const res = await fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete files");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Files Deleted",
        description: data.message,
      });
      // Invalidate storage queries
      queryClient.invalidateQueries({ queryKey: ["storage-files"] });
      queryClient.invalidateQueries({ queryKey: ["storage-metrics"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
