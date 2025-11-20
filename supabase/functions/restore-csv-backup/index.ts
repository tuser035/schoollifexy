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

    const { adminId, csvData } = await req.json();

    console.log('Starting CSV backup restoration');

    // Verify admin
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, email, name')
      .eq('id', adminId)
      .single();

    if (adminError || !admin) {
      throw new Error('관리자 권한이 필요합니다');
    }

    // Restore order (considering dependencies)
    const restoreOrder = [
      'departments',
      'students',
      'teachers',
      'merits',
      'demerits',
      'monthly',
      'career_counseling',
      'email_templates',
      'email_history',
      'student_groups',
      'teacher_groups',
      'file_metadata'
    ];

    const restoredTables: string[] = [];
    let totalRestored = 0;

    // Restore each table
    for (const tableName of restoreOrder) {
      if (!csvData[tableName] || csvData[tableName].length === 0) {
        console.log(`Skipping ${tableName}: no data in backup`);
        continue;
      }

      try {
        const records = csvData[tableName];
        
        // Delete existing data
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        if (deleteError) {
          console.error(`Error deleting ${tableName}:`, deleteError);
        }

        // Insert in batches
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          
          const { error: insertError } = await supabase
            .from(tableName)
            .insert(batch);

          if (insertError) {
            console.error(`Error inserting batch to ${tableName}:`, insertError);
            throw insertError;
          }
        }

        restoredTables.push(tableName);
        totalRestored += records.length;
        console.log(`Restored ${tableName}: ${records.length} records`);
      } catch (err) {
        console.error(`Error restoring ${tableName}:`, err);
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        throw new Error(`${tableName} 복원 중 오류 발생: ${errorMsg}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        restoredTables,
        totalRestored,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Restore error:', error);
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
