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
    const { admin_id, book_id, page_number, filename, image_base64, image_type } = await req.json();

    if (!admin_id || !book_id || !filename || !image_base64) {
      return new Response(
        JSON.stringify({ error: "필수 필드가 누락되었습니다" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 관리자/교사 권한 확인
    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("id", admin_id)
      .single();

    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("id", admin_id)
      .single();

    if (!admin && !teacher) {
      return new Response(
        JSON.stringify({ error: "권한이 없습니다" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Base64 디코딩
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // 파일 확장자 추출
    const ext = filename.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    
    // 이미지 타입에 따른 경로 설정
    let storagePath: string;
    if (image_type === "cover") {
      storagePath = `covers/${book_id}/${timestamp}_${randomId}.${ext}`;
    } else {
      storagePath = `pages/${book_id}/${page_number}_${timestamp}_${randomId}.${ext}`;
    }

    // 스토리지에 업로드
    const { error: uploadError } = await supabase.storage
      .from("storybook-images")
      .upload(storagePath, imageBuffer, {
        contentType: `image/${ext}`,
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
      .from("storybook-images")
      .getPublicUrl(storagePath);

    return new Response(
      JSON.stringify({
        success: true,
        path: storagePath,
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
