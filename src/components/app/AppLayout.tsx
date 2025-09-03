import { PropsWithChildren } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";
import AvatarMenu from "./AvatarMenu";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/contexts/AuthContext";
export default function AppLayout({
  children
}: PropsWithChildren) {
  const {
    user
  } = useAuth();

  // Extract organization name from user metadata or email domain
  const getOrganizationName = () => {
    const meta = user?.user_metadata as any;
    if (meta?.organization_name) return meta.organization_name as string;
    if (meta?.organization) return meta.organization as string;
    // Fallback to email domain
    if (user?.email) {
      const domain = user.email.split('@')[1];
      const base = domain.split('.')[0];
      return base.charAt(0).toUpperCase() + base.slice(1);
    }
    return "Organization";
  };
  return <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="p-2 hover:bg-muted rounded-md transition-colors" />
              <div className="flex items-center gap-3">
                <div className="text-base md:text-xl font-bold tracking-tight">{getOrganizationName()}</div>
                <div className="hidden sm:block text-xs md:text-sm text-muted-foreground font-medium">Dashboard</div>
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
    </SidebarProvider>;
}