import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  adminId: string;
  templateId: string;
  recipientType: "all" | "filtered";
  grade?: number;
  class?: number;
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

    const { adminId, templateId, recipientType, grade, class: classNum }: SendEmailRequest = await req.json();

    console.log("Send email request:", { adminId, templateId, recipientType, grade, class: classNum });

    // 관리자 확인
    const { data: admin, error: adminError } = await supabase
      .from("admins")
      .select("email")
      .eq("id", adminId)
      .single();

    if (adminError || !admin) {
      throw new Error("관리자 권한이 없습니다");
    }

    // 템플릿 가져오기
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      throw new Error("템플릿을 찾을 수 없습니다");
    }

    // 학생 목록 가져오기
    let query = supabase.from("students").select("student_id, name, gmail");

    if (recipientType === "filtered") {
      if (grade) query = query.eq("grade", grade);
      if (classNum) query = query.eq("class", classNum);
    }

    const { data: students, error: studentsError } = await query;

    if (studentsError) {
      throw new Error("학생 목록을 가져오는데 실패했습니다");
    }

    if (!students || students.length === 0) {
      throw new Error("발송할 학생이 없습니다");
    }

    console.log(`Sending emails to ${students.length} students`);

    // 이메일 발송
    const sendResults = [];
    const emailHistoryRecords = [];

    for (const student of students) {
      if (!student.gmail) {
        console.log(`Student ${student.name} has no email, skipping`);
        continue;
      }

      try {
        const emailResponse = await resend.emails.send({
          from: "School Point <onboarding@resend.dev>",
          to: [student.gmail],
          subject: template.subject,
          html: template.body,
        });

        console.log(`Email sent to ${student.name}:`, emailResponse);

        sendResults.push({
          student: student.name,
          email: student.gmail,
          success: true,
          messageId: emailResponse.data?.id || "unknown",
        });

        // 이메일 히스토리 기록
        emailHistoryRecords.push({
          sender_id: adminId,
          sender_name: admin.email,
          sender_type: "admin",
          recipient_student_id: student.student_id,
          recipient_email: student.gmail,
          recipient_name: student.name,
          subject: template.subject,
          body: template.body,
          sent_at: new Date().toISOString(),
          resend_email_id: emailResponse.data?.id || null,
        });
      } catch (error: any) {
        console.error(`Failed to send email to ${student.name}:`, error);
        sendResults.push({
          student: student.name,
          email: student.gmail,
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
    console.error("Error in send-email function:", error);
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
