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

    // Resend 무료 플랜: schoollifexy@gmail.com으로만 발송 가능
    const testEmail = "schoollifexy@gmail.com";

    for (const student of students) {
      if (!student.email || !student.email.includes("@")) {
        console.log(`Student ${student.name} has no valid email, skipping`);
        continue;
      }

      try {
        // 무료 플랜에서는 테스트 이메일로만 발송
        const emailResponse = await resend.emails.send({
          from: "School Point <onboarding@resend.dev>",
          to: [testEmail],
          subject: `[테스트] ${subject} - ${student.name}님께`,
          html: `
            <div style="background-color: #f0f0f0; padding: 10px; margin-bottom: 20px; border-left: 4px solid #ff9800;">
              <strong>⚠️ 테스트 모드</strong><br/>
              실제 수신자: ${student.name} (${student.email})<br/>
              무료 플랜 제한으로 schoollifexy@gmail.com으로 발송됩니다.
            </div>
            ${body}
          `,
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
