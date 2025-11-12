import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type UserType = "student" | "teacher" | "admin";

const PasswordReset = () => {
  const [userType, setUserType] = useState<UserType>("student");
  const [identifier, setIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
        const { data: admin } = await supabase
          .from("admins")
          .select("id")
          .eq("email", identifier)
          .single();
        
        if (!admin) throw new Error("관리자를 찾을 수 없습니다");
        
        const { data, error } = await supabase.rpc("update_admin_password", {
          admin_id_input: admin.id,
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
        <CardTitle>비밀번호 재설정</CardTitle>
        <CardDescription>학생, 교사, 관리자의 비밀번호를 재설정합니다</CardDescription>
      </CardHeader>
      <CardContent>
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
              {userType === "admin" && "이메일"}
            </Label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={
                userType === "student" ? "예: 10101" :
                userType === "teacher" ? "예: 010-1234-5678" :
                "예: admin@school.com"
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
      </CardContent>
    </Card>
  );
};

export default PasswordReset;
