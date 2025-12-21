import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const StudentLogin = () => {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { loginStudent } = await import("@/lib/auth");
      const user = await loginStudent(studentId, password);
      
      localStorage.setItem("auth_user", JSON.stringify(user));
      toast.success(`환영합니다, ${user.name}님!`);
      navigate("/student/dashboard");
    } catch (error: any) {
      toast.error(error.message || "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="student-id">학번</Label>
        <Input
          id="student-id"
          type="text"
          placeholder="예: 111(1학년 1반 1번)"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="student-password">비밀번호</Label>
        <div className="relative">
          <Input
            id="student-password"
            type={showPassword ? "text" : "password"}
            placeholder="초기 비밀번호: 1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-student hover:bg-student/90 text-white"
        disabled={isLoading}
      >
        {isLoading ? "로그인 중..." : "학생 로그인"}
      </Button>
    </form>
  );
};

export default StudentLogin;
