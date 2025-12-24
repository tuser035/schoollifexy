import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Mail, Paperclip, X, AlertTriangle, GraduationCap, Users, Loader2, Languages, Printer, FileText, Save } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync, TableSubscription } from "@/hooks/use-realtime-sync";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

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

interface StudentGroup {
  id: string;
  group_name: string;
  student_ids: string[];
}

interface TeacherGroup {
  id: string;
  group_name: string;
  teacher_ids: string[];
}

interface EmailTemplate {
  id: string;
  title: string;
  subject: string;
  body: string;
}

interface Student {
  student_id: string;
  name: string;
  gmail: string;
}

interface Teacher {
  id: string;
  name: string;
  teacher_email: string;
}

interface BulkEmailSenderProps {
  isActive?: boolean;
}

const BulkEmailSender = ({ isActive = false }: BulkEmailSenderProps) => {
  const [recipientType, setRecipientType] = useState<"student" | "teacher">("student");
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([]);
  const [teacherGroups, setTeacherGroups] = useState<TeacherGroup[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [recipientsWithoutEmail, setRecipientsWithoutEmail] = useState<string[]>([]);
  const [validEmailCount, setValidEmailCount] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingFileName, setUploadingFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  
  // 번역 관련 상태
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslationPreview, setShowTranslationPreview] = useState(false);
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const [foreignStudentLanguages, setForeignStudentLanguages] = useState<string[]>([]);
  
  // PDF 관련 상태
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string>("");
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const authUser = localStorage.getItem("auth_user");
  const user = authUser ? JSON.parse(authUser) : null;

  const groupTables: TableSubscription[] = user ? [
    {
      channelName: "bulk-email-student-groups",
      table: "student_groups",
      filter: `admin_id=eq.${user.id}`,
      labels: {
        insert: "새 학생 그룹이 추가되었습니다",
        update: "학생 그룹이 수정되었습니다",
        delete: "학생 그룹이 삭제되었습니다",
      },
    },
    {
      channelName: "bulk-email-teacher-groups",
      table: "teacher_groups",
      filter: `admin_id=eq.${user.id}`,
      labels: {
        insert: "새 교사 그룹이 추가되었습니다",
        update: "교사 그룹이 수정되었습니다",
        delete: "교사 그룹이 삭제되었습니다",
      },
    },
    {
      channelName: "bulk-email-templates",
      table: "email_templates",
      labels: {
        insert: "새 템플릿이 추가되었습니다",
        update: "템플릿이 수정되었습니다",
        delete: "템플릿이 삭제되었습니다",
      },
    },
  ] : [];

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      loadStudentGroups(),
      loadTeacherGroups(),
      loadTemplates(),
    ]);
  }, []);

  useRealtimeSync({
    tables: groupTables,
    onRefresh: handleRefresh,
    enabled: !!user,
  });

  // 선택된 그룹이 목록에 없으면 초기화
  useEffect(() => {
    if (selectedGroup) {
      if (recipientType === "student") {
        const exists = studentGroups.some(g => g.id === selectedGroup);
        if (!exists) setSelectedGroup("");
      } else {
        const exists = teacherGroups.some(g => g.id === selectedGroup);
        if (!exists) setSelectedGroup("");
      }
    }
  }, [studentGroups, teacherGroups, recipientType, selectedGroup]);

  useEffect(() => {
    if (isActive) {
      loadStudentGroups();
      loadTeacherGroups();
      loadTemplates();
    }
  }, [isActive]);

  useEffect(() => {
    loadStudentGroups();
    loadTeacherGroups();
    loadTemplates();
  }, []);

  // 수신자 유형 변경 시 선택 초기화
  useEffect(() => {
    setSelectedGroup("");
    setSelectedTemplate("");
    setSubject("");
    setBody("");
    setRecipientsWithoutEmail([]);
    setValidEmailCount(0);
  }, [recipientType]);

  const loadStudentGroups = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase.rpc("admin_get_student_groups", {
        admin_id_input: user.id,
      });

      if (error) throw error;
      setStudentGroups(data || []);
    } catch (error: any) {
      console.error("Error loading student groups:", error);
    }
  };

  const loadTeacherGroups = async () => {
    try {
      if (!user) return;
      
      // RPC 함수를 사용하여 교사 그룹 조회
      const { data, error } = await supabase.rpc("teacher_get_own_teacher_groups", {
        teacher_id_input: user.id,
      });

      if (error) throw error;
      setTeacherGroups(data || []);
    } catch (error: any) {
      console.error("Error loading teacher groups:", error);
    }
  };

  const loadTemplates = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase.rpc("admin_get_email_templates", {
        admin_id_input: user.id,
      });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error loading templates:", error);
    }
  };

  const handleGroupSelect = async (groupId: string) => {
    setSelectedGroup(groupId);
    setRecipientsWithoutEmail([]);
    setValidEmailCount(0);
    setForeignStudentLanguages([]);
    setTranslations(new Map());

    if (!groupId) return;

    try {
      if (!user) return;

      if (recipientType === "student") {
        const group = studentGroups.find(g => g.id === groupId);
        if (!group) return;

        const { data: studentsData, error } = await supabase.rpc(
          "teacher_get_students_by_ids",
          {
            teacher_id_input: user.id,
            student_ids_input: group.student_ids,
          }
        );

        if (error) throw error;

        if (studentsData) {
          const withoutEmail = studentsData.filter((s: any) => !s.gmail || !s.gmail.includes("@"));
          const withEmail = studentsData.filter((s: any) => s.gmail && s.gmail.includes("@"));
          setRecipientsWithoutEmail(withoutEmail.map((s: any) => s.name));
          setValidEmailCount(withEmail.length);
          
          // 외국인 학생 언어 수집 - RPC 함수 사용
          const { data: nationalityData, error: nationalityError } = await supabase.rpc(
            "get_student_nationality_codes",
            {
              user_id_input: user.id,
              student_ids_input: group.student_ids
            }
          );
          
          if (nationalityError) {
            console.error("nationality 조회 오류:", nationalityError);
          }
          
          if (nationalityData && nationalityData.length > 0) {
            const foreignLangs = new Set<string>();
            for (const s of nationalityData) {
              if (s.nationality_code && s.nationality_code !== 'kr' && nationalityToLanguage[s.nationality_code]) {
                foreignLangs.add(s.nationality_code);
              }
            }
            const langsArray = [...foreignLangs];
            console.log("외국인 언어 배열:", langsArray);
            setForeignStudentLanguages(langsArray);
          }
        }
      } else {
        const group = teacherGroups.find(g => g.id === groupId);
        if (!group) return;

        const { data: teachersData, error } = await supabase.rpc("admin_get_teachers", {
          admin_id_input: user.id,
          search_text: null,
          search_grade: null,
          search_class: null,
          search_department: null,
          search_subject: null,
          search_dept_name: null,
          search_homeroom: null,
        });

        if (error) throw error;

        if (teachersData) {
          const groupTeachers = teachersData.filter((t: Teacher) => 
            group.teacher_ids.includes(t.id)
          );
          const withoutEmail = groupTeachers.filter((t: Teacher) => !t.teacher_email || !t.teacher_email.includes("@"));
          const withEmail = groupTeachers.filter((t: Teacher) => t.teacher_email && t.teacher_email.includes("@"));
          setRecipientsWithoutEmail(withoutEmail.map((t: Teacher) => t.name));
          setValidEmailCount(withEmail.length);
        }
      }
    } catch (error: any) {
      console.error("Error checking emails:", error);
    }
  };

  // 번역 미리보기 함수
  const handleTranslatePreview = async () => {
    if (!body.trim()) {
      toast.error("번역할 내용을 입력하세요");
      return;
    }

    if (foreignStudentLanguages.length === 0) {
      toast.error("선택된 그룹에 외국인 학생이 없습니다");
      return;
    }

    setIsTranslating(true);
    try {
      const newTranslations = new Map<string, string>();
      
      for (const langCode of foreignStudentLanguages) {
        const langInfo = nationalityToLanguage[langCode];
        if (!langInfo) continue;

        const { data, error } = await supabase.functions.invoke("translate-content", {
          body: {
            content: body,
            targetLanguage: langCode,
          },
        });

        if (error) {
          console.error(`Translation to ${langInfo.name} failed:`, error);
          continue;
        }

        if (data?.translatedText) {
          newTranslations.set(langCode, data.translatedText);
        }
      }

      setTranslations(newTranslations);
      setShowTranslationPreview(true);
      toast.success(`${newTranslations.size}개 언어로 번역 완료`);
    } catch (error: any) {
      console.error("Translation error:", error);
      toast.error("번역 중 오류가 발생했습니다");
    } finally {
      setIsTranslating(false);
    }
  };

  // 출력 함수
  const handlePrint = () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("제목과 내용을 입력하세요");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("팝업이 차단되었습니다. 팝업 차단을 해제해주세요.");
      return;
    }

    let translationHtml = '';
    translations.forEach((translatedText, langCode) => {
      const langInfo = nationalityToLanguage[langCode];
      if (langInfo) {
        translationHtml += `
          <div style="margin-top: 30px; padding: 20px; background-color: #f0f7ff; border-radius: 8px; border-left: 4px solid #007bff;">
            <h3 style="margin: 0 0 15px 0; font-size: 14px; color: #007bff;">
              🌍 ${langInfo.nativeName} 번역 (${langInfo.name} Translation)
            </h3>
            <div style="white-space: pre-wrap; font-family: inherit; line-height: 1.8; color: #333;">
              ${translatedText}
            </div>
          </div>
        `;
      }
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Malgun Gothic', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.8;
          }
          h1 {
            font-size: 24px;
            color: #333;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #007bff;
          }
          .content {
            white-space: pre-wrap;
            font-size: 14px;
            color: #333;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <h1>${subject}</h1>
        <div class="content">${body}</div>
        ${translationHtml}
      </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === "__none__") {
      setSubject("");
      setBody("");
      return;
    }
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  // PDF 파일 선택 및 텍스트 추출 핸들러
  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      toast.error("PDF 파일만 선택할 수 있습니다");
      return;
    }
    
    setIsExtractingPdf(true);
    setPdfFileName(file.name);
    
    try {
      // PDF.js worker 설정 - legacy worker 사용
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer
      }).promise;
      
      let fullText = "";
      let hasTextContent = false;
      
      console.log(`PDF 로드 완료: ${pdf.numPages}페이지`);
      
      // 먼저 텍스트 기반 PDF인지 확인
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        console.log(`페이지 ${i} 텍스트 아이템 수:`, textContent.items.length);
        
        if (textContent.items.length > 0) {
          hasTextContent = true;
        }
        
        // 텍스트 아이템들을 줄바꿈 고려하여 조합
        let pageText = "";
        let lastY: number | null = null;
        
        for (const item of textContent.items) {
          const textItem = item as any;
          if (textItem.str) {
            // Y 좌표가 변경되면 줄바꿈 추가
            if (lastY !== null && Math.abs(textItem.transform[5] - lastY) > 5) {
              pageText += "\n";
            }
            pageText += textItem.str;
            lastY = textItem.transform[5];
          }
        }
        
        fullText += pageText + "\n\n";
      }
      
      const extractedText = fullText.trim();
      
      console.log("추출된 텍스트 길이:", extractedText.length);
      console.log("추출된 텍스트 미리보기:", extractedText.substring(0, 200));
      
      // 텍스트가 없으면 OCR 시도
      if (!extractedText || !hasTextContent) {
        toast.info("이미지 기반 PDF입니다. OCR을 시작합니다...");
        
        // PDF 페이지를 이미지로 변환하여 OCR 수행
        let ocrText = "";
        const scale = 1.5; // 이미지 크기를 줄여서 전송
        
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) { // 최대 10페이지까지만 처리
          toast.info(`OCR 진행 중... (${i}/${Math.min(pdf.numPages, 10)}페이지)`);
          
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          
          console.log(`페이지 ${i} viewport:`, viewport.width, 'x', viewport.height);
          
          // Canvas에 페이지 렌더링
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          
          const context = canvas.getContext('2d');
          if (!context) {
            throw new Error('Canvas context를 생성할 수 없습니다');
          }
          
          // 배경을 흰색으로 설정
          context.fillStyle = 'white';
          context.fillRect(0, 0, canvas.width, canvas.height);
          
          // PDF 페이지 렌더링
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
            canvas: canvas
          } as any;
          
          await page.render(renderContext).promise;
          
          console.log(`페이지 ${i} 렌더링 완료 - 캔버스: ${canvas.width}x${canvas.height}`);
          
          // 캔버스가 비어있는지 확인 (모든 픽셀이 흰색인지)
          const testData = context.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
          let hasContent = false;
          for (let j = 0; j < testData.data.length; j += 4) {
            // 완전히 흰색(255,255,255)이 아닌 픽셀이 있는지 확인
            if (testData.data[j] < 250 || testData.data[j+1] < 250 || testData.data[j+2] < 250) {
              hasContent = true;
              break;
            }
          }
          console.log(`페이지 ${i} 콘텐츠 존재:`, hasContent);
          
          if (!hasContent) {
            console.log(`페이지 ${i}가 비어있습니다. 스킵합니다.`);
            continue;
          }
          
          // Canvas를 JPEG로 변환하여 크기 줄이기
          const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
          
          console.log(`페이지 ${i} 이미지 생성 완료 - base64 길이: ${imageBase64.length}`);
          
          // 디버깅: 첫 페이지 이미지를 다운로드 가능하게
          if (i === 1) {
            // 이미지를 새 탭에서 열어서 확인 가능하도록
            const debugLink = document.createElement('a');
            debugLink.href = imageBase64;
            debugLink.download = `pdf-page-${i}-debug.png`;
            debugLink.click();
            console.log('디버깅용 이미지가 다운로드되었습니다. 파일을 확인해주세요.');
          }
          
          // OCR Edge Function 호출
          const { data: ocrData, error: ocrError } = await supabase.functions.invoke('ocr-pdf', {
            body: { imageBase64 }
          });
          
          console.log(`페이지 ${i} OCR 응답:`, ocrData);
          
          if (ocrError) {
            console.error(`페이지 ${i} OCR 오류:`, ocrError);
            continue;
          }
          
          // 다양한 "텍스트 없음" 응답 패턴 체크
          const noTextPatterns = ['텍스트 없음', '텍스트가 없', '추출할 수 없', '인식할 수 없', '희미', '품질이 낮'];
          const isNoText = noTextPatterns.some(pattern => ocrData?.text?.includes(pattern));
          
          if (ocrData?.text && !isNoText) {
            ocrText += ocrData.text + "\n\n";
          } else {
            console.log(`페이지 ${i}: 텍스트 추출 실패 - ${ocrData?.text?.substring(0, 100)}`);
          }
        }
        
        if (!ocrText.trim()) {
          toast.error("PDF에서 텍스트를 추출할 수 없습니다. 원본 PDF 품질을 확인해주세요.");
          return;
        }
        
        // OCR로 추출된 텍스트를 본문에 설정
        setBody(ocrText.trim());
        
        // 제목이 비어있으면 파일명을 제목으로 설정
        if (!subject.trim()) {
          const titleFromFileName = file.name.replace(/\.pdf$/i, "");
          setSubject(titleFromFileName);
        }
        
        toast.success(`OCR 텍스트 추출 완료 (${Math.min(pdf.numPages, 10)}페이지)`);
        return;
      }
      
      // 추출된 텍스트를 본문에 설정
      setBody(extractedText);
      
      // 제목이 비어있으면 파일명을 제목으로 설정
      if (!subject.trim()) {
        const titleFromFileName = file.name.replace(/\.pdf$/i, "");
        setSubject(titleFromFileName);
      }
      
      toast.success(`PDF 텍스트 추출 완료 (${pdf.numPages}페이지)`);
    } catch (error: any) {
      console.error("PDF 추출 오류:", error);
      toast.error("PDF 텍스트 추출 중 오류가 발생했습니다");
    } finally {
      setIsExtractingPdf(false);
      if (pdfInputRef.current) {
        pdfInputRef.current.value = "";
      }
    }
  };

  // 템플릿으로 저장 함수
  const handleSaveAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error("템플릿 이름을 입력하세요");
      return;
    }
    
    if (!subject.trim() || !body.trim()) {
      toast.error("제목과 내용을 입력하세요");
      return;
    }
    
    try {
      if (!user) return;
      
      const { error } = await supabase.rpc("admin_insert_email_template_bulk", {
        admin_id_input: user.id,
        title_input: newTemplateName.trim(),
        subject_input: subject,
        body_input: body,
        template_type_input: "bulk",
      });
      
      if (error) throw error;
      
      toast.success(`템플릿 "${newTemplateName}" 저장 완료`);
      setShowSaveTemplateDialog(false);
      setNewTemplateName("");
      
      // 템플릿 목록 새로고침
      await loadTemplates();
    } catch (error: any) {
      console.error("템플릿 저장 오류:", error);
      toast.error("템플릿 저장 실패: " + error.message);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // 첨부파일 업로드 함수 - Edge Function을 통해 Service Role로 업로드
  const uploadAttachments = async (): Promise<{
    url?: string;
    name?: string;
    isZip?: boolean;
    files?: Array<{ url: string; name: string }>;
  } | undefined> => {
    if (attachments.length === 0) return undefined;

    const uploadedFiles: Array<{ url: string; name: string }> = [];
    const totalFiles = attachments.length;

    for (let i = 0; i < attachments.length; i++) {
      const file = attachments[i];
      setUploadingFileName(file.name);
      setUploadProgress(Math.round((i / totalFiles) * 100));

      // 파일을 base64로 변환
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Edge Function을 통해 업로드 (Service Role 사용)
      const { data, error } = await supabase.functions.invoke('upload-email-attachment', {
        body: {
          user_id: user.id,
          filename: file.name,
          file_base64: base64,
          content_type: file.type || 'application/octet-stream',
        },
      });

      if (error || !data?.ok) {
        console.error('File upload error:', error || data?.error);
        throw new Error(`파일 업로드 실패: ${file.name}`);
      }

      uploadedFiles.push({
        url: data.publicUrl,
        name: file.name,
      });

      setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    setUploadingFileName("");
    setUploadProgress(0);

    // 단일 파일인 경우
    if (uploadedFiles.length === 1) {
      return {
        url: uploadedFiles[0].url,
        name: uploadedFiles[0].name,
        isZip: false,
      };
    }

    // 여러 파일인 경우
    return {
      files: uploadedFiles,
    };
  };

  const handleSend = async () => {
    if (!selectedGroup) {
      toast.error("그룹을 선택하세요");
      return;
    }

    if (!subject.trim() || !body.trim()) {
      toast.error("제목과 내용을 입력하세요");
      return;
    }

    try {
      setIsSending(true);
      if (!user) return;

      // 첨부파일 업로드
      let attachmentInfo;
      if (attachments.length > 0) {
        setIsUploading(true);
        try {
          attachmentInfo = await uploadAttachments();
        } finally {
          setIsUploading(false);
        }
      }

      if (recipientType === "student") {
        // 학생 일괄 발송
        const { data: latestGroups, error: groupsError } = await supabase.rpc("admin_get_student_groups", {
          admin_id_input: user.id,
        });

        if (groupsError) throw groupsError;

        const group = latestGroups?.find((g: StudentGroup) => g.id === selectedGroup);
        if (!group) {
          toast.error("그룹을 찾을 수 없습니다");
          return;
        }

        setStudentGroups(latestGroups || []);

        const { data: studentsData, error: studentsError } = await supabase.rpc(
          "teacher_get_students_by_ids",
          {
            teacher_id_input: user.id,
            student_ids_input: group.student_ids,
          }
        );

        if (studentsError) throw studentsError;

        if (!studentsData || studentsData.length === 0) {
          toast.error("그룹에 학생이 없습니다");
          return;
        }

        const validStudents = studentsData.filter((s: Student) => s.gmail && s.gmail.includes("@"));

        if (validStudents.length === 0) {
          toast.error("이메일 주소가 등록된 학생이 없습니다");
          return;
        }

        const { data, error } = await supabase.functions.invoke("send-bulk-email", {
          body: {
            adminId: user.id,
            subject: subject,
            body: body,
            students: validStudents.map((s: Student) => ({
              studentId: s.student_id,
              name: s.name,
              email: s.gmail,
            })),
            attachmentInfo,
          },
        });

        if (error) throw error;

        toast.success(
          `학생 이메일 발송 완료\n성공: ${data.totalSent}건, 실패: ${data.totalFailed}건`,
          { duration: 5000 }
        );
      } else {
        // 교사 일괄 발송
        const group = teacherGroups.find(g => g.id === selectedGroup);
        if (!group) {
          toast.error("그룹을 찾을 수 없습니다");
          return;
        }

        const { data: teachersData, error: teachersError } = await supabase.rpc("admin_get_teachers", {
          admin_id_input: user.id,
          search_text: null,
          search_grade: null,
          search_class: null,
          search_department: null,
          search_subject: null,
          search_dept_name: null,
          search_homeroom: null,
        });

        if (teachersError) throw teachersError;

        const groupTeachers = teachersData?.filter((t: Teacher) => 
          group.teacher_ids.includes(t.id)
        ) || [];

        const validTeachers = groupTeachers.filter((t: Teacher) => t.teacher_email && t.teacher_email.includes("@"));

        if (validTeachers.length === 0) {
          toast.error("이메일 주소가 등록된 교사가 없습니다");
          return;
        }

        // 교사 이메일 발송도 동일한 edge function 사용 (recipients 형식 맞춤)
        const { data, error } = await supabase.functions.invoke("send-bulk-email", {
          body: {
            adminId: user.id,
            subject: subject,
            body: body,
            students: validTeachers.map((t: Teacher) => ({
              studentId: t.id, // 교사 UUID를 ID로 사용
              name: t.name,
              email: t.teacher_email,
            })),
            recipientType: "teacher", // 교사 발송임을 표시
            attachmentInfo,
          },
        });

        if (error) throw error;

        toast.success(
          `교사 이메일 발송 완료\n성공: ${data.totalSent}건, 실패: ${data.totalFailed}건`,
          { duration: 5000 }
        );
      }

      setSelectedTemplate("");
      setSubject("");
      setBody("");
      setAttachments([]);
    } catch (error: any) {
      console.error("Error sending bulk email:", error);
      toast.error("이메일 발송 실패: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const currentGroups = recipientType === "student" ? studentGroups : teacherGroups;
  const selectedGroupData = currentGroups.find(g => g.id === selectedGroup);
  const memberCount = selectedGroupData 
    ? (recipientType === "student" 
        ? (selectedGroupData as StudentGroup).student_ids.length 
        : (selectedGroupData as TeacherGroup).teacher_ids.length)
    : 0;

  return (
    <Card className="h-full flex flex-col border-bulk-email-pink/30">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-bulk-email-pink">
          <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
          일괄 메시지 발송
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col p-6">
        <div className="flex-1 overflow-y-auto space-y-3 pb-4 -mx-6 px-6">
          {/* 수신자 유형 선택 */}
          <div>
            <Label className="text-sm sm:text-base mb-2 block">수신자 유형</Label>
            <Tabs value={recipientType} onValueChange={(v) => setRecipientType(v as "student" | "teacher")}>
              <TabsList className="grid w-full grid-cols-2 bg-bulk-email-pink/10">
                <TabsTrigger value="student" className="data-[state=active]:bg-bulk-email-pink data-[state=active]:text-white">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  학생
                </TabsTrigger>
                <TabsTrigger value="teacher" className="data-[state=active]:bg-bulk-email-pink data-[state=active]:text-white">
                  <Users className="w-4 h-4 mr-2" />
                  교사
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div>
            <Label className="text-sm sm:text-base">
              {recipientType === "student" ? "학생 그룹 선택" : "교사 그룹 선택"}
            </Label>
            <Select value={selectedGroup} onValueChange={handleGroupSelect}>
              <SelectTrigger className="h-11 text-sm">
                <SelectValue placeholder="그룹을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {currentGroups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.group_name} (
                    {recipientType === "student" 
                      ? (group as StudentGroup).student_ids.length 
                      : (group as TeacherGroup).teacher_ids.length}명)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGroupData && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                {validEmailCount > 0 
                  ? `${validEmailCount}명에게 발송됩니다`
                  : `${memberCount}명`}
              </p>
            )}
          </div>

          {/* 이메일 없는 수신자 경고 */}
          {recipientsWithoutEmail.length > 0 && (
            <Alert variant="destructive" className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">
                  이메일 주소가 없는 {recipientType === "student" ? "학생" : "교사"} ({recipientsWithoutEmail.length}명)
                </p>
                <p className="text-xs">
                  {recipientsWithoutEmail.join(", ")}
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label className="text-sm sm:text-base">템플릿 선택 (선택사항)</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="h-11 text-sm">
                <SelectValue placeholder="템플릿을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">직접 작성</SelectItem>
                {recipientType === "student" ? (
                  <>
                    {templates.filter(t => 
                      t.title === "가정통신문" || t.title === "사제동행 디지털 챌린지"
                    ).map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.title}
                      </SelectItem>
                    ))}
                  </>
                ) : (
                  <>
                    {templates.filter(t => 
                      t.title === "교사 친목회" || t.title === "전공심화동아리 담임"
                    ).map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.title}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm sm:text-base">제목</Label>
            <Textarea
              placeholder="이메일 제목을 입력하세요"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              rows={2}
              className="text-sm resize-none min-h-[60px]"
            />
          </div>

          <div>
            <Label className="text-sm sm:text-base">내용</Label>
            <Textarea
              placeholder="이메일 내용을 입력하세요"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="font-mono text-sm resize-none min-h-[120px] sm:min-h-[160px]"
            />
          </div>

          {attachments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">첨부파일</Label>
              <div className="space-y-1.5">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted px-3 py-2 rounded-md text-xs sm:text-sm">
                    <span className="truncate flex-1 mr-2">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeAttachment(index)}
                      disabled={isUploading}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="font-medium">파일 업로드 중...</span>
              </div>
              {uploadingFileName && (
                <p className="text-xs text-muted-foreground truncate">
                  {uploadingFileName}
                </p>
              )}
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {uploadProgress}%
              </p>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1 pt-2">
            <p>• 이메일 주소가 등록된 {recipientType === "student" ? "학생" : "교사"}에게만 발송됩니다</p>
            <p>• 발송 후 이메일 히스토리에서 결과를 확인할 수 있습니다</p>
            <p>• Rate limit 방지를 위해 0.5초 간격으로 발송됩니다</p>
          </div>
        </div>

        <div className="flex-shrink-0 pt-4 -mx-6 px-6 border-t bg-card space-y-2">
          {/* 외국인 학생 언어 정보 */}
          {recipientType === "student" && foreignStudentLanguages.length > 0 && (
            <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 p-2 rounded-md">
              🌍 외국인 학생 포함: {foreignStudentLanguages.map(code => nationalityToLanguage[code]?.nativeName).filter(Boolean).join(", ")}
            </div>
          )}
          
          {/* PDF 추출 중 표시 */}
          {isExtractingPdf && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md text-sm text-amber-700 dark:text-amber-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              PDF 텍스트 추출 중... ({pdfFileName})
            </div>
          )}
          
          {/* 첫 번째 행: PDF 불러오기, 파일첨부, 템플릿 저장 */}
          <div className="flex gap-2">
            <Input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handlePdfSelect}
              disabled={isExtractingPdf}
            />
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => pdfInputRef.current?.click()}
              disabled={isSending || isExtractingPdf}
              className="flex-1 h-10 text-sm font-medium border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
            >
              {isExtractingPdf ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-1" />
              )}
              PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || isUploading}
              className="flex-1 h-10 text-sm font-medium"
            >
              <Paperclip className="w-4 h-4 mr-1" />
              첨부
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSaveTemplateDialog(true)}
              disabled={!subject.trim() || !body.trim()}
              className="flex-1 h-10 text-sm font-medium border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950/30"
            >
              <Save className="w-4 h-4 mr-1" />
              저장
            </Button>
          </div>
          
          {/* 두 번째 행: 번역, 출력 */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTranslatePreview}
              disabled={isTranslating || !body.trim() || foreignStudentLanguages.length === 0}
              className="flex-1 h-10 text-sm font-medium border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
            >
              {isTranslating ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Languages className="w-4 h-4 mr-1" />
              )}
              번역
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              disabled={!subject.trim() || !body.trim()}
              className="flex-1 h-10 text-sm font-medium border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
            >
              <Printer className="w-4 h-4 mr-1" />
              출력
            </Button>
          </div>
          
          {/* 세 번째 행: 일괄 발송 */}
          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || !selectedGroup || isUploading}
            className="w-full h-11 text-sm sm:text-base font-medium bg-bulk-email-pink hover:bg-bulk-email-pink-hover"
            size="default"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "발송 중..." : "일괄 발송"}
          </Button>
        </div>

        {/* 번역 미리보기 다이얼로그 */}
        <Dialog open={showTranslationPreview} onOpenChange={setShowTranslationPreview}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-blue-600" />
                번역 미리보기
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* 원본 */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">📝 원본 (한국어)</h4>
                  <div className="whitespace-pre-wrap text-sm">{body}</div>
                </div>
                
                {/* 번역 결과 */}
                {Array.from(translations.entries()).map(([langCode, translatedText]) => {
                  const langInfo = nationalityToLanguage[langCode];
                  return (
                    <div key={langCode} className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-500">
                      <h4 className="text-sm font-medium mb-2 text-blue-700 dark:text-blue-300">
                        🌍 {langInfo?.nativeName} ({langInfo?.name})
                      </h4>
                      <div className="whitespace-pre-wrap text-sm">{translatedText}</div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowTranslationPreview(false)}>
                닫기
              </Button>
              <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700">
                <Printer className="w-4 h-4 mr-2" />
                출력하기
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 템플릿 저장 다이얼로그 */}
        <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Save className="w-5 h-5 text-purple-600" />
                템플릿으로 저장
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm">템플릿 이름</Label>
                <Input
                  placeholder="템플릿 이름을 입력하세요"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>제목:</strong> {subject}</p>
                <p><strong>내용 미리보기:</strong> {body.substring(0, 100)}{body.length > 100 ? "..." : ""}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
                취소
              </Button>
              <Button 
                onClick={handleSaveAsTemplate}
                disabled={!newTemplateName.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Save className="w-4 h-4 mr-2" />
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BulkEmailSender;
