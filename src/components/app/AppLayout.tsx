
import { PropsWithChildren } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";
import AvatarMenu from "./AvatarMenu";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/contexts/AuthContext";

export default function AppLayout({ children }: PropsWithChildren) {
  const { user } = useAuth();
  
  // Extract organization name from user metadata or email domain
  const getOrganizationName = () => {
    if (user?.user_metadata?.organization) {
      return user.user_metadata.organization;
    }
    // Fallback to email domain
    if (user?.email) {
      const domain = user.email.split('@')[1];
      return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    }
    return "Organization";
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold">FinNavigator</div>
              <div className="text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded">
                {getOrganizationName()}
              </div>
            </div>
            <AvatarMenu />
          </header>
          <main className="flex-1 p-4 md:p-6 w-full">
            {children}
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
