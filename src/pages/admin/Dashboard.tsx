import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Upload, Database, BarChart, LogOut, ClipboardCheck, TrendingUp, FolderOpen, Trophy, FileText } from "lucide-react";
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
            <p className="text-muted-foreground">
              {user.type === "admin" 
                ? user.email 
                : user.grade && user.class 
                  ? `${user.name} (${user.grade}-${user.class})`
                  : user.name
              }
            </p>
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
        <Tabs defaultValue={user.type === "teacher" ? "data" : "password"} className="w-full flex gap-6">
          <TabsList className="flex flex-col h-fit w-48 p-2 gap-1">
            {user.type === "admin" && (
              <>
                <TabsTrigger value="password" className="w-full justify-start">
                  <Key className="w-4 h-4 mr-2" />
                  비밀번호
                </TabsTrigger>
                <TabsTrigger value="upload" className="w-full justify-start">
                  <Upload className="w-4 h-4 mr-2" />
                  업로드
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="data" className="w-full justify-start">
              <Database className="w-4 h-4 mr-2" />
              데이터
            </TabsTrigger>
            <TabsTrigger value="points" className="w-full justify-start">
              <BarChart className="w-4 h-4 mr-2" />
              상점
            </TabsTrigger>
            {user.type === "admin" && (
              <TabsTrigger value="counseling" className="w-full justify-start">
                <ClipboardCheck className="w-4 h-4 mr-2" />
                상담
              </TabsTrigger>
            )}
            <TabsTrigger value="statistics" className="w-full justify-start">
              <TrendingUp className="w-4 h-4 mr-2" />
              통계
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="w-full justify-start">
              <Trophy className="w-4 h-4 mr-2" />
              순위
            </TabsTrigger>
            <TabsTrigger value="email-history" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              이메일
            </TabsTrigger>
            {user.type === "admin" && (
              <TabsTrigger value="email-templates" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                템플릿
              </TabsTrigger>
            )}
            {user.type === "admin" && (
              <TabsTrigger value="storage" className="w-full justify-start">
                <FolderOpen className="w-4 h-4 mr-2" />
                파일
              </TabsTrigger>
            )}
          </TabsList>
          
          <div className="flex-1">{/* 컨텐츠 래퍼 */}

          {user.type === "admin" && (
            <>
              <TabsContent value="password">
                <PasswordReset />
              </TabsContent>

              <TabsContent value="upload">
                <BulkUpload />
              </TabsContent>
            </>
          )}

          <TabsContent value="data">
            <DataInquiry />
          </TabsContent>

          <TabsContent value="points">
            <PointsInquiry />
          </TabsContent>

          {user.type === "admin" && (
            <TabsContent value="counseling">
              <CounselingInquiry />
            </TabsContent>
          )}

          <TabsContent value="statistics">
            <StatisticsChart />
          </TabsContent>

          <TabsContent value="leaderboard">
            <StudentLeaderboard />
          </TabsContent>

          <TabsContent value="email-history">
            <EmailHistory />
          </TabsContent>

          {user.type === "admin" && (
            <TabsContent value="email-templates">
              <EmailTemplateManager />
            </TabsContent>
          )}

          {user.type === "admin" && (
            <TabsContent value="storage">
              <StorageManager />
            </TabsContent>
          )}
          </div>{/* 컨텐츠 래퍼 종료 */}
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
