import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AdminPasswordChangeProps {
  adminId: string;
  adminEmail: string;
}

const AdminPasswordChange = ({ adminId, adminEmail }: AdminPasswordChangeProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // 유효성 검사
    if (newPassword.length < 8) {
      toast.error("새 비밀번호는 최소 8자 이상이어야 합니다");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("새 비밀번호가 일치하지 않습니다");
      return;
    }

    setIsLoading(true);

    try {
      // 현재 비밀번호 확인
      const { data: isValid, error: verifyError } = await supabase.rpc("verify_admin_password", {
        email_input: adminEmail,
        password_input: currentPassword,
      });

      if (verifyError) throw verifyError;
      
      if (!isValid) {
        toast.error("현재 비밀번호가 올바르지 않습니다");
        return;
      }

      // 새 비밀번호로 변경
      const { error: updateError } = await supabase.rpc("update_admin_password", {
        admin_id_input: adminId,
        new_password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success("비밀번호가 성공적으로 변경되었습니다");
      
      // 폼 초기화
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "비밀번호 변경에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>내 비밀번호 변경</CardTitle>
        <CardDescription>
          시스템 관리자 계정의 비밀번호를 변경합니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">현재 비밀번호</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="현재 비밀번호를 입력하세요"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">새 비밀번호</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="새 비밀번호를 입력하세요 (최소 8자)"
              required
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호를 다시 입력하세요"
              required
              minLength={8}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminPasswordChange;
