import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const StudentLogin = () => {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
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
        <Label htmlFor="student-id">학번 (학년+반+번호)</Label>
        <Input
          id="student-id"
          type="text"
          placeholder="예: 10101 (1학년 1반 1번)"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="student-password">비밀번호</Label>
        <Input
          id="student-password"
          type="password"
          placeholder="초기 비밀번호: 12345678"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
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
