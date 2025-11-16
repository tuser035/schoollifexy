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
    const { admin_id, target_type, target_id, filename, image_base64, content_type, old_path } = await req.json()
    
    console.log('Upload request:', { admin_id, target_type, target_id, filename })

    if (!admin_id || !target_type || !target_id || !filename || !image_base64) {
      console.error('Missing required fields')
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

    console.log('Admin verification:', { admin, adminError })

    if (adminError || !admin) {
      console.error('Unauthorized:', adminError)
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Determine bucket and table based on target_type
    const bucket = target_type === 'student' ? 'student-photos' : 'teacher-photos'
    const table = target_type === 'student' ? 'students' : 'teachers'
    const idColumn = target_type === 'student' ? 'student_id' : 'call_t'

    // Prepare upload
    const base64 = typeof image_base64 === 'string' && image_base64.includes(',')
      ? image_base64.split(',')[1]
      : image_base64

    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const ext = (filename.split('.').pop() || 'jpg').toLowerCase()
    const path = `${target_id}.${ext}`

    // Remove previous file if provided and different
    if (old_path && old_path !== path) {
      await supabase.storage.from(bucket).remove([old_path])
    }

    // Upload new file (upsert)
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, binary, {
        contentType: content_type || 'application/octet-stream',
        upsert: true,
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
      .from(bucket)
      .getPublicUrl(path)

    const publicUrl = publicUrlData.publicUrl
    console.log('Public URL:', publicUrl)

    // Update table with new photo URL
    const { data: updateData, error: updateError } = await supabase
      .from(table)
      .update({ photo_url: publicUrl })
      .eq(idColumn, target_id)
      .select()

    console.log('Update result:', { updateData, updateError })

    if (updateError) {
      console.error('Update error:', updateError)
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
    console.error('Error:', e)
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
