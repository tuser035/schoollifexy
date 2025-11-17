import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Student {
  studentId: string;
  name: string;
  email: string;
}

interface SendBulkEmailRequest {
  adminId: string;
  subject: string;
  body: string;
  students: Student[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { adminId, subject, body, students }: SendBulkEmailRequest = await req.json();

    console.log("Bulk email request:", { adminId, subject, studentCount: students.length });

    // 관리자/교사 확인
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("email")
      .eq("id", adminId)
      .maybeSingle();

    let senderName = "Unknown";
    let senderType = "admin";

    if (adminError || !admin) {
      // Try teacher
      const { data: teacher, error: teacherError } = await supabase
        .from("teachers")
        .select("name")
        .eq("id", adminId)
        .maybeSingle();

      if (teacherError || !teacher) {
        throw new Error("권한이 없습니다");
      }
      senderName = teacher.name;
      senderType = "teacher";
    } else {
      senderName = admin.email;
    }

    if (!students || students.length === 0) {
      throw new Error("발송할 학생이 없습니다");
    }

    console.log(`Sending emails to ${students.length} students`);

    // 이메일 발송
    const sendResults = [];
    const emailHistoryRecords = [];

    for (const student of students) {
      if (!student.email || !student.email.includes("@")) {
        console.log(`Student ${student.name} has no valid email, skipping`);
        continue;
      }

      try {
        // Rate limit 방지를 위한 delay (500ms)
        if (sendResults.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 실제 학생 이메일로 발송
        const emailResponse = await resend.emails.send({
          from: "School Point <onboarding@resend.dev>",
          replyTo: "gb25tr04@sc.gyo6.net",
          to: [student.email],
          subject: subject,
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="background-color: #ffffff; padding: 20px;">
                <div style="white-space: pre-wrap; font-family: inherit; line-height: 1.6;">${body}</div>
              </div>
              
              <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d;">
                <p style="margin: 0 0 10px 0;"><strong>School Point 학생 관리 시스템</strong></p>
                <p style="margin: 0 0 5px 0;">이 메일은 귀하가 등록한 학생 정보를 기반으로 발송되었습니다.</p>
                <p style="margin: 0 0 5px 0;">문의사항: gb25tr04@sc.gyo6.net</p>
                <p style="margin: 0;">수신을 원하지 않으시면 학교에 연락해 주세요.</p>
              </div>
            </div>
          `,
          text: `
${body.replace(/<[^>]*>/g, '')}

---
School Point 학생 관리 시스템
문의: gb25tr04@sc.gyo6.net
          `.trim(),
        });

        console.log(`Email sent to ${student.name}:`, emailResponse);

        sendResults.push({
          student: student.name,
          email: student.email,
          success: true,
          messageId: emailResponse.data?.id || "unknown",
        });

        // 이메일 히스토리 기록
        emailHistoryRecords.push({
          sender_id: adminId,
          sender_name: senderName,
          sender_type: senderType,
          recipient_student_id: student.studentId,
          recipient_email: student.email,
          recipient_name: student.name,
          subject: subject,
          body: body,
          sent_at: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error(`Failed to send email to ${student.name}:`, error);
        sendResults.push({
          student: student.name,
          email: student.email,
          success: false,
          error: error?.message || "Unknown error",
        });
      }
    }

    // 이메일 히스토리 저장
    if (emailHistoryRecords.length > 0) {
      const { error: historyError } = await supabase
        .from("email_history")
        .insert(emailHistoryRecords);

      if (historyError) {
        console.error("Failed to save email history:", historyError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalSent: sendResults.filter((r) => r.success).length,
        totalFailed: sendResults.filter((r) => !r.success).length,
        results: sendResults,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-bulk-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
