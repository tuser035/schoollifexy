import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { adminId } = await req.json();

    // Verify admin
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, email, name')
      .eq('id', adminId)
      .single();

    if (adminError || !admin) {
      throw new Error('관리자 권한이 필요합니다');
    }

    // Tables to export
    const tables = [
      'students',
      'teachers',
      'merits',
      'demerits',
      'monthly',
      'career_counseling',
      'email_history',
      'email_templates',
      'departments',
      'student_groups',
      'teacher_groups',
      'file_metadata'
    ];

    const exportData: Record<string, any[]> = {};
    let successCount = 0;
    let errorCount = 0;

    // Fetch data from each table
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName as any)
          .select('*');

        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          errorCount++;
          exportData[tableName] = [];
        } else {
          exportData[tableName] = data || [];
          successCount++;
        }
      } catch (err) {
        console.error(`Error processing ${tableName}:`, err);
        errorCount++;
        exportData[tableName] = [];
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: exportData,
        metadata: {
          exportDate: new Date().toISOString(),
          adminEmail: admin.email || admin.name,
          successCount,
          errorCount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
