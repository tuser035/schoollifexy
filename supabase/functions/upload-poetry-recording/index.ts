import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const studentId = formData.get('studentId') as string;
    const collectionId = formData.get('collectionId') as string;
    const poemId = formData.get('poemId') as string;
    const poemTitle = formData.get('poemTitle') as string;

    if (!file || !studentId || !collectionId || !poemId) {
      console.error('Missing required fields:', { file: !!file, studentId, collectionId, poemId });
      throw new Error('파일, 학생 ID, 시집 ID, 시 ID가 필요합니다.');
    }

    console.log('Upload request received:', { studentId, collectionId, poemId, poemTitle, fileSize: file.size });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 파일명 생성 (학생ID_시집ID_시ID_타임스탬프.webm)
    const timestamp = Date.now();
    const safeTitle = (poemTitle || 'poem').replace(/[^a-zA-Z0-9가-힣]/g, '_').slice(0, 30);
    const fileName = `${studentId}/${collectionId}/${poemId}_${safeTitle}_${timestamp}.webm`;

    console.log('Uploading to path:', fileName);

    // 파일 업로드
    const arrayBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('poetry-recordings')
      .upload(fileName, arrayBuffer, {
        contentType: file.type || 'audio/webm',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('Upload successful:', uploadData);

    // Public URL 생성
    const { data: urlData } = supabase.storage
      .from('poetry-recordings')
      .getPublicUrl(fileName);

    const recordingUrl = urlData.publicUrl;
    console.log('Recording URL:', recordingUrl);

    // 녹음 정보 저장 및 포인트 지급
    const { data: saveResult, error: saveError } = await supabase.rpc('student_save_poetry_recording', {
      student_id_input: studentId,
      collection_id_input: collectionId,
      poem_id_input: poemId,
      recording_url_input: recordingUrl,
      duration_seconds_input: null
    });

    if (saveError) {
      console.error('Save error:', saveError);
      throw saveError;
    }

    console.log('Save result:', saveResult);

    return new Response(
      JSON.stringify({
        success: true,
        url: recordingUrl,
        result: saveResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in upload-poetry-recording:', error);
    const errorMessage = error instanceof Error ? error.message : '녹음 업로드 중 오류가 발생했습니다.';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
