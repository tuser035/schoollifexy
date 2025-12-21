import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Key, Upload, Database, BarChart, LogOut, ClipboardCheck, TrendingUp, FolderOpen, Trophy, FileText, Mail, PackageOpen, Settings, Shield, FileCode, GraduationCap, Cog, MessageCircle, AlertTriangle, Music, BookOpen, BarChart3, PenLine, Layers } from "lucide-react";
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
import StorybookCategories from "@/components/admin/StorybookCategories";
import { LucideIcon } from "lucide-react";

type TabItem = {
  value: string;
  label: string;
  icon: LucideIcon;
  activeClass: string;
  borderClass: string;
  textClass: string;
  cardTitle: string;
  category: string;
  description?: string;
};

type TabGroup = {
  name: string;
  label: string;
  items: TabItem[];
};

const getTabGroups = (user: AuthUser): TabGroup[] => {
  const isSystemAdmin = user.type === "admin";
  
  const groups: TabGroup[] = [];
  
  // 시스템 관리자만 - 업로드
  if (isSystemAdmin) {
    groups.push({
      name: "upload",
      label: "업로드",
      items: [
        { 
          value: "upload", 
          label: "업로드", 
          icon: Upload, 
          activeClass: "data-[state=active]:bg-data-inquiry-indigo data-[state=active]:text-white",
          borderClass: "border-data-inquiry-indigo/30",
          textClass: "text-data-inquiry-indigo",
          cardTitle: "데이터 업로드",
          category: "upload"
        }
      ]
    });
  }
  
  // 계정 관리
  groups.push({
    name: "account",
    label: "계정",
    items: [
      { 
        value: "data", 
        label: "데이터", 
        icon: Database, 
        activeClass: "data-[state=active]:bg-merit-blue data-[state=active]:text-white",
        borderClass: "border-merit-blue/30",
        textClass: "text-merit-blue",
        cardTitle: "데이터 조회",
        category: "account"
      },
      { 
        value: "password", 
        label: "비밀번호", 
        icon: Key, 
        activeClass: "data-[state=active]:bg-merit-blue data-[state=active]:text-white",
        borderClass: "border-merit-blue/30",
        textClass: "text-merit-blue",
        cardTitle: "비밀번호 재설정",
        category: "account"
      }
    ]
  });
  
  // 상벌점
  groups.push({
    name: "points",
    label: "상벌점",
    items: [
      { 
        value: "points", 
        label: "상점", 
        icon: BarChart, 
        activeClass: "data-[state=active]:bg-demerit-orange data-[state=active]:text-white",
        borderClass: "border-demerit-orange/30",
        textClass: "text-demerit-orange",
        cardTitle: "상점 조회",
        category: "points"
      },
      { 
        value: "statistics", 
        label: "통계", 
        icon: TrendingUp, 
        activeClass: "data-[state=active]:bg-demerit-orange data-[state=active]:text-white",
        borderClass: "border-demerit-orange/30",
        textClass: "text-demerit-orange",
        cardTitle: "통계",
        category: "points"
      },
      { 
        value: "leaderboard", 
        label: "순위", 
        icon: Trophy, 
        activeClass: "data-[state=active]:bg-demerit-orange data-[state=active]:text-white",
        borderClass: "border-demerit-orange/30",
        textClass: "text-demerit-orange",
        cardTitle: "학생 순위",
        category: "points"
      },
      { 
        value: "counseling", 
        label: "상담", 
        icon: ClipboardCheck, 
        activeClass: "data-[state=active]:bg-demerit-orange data-[state=active]:text-white",
        borderClass: "border-demerit-orange/30",
        textClass: "text-demerit-orange",
        cardTitle: "상담 기록",
        category: "points"
      }
    ]
  });
  
  // 일괄메일
  groups.push({
    name: "email",
    label: "메일",
    items: [
      { 
        value: "email-history", 
        label: "이메일", 
        icon: Mail, 
        activeClass: "data-[state=active]:bg-monthly-green data-[state=active]:text-white",
        borderClass: "border-monthly-green/30",
        textClass: "text-monthly-green",
        cardTitle: "이메일 발송 이력",
        category: "email"
      },
      { 
        value: "email-templates", 
        label: "템플릿", 
        icon: FileText, 
        activeClass: "data-[state=active]:bg-monthly-green data-[state=active]:text-white",
        borderClass: "border-monthly-green/30",
        textClass: "text-monthly-green",
        cardTitle: "이메일 템플릿",
        category: "email"
      }
    ]
  });
  
  // 마음톡
  groups.push({
    name: "mindtalk",
    label: "마음톡",
    items: [
      { 
        value: "mindtalk", 
        label: "마음톡", 
        icon: MessageCircle, 
        activeClass: "data-[state=active]:bg-pink-500 data-[state=active]:text-white",
        borderClass: "border-pink-500/30",
        textClass: "text-pink-600",
        cardTitle: "마음톡 조회",
        category: "mindtalk"
      },
      { 
        value: "mindtalk-keywords", 
        label: "키워드", 
        icon: AlertTriangle, 
        activeClass: "data-[state=active]:bg-pink-500 data-[state=active]:text-white",
        borderClass: "border-pink-500/30",
        textClass: "text-pink-600",
        cardTitle: "키워드 관리",
        category: "mindtalk"
      },
      { 
        value: "mindtalk-music", 
        label: "뮤직", 
        icon: Music, 
        activeClass: "data-[state=active]:bg-pink-500 data-[state=active]:text-white",
        borderClass: "border-pink-500/30",
        textClass: "text-pink-600",
        cardTitle: "힐링 뮤직",
        category: "mindtalk"
      }
    ]
  });
  
  // 인문학 서점
  groups.push({
    name: "reading",
    label: "인문학 서점",
    items: [
      { 
        value: "storybook-categories", 
        label: "카테고리", 
        icon: Layers, 
        activeClass: "data-[state=active]:bg-teal-500 data-[state=active]:text-white",
        borderClass: "border-teal-500/30",
        textClass: "text-teal-600",
        cardTitle: "카테고리 관리",
        category: "reading"
      },
      { 
        value: "storybooks", 
        label: "동화책 관리", 
        icon: BookOpen, 
        activeClass: "data-[state=active]:bg-teal-500 data-[state=active]:text-white",
        borderClass: "border-teal-500/30",
        textClass: "text-teal-600",
        cardTitle: "동화책 관리",
        category: "reading"
      },
      { 
        value: "book-reports", 
        label: "독후감", 
        icon: PenLine, 
        activeClass: "data-[state=active]:bg-teal-500 data-[state=active]:text-white",
        borderClass: "border-teal-500/30",
        textClass: "text-teal-600",
        cardTitle: "독후감 관리",
        category: "reading"
      },
      { 
        value: "reading-stats", 
        label: "읽기통계", 
        icon: BarChart3, 
        activeClass: "data-[state=active]:bg-teal-500 data-[state=active]:text-white",
        borderClass: "border-teal-500/30",
        textClass: "text-teal-600",
        cardTitle: "읽기 통계",
        category: "reading"
      }
    ]
  });
  
  // 시스템 관리자만 - 시스템 설정
  if (isSystemAdmin) {
    groups.push({
      name: "system",
      label: "시스템",
      items: [
        { 
          value: "system-settings", 
          label: "설정", 
          icon: Cog, 
          activeClass: "data-[state=active]:bg-email-history-teal data-[state=active]:text-white",
          borderClass: "border-email-history-teal/30",
          textClass: "text-email-history-teal",
          cardTitle: "설정",
          category: "system",
          description: "학교명, 심볼, 파비콘, 이메일 회신 주소 등 기본 설정을 관리합니다."
        },
        { 
          value: "export", 
          label: "백업", 
          icon: PackageOpen, 
          activeClass: "data-[state=active]:bg-email-history-teal data-[state=active]:text-white",
          borderClass: "border-email-history-teal/30",
          textClass: "text-email-history-teal",
          cardTitle: "데이터 백업",
          category: "system",
          description: "모든 데이터를 CSV 또는 JSON 형식으로 내보내고 복원합니다."
        },
        { 
          value: "auto-backup", 
          label: "자동백업", 
          icon: Settings, 
          activeClass: "data-[state=active]:bg-email-history-teal data-[state=active]:text-white",
          borderClass: "border-email-history-teal/30",
          textClass: "text-email-history-teal",
          cardTitle: "자동 백업 설정",
          category: "system",
          description: "정기적인 자동 백업 스케줄을 설정하고 관리합니다."
        },
        { 
          value: "storage", 
          label: "파일", 
          icon: FolderOpen, 
          activeClass: "data-[state=active]:bg-email-history-teal data-[state=active]:text-white",
          borderClass: "border-email-history-teal/30",
          textClass: "text-email-history-teal",
          cardTitle: "파일 관리",
          category: "system",
          description: "업로드된 이미지, 첨부파일 등 저장소 파일을 관리합니다."
        },
        { 
          value: "security-logs", 
          label: "보안", 
          icon: Shield, 
          activeClass: "data-[state=active]:bg-email-history-teal data-[state=active]:text-white",
          borderClass: "border-email-history-teal/30",
          textClass: "text-email-history-teal",
          cardTitle: "보안 로그",
          category: "system",
          description: "로그인 시도, 권한 변경 등 보안 관련 활동 기록을 확인합니다."
        },
        { 
          value: "db-logs", 
          label: "DB", 
          icon: FileCode, 
          activeClass: "data-[state=active]:bg-email-history-teal data-[state=active]:text-white",
          borderClass: "border-email-history-teal/30",
          textClass: "text-email-history-teal",
          cardTitle: "DB 로그",
          category: "system",
          description: "데이터베이스 변경 이력 및 감사 로그를 조회합니다."
        }
      ]
    });
  }
  
  return groups;
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

  const tabGroups = getTabGroups(user);
  const allItems = tabGroups.flatMap(g => g.items);
  const currentTab = allItems.find(t => t.value === activeTab);

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
      case "storybook-categories":
        return <StorybookCategories adminId={user.id} />;
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
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full" style={{ gridTemplateColumns: `repeat(${allItems.length}, minmax(0, 1fr))` }}>
              {allItems.map((item) => {
                const Icon = item.icon;
                return (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className={`whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 ${item.activeClass}`}
                  >
                    <Icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span>{item.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {allItems.map((item) => (
            <TabsContent key={item.value} value={item.value}>
              <Card className={item.borderClass}>
                <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                  <CardTitle className={`text-base sm:text-lg ${item.textClass}`}>
                    {item.cardTitle}
                  </CardTitle>
                  {item.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  )}
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
