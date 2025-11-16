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
    const { admin_id, student_id, filename, image_base64, content_type, old_path } = await req.json()

    if (!admin_id || !student_id || !filename || !image_base64) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify admin exists
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id')
      .eq('id', admin_id)
      .maybeSingle()

    if (adminError || !admin) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Prepare upload
    const base64 = typeof image_base64 === 'string' && image_base64.includes(',')
      ? image_base64.split(',')[1]
      : image_base64

    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const ext = (filename.split('.').pop() || 'jpg').toLowerCase()
    const path = `${student_id}.${ext}`

    // Remove previous file if provided and different
    if (old_path && old_path !== path) {
      await supabase.storage.from('student-photos').remove([old_path])
    }

    // Upload new file (upsert)
    const { error: uploadError } = await supabase.storage
      .from('student-photos')
      .upload(path, binary, {
        contentType: content_type || 'application/octet-stream',
        upsert: true,
      })

    if (uploadError) {
      return new Response(JSON.stringify({ ok: false, error: uploadError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: publicUrlData } = supabase.storage
      .from('student-photos')
      .getPublicUrl(path)

    const publicUrl = publicUrlData.publicUrl

    // Update students table with new photo URL
    const { error: updateError } = await supabase
      .from('students')
      .update({ photo_url: publicUrl })
      .eq('student_id', student_id)

    if (updateError) {
      return new Response(JSON.stringify({ ok: false, error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, path, publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
