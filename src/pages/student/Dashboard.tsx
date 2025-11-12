import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, AlertCircle, Star, LogOut } from "lucide-react";
import { logout, type AuthUser } from "@/lib/auth";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const authUser = localStorage.getItem("auth_user");
    if (!authUser) {
      navigate("/");
      return;
    }
    
    const parsedUser = JSON.parse(authUser);
    if (parsedUser.type !== "student") {
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
            <h1 className="text-2xl font-bold text-foreground">학생 대시보드</h1>
            <p className="text-muted-foreground">{user.name}님 ({user.studentId})</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-merit-blue">
            <CardHeader className="bg-merit-blue-light">
              <CardTitle className="flex items-center text-merit-blue">
                <Award className="w-5 h-5 mr-2" />
                상점
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-4xl font-bold text-merit-blue">0</div>
              <p className="text-muted-foreground mt-2">총 상점</p>
            </CardContent>
          </Card>

          <Card className="border-demerit-orange">
            <CardHeader className="bg-demerit-orange-light">
              <CardTitle className="flex items-center text-demerit-orange">
                <AlertCircle className="w-5 h-5 mr-2" />
                벌점
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-4xl font-bold text-demerit-orange">0</div>
              <p className="text-muted-foreground mt-2">총 벌점</p>
            </CardContent>
          </Card>

          <Card className="border-monthly-green">
            <CardHeader className="bg-monthly-green-light">
              <CardTitle className="flex items-center text-monthly-green">
                <Star className="w-5 h-5 mr-2" />
                이달의 학생
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-4xl font-bold text-monthly-green">0</div>
              <p className="text-muted-foreground mt-2">추천 횟수</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>상세 내역</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">상세 내역 기능 구현 중...</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudentDashboard;
