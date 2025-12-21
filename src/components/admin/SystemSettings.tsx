import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Save, Mail, RefreshCw, Upload, Image, Trash2, Globe } from "lucide-react";

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_at: string;
}

// 동적으로 파비콘 변경하는 함수
const updateFavicon = (url: string) => {
  const link: HTMLLinkElement =
    document.querySelector("link[rel*='icon']") ||
    document.createElement("link");
  link.type = "image/x-icon";
  link.rel = "shortcut icon";
  link.href = url;
  document.getElementsByTagName("head")[0].appendChild(link);
};

const SystemSettings = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolNameEn, setSchoolNameEn] = useState("");
  const [schoolSymbolUrl, setSchoolSymbolUrl] = useState<string | null>(null);
  const [uploadingSymbol, setUploadingSymbol] = useState(false);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

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

      // 학교명 설정 찾기
      const schoolNameSetting = (data || []).find(
        (s: SystemSetting) => s.setting_key === "school_name"
      );
      if (schoolNameSetting) {
        setSchoolName(schoolNameSetting.setting_value);
      }

      // 학교 영문명 설정 찾기
      const schoolNameEnSetting = (data || []).find(
        (s: SystemSetting) => s.setting_key === "school_name_en"
      );
      if (schoolNameEnSetting) {
        setSchoolNameEn(schoolNameEnSetting.setting_value);
      }

      // 학교 심볼 URL 찾기
      const symbolSetting = (data || []).find(
        (s: SystemSetting) => s.setting_key === "school_symbol_url"
      );
      if (symbolSetting) {
        setSchoolSymbolUrl(symbolSetting.setting_value);
      }

      // 파비콘 URL 찾기
      const faviconSetting = (data || []).find(
        (s: SystemSetting) => s.setting_key === "favicon_url"
      );
      if (faviconSetting && faviconSetting.setting_value) {
        setFaviconUrl(faviconSetting.setting_value);
        updateFavicon(faviconSetting.setting_value);
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

  const handleSaveSchoolName = async () => {
    if (!schoolName.trim()) {
      toast.error("학교명을 입력해주세요");
      return;
    }

    setSaving(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { error } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: "school_name",
        setting_value_input: schoolName.trim(),
      });

      if (error) throw error;

      toast.success("학교명이 저장되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to save school name:", error);
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchoolNameEn = async () => {
    if (!schoolNameEn.trim()) {
      toast.error("학교 영문명을 입력해주세요");
      return;
    }

    setSaving(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { error } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: "school_name_en",
        setting_value_input: schoolNameEn.trim(),
      });

      if (error) throw error;

      toast.success("학교 영문명이 저장되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to save school name en:", error);
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

      // Admin 세션 설정 (스토리지 RLS 정책을 위해)
      await supabase.rpc("set_admin_session", { admin_id_input: user.id });

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

  // 이미지를 64x64로 리사이즈하는 함수
  const resizeImage = (file: File, size: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob"));
            }
          },
          "image/png",
          1.0
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증 (ICO, PNG, JPG 허용)
    const validTypes = ["image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/jpeg", "image/gif"];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".ico")) {
      toast.error("ICO, PNG, JPG, GIF 파일만 업로드 가능합니다");
      return;
    }

    // 파일 크기 검증 (1MB)
    if (file.size > 1 * 1024 * 1024) {
      toast.error("파일 크기는 1MB 이하여야 합니다");
      return;
    }

    setUploadingFavicon(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("로그인이 필요합니다");
        return;
      }

      const user = JSON.parse(authUser);

      // Admin 세션 설정 (스토리지 RLS 정책을 위해)
      await supabase.rpc("set_admin_session", { admin_id_input: user.id });

      // 이미지를 64x64로 리사이즈
      const resizedBlob = await resizeImage(file, 64);

      // 파일명 생성 (PNG로 저장)
      const fileName = `favicon-${Date.now()}.png`;

      // 기존 파일 삭제 (있는 경우)
      if (faviconUrl) {
        const oldPath = faviconUrl.split("/school-symbols/").pop();
        if (oldPath) {
          await supabase.storage.from("school-symbols").remove([oldPath]);
        }
      }

      // 새 파일 업로드 (school-symbols 버킷 재사용)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("school-symbols")
        .upload(fileName, resizedBlob, { upsert: true, contentType: "image/png" });

      if (uploadError) throw uploadError;

      // 공개 URL 가져오기
      const { data: publicUrlData } = supabase.storage
        .from("school-symbols")
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // 설정에 URL 저장
      const { error: settingError } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: "favicon_url",
        setting_value_input: publicUrl,
      });

      if (settingError) throw settingError;

      setFaviconUrl(publicUrl);
      updateFavicon(publicUrl);
      toast.success("파비콘이 업로드되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to upload favicon:", error);
      toast.error("업로드에 실패했습니다: " + error.message);
    } finally {
      setUploadingFavicon(false);
      if (faviconInputRef.current) {
        faviconInputRef.current.value = "";
      }
    }
  };

  const handleDeleteFavicon = async () => {
    if (!faviconUrl) return;

    if (!confirm("파비콘을 삭제하시겠습니까? 기본 파비콘으로 복원됩니다.")) return;

    setUploadingFavicon(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      // 스토리지에서 파일 삭제
      const oldPath = faviconUrl.split("/school-symbols/").pop();
      if (oldPath) {
        await supabase.storage.from("school-symbols").remove([oldPath]);
      }

      // 설정에서 URL 제거
      const { error } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: "favicon_url",
        setting_value_input: "",
      });

      if (error) throw error;

      setFaviconUrl(null);
      // 기본 파비콘으로 복원
      updateFavicon("/favicon.png");
      toast.success("파비콘이 삭제되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to delete favicon:", error);
      toast.error("삭제에 실패했습니다");
    } finally {
      setUploadingFavicon(false);
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

      {/* 학교명 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5" />
            학교명
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schoolName">학교명</Label>
            <p className="text-sm text-muted-foreground">
              온보딩 화면 등에 표시될 학교명을 입력합니다. 미입력 시 기본값 "스쿨라이프.KR"이 표시됩니다.
            </p>
            <div className="flex gap-2">
              <Input
                id="schoolName"
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="예: ○○고등학교"
                className="flex-1"
              />
              <Button
                onClick={handleSaveSchoolName}
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
          {settings.find((s) => s.setting_key === "school_name")?.updated_at && (
            <p className="text-xs text-muted-foreground">
              마지막 수정:{" "}
              {new Date(
                settings.find((s) => s.setting_key === "school_name")!.updated_at
              ).toLocaleString("ko-KR")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 학교 영문명 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5" />
            학교 영문명
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schoolNameEn">학교 영문명</Label>
            <p className="text-sm text-muted-foreground">
              온보딩 화면 하단에 표시될 학교 영문명을 입력합니다. 미입력 시 "SchoolLife.KR"이 표시됩니다.
            </p>
            <div className="flex gap-2">
              <Input
                id="schoolNameEn"
                type="text"
                value={schoolNameEn}
                onChange={(e) => setSchoolNameEn(e.target.value)}
                placeholder="예: ○○ High School"
                className="flex-1"
              />
              <Button
                onClick={handleSaveSchoolNameEn}
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
          {settings.find((s) => s.setting_key === "school_name_en")?.updated_at && (
            <p className="text-xs text-muted-foreground">
              마지막 수정:{" "}
              {new Date(
                settings.find((s) => s.setting_key === "school_name_en")!.updated_at
              ).toLocaleString("ko-KR")}
            </p>
          )}
        </CardContent>
      </Card>

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

      {/* 파비콘 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="w-5 h-5" />
            파비콘 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>파비콘 이미지</Label>
            <p className="text-sm text-muted-foreground">
              브라우저 탭에 표시될 파비콘 이미지를 업로드합니다. (권장: 32x32px 또는 64x64px, ICO/PNG/JPG)
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* 미리보기 */}
              <div className="w-16 h-16 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                {faviconUrl ? (
                  <img
                    src={faviconUrl}
                    alt="파비콘"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Globe className="w-8 h-8 text-muted-foreground" />
                )}
              </div>

              {/* 업로드 버튼 */}
              <div className="flex flex-col gap-2">
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept=".ico,.png,.jpg,.jpeg,.gif,image/x-icon,image/png,image/jpeg,image/gif"
                  onChange={handleFaviconUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => faviconInputRef.current?.click()}
                  disabled={uploadingFavicon}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingFavicon ? "업로드 중..." : "파비콘 업로드"}
                </Button>
                
                {faviconUrl && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteFavicon}
                    disabled={uploadingFavicon}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    삭제
                  </Button>
                )}
              </div>
            </div>
          </div>

          {settings.find((s) => s.setting_key === "favicon_url")?.updated_at && (
            <p className="text-xs text-muted-foreground">
              마지막 수정:{" "}
              {new Date(
                settings.find((s) => s.setting_key === "favicon_url")!.updated_at
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
