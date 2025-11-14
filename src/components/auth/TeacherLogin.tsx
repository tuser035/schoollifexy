import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const TeacherLogin = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // Format based on length
    if (digitsOnly.length <= 3) {
      return digitsOnly;
    } else if (digitsOnly.length <= 7) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
    } else {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { loginTeacher } = await import("@/lib/auth");
      const user = await loginTeacher(phone, password);
      
      localStorage.setItem("auth_user", JSON.stringify(user));
      toast.success(`환영합니다, ${user.name}님!`);
      navigate("/teacher/dashboard");
    } catch (error: any) {
      toast.error(error.message || "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="teacher-phone">휴대폰 번호</Label>
        <Input
          id="teacher-phone"
          type="tel"
          placeholder="010-1234-5678"
          value={phone}
          onChange={handlePhoneChange}
          maxLength={13}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="teacher-password">비밀번호</Label>
        <Input
          id="teacher-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <Button 
        type="submit" 
        className="w-full bg-teacher hover:bg-teacher/90"
        disabled={isLoading}
      >
        {isLoading ? "로그인 중..." : "교사 로그인"}
      </Button>
      
      <p className="text-sm text-center text-muted-foreground">
        스쿨포인트.상점 시스템 문의가 있으신가요?{" "}
        <a 
          href="https://mail.google.com/mail/?view=cm&fs=1&to=gyeongjuhs@naver.com&su=%EC%8A%A4%EC%BF%A8%ED%8F%AC%EC%9D%B8%ED%8A%B8%20%EC%8B%9C%EC%8A%A4%ED%85%9C%20%EB%AC%B8%EC%9D%98&body=%EB%AC%B8%EC%9D%98%20%EB%82%B4%EC%9A%A9%EC%9D%84%20%EC%9E%85%EB%A0%A5%ED%95%B4%EC%A3%BC%EC%84%B8%EC%9A%94.%0A%0A%EB%AC%B8%EC%9D%98%20%EC%9C%A0%ED%98%95%3A%20%5B%EB%A1%9C%EA%B7%B8%EC%9D%B8%20%EB%AC%B8%EC%A0%9C%20%2F%20%ED%8F%AC%EC%9D%B8%ED%8A%B8%20%EC%A1%B0%ED%9A%8C%20%2F%20%EA%B8%B0%ED%83%80%5D%0A%0A%EB%8B%B4%EB%8B%B9%EC%9E%90%3A%20%EA%B2%BD%EC%A3%BC%EC%A0%95%EB%B3%B4%EA%B3%A0%EB%93%B1%ED%95%99%EA%B5%90%20%EC%9D%B4%EC%A0%95%EC%9B%90"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          관리자에게 문의
        </a>
      </p>
    </form>
  );
};

export default TeacherLogin;
