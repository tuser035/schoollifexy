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
    const { teacher_id, filename, file_base64, content_type, file_size } = await req.json()
    
    console.log('Upload request:', { teacher_id, filename, content_type, file_size })

    if (!teacher_id || !filename || !file_base64) {
      console.error('Missing required fields')
      return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify teacher exists
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('id', teacher_id)
      .maybeSingle()

    console.log('Teacher verification:', { teacher })

    if (!teacher) {
      console.error('Unauthorized: Teacher not found')
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
    const fileExt = filename.split('.').pop() || 'jpg'
    const uniqueFilename = `${teacher_id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload file using service role (bypasses RLS)
    const { error: uploadError } = await supabase.storage
      .from('evidence-photos')
      .upload(uniqueFilename, binary, {
        contentType: content_type || 'image/jpeg',
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
      .from('evidence-photos')
      .getPublicUrl(uniqueFilename)

    const publicUrl = publicUrlData.publicUrl
    console.log('Public URL:', publicUrl)

    // Save metadata
    await supabase.from('file_metadata').insert({
      storage_path: uniqueFilename,
      original_filename: filename,
      file_size: file_size,
      mime_type: content_type || 'image/jpeg',
      bucket_name: 'evidence-photos',
      uploaded_by: teacher_id
    })

    return new Response(JSON.stringify({ ok: true, path: uniqueFilename, publicUrl }), {
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
