import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Key, Upload, Database, BarChart, LogOut, ClipboardCheck, TrendingUp, FolderOpen, Trophy, FileText, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { logout, type AuthUser } from "@/lib/auth";
import PasswordReset from "@/components/admin/PasswordReset";
import BulkUpload from "@/components/admin/BulkUpload";
import DataInquiry from "@/components/admin/DataInquiry";
import PointsInquiry from "@/components/admin/PointsInquiry";
import CounselingInquiry from "@/components/admin/CounselingInquiry";
import StatisticsChart from "@/components/admin/StatisticsChart";
import StorageManager from "@/components/admin/StorageManager";
import StudentLeaderboard from "@/components/admin/StudentLeaderboard";
import { EmailHistory } from "@/components/admin/EmailHistory";
import EmailTemplateManager from "@/components/admin/EmailTemplateManager";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
} from "@/components/ui/sidebar";

const menuItems = (userType: "admin" | "teacher") => {
  const items = [
    ...(userType === "admin" ? [
      { value: "password", label: "비밀번호", icon: Key },
      { value: "upload", label: "업로드", icon: Upload },
    ] : []),
    { value: "data", label: "데이터", icon: Database },
    { value: "points", label: "상점", icon: BarChart },
    ...(userType === "admin" ? [
      { value: "counseling", label: "상담", icon: ClipboardCheck },
    ] : []),
    { value: "statistics", label: "통계", icon: TrendingUp },
    { value: "leaderboard", label: "순위", icon: Trophy },
    { value: "email-history", label: "이메일", icon: Mail },
    ...(userType === "admin" ? [
      { value: "email-templates", label: "템플릿", icon: FileText },
      { value: "storage", label: "파일", icon: FolderOpen },
    ] : []),
  ];
  return items;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>("password");

  useEffect(() => {
    const authUser = localStorage.getItem("auth_user");
    if (!authUser) {
      navigate("/");
      return;
    }
    
    const parsedUser = JSON.parse(authUser);
    if (parsedUser.type !== "admin" && parsedUser.type !== "teacher") {
      navigate("/");
      return;
    }
    
    setUser(parsedUser);
    // 기본 탭 설정
    const defaultTab = parsedUser.type === "teacher" ? "data" : "password";
    setActiveTab(defaultTab);
  }, [navigate]);

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "password":
        return <PasswordReset />;
      case "upload":
        return <BulkUpload />;
      case "data":
        return <DataInquiry />;
      case "points":
        return <PointsInquiry />;
      case "counseling":
        return <CounselingInquiry />;
      case "statistics":
        return <StatisticsChart />;
      case "leaderboard":
        return <StudentLeaderboard />;
      case "email-history":
        return <EmailHistory />;
      case "email-templates":
        return <EmailTemplateManager />;
      case "storage":
        return <StorageManager />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex flex-col bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {user.type === "admin" ? "관리자 대시보드" : "데이터 조회"}
                </h1>
                <p className="text-muted-foreground">
                  {user.type === "admin" 
                    ? user.email 
                    : user.grade && user.class 
                      ? `${user.name} (${user.grade}-${user.class})`
                      : user.name
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {user.type === "teacher" && (
                <Button onClick={() => navigate("/teacher/dashboard")} variant="outline">
                  돌아가기
                </Button>
              )}
              <Button onClick={handleLogout} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 w-full">
          <Sidebar collapsible="icon" className="border-r w-32 data-[state=collapsed]:w-14">
            <SidebarHeader className="border-b p-2">
              <SidebarTrigger className="ml-auto">
                <ChevronLeft className="h-4 w-4" />
              </SidebarTrigger>
            </SidebarHeader>
            <SidebarContent className="overflow-y-auto">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {menuItems(user.type === "student" ? "teacher" : user.type).map((item) => {
                      const Icon = item.icon;
                      return (
                        <SidebarMenuItem key={item.value}>
                          <SidebarMenuButton
                            onClick={() => setActiveTab(item.value)}
                            isActive={activeTab === item.value}
                            tooltip={item.label}
                            className="w-full text-xs"
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <main className="flex-1 p-8">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
