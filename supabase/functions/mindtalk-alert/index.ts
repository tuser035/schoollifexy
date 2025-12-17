import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRequest {
  studentId: string;
  studentName: string;
  studentGrade: number;
  studentClass: number;
  studentNumber: number;
  dangerousWordCount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      studentId, 
      studentName, 
      studentGrade, 
      studentClass, 
      studentNumber,
      dangerousWordCount 
    }: AlertRequest = await req.json();

    console.log(`🚨 MindTalk Alert: ${studentName} (${studentId}) - ${dangerousWordCount} dangerous words`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find homeroom teachers (공동담임 지원)
    const { data: teachers, error: teacherError } = await supabase
      .from('teachers')
      .select('id, name, teacher_email')
      .eq('grade', studentGrade)
      .eq('class', studentClass)
      .eq('is_homeroom', true);

    if (teacherError || !teachers || teachers.length === 0) {
      console.log(`No homeroom teacher found for grade ${studentGrade} class ${studentClass}`);
      return new Response(JSON.stringify({ 
        success: false, 
        message: "담임선생님을 찾을 수 없습니다." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 이메일이 있는 담임선생님만 필터링
    const validTeachers = teachers.filter(t => t.teacher_email);
    
    if (validTeachers.length === 0) {
      console.log("Homeroom teachers have no email addresses");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "담임선생님의 이메일이 등록되어 있지 않습니다." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${validTeachers.length} homeroom teacher(s): ${validTeachers.map(t => t.name).join(', ')}`);

    // Get reply-to email setting
    const { data: replyToSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'reply_to_email')
      .single();

    const replyToEmail = replyToSetting?.setting_value || 'noreply@schoolpoint.store';

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "이메일 서비스가 설정되지 않았습니다." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Noto Sans KR', sans-serif; background: #f8f9fa; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 24px; }
          .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0; }
          .student-info { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          .info-row:last-child { border-bottom: none; }
          .label { color: #64748b; }
          .value { color: #1e293b; font-weight: 600; }
          .warning { color: #dc2626; font-weight: bold; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; color: #64748b; font-size: 12px; }
          .action-btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 마음톡 위험 신호 감지</h1>
          </div>
          <div class="content">
            <div class="alert-box">
              <p class="warning">⚠️ 학생의 대화에서 위험 신호가 감지되었습니다.</p>
              <p>마음톡 AI 상담 중 위험한 단어가 <strong>${dangerousWordCount}회</strong> 누적 감지되었습니다.</p>
            </div>
            
            <div class="student-info">
              <h3 style="margin-top: 0;">📋 학생 정보</h3>
              <div class="info-row">
                <span class="label">이름</span>
                <span class="value">${studentName}</span>
              </div>
              <div class="info-row">
                <span class="label">학년</span>
                <span class="value">${studentGrade}학년</span>
              </div>
              <div class="info-row">
                <span class="label">반</span>
                <span class="value">${studentClass}반</span>
              </div>
              <div class="info-row">
                <span class="label">번호</span>
                <span class="value">${studentNumber}번</span>
              </div>
              <div class="info-row">
                <span class="label">학번</span>
                <span class="value">${studentId}</span>
              </div>
            </div>
            
            <p><strong>권장 조치:</strong></p>
            <ul>
              <li>학생과 1:1 면담을 진행해 주세요</li>
              <li>필요시 전문 상담 교사에게 연계해 주세요</li>
              <li>학부모와의 소통을 고려해 주세요</li>
            </ul>
            
            <p style="color: #64748b; font-size: 14px;">
              * 이 알림은 학생의 안전을 위해 자동으로 발송되었습니다.
            </p>
          </div>
          <div class="footer">
            <p>스쿨포인트 마음톡 시스템</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 모든 담임선생님에게 이메일 발송 (공동담임 지원)
    const emailPromises = validTeachers.map(teacher => 
      resend.emails.send({
        from: "스쿨포인트 마음톡 <noreply@schoolpoint.store>",
        to: [teacher.teacher_email],
        reply_to: replyToEmail,
        subject: `🚨 [긴급] ${studentName} 학생 마음톡 위험 신호 감지`,
        html: emailHtml,
      })
    );

    const emailResults = await Promise.allSettled(emailPromises);
    const successCount = emailResults.filter(r => r.status === 'fulfilled').length;
    const teacherNames = validTeachers.map(t => t.name).join(', ');

    console.log(`✅ Alert emails sent to ${successCount}/${validTeachers.length} homeroom teachers`);

    return new Response(JSON.stringify({ 
      success: successCount > 0, 
      message: successCount === validTeachers.length 
        ? `담임선생님(${teacherNames})께 알림이 발송되었습니다.`
        : `담임선생님 ${successCount}/${validTeachers.length}명에게 알림이 발송되었습니다.`,
      sentCount: successCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("mindtalk-alert error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
