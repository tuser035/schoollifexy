import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileBase64, title, category, adminId } = await req.json();

    if (!fileName || !fileBase64 || !title || !adminId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', adminId)
      .single();

    if (adminError || !adminData) {
      // Check if teacher with admin rights
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('id', adminId)
        .eq('is_admin', true)
        .single();

      if (teacherError || !teacherData) {
        return new Response(
          JSON.stringify({ error: '권한이 없습니다' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Decode base64 and upload to storage
    const base64Data = fileBase64.split(',')[1] || fileBase64;
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const filePath = `music/${Date.now()}_${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('mindtalk-music')
      .upload(filePath, binaryData, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: '파일 업로드 실패' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert music metadata
    const { data: musicData, error: musicError } = await supabase
      .from('mindtalk_music')
      .insert({
        title,
        category: category || '힐링',
        file_path: filePath,
        is_active: true
      })
      .select()
      .single();

    if (musicError) {
      console.error('Insert error:', musicError);
      return new Response(
        JSON.stringify({ error: '메타데이터 저장 실패' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Music uploaded successfully:', musicData);

    return new Response(
      JSON.stringify({ success: true, data: musicData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: '서버 오류가 발생했습니다' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
