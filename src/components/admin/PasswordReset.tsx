import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type AuthUser } from "@/lib/auth";

type UserType = "student" | "teacher" | "admin";

interface PasswordResetProps {
  currentUser?: AuthUser;
}

const PasswordReset = ({ currentUser }: PasswordResetProps) => {
  const [userType, setUserType] = useState<UserType>("student");
  const [identifier, setIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // 내 비밀번호 변경용 상태
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPasswordSelf, setNewPasswordSelf] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoadingSelf, setIsLoadingSelf] = useState(false);
  
  const isSystemAdmin = currentUser?.type === "admin";

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    
    // 최대 11자리까지만 허용
    const limitedNumbers = numbers.slice(0, 11);
    
    // 하이픈 추가
    if (limitedNumbers.length <= 3) {
      return limitedNumbers;
    } else if (limitedNumbers.length <= 7) {
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3)}`;
    } else {
      return `${limitedNumbers.slice(0, 3)}-${limitedNumbers.slice(3, 7)}-${limitedNumbers.slice(7)}`;
    }
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (userType === "teacher" || userType === "admin") {
      // 교사 또는 관리자일 경우 전화번호 포맷팅 적용
      setIdentifier(formatPhoneNumber(value));
    } else {
      setIdentifier(value);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || currentUser.type !== "admin") {
      toast.error("권한이 없습니다");
      return;
    }

    if (newPasswordSelf !== confirmPassword) {
      toast.error("새 비밀번호가 일치하지 않습니다");
      return;
    }

    if (newPasswordSelf.length < 4) {
      toast.error("비밀번호는 최소 4자 이상이어야 합니다");
      return;
    }

    setIsLoadingSelf(true);

    try {
      // 현재 비밀번호 확인
      const { data: isValid, error: verifyError } = await supabase.rpc("verify_admin_password", {
        email_input: currentUser.email || "",
        password_input: currentPassword,
      });

      if (verifyError) throw verifyError;
      if (!isValid) {
        toast.error("현재 비밀번호가 올바르지 않습니다");
        setIsLoadingSelf(false);
        return;
      }

      // 비밀번호 업데이트
      const { error: updateError } = await supabase.rpc("update_admin_password", {
        admin_id_input: currentUser.id,
        new_password: newPasswordSelf,
      });

      if (updateError) throw updateError;

      toast.success("비밀번호가 성공적으로 변경되었습니다");
      setCurrentPassword("");
      setNewPasswordSelf("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "비밀번호 변경에 실패했습니다");
    } finally {
      setIsLoadingSelf(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;
      
      if (userType === "student") {
        const { data, error } = await supabase.rpc("update_student_password", {
          student_id_input: identifier,
          new_password: newPassword,
        });
        result = { data, error };
      } else if (userType === "teacher") {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("id")
          .eq("call_t", identifier)
          .single();
        
        if (!teacher) throw new Error("교사를 찾을 수 없습니다");
        
        const { data, error } = await supabase.rpc("update_teacher_password", {
          teacher_id_input: teacher.id,
          new_password: newPassword,
        });
        result = { data, error };
      } else {
        // 관리자는 교사 테이블에서 is_admin=true인 사용자의 전화번호로 조회
        const { data: teacher } = await supabase
          .from("teachers")
          .select("id")
          .eq("call_t", identifier)
          .eq("is_admin", true)
          .single();
        
        if (!teacher) throw new Error("관리자를 찾을 수 없습니다");
        
        const { data, error } = await supabase.rpc("update_teacher_password", {
          teacher_id_input: teacher.id,
          new_password: newPassword,
        });
        result = { data, error };
      }

      if (result.error) throw result.error;
      
      toast.success("비밀번호가 성공적으로 변경되었습니다");
      setIdentifier("");
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.message || "비밀번호 변경에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>비밀번호 관리</CardTitle>
        <CardDescription>
          {isSystemAdmin ? "다른 사용자의 비밀번호 재설정 또는 본인 비밀번호 변경" : "학생, 교사, 관리자의 비밀번호를 재설정합니다"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSystemAdmin ? (
          <Tabs defaultValue="others" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="others">다른 사용자</TabsTrigger>
              <TabsTrigger value="self">내 비밀번호</TabsTrigger>
            </TabsList>

            <TabsContent value="others" className="mt-4">
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label>사용자 유형</Label>
                  <Select value={userType} onValueChange={(value) => setUserType(value as UserType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">학생</SelectItem>
                      <SelectItem value="teacher">교사</SelectItem>
                      <SelectItem value="admin">관리자</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {userType === "student" && "학생 ID"}
                    {userType === "teacher" && "전화번호"}
                    {userType === "admin" && "전화번호"}
                  </Label>
                  <Input
                    value={identifier}
                    onChange={handleIdentifierChange}
                    placeholder={
                      userType === "student" ? "예: 10101" :
                      userType === "teacher" ? "예: 010-1234-5678" :
                      "예: 010-1234-5678"
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>새 비밀번호</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호를 입력하세요"
                    required
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "변경 중..." : "비밀번호 변경"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="self" className="mt-4">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label>현재 비밀번호</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="현재 비밀번호를 입력하세요"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>새 비밀번호</Label>
                  <Input
                    type="password"
                    value={newPasswordSelf}
                    onChange={(e) => setNewPasswordSelf(e.target.value)}
                    placeholder="새 비밀번호를 입력하세요"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>새 비밀번호 확인</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호를 다시 입력하세요"
                    required
                  />
                </div>

                <Button type="submit" disabled={isLoadingSelf} className="w-full">
                  {isLoadingSelf ? "변경 중..." : "비밀번호 변경"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label>사용자 유형</Label>
              <Select value={userType} onValueChange={(value) => setUserType(value as UserType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">학생</SelectItem>
                  <SelectItem value="teacher">교사</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {userType === "student" && "학생 ID"}
                {userType === "teacher" && "전화번호"}
                {userType === "admin" && "전화번호"}
              </Label>
              <Input
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder={
                  userType === "student" ? "예: 10101" :
                  userType === "teacher" ? "예: 010-1234-5678" :
                  "예: 010-1234-5678"
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>새 비밀번호</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호를 입력하세요"
                required
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "변경 중..." : "비밀번호 변경"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default PasswordReset;
