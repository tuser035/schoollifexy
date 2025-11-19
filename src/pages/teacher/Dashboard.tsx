import { useEffect, useState } from "react";
import { useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { logout, type AuthUser } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import Merit from "./Merit";
import Demerit from "./Demerit";
import Monthly from "./Monthly";
import DataViewPage from "./DataView";

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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <TeacherSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="border-b bg-card h-16 flex items-center">
            <div className="container mx-auto px-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">교사 대시보드</h1>
                  <p className="text-sm text-muted-foreground">
                    {user.name}님 환영합니다
                    {user.isHomeroom && user.grade && user.class && ` (${user.grade}-${user.class})`}
                  </p>
                </div>
              </div>
              <Button onClick={handleLogout} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </header>

          <main className="flex-1 container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Navigate to="/teacher/merit" replace />} />
              <Route path="/merit" element={<Merit />} />
              <Route path="/demerit" element={<Demerit />} />
              <Route path="/monthly" element={<Monthly />} />
              <Route path="/dataview" element={<DataViewPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default TeacherDashboard;
