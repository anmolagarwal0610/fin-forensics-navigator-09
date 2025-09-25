import { NavLink, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { LayoutDashboard, FolderGit2, UserCog } from "lucide-react";
const items = [{
  title: "Dashboard",
  url: "/app/dashboard",
  icon: LayoutDashboard
}, {
  title: "Account",
  url: "/app/account",
  icon: UserCog
}];
export default function AppSidebar() {
  const {
    state
  } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isActive = (p: string) => currentPath === p;
  const getNavCls = ({
    isActive
  }: {
    isActive: boolean;
  }) => isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";
  return <>
      <Sidebar className={state === "collapsed" ? "w-14" : "w-60"} collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <div className="flex items-center justify-center p-4">
              <SidebarGroupLabel className="text-lg font-bold text-primary">FinNavigator</SidebarGroupLabel>
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className={getNavCls}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {state !== "collapsed" && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </>;
}