import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface AdminCase {
  id: string;
  name: string;
  status: string;
  created_at: string;
  user_email: string;
  user_name: string;
  organization: string;
  color_hex: string;
  description: string | null;
  tags: string[] | null;
  result_zip_url: string | null;
  input_zip_url: string | null;
}

export function useAdminCases() {
  return useQuery({
    queryKey: ['admin-cases'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('admin-get-all-cases', {
        body: {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      return response.data.cases as AdminCase[];
    },
  });
}
