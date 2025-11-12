import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Upload, Database, BarChart, LogOut } from "lucide-react";
import { logout, type AuthUser } from "@/lib/auth";
import PasswordReset from "@/components/admin/PasswordReset";
import BulkUpload from "@/components/admin/BulkUpload";
import DataInquiry from "@/components/admin/DataInquiry";
import PointsInquiry from "@/components/admin/PointsInquiry";

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
    if (parsedUser.type !== "admin") {
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
            <h1 className="text-2xl font-bold text-foreground">관리자 대시보드</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="password">
              <Key className="w-4 h-4 mr-2" />
              비밀번호 재설정
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-2" />
              대량 업로드
            </TabsTrigger>
            <TabsTrigger value="data">
              <Database className="w-4 h-4 mr-2" />
              데이터 조회
            </TabsTrigger>
            <TabsTrigger value="points">
              <BarChart className="w-4 h-4 mr-2" />
              상점 조회
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
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
