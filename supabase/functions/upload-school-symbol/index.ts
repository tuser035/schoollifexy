import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { admin_id, image_base64, filename, image_type, old_url } = await req.json();

    if (!admin_id || !image_base64 || !filename) {
      return new Response(
        JSON.stringify({ error: "필수 필드가 누락되었습니다" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 관리자 권한 확인
    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("id", admin_id)
      .single();

    if (!admin) {
      return new Response(
        JSON.stringify({ error: "권한이 없습니다" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 기존 파일 삭제 (있는 경우)
    if (old_url) {
      const oldPath = old_url.split("/school-symbols/").pop();
      if (oldPath) {
        await supabase.storage.from("school-symbols").remove([oldPath]);
      }
    }

    // Base64 디코딩
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // 파일 확장자 추출
    const ext = filename.split(".").pop() || "png";
    const timestamp = Date.now();
    
    // 이미지 타입에 따른 파일명 설정
    const storagePath = image_type === "favicon" 
      ? `favicon-${timestamp}.${ext}`
      : `school-symbol-${timestamp}.${ext}`;

    // 스토리지에 업로드
    const { error: uploadError } = await supabase.storage
      .from("school-symbols")
      .upload(storagePath, imageBuffer, {
        contentType: `image/${ext === "ico" ? "x-icon" : ext}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "이미지 업로드 실패: " + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 공개 URL 가져오기
    const { data: publicUrlData } = supabase.storage
      .from("school-symbols")
      .getPublicUrl(storagePath);

    // 설정에 URL 저장 - 먼저 기존 설정이 있는지 확인
    const settingKey = image_type === "favicon" ? "favicon_url" : "school_symbol_url";
    
    const { data: existingSetting } = await supabase
      .from("system_settings")
      .select("id")
      .eq("setting_key", settingKey)
      .single();

    let settingError;
    if (existingSetting) {
      // 기존 설정 업데이트
      const { error } = await supabase
        .from("system_settings")
        .update({
          setting_value: publicUrlData.publicUrl,
          updated_at: new Date().toISOString(),
          updated_by: admin_id,
        })
        .eq("setting_key", settingKey);
      settingError = error;
    } else {
      // 새 설정 삽입
      const { error } = await supabase
        .from("system_settings")
        .insert({
          setting_key: settingKey,
          setting_value: publicUrlData.publicUrl,
          updated_at: new Date().toISOString(),
          updated_by: admin_id,
        });
      settingError = error;
    }

    if (settingError) {
      console.error("Setting update error:", settingError);
      return new Response(
        JSON.stringify({ error: "설정 저장 실패: " + settingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        publicUrl: publicUrlData.publicUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
