import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Upload, Database, BarChart, LogOut, ClipboardCheck, TrendingUp, FolderOpen, Trophy, Calendar, FileText } from "lucide-react";
import { logout, type AuthUser } from "@/lib/auth";
import PasswordReset from "@/components/admin/PasswordReset";
import BulkUpload from "@/components/admin/BulkUpload";
import DataInquiry from "@/components/admin/DataInquiry";
import PointsInquiry from "@/components/admin/PointsInquiry";
import CounselingInquiry from "@/components/admin/CounselingInquiry";
import StatisticsChart from "@/components/admin/StatisticsChart";
import StorageManager from "@/components/admin/StorageManager";
import StudentLeaderboard from "@/components/admin/StudentLeaderboard";
import GoogleCalendar from "@/components/admin/GoogleCalendar";
import PDFScheduleUpload from "@/components/admin/PDFScheduleUpload";
import WeeklyMeetingUpload from "@/components/admin/WeeklyMeetingUpload";
import EdufineUpload from "@/components/admin/EdufineUpload";
import EdufineDocumentStorage from "@/components/admin/EdufineDocumentStorage";
import EdufineInquiry from "@/components/admin/EdufineInquiry";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);

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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {user.type === "admin" ? "관리자 대시보드" : "데이터 조회"}
            </h1>
            <p className="text-muted-foreground">{user.email || user.name}</p>
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

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-11 mb-6">
            <TabsTrigger value="password">
              <Key className="w-4 h-4 mr-2" />
              비밀번호
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-2" />
              업로드
            </TabsTrigger>
            <TabsTrigger value="data">
              <Database className="w-4 h-4 mr-2" />
              데이터
            </TabsTrigger>
            <TabsTrigger value="points">
              <BarChart className="w-4 h-4 mr-2" />
              상점
            </TabsTrigger>
            <TabsTrigger value="counseling">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              상담
            </TabsTrigger>
            <TabsTrigger value="statistics">
              <TrendingUp className="w-4 h-4 mr-2" />
              통계
            </TabsTrigger>
            <TabsTrigger value="leaderboard">
              <Trophy className="w-4 h-4 mr-2" />
              순위
            </TabsTrigger>
            <TabsTrigger value="storage">
              <FolderOpen className="w-4 h-4 mr-2" />
              파일
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="w-4 h-4 mr-2" />
              업무
            </TabsTrigger>
            <TabsTrigger value="weekly-meeting">
              <Calendar className="w-4 h-4 mr-2" />
              회의
            </TabsTrigger>
            <TabsTrigger value="edufine">
              <FileText className="w-4 h-4 mr-2" />
              에듀파인
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password">
            <PasswordReset />
          </TabsContent>

          <TabsContent value="upload">
            <BulkUpload />
          </TabsContent>

          <TabsContent value="data">
            <DataInquiry />
          </TabsContent>

          <TabsContent value="points">
            <PointsInquiry />
          </TabsContent>

          <TabsContent value="counseling">
            <CounselingInquiry />
          </TabsContent>

          <TabsContent value="statistics">
            <StatisticsChart />
          </TabsContent>

          <TabsContent value="leaderboard">
            <StudentLeaderboard />
          </TabsContent>

          <TabsContent value="storage" className="space-y-6">
            <EdufineDocumentStorage />
            <StorageManager />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <EdufineUpload />
          </TabsContent>

          <TabsContent value="weekly-meeting" className="space-y-6">
            <WeeklyMeetingUpload />
          </TabsContent>

          <TabsContent value="edufine">
            <EdufineInquiry />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
