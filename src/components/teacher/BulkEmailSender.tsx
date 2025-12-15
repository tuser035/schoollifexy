import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Mail, Paperclip, X, AlertTriangle, GraduationCap, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync, TableSubscription } from "@/hooks/use-realtime-sync";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          const withoutEmail = studentsData.filter((s: Student) => !s.gmail || !s.gmail.includes("@"));
          const withEmail = studentsData.filter((s: Student) => s.gmail && s.gmail.includes("@"));
          setRecipientsWithoutEmail(withoutEmail.map((s: Student) => s.name));
          setValidEmailCount(withEmail.length);
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

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // 첨부파일 업로드 함수
  const uploadAttachments = async (): Promise<{
    url?: string;
    name?: string;
    isZip?: boolean;
    files?: Array<{ url: string; name: string }>;
  } | undefined> => {
    if (attachments.length === 0) return undefined;

    const uploadedFiles: Array<{ url: string; name: string }> = [];

    for (const file of attachments) {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `bulk-email/${user.id}/${timestamp}_${safeName}`;

      const { data, error } = await supabase.storage
        .from('email-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('File upload error:', error);
        throw new Error(`파일 업로드 실패: ${file.name}`);
      }

      const { data: urlData } = supabase.storage
        .from('email-attachments')
        .getPublicUrl(filePath);

      uploadedFiles.push({
        url: urlData.publicUrl,
        name: file.name,
      });
    }

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
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="student">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  학생
                </TabsTrigger>
                <TabsTrigger value="teacher">
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
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1 pt-2">
            <p>• 이메일 주소가 등록된 {recipientType === "student" ? "학생" : "교사"}에게만 발송됩니다</p>
            <p>• 발송 후 이메일 히스토리에서 결과를 확인할 수 있습니다</p>
            <p>• Rate limit 방지를 위해 0.5초 간격으로 발송됩니다</p>
          </div>
        </div>

        <div className="flex-shrink-0 pt-4 -mx-6 px-6 border-t bg-card">
          <div className="flex gap-2">
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
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || isUploading}
              className="flex-1 h-11 text-sm sm:text-base font-medium"
            >
              <Paperclip className="w-4 h-4 mr-2" />
              파일첨부
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={isSending || !selectedGroup || isUploading}
              className="flex-1 h-11 text-sm sm:text-base font-medium"
              size="default"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "발송 중..." : "일괄 발송"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkEmailSender;
