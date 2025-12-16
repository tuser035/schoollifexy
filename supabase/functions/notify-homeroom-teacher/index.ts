import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const fromEmail = "noreply@schoolpoint.store";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  studentName: string;
  studentGrade: number;
  studentClass: number;
  studentNumber: number;
  category: string;
  reason: string;
  score: number;
  teacherName: string; // 벌점을 부여한 교사 이름
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      studentName,
      studentGrade,
      studentClass,
      studentNumber,
      category,
      reason,
      score,
      teacherName,
    }: NotifyRequest = await req.json();

    console.log("Notify homeroom teacher request:", {
      studentName,
      studentGrade,
      studentClass,
      teacherName,
    });

    // 담임 선생님 찾기 (is_homeroom = true, 같은 학년, 같은 반)
    const { data: homeroomTeacher, error: teacherError } = await supabase
      .from("teachers")
      .select("id, name, teacher_email")
      .eq("is_homeroom", true)
      .eq("grade", studentGrade)
      .eq("class", studentClass)
      .single();

    if (teacherError || !homeroomTeacher) {
      console.log(`No homeroom teacher found for grade ${studentGrade}, class ${studentClass}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: "담임 선생님을 찾을 수 없습니다",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!homeroomTeacher.teacher_email) {
      console.log(`Homeroom teacher ${homeroomTeacher.name} has no email`);
      return new Response(
        JSON.stringify({
          success: false,
          message: "담임 선생님의 이메일이 등록되어 있지 않습니다",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Found homeroom teacher: ${homeroomTeacher.name} (${homeroomTeacher.teacher_email})`);

    // 답장 이메일 주소 가져오기
    const { data: replyToSetting } = await supabase.rpc("get_system_setting", {
      setting_key_input: "reply_to_email"
    });
    const replyToEmail = replyToSetting || "gyeongjuhs@naver.com";

    // 이메일 본문 생성
    const currentDate = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailSubject = `[벌점 알림] ${studentGrade}학년 ${studentClass}반 ${studentName} 학생 벌점 부여 안내`;
    
    const emailHtml = `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 20px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">🔔 학생 벌점 부여 알림</h1>
        </div>
        
        <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 25px; border-radius: 0 0 10px 10px;">
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">
            안녕하세요, <strong>${homeroomTeacher.name}</strong> 선생님.<br>
            담당 학급 학생의 벌점 부여 내역을 알려드립니다.
          </p>
          
          <div style="background: #fef3c7; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 100px;">학생</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">
                  ${studentName} (${studentGrade}학년 ${studentClass}반 ${studentNumber}번)
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">항목</td>
                <td style="padding: 8px 0; color: #111827;">${category}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">사유</td>
                <td style="padding: 8px 0; color: #111827;">${reason.replace(/\n/g, '<br>')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">벌점</td>
                <td style="padding: 8px 0; color: #ea580c; font-weight: 700; font-size: 18px;">${score}점</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">부여 교사</td>
                <td style="padding: 8px 0; color: #111827;">${teacherName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">일시</td>
                <td style="padding: 8px 0; color: #111827;">${currentDate}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #6b7280; font-size: 13px; margin-top: 25px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            이 메일은 School Point 시스템에서 자동으로 발송되었습니다.<br>
            문의사항이 있으시면 교무실로 연락해 주세요.
          </p>
        </div>
      </div>
    `;

    // 이메일 발송
    const emailResponse = await resend.emails.send({
      from: `School Point <${fromEmail}>`,
      replyTo: replyToEmail,
      to: [homeroomTeacher.teacher_email],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: `담임 선생님(${homeroomTeacher.name})에게 알림이 발송되었습니다`,
        homeroomTeacher: homeroomTeacher.name,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-homeroom-teacher function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
