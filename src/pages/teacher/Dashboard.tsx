import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, AlertCircle, Star, LogOut, Shield, Users, Mail, History } from "lucide-react";
import { logout, type AuthUser } from "@/lib/auth";
import MeritForm from "@/components/teacher/MeritForm";
import DemeritForm from "@/components/teacher/DemeritForm";
import MonthlyForm from "@/components/teacher/MonthlyForm";
import GroupTabs from "@/components/teacher/GroupTabs";
import BulkEmailSender from "@/components/teacher/BulkEmailSender";
import EmailHistory from "@/components/teacher/EmailHistory";
import TeacherRecordsList from "@/components/teacher/TeacherRecordsList";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState("merit");

  useEffect(() => {
    const authUser = localStorage.getItem("auth_user");
    if (!authUser) {
      navigate("/");
      return;
    }
    
    const parsedUser = JSON.parse(authUser);
    if (parsedUser.type !== "teacher") {
      navigate("/");
      return;
    }
    
    setUser(parsedUser);
  }, [navigate]);

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">교사 대시보드</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {user.name}님 환영합니다
              {user.isHomeroom && user.grade && user.class && ` (${user.grade}-${user.class})`}
            </p>
          </div>
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          {user.isAdmin && (
            <Button onClick={() => navigate("/admin/dashboard")} variant="outline" size="sm" className="h-8 sm:h-9 px-2 sm:px-3">
              <Shield className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">관리자 대시보드</span>
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
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6">
              <TabsTrigger 
                value="merit"
                className="data-[state=active]:bg-merit-blue data-[state=active]:text-white whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3"
              >
                <Award className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span>상점</span>
              </TabsTrigger>
              <TabsTrigger 
                value="demerit"
                className="data-[state=active]:bg-demerit-orange data-[state=active]:text-white whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3"
              >
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span>벌점</span>
              </TabsTrigger>
              <TabsTrigger 
                value="monthly"
                className="data-[state=active]:bg-monthly-green data-[state=active]:text-white whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3"
              >
                <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span>이달의학생</span>
              </TabsTrigger>
              <TabsTrigger 
                value="groups" 
                className="data-[state=active]:bg-groups-purple data-[state=active]:text-white whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3"
              >
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span>그룹</span>
              </TabsTrigger>
              <TabsTrigger 
                value="bulk-email" 
                className="data-[state=active]:bg-bulk-email-pink data-[state=active]:text-white whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3"
              >
                <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span>일괄발송</span>
              </TabsTrigger>
              <TabsTrigger 
                value="email-history" 
                className="data-[state=active]:bg-email-history-teal data-[state=active]:text-white whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3"
              >
                <History className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span>발송이력</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="merit">
            <Card>
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                <CardTitle className="text-merit-blue text-base sm:text-lg">상점 부여</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <MeritForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demerit">
            <Card>
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                <CardTitle className="text-demerit-orange text-base sm:text-lg">벌점 부여</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <DemeritForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly">
            <Card>
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                <CardTitle className="text-monthly-green text-base sm:text-lg">이달의 학생 추천</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <MonthlyForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups">
            <GroupTabs />
          </TabsContent>

          <TabsContent value="bulk-email">
            <BulkEmailSender isActive={activeTab === "bulk-email"} />
          </TabsContent>

          <TabsContent value="email-history">
            <EmailHistory />
          </TabsContent>
        </Tabs>

        {/* 교사가 부여한 기록 목록 */}
        <TeacherRecordsList teacherId={user.id} />
      </main>
    </div>
  );
};

export default TeacherDashboard;
