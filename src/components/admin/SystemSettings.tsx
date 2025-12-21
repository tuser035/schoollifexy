import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Save, Mail, RefreshCw, Upload, Image, Trash2, Globe, RotateCcw, MessageCircle, CheckCircle2, XCircle, History, ChevronDown, ChevronUp } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_at: string;
}

interface AuditLog {
  id: string;
  created_at: string;
  action_type: string;
  table_name: string | null;
  record_id: string | null;
  old_data: any;
  new_data: any;
  user_type: string | null;
  user_name?: string;
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

// 설정 키를 한글 라벨로 변환
const getSettingKeyLabel = (key: string | undefined): string => {
  const labels: Record<string, string> = {
    school_name: "학교명",
    school_name_en: "학교 영문명",
    school_symbol_url: "학교 심볼",
    favicon_url: "파비콘",
    kakao_qr_url: "카카오톡 QR 코드",
    kakao_chat_url: "카카오톡 채팅방 URL",
    reply_to_email: "답장 이메일",
  };
  return labels[key || ""] || key || "알 수 없음";
};

// 긴 값 자르기 (URL 등)
const truncateValue = (value: string | undefined): string => {
  if (!value) return "";
  if (value.length > 50) {
    return value.substring(0, 50) + "...";
  }
  return value;
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
  const [kakaoQrUrl, setKakaoQrUrl] = useState<string | null>(null);
  const [uploadingKakaoQr, setUploadingKakaoQr] = useState(false);
  const [kakaoChatUrl, setKakaoChatUrl] = useState("");
  const [kakaoChatUrlError, setKakaoChatUrlError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [restoringLogId, setRestoringLogId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const kakaoQrInputRef = useRef<HTMLInputElement>(null);

  // 초기화 함수들
  const handleResetSchoolName = async () => {
    setResetting(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { error } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: "school_name",
        setting_value_input: "",
      });

      if (error) throw error;

      setSchoolName("");
      toast.success("학교명이 초기화되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to reset school name:", error);
      toast.error("초기화에 실패했습니다");
    } finally {
      setResetting(false);
    }
  };

  const handleResetSchoolNameEn = async () => {
    setResetting(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { error } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: "school_name_en",
        setting_value_input: "",
      });

      if (error) throw error;

      setSchoolNameEn("");
      toast.success("학교 영문명이 초기화되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to reset school name en:", error);
      toast.error("초기화에 실패했습니다");
    } finally {
      setResetting(false);
    }
  };

  const handleResetSymbol = async () => {
    setResetting(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      // 스토리지에서 파일 삭제
      if (schoolSymbolUrl) {
        const oldPath = schoolSymbolUrl.split("/school-symbols/").pop();
        if (oldPath) {
          await supabase.storage.from("school-symbols").remove([oldPath]);
        }
      }

      // 설정에서 URL 제거
      const { error } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: "school_symbol_url",
        setting_value_input: "",
      });

      if (error) throw error;

      setSchoolSymbolUrl(null);
      toast.success("학교 심볼이 초기화되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to reset symbol:", error);
      toast.error("초기화에 실패했습니다");
    } finally {
      setResetting(false);
    }
  };

  const handleResetFavicon = async () => {
    setResetting(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      // 스토리지에서 파일 삭제
      if (faviconUrl) {
        const oldPath = faviconUrl.split("/school-symbols/").pop();
        if (oldPath) {
          await supabase.storage.from("school-symbols").remove([oldPath]);
        }
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
      toast.success("파비콘이 초기화되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to reset favicon:", error);
      toast.error("초기화에 실패했습니다");
    } finally {
      setResetting(false);
    }
  };

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

      // 카카오톡 QR URL 찾기
      const kakaoQrSetting = (data || []).find(
        (s: SystemSetting) => s.setting_key === "kakao_qr_url"
      );
      if (kakaoQrSetting && kakaoQrSetting.setting_value) {
        setKakaoQrUrl(kakaoQrSetting.setting_value);
      }

      // 카카오톡 채팅방 URL 찾기
      const kakaoChatSetting = (data || []).find(
        (s: SystemSetting) => s.setting_key === "kakao_chat_url"
      );
      if (kakaoChatSetting && kakaoChatSetting.setting_value) {
        setKakaoChatUrl(kakaoChatSetting.setting_value);
      }
    } catch (error: any) {
      console.error("Failed to fetch settings:", error);
      toast.error("설정을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingHistory(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { data, error } = await supabase.rpc("get_audit_logs", {
        p_admin_id: user.id,
        p_limit: 50,
      });

      if (error) throw error;

      // system_settings 테이블 관련 로그만 필터링
      const settingsLogs = (data || []).filter(
        (log: AuditLog) => log.table_name === "system_settings"
      );

      setAuditLogs(settingsLogs);
    } catch (error: any) {
      console.error("Failed to fetch audit logs:", error);
      toast.error("변경 내역을 불러오는데 실패했습니다");
    } finally {
      setLoadingHistory(false);
    }
  };

  // 히스토리에서 설정 복원
  const handleRestoreFromHistory = async (log: AuditLog) => {
    if (!log.old_data?.setting_key || !log.old_data?.setting_value) {
      toast.error("복원할 이전 값이 없습니다");
      return;
    }

    setRestoringLogId(log.id);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);
      const settingKey = log.old_data.setting_key;
      const settingValue = log.old_data.setting_value;

      const { error } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: settingKey,
        setting_value_input: settingValue,
      });

      if (error) throw error;

      // 상태 업데이트
      switch (settingKey) {
        case "school_name":
          setSchoolName(settingValue);
          break;
        case "school_name_en":
          setSchoolNameEn(settingValue);
          break;
        case "school_symbol_url":
          setSchoolSymbolUrl(settingValue);
          break;
        case "favicon_url":
          setFaviconUrl(settingValue);
          updateFavicon(settingValue);
          break;
        case "kakao_qr_url":
          setKakaoQrUrl(settingValue);
          break;
        case "kakao_chat_url":
          setKakaoChatUrl(settingValue);
          break;
        case "reply_to_email":
          setReplyToEmail(settingValue);
          break;
      }

      toast.success(`${getSettingKeyLabel(settingKey)} 설정이 복원되었습니다`);
      fetchSettings();
      fetchAuditLogs();
    } catch (error: any) {
      console.error("Failed to restore setting:", error);
      toast.error("설정 복원에 실패했습니다");
    } finally {
      setRestoringLogId(null);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (showHistory) {
      fetchAuditLogs();
    }
  }, [showHistory]);

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

  const validateKakaoChatUrl = (url: string): { isValid: boolean; message: string } => {
    if (!url.trim()) {
      return { isValid: true, message: "" }; // 빈 값은 허용 (URL 삭제 시)
    }

    // URL 형식 검증
    try {
      const parsedUrl = new URL(url);
      
      // HTTPS만 허용
      if (parsedUrl.protocol !== "https:") {
        return { isValid: false, message: "HTTPS URL만 허용됩니다" };
      }

      // 카카오톡 오픈채팅 URL 형식 확인
      const validDomains = ["open.kakao.com", "pf.kakao.com"];
      if (!validDomains.includes(parsedUrl.hostname)) {
        return { isValid: false, message: "카카오톡 오픈채팅 URL만 허용됩니다 (open.kakao.com 또는 pf.kakao.com)" };
      }

      // URL 길이 제한
      if (url.length > 500) {
        return { isValid: false, message: "URL이 너무 깁니다 (최대 500자)" };
      }

      return { isValid: true, message: "" };
    } catch {
      return { isValid: false, message: "유효한 URL 형식이 아닙니다" };
    }
  };

  const handleSaveKakaoChatUrl = async () => {
    const validation = validateKakaoChatUrl(kakaoChatUrl);
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    setSaving(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { error } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: "kakao_chat_url",
        setting_value_input: kakaoChatUrl.trim(),
      });

      if (error) throw error;

      toast.success("카카오톡 채팅방 URL이 저장되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to save kakao chat url:", error);
      toast.error("저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  // 파일을 Base64로 변환하는 함수
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
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

      // 파일을 Base64로 변환
      const base64Data = await fileToBase64(file);

      // Edge Function을 통해 업로드
      const { data, error } = await supabase.functions.invoke("upload-school-symbol", {
        body: {
          admin_id: user.id,
          image_base64: base64Data,
          filename: file.name,
          image_type: "symbol",
          old_url: schoolSymbolUrl,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSchoolSymbolUrl(data.publicUrl);
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

      // 이미지를 64x64로 리사이즈
      const resizedBlob = await resizeImage(file, 64);

      // Blob을 Base64로 변환
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(resizedBlob);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      // Edge Function을 통해 업로드
      const { data, error } = await supabase.functions.invoke("upload-school-symbol", {
        body: {
          admin_id: user.id,
          image_base64: base64Data,
          filename: "favicon.png",
          image_type: "favicon",
          old_url: faviconUrl,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setFaviconUrl(data.publicUrl);
      updateFavicon(data.publicUrl);
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

  // 카카오톡 QR 코드 업로드
  const handleKakaoQrUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    // 파일 크기 검증 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("파일 크기는 2MB 이하여야 합니다");
      return;
    }

    setUploadingKakaoQr(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("로그인이 필요합니다");
        return;
      }

      const user = JSON.parse(authUser);

      // 파일을 Base64로 변환
      const base64Data = await fileToBase64(file);

      // Edge Function을 통해 업로드
      const { data, error } = await supabase.functions.invoke("upload-school-symbol", {
        body: {
          admin_id: user.id,
          image_base64: base64Data,
          filename: file.name,
          image_type: "kakao_qr",
          old_url: kakaoQrUrl,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setKakaoQrUrl(data.publicUrl);
      toast.success("카카오톡 QR 코드가 업로드되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to upload kakao QR:", error);
      toast.error("업로드에 실패했습니다: " + error.message);
    } finally {
      setUploadingKakaoQr(false);
      if (kakaoQrInputRef.current) {
        kakaoQrInputRef.current.value = "";
      }
    }
  };

  const handleDeleteKakaoQr = async () => {
    if (!kakaoQrUrl) return;

    if (!confirm("카카오톡 QR 코드를 삭제하시겠습니까?")) return;

    setUploadingKakaoQr(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      // 스토리지에서 파일 삭제
      const oldPath = kakaoQrUrl.split("/school-symbols/").pop();
      if (oldPath) {
        await supabase.storage.from("school-symbols").remove([oldPath]);
      }

      // 설정에서 URL 제거
      const { error } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: "kakao_qr_url",
        setting_value_input: "",
      });

      if (error) throw error;

      setKakaoQrUrl(null);
      toast.success("카카오톡 QR 코드가 삭제되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to delete kakao QR:", error);
      toast.error("삭제에 실패했습니다");
    } finally {
      setUploadingKakaoQr(false);
    }
  };

  const handleResetKakaoQr = async () => {
    setResetting(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      // 스토리지에서 파일 삭제
      if (kakaoQrUrl) {
        const oldPath = kakaoQrUrl.split("/school-symbols/").pop();
        if (oldPath) {
          await supabase.storage.from("school-symbols").remove([oldPath]);
        }
      }

      // 설정 초기화
      const { error } = await supabase.rpc("admin_update_system_setting", {
        admin_id_input: user.id,
        setting_key_input: "kakao_qr_url",
        setting_value_input: "",
      });

      if (error) throw error;

      setKakaoQrUrl(null);
      toast.success("카카오톡 QR 코드가 초기화되었습니다");
      fetchSettings();
    } catch (error: any) {
      console.error("Failed to reset kakao QR:", error);
      toast.error("초기화에 실패했습니다");
    } finally {
      setResetting(false);
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={resetting || !schoolName}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    초기화
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>학교명 초기화</AlertDialogTitle>
                    <AlertDialogDescription>
                      학교명을 기본값으로 초기화하시겠습니까? 초기화 후에는 "스쿨라이프.KR"로 표시됩니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetSchoolName}>
                      초기화
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={resetting || !schoolNameEn}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    초기화
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>학교 영문명 초기화</AlertDialogTitle>
                    <AlertDialogDescription>
                      학교 영문명을 기본값으로 초기화하시겠습니까? 초기화 후에는 "SchoolLife.KR"로 표시됩니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetSchoolNameEn}>
                      초기화
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSymbol}
                      disabled={uploadingSymbol}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      삭제
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={resetting}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          초기화
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>학교 심볼 초기화</AlertDialogTitle>
                          <AlertDialogDescription>
                            학교 심볼을 기본값으로 초기화하시겠습니까? 현재 이미지가 삭제되고 기본 이미지가 표시됩니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction onClick={handleResetSymbol}>
                            초기화
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
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
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteFavicon}
                      disabled={uploadingFavicon}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      삭제
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={resetting}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          초기화
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>파비콘 초기화</AlertDialogTitle>
                          <AlertDialogDescription>
                            파비콘을 기본값으로 초기화하시겠습니까? 현재 이미지가 삭제되고 기본 파비콘이 사용됩니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction onClick={handleResetFavicon}>
                            초기화
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
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

      {/* 카카오톡 QR 코드 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="w-5 h-5" />
            카카오톡 상담 QR 코드
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>QR 코드 이미지</Label>
            <p className="text-sm text-muted-foreground">
              온보딩 화면에 표시될 카카오톡 채팅방 QR 코드 이미지를 업로드합니다.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* 미리보기 */}
              <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                {kakaoQrUrl ? (
                  <img
                    src={kakaoQrUrl}
                    alt="카카오톡 QR"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <MessageCircle className="w-12 h-12 text-muted-foreground" />
                )}
              </div>

              {/* 업로드 버튼 */}
              <div className="flex flex-col gap-2">
                <input
                  ref={kakaoQrInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleKakaoQrUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => kakaoQrInputRef.current?.click()}
                  disabled={uploadingKakaoQr}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingKakaoQr ? "업로드 중..." : "이미지 업로드"}
                </Button>
                
                {kakaoQrUrl && (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteKakaoQr}
                      disabled={uploadingKakaoQr}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      삭제
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={resetting}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          초기화
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>카카오톡 QR 코드 초기화</AlertDialogTitle>
                          <AlertDialogDescription>
                            카카오톡 QR 코드를 초기화하시겠습니까? 온보딩 화면에서 QR 코드가 표시되지 않습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction onClick={handleResetKakaoQr}>
                            초기화
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          </div>

          {settings.find((s) => s.setting_key === "kakao_qr_url")?.updated_at && (
            <p className="text-xs text-muted-foreground">
              마지막 수정:{" "}
              {new Date(
                settings.find((s) => s.setting_key === "kakao_qr_url")!.updated_at
              ).toLocaleString("ko-KR")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 카카오톡 채팅방 URL 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="w-5 h-5" />
            카카오톡 채팅방 URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kakao-chat-url">오픈채팅방 URL</Label>
            <p className="text-sm text-muted-foreground">
              카카오톡 오픈채팅방 URL을 입력하면 QR 코드 확대 화면에서 '카카오톡으로 열기' 버튼이 표시됩니다.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  id="kakao-chat-url"
                  type="url"
                  value={kakaoChatUrl}
                  onChange={(e) => {
                    const value = e.target.value;
                    setKakaoChatUrl(value);
                    const validation = validateKakaoChatUrl(value);
                    setKakaoChatUrlError(validation.isValid ? "" : validation.message);
                  }}
                  placeholder="https://open.kakao.com/o/..."
                  className={`pr-10 ${kakaoChatUrlError ? "border-destructive focus-visible:ring-destructive" : kakaoChatUrl.trim() ? "border-green-500 focus-visible:ring-green-500" : ""}`}
                />
                {kakaoChatUrl.trim() && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {kakaoChatUrlError ? (
                      <XCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                )}
              </div>
              <Button onClick={handleSaveKakaoChatUrl} disabled={saving || !!kakaoChatUrlError}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
            {kakaoChatUrlError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {kakaoChatUrlError}
              </p>
            )}
            {kakaoChatUrl.trim() && !kakaoChatUrlError && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                유효한 카카오톡 URL입니다
              </p>
            )}
          </div>

          {settings.find((s) => s.setting_key === "kakao_chat_url")?.updated_at && (
            <p className="text-xs text-muted-foreground">
              마지막 수정:{" "}
              {new Date(
                settings.find((s) => s.setting_key === "kakao_chat_url")!.updated_at
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

      {/* 설정 변경 히스토리 */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setShowHistory(!showHistory)}
        >
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5" />
              설정 변경 히스토리
            </div>
            {showHistory ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </CardTitle>
        </CardHeader>
        {showHistory && (
          <CardContent className="space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center p-4">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                <span className="text-muted-foreground">로딩 중...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                변경 내역이 없습니다
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-3 bg-muted/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {getSettingKeyLabel(log.new_data?.setting_key || log.old_data?.setting_key)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      {log.action_type === "UPDATE" && (
                        <>
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground shrink-0">이전:</span>
                            <span className="text-red-600 break-all">
                              {truncateValue(log.old_data?.setting_value) || "(없음)"}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground shrink-0">변경:</span>
                            <span className="text-green-600 break-all">
                              {truncateValue(log.new_data?.setting_value) || "(없음)"}
                            </span>
                          </div>
                        </>
                      )}
                      {log.action_type === "INSERT" && (
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground shrink-0">생성:</span>
                          <span className="text-green-600 break-all">
                            {truncateValue(log.new_data?.setting_value)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {log.user_name && (
                        <p className="text-xs text-muted-foreground">
                          변경자: {log.user_name}
                        </p>
                      )}
                      {log.action_type === "UPDATE" && log.old_data?.setting_value && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={restoringLogId === log.id}
                            >
                              {restoringLogId === log.id ? (
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3 mr-1" />
                              )}
                              이전 값으로 복원
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>설정 복원</AlertDialogTitle>
                              <AlertDialogDescription className="space-y-2">
                                <p>다음 설정을 이전 값으로 복원하시겠습니까?</p>
                                <div className="bg-muted p-3 rounded-lg text-sm">
                                  <p><strong>설정:</strong> {getSettingKeyLabel(log.old_data?.setting_key)}</p>
                                  <p><strong>복원할 값:</strong> {truncateValue(log.old_data?.setting_value)}</p>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRestoreFromHistory(log)}>
                                복원
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAuditLogs}
              disabled={loadingHistory}
              className="w-full"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingHistory ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default SystemSettings;
