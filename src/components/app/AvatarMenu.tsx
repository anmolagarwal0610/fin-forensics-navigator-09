import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNameInitials, cleanupAuthState } from "@/utils/auth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function AvatarMenu() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Fetch user's profile to get full_name
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    try {
      cleanupAuthState();
      await supabase.auth.signOut({ scope: "global" });
      toast({ title: "Signed out successfully" });
      navigate("/signin");
    } catch (error) {
      console.error("Sign out error:", error);
      toast({ title: "Signed out" });
      navigate("/signin");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {getNameInitials(profile?.full_name, user?.email)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-semibold truncate">
          {profile?.full_name || user?.email?.split('@')[0] || t('avatarMenu.myAccount')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => navigate("/app/account")}
          className="flex items-center justify-between cursor-pointer"
        >
          <span>{t('avatarMenu.account')}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTheme(theme === "light" ? "dark" : "light");
            }}
            className="p-1 rounded hover:bg-accent"
          >
            <div className="relative h-4 w-4">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute top-0 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </div>
          </button>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          {t('avatarMenu.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
