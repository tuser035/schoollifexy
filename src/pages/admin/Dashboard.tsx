import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Upload, Database, BarChart, LogOut, ClipboardCheck, TrendingUp, FolderOpen, Trophy, FileText, Mail, PackageOpen, Settings, Shield, FileCode, GraduationCap, Cog, MessageCircle, AlertTriangle, Music, BookOpen, BarChart3, PenLine } from "lucide-react";
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
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TabItem = {
  value: string;
  label: string;
  icon: LucideIcon;
  bgColor: string;
  borderColor: string;
};

type TabGroup = {
  title: string;
  items: TabItem[];
};

const getTabGroups = (user: AuthUser): TabGroup[] => {
  const isSystemAdmin = user.type === "admin";
  
  const groups: TabGroup[] = [];
  
  // 시스템 관리자만 - 데이터 관리
  if (isSystemAdmin) {
    groups.push({
      title: "데이터 관리",
      items: [
        { value: "upload", label: "업로드", icon: Upload, bgColor: "bg-slate-500", borderColor: "border-slate-500" },
      ]
    });
  }
  
  // 계정 관리 - 데이터, 비밀번호변경
  groups.push({
    title: "계정 관리",
    items: [
      { value: "data", label: "데이터", icon: Database, bgColor: "bg-amber-500", borderColor: "border-amber-500" },
      { value: "password", label: "비밀번호", icon: Key, bgColor: "bg-amber-500", borderColor: "border-amber-500" },
    ]
  });
  
  // 상벌점 - 상점, 통계, 순위, 상담
  groups.push({
    title: "상벌점",
    items: [
      { value: "points", label: "상점", icon: BarChart, bgColor: "bg-emerald-500", borderColor: "border-emerald-500" },
      { value: "statistics", label: "통계", icon: TrendingUp, bgColor: "bg-emerald-500", borderColor: "border-emerald-500" },
      { value: "leaderboard", label: "순위", icon: Trophy, bgColor: "bg-emerald-500", borderColor: "border-emerald-500" },
      { value: "counseling", label: "상담", icon: ClipboardCheck, bgColor: "bg-emerald-500", borderColor: "border-emerald-500" },
    ]
  });
  
  // 일괄메일 - 이메일, 템플릿
  groups.push({
    title: "일괄메일",
    items: [
      { value: "email-history", label: "이메일", icon: Mail, bgColor: "bg-blue-500", borderColor: "border-blue-500" },
      { value: "email-templates", label: "템플릿", icon: FileText, bgColor: "bg-blue-500", borderColor: "border-blue-500" },
    ]
  });
  
  // 마음톡 - 마음톡, 키워드관리, 힐링뮤직
  groups.push({
    title: "마음톡",
    items: [
      { value: "mindtalk", label: "마음톡", icon: MessageCircle, bgColor: "bg-pink-500", borderColor: "border-pink-500" },
      { value: "mindtalk-keywords", label: "키워드", icon: AlertTriangle, bgColor: "bg-pink-500", borderColor: "border-pink-500" },
      { value: "mindtalk-music", label: "뮤직", icon: Music, bgColor: "bg-pink-500", borderColor: "border-pink-500" },
    ]
  });
  
  // 독서 - 추천도서, 독후감, 읽기통계
  groups.push({
    title: "독서",
    items: [
      { value: "storybooks", label: "추천도서", icon: BookOpen, bgColor: "bg-orange-500", borderColor: "border-orange-500" },
      { value: "book-reports", label: "독후감", icon: PenLine, bgColor: "bg-orange-500", borderColor: "border-orange-500" },
      { value: "reading-stats", label: "통계", icon: BarChart3, bgColor: "bg-orange-500", borderColor: "border-orange-500" },
    ]
  });
  
  // 시스템 관리자만 - 시스템 설정
  if (isSystemAdmin) {
    groups.push({
      title: "시스템",
      items: [
        { value: "system-settings", label: "설정", icon: Cog, bgColor: "bg-slate-600", borderColor: "border-slate-600" },
        { value: "export", label: "백업", icon: PackageOpen, bgColor: "bg-slate-600", borderColor: "border-slate-600" },
        { value: "auto-backup", label: "자동백업", icon: Settings, bgColor: "bg-slate-600", borderColor: "border-slate-600" },
        { value: "storage", label: "파일", icon: FolderOpen, bgColor: "bg-slate-600", borderColor: "border-slate-600" },
        { value: "security-logs", label: "보안", icon: Shield, bgColor: "bg-slate-600", borderColor: "border-slate-600" },
        { value: "db-logs", label: "DB", icon: FileCode, bgColor: "bg-slate-600", borderColor: "border-slate-600" },
      ]
    });
  }
  
  return groups;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>("password");
  const [activeGroup, setActiveGroup] = useState<string>("계정 관리");

  useEffect(() => {
    const authUser = localStorage.getItem("auth_user");
    if (!authUser) {
      navigate("/");
      return;
    }
    
    const parsedUser = JSON.parse(authUser);
    if (parsedUser.type !== "admin" && !(parsedUser.type === "teacher" && parsedUser.isAdmin)) {
      navigate("/");
      return;
    }
    
    setUser(parsedUser);
    const isSystemAdmin = parsedUser.type === "admin";
    const defaultTab = isSystemAdmin ? "upload" : "data";
    const defaultGroup = isSystemAdmin ? "데이터 관리" : "계정 관리";
    setActiveTab(defaultTab);
    setActiveGroup(defaultGroup);
  }, [navigate]);

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return null;
  }

  const tabGroups = getTabGroups(user);
  const currentGroup = tabGroups.find(g => g.title === activeGroup);
  const allTabs = tabGroups.flatMap(g => g.items);
  const currentTabItem = allTabs.find(t => t.value === activeTab);

  const handleGroupChange = (groupTitle: string) => {
    setActiveGroup(groupTitle);
    const group = tabGroups.find(g => g.title === groupTitle);
    if (group && group.items.length > 0) {
      setActiveTab(group.items[0].value);
    }
  };

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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">
              {user.type === "admin" ? "시스템 관리자" : user.isAdmin ? "관리자" : "데이터 조회"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {user.type === "admin" 
                ? user.email 
                : user.grade && user.class 
                  ? `${user.name} (${user.grade}-${user.class})`
                  : user.name
              }
            </p>
          </div>
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            {user.type === "teacher" && (
              <Button onClick={() => navigate("/teacher/dashboard")} variant="outline" size="sm" className="h-8 sm:h-9 px-2 sm:px-3" title="교사 대시보드">
                <GraduationCap className="w-4 h-4" />
              </Button>
            )}
            <Button onClick={handleLogout} variant="outline" size="sm" className="h-8 sm:h-9 px-2 sm:px-3">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">로그아웃</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* 카테고리 그룹 탭 - 교사 대시보드 스타일 */}
        <Tabs value={activeGroup} onValueChange={handleGroupChange} className="w-full mb-4">
          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
            <TabsList className="inline-flex w-auto min-w-full">
              {tabGroups.map((group) => (
                <TabsTrigger
                  key={group.title}
                  value={group.title}
                  className={cn(
                    "whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3",
                    `data-[state=active]:${group.items[0]?.bgColor} data-[state=active]:text-white`
                  )}
                  style={{
                    backgroundColor: activeGroup === group.title ? 
                      group.items[0]?.bgColor.replace('bg-', '').includes('slate') ? '#64748b' :
                      group.items[0]?.bgColor.replace('bg-', '').includes('amber') ? '#f59e0b' :
                      group.items[0]?.bgColor.replace('bg-', '').includes('emerald') ? '#10b981' :
                      group.items[0]?.bgColor.replace('bg-', '').includes('blue') ? '#3b82f6' :
                      group.items[0]?.bgColor.replace('bg-', '').includes('pink') ? '#ec4899' :
                      group.items[0]?.bgColor.replace('bg-', '').includes('orange') ? '#f97316' :
                      undefined : undefined,
                    color: activeGroup === group.title ? 'white' : undefined
                  }}
                >
                  {group.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        {/* 선택된 그룹의 하위 탭 - 교사 대시보드 스타일 */}
        {currentGroup && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="mb-4 sm:mb-6 overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              <TabsList className="inline-flex w-auto min-w-full">
                {currentGroup.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.value;
                  const bgColorValue = 
                    item.bgColor.includes('slate-500') ? '#64748b' :
                    item.bgColor.includes('slate-600') ? '#475569' :
                    item.bgColor.includes('amber') ? '#f59e0b' :
                    item.bgColor.includes('emerald') ? '#10b981' :
                    item.bgColor.includes('blue') ? '#3b82f6' :
                    item.bgColor.includes('pink') ? '#ec4899' :
                    item.bgColor.includes('orange') ? '#f97316' : undefined;
                  
                  return (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3"
                      style={{
                        backgroundColor: isActive ? bgColorValue : undefined,
                        color: isActive ? 'white' : undefined
                      }}
                    >
                      <Icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span>{item.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {currentGroup.items.map((item) => {
              const borderColorValue = 
                item.borderColor.includes('slate-500') ? 'rgba(100, 116, 139, 0.3)' :
                item.borderColor.includes('slate-600') ? 'rgba(71, 85, 105, 0.3)' :
                item.borderColor.includes('amber') ? 'rgba(245, 158, 11, 0.3)' :
                item.borderColor.includes('emerald') ? 'rgba(16, 185, 129, 0.3)' :
                item.borderColor.includes('blue') ? 'rgba(59, 130, 246, 0.3)' :
                item.borderColor.includes('pink') ? 'rgba(236, 72, 153, 0.3)' :
                item.borderColor.includes('orange') ? 'rgba(249, 115, 22, 0.3)' : undefined;
              
              const textColorValue = 
                item.bgColor.includes('slate-500') ? '#64748b' :
                item.bgColor.includes('slate-600') ? '#475569' :
                item.bgColor.includes('amber') ? '#f59e0b' :
                item.bgColor.includes('emerald') ? '#10b981' :
                item.bgColor.includes('blue') ? '#3b82f6' :
                item.bgColor.includes('pink') ? '#ec4899' :
                item.bgColor.includes('orange') ? '#f97316' : undefined;

              return (
                <TabsContent key={item.value} value={item.value}>
                  <Card style={{ borderColor: borderColorValue }}>
                    <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                      <CardTitle className="text-base sm:text-lg" style={{ color: textColorValue }}>
                        {item.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6">
                      {renderContent()}
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
