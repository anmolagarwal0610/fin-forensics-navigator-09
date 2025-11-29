import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MaintenanceSettings {
  enabled: boolean;
  message: string;
}

export function useMaintenanceMode() {
  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-mode"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .single();

      if (error) {
        console.error("Failed to fetch maintenance mode:", error);
        return { enabled: false, message: "" };
      }

      const settings = data?.value as unknown as MaintenanceSettings;
      return settings || { enabled: false, message: "" };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return {
    isMaintenanceMode: data?.enabled ?? false,
    message: data?.message ?? "Our servers are currently down for scheduled maintenance. We will be back shortly!",
    loading: isLoading,
  };
}
