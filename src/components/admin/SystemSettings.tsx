import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Save, Mail, RefreshCw, Upload, Image, Trash2 } from "lucide-react";

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
  const [schoolSymbolUrl, setSchoolSymbolUrl] = useState<string | null>(null);
  const [uploadingSymbol, setUploadingSymbol] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // 학교 심볼 URL 찾기
      const symbolSetting = (data || []).find(
        (s: SystemSetting) => s.setting_key === "school_symbol_url"
      );
      if (symbolSetting) {
        setSchoolSymbolUrl(symbolSetting.setting_value);
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

  const handleSymbolUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다");
      return;
    }

    setUploadingSymbol(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("로그인이 필요합니다");
        return;
      }

      const user = JSON.parse(authUser);

      // 파일명 생성
      const fileExt = file.name.split(".").pop();
      const fileName = `school-symbol-${Date.now()}.${fileExt}`;

      // 기존 파일 삭제 (있는 경우)
      if (schoolSymbolUrl) {
        const oldPath = schoolSymbolUrl.split("/school-symbols/").pop();
        if (oldPath) {
          await supabase.storage.from("school-symbols").remove([oldPath]);
        }
      }

      // 새 파일 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("school-symbols")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 공개 URL 가져오기
      const { data: publicUrlData } = supabase.storage
        .from("school-symbols")
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // 설정에 URL 저장
      const { error: settingError } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: "school_symbol_url",
        setting_value_input: publicUrl,
      });

      if (settingError) throw settingError;

      setSchoolSymbolUrl(publicUrl);
      toast.success("학교 심볼이 업로드되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to upload symbol:", error);
      toast.error("업로드에 실패했습니다: " + error.message);
    } finally {
      setUploadingSymbol(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteSymbol = async () => {
    if (!schoolSymbolUrl) return;

    if (!confirm("학교 심볼을 삭제하시겠습니까?")) return;

    setUploadingSymbol(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      // 스토리지에서 파일 삭제
      const oldPath = schoolSymbolUrl.split("/school-symbols/").pop();
      if (oldPath) {
        await supabase.storage.from("school-symbols").remove([oldPath]);
      }

      // 설정에서 URL 제거
      const { error } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: "school_symbol_url",
        setting_value_input: "",
      });

      if (error) throw error;

      setSchoolSymbolUrl(null);
      toast.success("학교 심볼이 삭제되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to delete symbol:", error);
      toast.error("삭제에 실패했습니다");
    } finally {
      setUploadingSymbol(false);
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

      {/* 학교 심볼 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Image className="w-5 h-5" />
            학교 심볼
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>학교 심볼 이미지</Label>
            <p className="text-sm text-muted-foreground">
              온보딩 화면 등에 표시될 학교 심볼 이미지를 업로드합니다. (권장: 200x200px 이상, PNG 또는 JPG)
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* 미리보기 */}
              <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                {schoolSymbolUrl ? (
                  <img
                    src={schoolSymbolUrl}
                    alt="학교 심볼"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Image className="w-12 h-12 text-muted-foreground" />
                )}
              </div>

              {/* 업로드 버튼 */}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSymbolUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingSymbol}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingSymbol ? "업로드 중..." : "이미지 업로드"}
                </Button>
                
                {schoolSymbolUrl && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSymbol}
                    disabled={uploadingSymbol}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    삭제
                  </Button>
                )}
              </div>
            </div>
          </div>

          {settings.find((s) => s.setting_key === "school_symbol_url")?.updated_at && (
            <p className="text-xs text-muted-foreground">
              마지막 수정:{" "}
              {new Date(
                settings.find((s) => s.setting_key === "school_symbol_url")!.updated_at
              ).toLocaleString("ko-KR")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 이메일 설정 */}
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
