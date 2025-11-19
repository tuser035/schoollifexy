import { Award, AlertCircle, Star, Database } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "상점 부여", path: "/teacher/merit", icon: Award, color: "text-merit-blue" },
  { title: "벌점 부여", path: "/teacher/demerit", icon: AlertCircle, color: "text-demerit-orange" },
  { title: "이달의 학생", path: "/teacher/monthly", icon: Star, color: "text-monthly-green" },
  { title: "데이터 조회", path: "/teacher/dataview", icon: Database, color: "text-foreground" },
];

export function TeacherSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"}>
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>교사 메뉴</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.path}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted font-medium"
                    >
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                      {!collapsed && <span className="ml-2">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
