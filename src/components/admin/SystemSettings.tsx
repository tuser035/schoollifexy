import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Save, Mail, RefreshCw } from "lucide-react";

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_at: string;
}

const SystemSettings = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState("");

  const fetchSettings = async () => {
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);
      
      const { data, error } = await supabase.rpc("admin_get_system_settings", {
        admin_id_input: user.id,
      });

      if (error) throw error;

      setSettings(data || []);
      
      // 답장 이메일 설정 찾기
      const replyToSetting = (data || []).find(
        (s: SystemSetting) => s.setting_key === "reply_to_email"
      );
      if (replyToSetting) {
        setReplyToEmail(replyToSetting.setting_value);
      }
    } catch (error: any) {
      console.error("Failed to fetch settings:", error);
      toast.error("설정을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveReplyToEmail = async () => {
    if (!replyToEmail || !replyToEmail.includes("@")) {
      toast.error("유효한 이메일 주소를 입력해주세요");
      return;
    }

    setSaving(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { error } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: "reply_to_email",
        setting_value_input: replyToEmail,
      });

      if (error) throw error;

      toast.success("답장 이메일 주소가 저장되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to save setting:", error);
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">시스템 설정</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5" />
            이메일 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reply-to-email">답장 받을 이메일 주소</Label>
            <p className="text-sm text-muted-foreground">
              학생/교사가 발송된 이메일에 답장할 때 이 주소로 메일이 발송됩니다.
            </p>
            <div className="flex gap-2">
              <Input
                id="reply-to-email"
                type="email"
                value={replyToEmail}
                onChange={(e) => setReplyToEmail(e.target.value)}
                placeholder="gyeongjuhs@naver.com"
                className="flex-1"
              />
              <Button onClick={handleSaveReplyToEmail} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>

          {settings.find((s) => s.setting_key === "reply_to_email")?.updated_at && (
            <p className="text-xs text-muted-foreground">
              마지막 수정:{" "}
              {new Date(
                settings.find((s) => s.setting_key === "reply_to_email")!.updated_at
              ).toLocaleString("ko-KR")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings;
