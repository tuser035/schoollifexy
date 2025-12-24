import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const fromEmail = "noreply@schoolpoint.store"; // 인증된 도메인 이메일

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Student {
  studentId: string;
  name: string;
  email: string;
  nationalityCode?: string; // 국적 코드 추가
}

interface SendBulkEmailRequest {
  adminId: string;
  subject: string;
  body: string;
  students: Student[];
  recipientType?: "student" | "teacher"; // 수신자 유형 (학생/교사)
  attachmentInfo?: {
    url?: string;
    name?: string;
    isZip?: boolean;
    files?: Array<{ url: string; name: string }>;
  };
}

// 국적 코드에 따른 언어 매핑
const nationalityToLanguage: Record<string, { name: string; nativeName: string }> = {
  'ru': { name: 'Russian', nativeName: '러시아어' },
  'vi': { name: 'Vietnamese', nativeName: '베트남어' },
  'zh': { name: 'Chinese', nativeName: '중국어' },
  'ja': { name: 'Japanese', nativeName: '일본어' },
  'en': { name: 'English', nativeName: '영어' },
  'th': { name: 'Thai', nativeName: '태국어' },
  'mn': { name: 'Mongolian', nativeName: '몽골어' },
  'uz': { name: 'Uzbek', nativeName: '우즈베크어' },
  'ph': { name: 'Filipino', nativeName: '필리핀어' },
  'id': { name: 'Indonesian', nativeName: '인도네시아어' },
  'np': { name: 'Nepali', nativeName: '네팔어' },
  'bd': { name: 'Bengali', nativeName: '벵골어' },
  'pk': { name: 'Urdu', nativeName: '우르두어' },
};

