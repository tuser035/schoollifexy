import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, AlertCircle, Star, LogOut, Shield } from "lucide-react";
import { logout, type AuthUser } from "@/lib/auth";
import MeritForm from "@/components/teacher/MeritForm";
import DemeritForm from "@/components/teacher/DemeritForm";
import MonthlyForm from "@/components/teacher/MonthlyForm";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);

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
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">교사 대시보드</h1>
            <p className="text-muted-foreground break-words max-w-[200px] sm:max-w-none">
              {user.name}님 환영합니다
              {user.isHomeroom && user.grade && user.class && ` (${user.grade}-${user.class})`}
            </p>
          </div>
          <div className="flex gap-2">
          {user.isAdmin && (
            <Button onClick={() => navigate("/admin/dashboard")} variant="outline" size="sm">
              <Shield className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">관리자 대시보드</span>
            </Button>
          )}
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">로그아웃</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="merit" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger 
              value="merit"
              className="data-[state=active]:bg-merit-blue data-[state=active]:text-white"
            >
              <Award className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">상점 부여</span>
            </TabsTrigger>
            <TabsTrigger 
              value="demerit"
              className="data-[state=active]:bg-demerit-orange data-[state=active]:text-white"
            >
              <AlertCircle className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">벌점 부여</span>
            </TabsTrigger>
            <TabsTrigger 
              value="monthly"
              className="data-[state=active]:bg-monthly-green data-[state=active]:text-white"
            >
              <Star className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">이달의 학생</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="merit">
            <Card>
              <CardHeader>
                <CardTitle className="text-merit-blue">상점 부여</CardTitle>
              </CardHeader>
              <CardContent>
                <MeritForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="demerit">
            <Card>
              <CardHeader>
                <CardTitle className="text-demerit-orange">벌점 부여</CardTitle>
              </CardHeader>
              <CardContent>
                <DemeritForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly">
            <Card>
              <CardHeader>
                <CardTitle className="text-monthly-green">이달의 학생 추천</CardTitle>
              </CardHeader>
              <CardContent>
                <MonthlyForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TeacherDashboard;
