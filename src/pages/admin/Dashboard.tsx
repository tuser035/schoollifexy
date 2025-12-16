import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Key, Upload, Database, BarChart, LogOut, ClipboardCheck, TrendingUp, FolderOpen, Trophy, FileText, ChevronLeft, ChevronRight, Mail, PackageOpen, Settings, Shield, FileCode, GraduationCap, Cog } from "lucide-react";
import { logout, type AuthUser } from "@/lib/auth";
import PasswordReset from "@/components/admin/PasswordReset";
import BulkUpload from "@/components/admin/BulkUpload";
import DataInquiry from "@/components/admin/DataInquiry";
import PointsInquiry from "@/components/admin/PointsInquiry";
import CounselingInquiry from "@/components/admin/CounselingInquiry";
import UnifiedStatistics from "@/components/admin/UnifiedStatistics";
import StorageManager from "@/components/admin/StorageManager";
import StudentLeaderboard from "@/components/admin/StudentLeaderboard";
import { EmailHistory } from "@/components/admin/EmailHistory";
import EmailTemplateManager from "@/components/admin/EmailTemplateManager";
import DataExport from "@/components/admin/DataExport";
import AutoBackupSettings from "@/components/admin/AutoBackupSettings";
import { SecurityLogs } from "@/components/admin/SecurityLogs";
import DatabaseLogs from "@/components/admin/DatabaseLogs";
import SystemSettings from "@/components/admin/SystemSettings";
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

const menuItems = (user: AuthUser) => {
  const isSystemAdmin = user.type === "admin";
  const isAdminTeacher = user.type === "teacher" && user.isAdmin;
  
  const items = [
    // 시스템 관리자만
    ...(isSystemAdmin ? [
      { value: "upload", label: "업로드", icon: Upload },
    ] : []),
    // 모든 사용자 (관리자 교사와 시스템 관리자)
    { value: "data", label: "데이터", icon: Database },
    { value: "password", label: "비밀번호 재설정", icon: Key },
    { value: "points", label: "상점", icon: BarChart },
    { value: "counseling", label: "상담", icon: ClipboardCheck },
    { value: "statistics", label: "통계", icon: TrendingUp },
    { value: "leaderboard", label: "순위", icon: Trophy },
    { value: "email-history", label: "이메일", icon: Mail },
    { value: "email-templates", label: "템플릿", icon: FileText },
    // 시스템 관리자만
    ...(isSystemAdmin ? [
      { value: "system-settings", label: "시스템설정", icon: Cog },
      { value: "export", label: "백업", icon: PackageOpen },
      { value: "auto-backup", label: "자동백업", icon: Settings },
      { value: "storage", label: "파일", icon: FolderOpen },
      { value: "security-logs", label: "보안로그", icon: Shield },
      { value: "db-logs", label: "DB로그", icon: FileCode },
    ] : []),
  ];
  return items;
};

// 사이드바 콘텐츠 컴포넌트 (useSidebar 훅 사용을 위해 분리)
const DashboardContent = ({ 
  user, 
  activeTab, 
  setActiveTab, 
  renderContent 
}: { 
  user: AuthUser; 
  activeTab: string; 
  setActiveTab: (tab: string) => void; 
  renderContent: () => React.ReactNode;
}) => {
  const { setOpen } = useSidebar();

  const handleMenuClick = (value: string) => {
    setActiveTab(value);
    setOpen(false); // 메뉴 선택 시 사이드바 자동 닫기
  };

  return (
    <div className="flex flex-1 w-full">
      <Sidebar collapsible="icon" className="border-r w-32 data-[state=collapsed]:w-14 landscape:w-48">
        <SidebarHeader className="border-b p-2">
          <SidebarTrigger className="ml-auto">
            <ChevronLeft className="h-4 w-4" />
          </SidebarTrigger>
        </SidebarHeader>
        <SidebarContent className="overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {menuItems(user).map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        onClick={() => handleMenuClick(item.value)}
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

      <main className="flex-1 p-2 sm:p-4 md:p-8 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
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
    // 시스템 관리자 또는 관리자 권한이 있는 교사만 접근 가능
    if (parsedUser.type !== "admin" && !(parsedUser.type === "teacher" && parsedUser.isAdmin)) {
      navigate("/");
      return;
    }
    
    setUser(parsedUser);
    // 기본 탭 설정
    const isSystemAdmin = parsedUser.type === "admin";
    const defaultTab = isSystemAdmin ? "upload" : "data";
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
        return <PasswordReset currentUser={user} />;
      case "upload":
        return <BulkUpload />;
      case "data":
        return <DataInquiry />;
      case "points":
        return <PointsInquiry />;
      case "counseling":
        return <CounselingInquiry />;
      case "statistics":
        return <UnifiedStatistics />;
      case "leaderboard":
        return <StudentLeaderboard />;
      case "email-history":
        return <EmailHistory />;
      case "email-templates":
        return <EmailTemplateManager />;
      case "system-settings":
        return <SystemSettings />;
      case "export":
        return <DataExport />;
      case "auto-backup":
        return <AutoBackupSettings />;
      case "storage":
        return <StorageManager />;
      case "security-logs":
        return <SecurityLogs />;
      case "db-logs":
        return <DatabaseLogs />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen w-full flex flex-col bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-foreground">
                  {user.type === "admin" ? "시스템 관리자 대시보드" : user.isAdmin ? "관리자 대시보드" : "데이터 조회"}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {user.type === "admin" 
                    ? user.email 
                    : user.grade && user.class 
                      ? `${user.name} (${user.grade}-${user.class})`
                      : user.name
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-1 sm:gap-2">
              {user.type === "teacher" && (
                <Button onClick={() => navigate("/teacher/dashboard")} variant="outline" size="sm">
                  <GraduationCap className="w-4 h-4 mr-1" />
                  교사 대시보드
                </Button>
              )}
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">로그아웃</span>
              </Button>
            </div>
          </div>
        </header>

        <DashboardContent 
          user={user} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          renderContent={renderContent} 
        />
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
