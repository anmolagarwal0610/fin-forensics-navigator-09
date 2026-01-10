import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFilesProcessed() {
  return useQuery({
    queryKey: ["files-processed"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return 0;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("total_files_processed")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching files processed:", error);
        return 0;
      }

      return data?.total_files_processed || 0;
    },
  });
}
