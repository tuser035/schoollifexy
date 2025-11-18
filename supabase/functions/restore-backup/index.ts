import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { backupFileName, adminId } = await req.json();

    console.log('Starting backup restoration:', backupFileName);

    // 관리자 확인
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('email')
      .eq('id', adminId)
      .single();

    if (adminError || !admin) {
      throw new Error('관리자 권한이 없습니다');
    }

    // 백업 파일 다운로드
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('edufine-documents')
      .download(`backups/${backupFileName}`);

    if (downloadError) {
      console.error('Error downloading backup:', downloadError);
      throw new Error('백업 파일을 다운로드할 수 없습니다');
    }

    const backupText = await fileData.text();
    const backup = JSON.parse(backupText);
    const backupData = backup.data;

    console.log('Backup loaded:', backup.metadata);

    // 복원할 테이블 목록 (의존성 순서 고려)
    const restoreOrder = [
      'departments',
      'admins',
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

    // 각 테이블의 데이터 복원
    for (const tableName of restoreOrder) {
      if (!backupData[tableName] || backupData[tableName].length === 0) {
        console.log(`Skipping ${tableName}: no data in backup`);
        continue;
      }

      try {
        // 기존 데이터 삭제 (RLS 우회를 위해 service key 사용)
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 레코드 삭제

        if (deleteError) {
          console.error(`Error deleting ${tableName}:`, deleteError);
          // 삭제 실패해도 계속 진행 (insert는 시도)
        }

        // 데이터 복원
        const records = backupData[tableName];
        
        // 배치로 나누어 삽입 (한 번에 너무 많이 삽입하지 않도록)
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

    const restoredMetadata = {
      timestamp: new Date().toISOString(),
      restoredFrom: backupFileName,
      tables: restoredTables.length,
      totalRecords: totalRestored,
      adminEmail: admin.email
    };

    console.log('Restoration completed:', restoredMetadata);

    // 성공 이메일 발송
    try {
      await resend.emails.send({
        from: '에듀파인 백업 시스템 <onboarding@resend.dev>',
        to: [admin.email],
        subject: '✅ 백업 복원 완료',
        html: `
          <h2>백업 복원이 성공적으로 완료되었습니다</h2>
          <p><strong>복원 시간:</strong> ${new Date(restoredMetadata.timestamp).toLocaleString('ko-KR')}</p>
          <p><strong>복원된 백업:</strong> ${backupFileName}</p>
          <p><strong>복원된 테이블:</strong> ${restoredMetadata.tables}개</p>
          <p><strong>총 레코드 수:</strong> ${restoredMetadata.totalRecords}개</p>
          <br/>
          <p><strong>⚠️ 주의:</strong> 기존 데이터는 모두 삭제되고 백업 데이터로 대체되었습니다.</p>
        `,
      });
      console.log('Success email sent to admin');
    } catch (emailError) {
      console.error('Error sending success email:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '백업 복원이 완료되었습니다',
        metadata: restoredMetadata
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Restoration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 실패 이메일 발송 (가능한 경우)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: admins } = await supabase
        .from('admins')
        .select('email');
      
      const adminEmails = admins?.map(admin => admin.email) || [];
      
      if (adminEmails.length > 0) {
        const emailPromises = adminEmails.map(email => 
          resend.emails.send({
            from: '에듀파인 백업 시스템 <onboarding@resend.dev>',
            to: [email],
            subject: '❌ 백업 복원 실패',
            html: `
              <h2>백업 복원 중 오류가 발생했습니다</h2>
              <p><strong>시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
              <p><strong>오류 메시지:</strong> ${errorMessage}</p>
              <br/>
              <p><strong>⚠️ 중요:</strong> 데이터가 부분적으로 복원되었을 수 있습니다. 시스템 관리자에게 즉시 문의하시기 바랍니다.</p>
            `,
          })
        );
        
        await Promise.all(emailPromises);
        console.log('Failure email sent to admins');
      }
    } catch (emailError) {
      console.error('Error sending failure email:', emailError);
    }
    
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
