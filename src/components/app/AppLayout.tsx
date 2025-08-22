
import { PropsWithChildren } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";
import AvatarMenu from "./AvatarMenu";
import { Toaster } from "@/components/ui/toaster";

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider>
      <header className="h-12 flex items-center border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <SidebarTrigger className="ml-2" />
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="text-sm font-semibold">FinNavigator</div>
          <AvatarMenu />
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-3rem)] w-full">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 max-w-[1400px] mx-auto w-full">
          {children}
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