// Gemini를 사용한 번역 함수
async function translateContent(content: string, targetLanguages: string[]): Promise<Map<string, string>> {
  const translations = new Map<string, string>();
  
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY is not configured");
    return translations;
  }

  for (const langCode of targetLanguages) {
    const langInfo = nationalityToLanguage[langCode];
    if (!langInfo) continue;

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a professional translator. Translate the following Korean text to ${langInfo.name}. 
Keep the formatting (line breaks, paragraphs) intact. 
Only provide the translation, no explanations or notes.
Make it natural and easy to understand for native speakers.`
            },
            {
              role: "user",
              content: content
            }
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        console.error(`Translation to ${langInfo.name} failed:`, response.status);
        continue;
      }

      const data = await response.json();
      const translatedText = data.choices?.[0]?.message?.content?.trim();
      
      if (translatedText) {
        translations.set(langCode, translatedText);
        console.log(`Successfully translated to ${langInfo.name}`);
      }
    } catch (error) {
      console.error(`Error translating to ${langInfo.name}:`, error);
    }
  }

  return translations;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SERVICE_ROLE_KEY를 사용하여 RLS 우회
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { adminId, subject, body, students, recipientType, attachmentInfo }: SendBulkEmailRequest = await req.json();

    console.log("Bulk email request:", { adminId, subject, studentCount: students.length, recipientType });

    // 답장 이메일 주소 가져오기
    const { data: replyToSetting } = await supabase.rpc("get_system_setting", {
      setting_key_input: "reply_to_email"
    });
    const replyToEmail = replyToSetting || "gyeongjuhs@naver.com";
    console.log("Reply-to email:", replyToEmail);

    // 먼저 교사인지 확인
    let senderName = "Unknown";
    let senderType = "teacher";

    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .select("name")
      .eq("id", adminId)
      .maybeSingle();

    if (teacherError || !teacher) {
      // 교사가 아니면 관리자인지 확인
      const { data: admin, error: adminError } = await supabase
        .from("admins")
        .select("email")
        .eq("id", adminId)
        .maybeSingle();

      if (adminError || !admin) {
        throw new Error("권한이 없습니다");
      }
      senderName = admin.email;
      senderType = "admin";
    } else {
      senderName = teacher.name;
      senderType = "teacher";
    }

    if (!students || students.length === 0) {
      throw new Error("발송할 학생이 없습니다");
    }

    console.log(`Sending emails to ${students.length} students`);

    // 학생들의 국적 코드 조회 (교사가 아닌 경우에만)
    let studentNationalityCodes: Map<string, string> = new Map();
    if (recipientType !== "teacher") {
      const studentIds = students.map(s => s.studentId).filter(Boolean);
      if (studentIds.length > 0) {
        const { data: studentsData } = await supabase
          .from("students")
          .select("student_id, nationality_code")
          .in("student_id", studentIds);
        
        if (studentsData) {
          for (const s of studentsData) {
            if (s.nationality_code && s.nationality_code !== 'kr') {
              studentNationalityCodes.set(s.student_id, s.nationality_code);
            }
          }
        }
      }
    }

    // 외국인 학생이 있는 경우 필요한 언어들 수집
    const uniqueLanguages = [...new Set(studentNationalityCodes.values())];
    console.log("Foreign languages needed:", uniqueLanguages);

    // 번역 수행 (외국인 학생이 있는 경우만)
    let translations: Map<string, string> = new Map();
    if (uniqueLanguages.length > 0) {
      console.log("Translating content to:", uniqueLanguages);
      translations = await translateContent(body, uniqueLanguages);
    }

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

        // 해당 학생의 국적 코드 확인
        const studentNationalityCode = studentNationalityCodes.get(student.studentId);
        
        // 번역된 내용 추가
        let translatedSection = '';
        if (studentNationalityCode && translations.has(studentNationalityCode)) {
          const langInfo = nationalityToLanguage[studentNationalityCode];
          const translatedText = translations.get(studentNationalityCode);
          translatedSection = `
            <div style="margin-top: 30px; padding: 20px; background-color: #f0f7ff; border-radius: 8px; border-left: 4px solid #007bff;">
              <h3 style="margin: 0 0 15px 0; font-size: 14px; color: #007bff;">
                🌍 ${langInfo?.nativeName} 번역 (${langInfo?.name} Translation)
              </h3>
              <div style="white-space: pre-wrap; font-family: inherit; line-height: 1.6; color: #333;">
                ${translatedText}
              </div>
            </div>
          `;
        }

        // 첨부파일 링크 HTML 생성
        let attachmentHtml = '';
        if (attachmentInfo) {
          if (attachmentInfo.url && attachmentInfo.name) {
            // 단일 파일 또는 ZIP
            attachmentHtml = `
              <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #495057;">📎 첨부파일</h3>
                <a href="${attachmentInfo.url}" 
                   style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: 500;"
                   download="${attachmentInfo.name}">
                  ${attachmentInfo.isZip ? '📦 ' : '📄 '}${attachmentInfo.name} 다운로드
                </a>
              </div>
            `;
          } else if (attachmentInfo.files && attachmentInfo.files.length > 0) {
            // 여러 개별 파일
            const fileLinks = attachmentInfo.files.map((file, index) => `
              <li style="margin-bottom: 10px;">
                <a href="${file.url}" 
                   style="color: #007bff; text-decoration: none; font-weight: 500;"
                   download="${file.name}">
                  ${index + 1}. ${file.name}
                </a>
              </li>
            `).join('');
            
            attachmentHtml = `
              <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #dee2e6;">
                <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #495057;">📎 첨부파일</h3>
                <ul style="list-style: none; padding: 0; margin: 0;">
                  ${fileLinks}
                </ul>
              </div>
            `;
          }
        }

        const htmlBody = `
          <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="background-color: #ffffff; padding: 20px;">
              <div style="white-space: pre-wrap; font-family: inherit; line-height: 1.6;">${body}</div>
            </div>
            
            ${translatedSection}
            
            ${attachmentHtml}
            
            <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d;">
              <p style="margin: 0 0 10px 0;"><strong>School Life 학생 관리 시스템</strong></p>
              <p style="margin: 0 0 5px 0;">이 메일은 School Life 시스템에서 자동으로 발송되었습니다.</p>
              <p style="margin: 0 0 5px 0;">문의사항이 있으시면 gyeongjuhs@naver.com로 연락해 주세요.</p>
            </div>
          </div>
        `;

        // Resend API로 메일 발송
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: `School Life <${fromEmail}>`,
          reply_to: replyToEmail,
          to: student.email,
          subject: subject,
          html: htmlBody,
        });

        if (emailError) {
          console.error(`Failed to send email to ${student.name}:`, emailError);
          sendResults.push({
            student: student.name,
            email: student.email,
            success: false,
            error: emailError.message,
          });
          continue;
        }

        console.log(`Email sent to ${student.name} via Resend, ID: ${emailData?.id}${studentNationalityCode ? ` (with ${studentNationalityCode} translation)` : ''}`);

        sendResults.push({
          student: student.name,
          email: student.email,
          success: true,
          messageId: emailData?.id || "resend-api",
          translated: !!studentNationalityCode,
        });

        // 첨부파일 URL 배열 생성
        let attachmentUrlsArray: string[] | null = null;
        if (attachmentInfo) {
          if (attachmentInfo.url) {
            attachmentUrlsArray = [attachmentInfo.url];
          } else if (attachmentInfo.files && attachmentInfo.files.length > 0) {
            attachmentUrlsArray = attachmentInfo.files.map(f => f.url);
          }
        }

        // 이메일 히스토리 기록
        // 교사에게 발송 시 recipient_student_id는 null로 저장
        emailHistoryRecords.push({
          sender_id: adminId,
          sender_name: senderName,
          sender_type: senderType,
          recipient_student_id: recipientType === "teacher" ? null : student.studentId,
          recipient_email: student.email,
          recipient_name: student.name,
          subject: subject,
          body: body,
          sent_at: new Date().toISOString(),
          resend_email_id: emailData?.id || null,
          attachment_urls: attachmentUrlsArray,
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

    const translatedCount = sendResults.filter(r => r.success && r.translated).length;

    return new Response(
      JSON.stringify({
        success: true,
        totalSent: sendResults.filter((r) => r.success).length,
        totalFailed: sendResults.filter((r) => !r.success).length,
        translatedCount: translatedCount,
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
