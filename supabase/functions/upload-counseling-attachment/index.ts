import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceKey)

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { admin_id, filename, file_base64, content_type } = await req.json()
    
    console.log('Upload request:', { admin_id, filename, content_type })

    if (!admin_id || !filename || !file_base64) {
      console.error('Missing required fields')
      return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify admin or teacher exists
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', admin_id)
      .maybeSingle()

    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', admin_id)
      .maybeSingle()

    console.log('Auth verification:', { admin, teacher })

    if (!admin && !teacher) {
      console.error('Unauthorized: Not found in admins or teachers')
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Prepare upload
    const base64 = typeof file_base64 === 'string' && file_base64.includes(',')
      ? file_base64.split(',')[1]
      : file_base64

    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const fileExt = filename.split('.').pop() || 'jpg'
    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const path = `counseling/${uniqueFilename}`

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from('counseling-attachments')
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
      .from('counseling-attachments')
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
