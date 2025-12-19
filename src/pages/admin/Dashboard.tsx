import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Key, Upload, Database, BarChart, LogOut, ClipboardCheck, TrendingUp, FolderOpen, Trophy, FileText, ChevronLeft, ChevronRight, Mail, PackageOpen, Settings, Shield, FileCode, GraduationCap, Cog, MessageCircle, AlertTriangle, Music, BookOpen, BarChart3, PenLine } from "lucide-react";
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
import MindTalkInquiry from "@/components/admin/MindTalkInquiry";
import MindTalkKeywords from "@/components/admin/MindTalkKeywords";
import MindTalkMusic from "@/components/admin/MindTalkMusic";
import StorybookManager from "@/components/admin/StorybookManager";
import ReadingStatistics from "@/components/admin/ReadingStatistics";
import BookReportManager from "@/components/admin/BookReportManager";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { LucideIcon } from "lucide-react";

type MenuItem = {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
  bgColor: string;
};

const getMenuGroups = (user: AuthUser): MenuGroup[] => {
  const isSystemAdmin = user.type === "admin";
  
  const groups: MenuGroup[] = [];
  
  // 시스템 관리자만 - 데이터 관리
  if (isSystemAdmin) {
    groups.push({
      title: "데이터 관리",
      bgColor: "bg-slate-100 dark:bg-slate-800",
      items: [
        { value: "upload", label: "업로드", icon: Upload, color: "text-slate-500" },
        { value: "data", label: "데이터", icon: Database, color: "text-slate-500" },
      ]
    });
  }
  
  // 계정 관리
  groups.push({
    title: "계정 관리",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    items: [
      { value: "password", label: "비밀번호 재설정", icon: Key, color: "text-amber-500" },
      { value: "leaderboard", label: "순위", icon: Trophy, color: "text-yellow-500" },
    ]
  });
  
  // 상벌점/통계
  groups.push({
    title: "상벌점",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    items: [
      { value: "points", label: "상점", icon: BarChart, color: "text-emerald-500" },
      { value: "statistics", label: "통계", icon: TrendingUp, color: "text-emerald-500" },
    ]
  });
  
  // 커뮤니케이션
  groups.push({
    title: "커뮤니케이션",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    items: [
      { value: "email-history", label: "이메일", icon: Mail, color: "text-blue-500" },
      { value: "email-templates", label: "템플릿", icon: FileText, color: "text-blue-500" },
      { value: "counseling", label: "상담", icon: ClipboardCheck, color: "text-violet-500" },
    ]
  });
  
  // 마음톡
  groups.push({
    title: "마음톡",
    bgColor: "bg-pink-50 dark:bg-pink-900/20",
    items: [
      { value: "mindtalk", label: "마음톡", icon: MessageCircle, color: "text-pink-500" },
      { value: "mindtalk-keywords", label: "키워드관리", icon: AlertTriangle, color: "text-pink-500" },
      { value: "mindtalk-music", label: "힐링뮤직", icon: Music, color: "text-pink-500" },
    ]
  });
  
  // 독서
  groups.push({
    title: "독서",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    items: [
      { value: "storybooks", label: "동화책", icon: BookOpen, color: "text-orange-500" },
      { value: "book-reports", label: "독후감", icon: PenLine, color: "text-orange-500" },
      { value: "reading-stats", label: "읽기통계", icon: BarChart3, color: "text-orange-500" },
    ]
  });
  
  // 시스템 관리자만 - 시스템 설정
  if (isSystemAdmin) {
    groups.push({
      title: "시스템",
      bgColor: "bg-slate-100 dark:bg-slate-800",
      items: [
        { value: "system-settings", label: "시스템설정", icon: Cog, color: "text-slate-500" },
        { value: "export", label: "백업", icon: PackageOpen, color: "text-slate-500" },
        { value: "auto-backup", label: "자동백업", icon: Settings, color: "text-slate-500" },
        { value: "storage", label: "파일", icon: FolderOpen, color: "text-slate-500" },
        { value: "security-logs", label: "보안로그", icon: Shield, color: "text-slate-500" },
        { value: "db-logs", label: "DB로그", icon: FileCode, color: "text-slate-500" },
      ]
    });
  }
  
  return groups;
};

const menuItems = (user: AuthUser) => {
  return getMenuGroups(user).flatMap(group => group.items);
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
  const { setOpen, setOpenMobile, isMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleMenuClick = (value: string) => {
    setActiveTab(value);
    // 메뉴 선택 시 사이드바 자동 닫기 (모바일/데스크톱 모두 대응)
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  const menuGroups = getMenuGroups(user);

  return (
    <div className="flex flex-1 w-full">
      <Sidebar collapsible="icon" className="border-r w-32 data-[state=collapsed]:w-14 landscape:w-48">
        <SidebarHeader className="border-b p-2">
          <SidebarTrigger className="ml-auto">
            <ChevronLeft className="h-4 w-4" />
          </SidebarTrigger>
        </SidebarHeader>
        <SidebarContent className="overflow-y-auto">
          {menuGroups.map((group, groupIndex) => (
            <SidebarGroup key={group.title} className="py-1">
              {!isCollapsed && (
                <SidebarGroupLabel className={`text-xs font-medium px-2 py-1.5 mx-1 rounded ${group.bgColor}`}>
                  {group.title}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.value;
                    // 아이콘 색상에서 border 색상 추출 (text-xxx-500 -> border-xxx-500)
                    const borderColor = item.color.replace('text-', 'border-');
                    return (
                      <SidebarMenuItem key={item.value} className="relative">
                        {isActive && (
                          <div className={`absolute left-0 top-1 bottom-1 w-1 rounded-r ${borderColor.replace('border-', 'bg-')}`} />
                        )}
                        <SidebarMenuButton
                          onClick={() => handleMenuClick(item.value)}
                          isActive={isActive}
                          tooltip={item.label}
                          className="w-full text-xs pl-3"
                        >
                          <Icon className={`h-4 w-4 flex-shrink-0 ${item.color}`} />
                          <span className="truncate">{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
              {groupIndex < menuGroups.length - 1 && (
                <Separator className="mt-2 mx-1" />
              )}
            </SidebarGroup>
          ))}
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
      case "mindtalk":
        return <MindTalkInquiry userId={user.id} />;
      case "mindtalk-keywords":
        return <MindTalkKeywords adminId={user.id} />;
      case "mindtalk-music":
        return <MindTalkMusic adminId={user.id} />;
      case "storybooks":
        return <StorybookManager adminId={user.id} />;
      case "reading-stats":
        return <ReadingStatistics adminId={user.id} />;
      case "book-reports":
        return <BookReportManager adminId={user.id} />;
      case "statistics":
        return <UnifiedStatistics />;
      case "leaderboard":
        return <StudentLeaderboard onNavigateToCounseling={() => setActiveTab("counseling")} />;
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
