import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting automatic backup...');

    // 모든 테이블 목록
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

    const backupData: Record<string, any> = {};
    let totalRecords = 0;
    const timestamp = new Date().toISOString();

    // 각 테이블의 데이터 수집
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*');

        if (error) {
          console.error(`Error fetching ${tableName}:`, error);
          continue;
        }

        backupData[tableName] = data || [];
        totalRecords += (data || []).length;
        console.log(`Backed up ${tableName}: ${(data || []).length} records`);
      } catch (err) {
        console.error(`Error processing ${tableName}:`, err);
      }
    }

    // 백업 메타데이터
    const backupMetadata = {
      timestamp,
      tables: Object.keys(backupData).length,
      totalRecords,
      version: '1.0'
    };

    // 백업 데이터를 JSON 파일로 저장
    const backupFileName = `backup_${timestamp.split('T')[0]}_${Date.now()}.json`;
    const backupContent = JSON.stringify({
      metadata: backupMetadata,
      data: backupData
    }, null, 2);

    // 스토리지에 백업 저장
    const { error: uploadError } = await supabase.storage
      .from('edufine-documents')
      .upload(`backups/${backupFileName}`, backupContent, {
        contentType: 'application/json',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading backup:', uploadError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to upload backup',
          details: uploadError 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // 백업 메타데이터 저장
    await supabase.from('file_metadata').insert({
      storage_path: `backups/${backupFileName}`,
      original_filename: backupFileName,
      file_size: new Blob([backupContent]).size,
      mime_type: 'application/json',
      bucket_name: 'edufine-documents'
    });

    console.log(`Backup completed: ${backupFileName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Backup completed successfully',
        metadata: backupMetadata,
        fileName: backupFileName
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Backup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
