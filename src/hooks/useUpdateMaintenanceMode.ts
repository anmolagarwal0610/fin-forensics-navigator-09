import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useUpdateMaintenanceMode() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Authentication required");
      }

      const { error } = await supabase
        .from("app_settings")
        .update({
          value: {
            enabled,
            message: "Our servers are currently down for scheduled maintenance. We will be back shortly!"
          },
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("key", "maintenance_mode");

      if (error) throw error;

      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-mode"] });
      toast({
        title: enabled ? "Maintenance Mode Enabled" : "Maintenance Mode Disabled",
        description: enabled 
          ? "Users will see the maintenance message and cannot submit files."
          : "Users can now submit files for analysis.",
      });
    },
    onError: (error) => {
      console.error("Failed to update maintenance mode:", error);
      toast({
        title: "Failed to update maintenance mode",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    updateMaintenanceMode: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
