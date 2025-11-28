import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, Mail, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StudentGroup {
  id: string;
  group_name: string;
  student_ids: string[];
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

const BulkEmailSender = () => {
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadGroups();
    loadTemplates();
  }, []);

  const loadGroups = async () => {
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);
      
      const { data, error } = await supabase.rpc("admin_get_student_groups", {
        admin_id_input: user.id,
      });

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error("Error loading groups:", error);
      toast.error("그룹 목록 조회 실패: " + error.message);
    }
  };

  const loadTemplates = async () => {
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);
      
      const { data, error } = await supabase.rpc("admin_get_email_templates", {
        admin_id_input: user.id,
      });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("Error loading templates:", error);
      toast.error("템플릿 목록 조회 실패: " + error.message);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
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
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      // 선택된 그룹의 학생 정보 조회
      const group = groups.find(g => g.id === selectedGroup);
      if (!group) {
        toast.error("그룹을 찾을 수 없습니다");
        return;
      }

      // 학생 ID로 학생 정보 조회
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("student_id, name, gmail")
        .in("student_id", group.student_ids);

      if (studentsError) throw studentsError;

      if (!studentsData || studentsData.length === 0) {
        toast.error("그룹에 학생이 없습니다");
        return;
      }

      // Gmail이 있는 학생만 필터링
      const validStudents = studentsData.filter(s => s.gmail && s.gmail.includes("@"));

      if (validStudents.length === 0) {
        toast.error("이메일 주소가 등록된 학생이 없습니다");
        return;
      }

      // 일괄 발송 API 호출
      const { data, error } = await supabase.functions.invoke("send-bulk-email", {
        body: {
          adminId: user.id,
          subject: subject,
          body: body,
          students: validStudents.map(s => ({
            studentId: s.student_id,
            name: s.name,
            email: s.gmail,
          })),
        },
      });

      if (error) throw error;

      toast.success(
        `이메일 발송 완료\n성공: ${data.totalSent}건, 실패: ${data.totalFailed}건`,
        { duration: 5000 }
      );

      // 초기화
      setSelectedGroup("");
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

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
          일괄 메시지 발송
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto space-y-3 pb-4 -mx-6 px-6">
          <div>
            <Label className="text-sm sm:text-base">학생 그룹 선택</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="h-11 text-sm">
                <SelectValue placeholder="그룹을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.group_name} ({group.student_ids.length}명)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGroupData && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                {selectedGroupData.student_ids.length}명의 학생에게 발송됩니다
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm sm:text-base">템플릿 선택 (선택사항)</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="h-11 text-sm">
                <SelectValue placeholder="템플릿을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">직접 작성</SelectItem>
                {templates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.title}
                  </SelectItem>
                ))}
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
            <p>• Gmail 주소가 등록된 학생에게만 발송됩니다</p>
            <p>• 발송 후 이메일 히스토리에서 결과를 확인할 수 있습니다</p>
            <p>• Rate limit 방지를 위해 0.5초 간격으로 발송됩니다</p>
          </div>
        </div>

        <div className="flex-shrink-0 pt-3 pb-2 -mx-6 px-6 border-t bg-card sticky bottom-0 z-10 shadow-lg">
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
