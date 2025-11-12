import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { loginAdmin } = await import("@/lib/auth");
      const user = await loginAdmin(email, password);
      
      localStorage.setItem("auth_user", JSON.stringify(user));
      toast.success("관리자 로그인 성공!");
      navigate("/admin/dashboard");
    } catch (error: any) {
      toast.error(error.message || "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="admin-email">이메일</Label>
        <Input
          id="admin-email"
          type="email"
          placeholder="admin@school.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-password">비밀번호</Label>
        <Input
          id="admin-password"
          type="password"
          placeholder="비밀번호를 입력하세요"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <Button 
        type="submit" 
        className="w-full bg-admin hover:bg-admin/90"
        disabled={isLoading}
      >
        {isLoading ? "로그인 중..." : "관리자 로그인"}
      </Button>
    </form>
  );
};

export default AdminLogin;
