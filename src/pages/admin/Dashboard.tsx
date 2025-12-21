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

type TabItem = {
  value: string;
  label: string;
  icon: LucideIcon;
  bgColor: string;
  cardTitle: string;
};

const getTabItems = (user: AuthUser): TabItem[] => {
  const isSystemAdmin = user.type === "admin";
  
  const items: TabItem[] = [];
  
  // 시스템 관리자만 - 업로드
  if (isSystemAdmin) {
    items.push({ value: "upload", label: "업로드", icon: Upload, bgColor: "#64748b", cardTitle: "데이터 업로드" });
  }
  
  // 계정 관리
  items.push({ value: "data", label: "데이터", icon: Database, bgColor: "#f59e0b", cardTitle: "데이터 조회" });
  items.push({ value: "password", label: "비밀번호", icon: Key, bgColor: "#f59e0b", cardTitle: "비밀번호 재설정" });
  
  // 상벌점
  items.push({ value: "points", label: "상점", icon: BarChart, bgColor: "#10b981", cardTitle: "상점 조회" });
  items.push({ value: "statistics", label: "통계", icon: TrendingUp, bgColor: "#10b981", cardTitle: "통계" });
  items.push({ value: "leaderboard", label: "순위", icon: Trophy, bgColor: "#10b981", cardTitle: "학생 순위" });
  items.push({ value: "counseling", label: "상담", icon: ClipboardCheck, bgColor: "#10b981", cardTitle: "상담 기록" });
  
  // 일괄메일
  items.push({ value: "email-history", label: "이메일", icon: Mail, bgColor: "#3b82f6", cardTitle: "이메일 발송 이력" });
  items.push({ value: "email-templates", label: "템플릿", icon: FileText, bgColor: "#3b82f6", cardTitle: "이메일 템플릿" });
  
  // 마음톡
  items.push({ value: "mindtalk", label: "마음톡", icon: MessageCircle, bgColor: "#ec4899", cardTitle: "마음톡 조회" });
  items.push({ value: "mindtalk-keywords", label: "키워드", icon: AlertTriangle, bgColor: "#ec4899", cardTitle: "키워드 관리" });
  items.push({ value: "mindtalk-music", label: "뮤직", icon: Music, bgColor: "#ec4899", cardTitle: "힐링 뮤직" });
  
  // 독서
  items.push({ value: "storybooks", label: "추천도서", icon: BookOpen, bgColor: "#f97316", cardTitle: "추천도서 관리" });
  items.push({ value: "book-reports", label: "독후감", icon: PenLine, bgColor: "#f97316", cardTitle: "독후감 관리" });
  items.push({ value: "reading-stats", label: "읽기통계", icon: BarChart3, bgColor: "#f97316", cardTitle: "읽기 통계" });
  
  // 시스템 관리자만 - 시스템 설정
  if (isSystemAdmin) {
    items.push({ value: "system-settings", label: "설정", icon: Cog, bgColor: "#475569", cardTitle: "시스템 설정" });
    items.push({ value: "export", label: "백업", icon: PackageOpen, bgColor: "#475569", cardTitle: "데이터 백업" });
    items.push({ value: "auto-backup", label: "자동백업", icon: Settings, bgColor: "#475569", cardTitle: "자동 백업 설정" });
    items.push({ value: "storage", label: "파일", icon: FolderOpen, bgColor: "#475569", cardTitle: "파일 관리" });
    items.push({ value: "security-logs", label: "보안", icon: Shield, bgColor: "#475569", cardTitle: "보안 로그" });
    items.push({ value: "db-logs", label: "DB", icon: FileCode, bgColor: "#475569", cardTitle: "DB 로그" });
  }
  
  return items;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>("data");

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
    setActiveTab(isSystemAdmin ? "upload" : "data");
  }, [navigate]);

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return null;
  }

  const tabItems = getTabItems(user);
  const currentTab = tabItems.find(t => t.value === activeTab);

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mb-4 sm:mb-6 overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
            <TabsList className="inline-flex w-auto min-w-full">
              {tabItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.value;
                
                return (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3"
                    style={{
                      backgroundColor: isActive ? item.bgColor : undefined,
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

          {tabItems.map((item) => (
            <TabsContent key={item.value} value={item.value}>
              <Card style={{ borderColor: `${item.bgColor}4D` }}>
                <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                  <CardTitle className="text-base sm:text-lg" style={{ color: item.bgColor }}>
                    {item.cardTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  {renderContent()}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
