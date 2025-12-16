import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceKey)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { user_id, filename, file_base64, content_type } = await req.json()
    
    console.log('Upload email attachment request:', { user_id, filename, content_type })

    if (!user_id || !filename || !file_base64) {
      console.error('Missing required fields')
      return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user is admin or teacher
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', user_id)
      .maybeSingle()

    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', user_id)
      .maybeSingle()

    console.log('Auth verification:', { admin, teacher })

    if (!admin && !teacher) {
      console.error('Unauthorized: Not found in admins or teachers')
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Decode base64
    const base64 = typeof file_base64 === 'string' && file_base64.includes(',')
      ? file_base64.split(',')[1]
      : file_base64

    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 10)
    // 원본 파일명을 경로에 포함 (특수문자 제거)
    const safeFilename = filename.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
    const path = `bulk-email/${user_id}/${timestamp}_${randomId}_${safeFilename}`

    // Upload file using service role (bypasses RLS)
    const { error: uploadError } = await supabase.storage
      .from('email-attachments')
      .upload(path, binary, {
        contentType: content_type || 'application/octet-stream',
        upsert: false,
      })

    console.log('Upload result:', { uploadError })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(JSON.stringify({ ok: false, error: uploadError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: publicUrlData } = supabase.storage
      .from('email-attachments')
      .getPublicUrl(path)

    const publicUrl = publicUrlData.publicUrl
    console.log('Public URL:', publicUrl)

    return new Response(JSON.stringify({ ok: true, path, publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Error:', e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
