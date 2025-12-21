import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminLogin = () => {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [kakaoChatUrl, setKakaoChatUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadKakaoUrl = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'kakao_chat_url')
          .single();
        if (data?.setting_value) {
          setKakaoChatUrl(data.setting_value);
        }
      } catch (error) {
        console.error('Failed to load kakao chat url:', error);
      }
    };
    loadKakaoUrl();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { loginAdmin } = await import("@/lib/auth");
      const user = await loginAdmin(emailOrPhone, password);
      
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
        <Label htmlFor="admin-email-or-phone">이메일 또는 전화번호</Label>
        <Input
          id="admin-email-or-phone"
          type="text"
          placeholder="ID@gbe.kr 또는 010-0000-0000"
          value={emailOrPhone}
          onChange={(e) => {
            const value = e.target.value;
            
            // 이메일 형식이면 그대로 사용
            if (value.includes('@')) {
              setEmailOrPhone(value);
              return;
            }
            
            // 숫자가 하나라도 있으면 전화번호로 처리
            const hasDigit = /\d/.test(value);
            if (!hasDigit) {
              // 숫자가 없으면 그대로 입력 (이메일 입력 중)
              setEmailOrPhone(value);
              return;
            }
            
            // 전화번호 형식이면 자동으로 하이픈 추가
            const digitsOnly = value.replace(/\D/g, '');
            let formatted = digitsOnly;
            
            if (digitsOnly.length <= 3) {
              formatted = digitsOnly;
            } else if (digitsOnly.length <= 7) {
              formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
            } else if (digitsOnly.length <= 11) {
              formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
            } else {
              formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7, 11)}`;
            }
            
            setEmailOrPhone(formatted);
          }}
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
      
      <p className="text-xs sm:text-sm text-center text-muted-foreground whitespace-nowrap flex items-center justify-center gap-1">
        스쿨라이프.KR 시스템 문의가 있을까요?{" "}
        {kakaoChatUrl ? (
          <a 
            href={kakaoChatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-yellow-600 hover:underline"
          >
            <MessageCircle className="w-4 h-4" />
            오픈채팅방
          </a>
        ) : (
          <span className="text-muted-foreground">오픈채팅방</span>
        )}
      </p>
    </form>
  );
};

export default AdminLogin;
