import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download, ClipboardEdit, FileUp, Camera, X, Send, Trash2, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type TableType = "students" | "teachers" | "homeroom" | "merits" | "demerits" | "monthly" | "departments";

interface MonthlyStudent {
  학생: string;
  추천횟수: number;
  연도: string;
  월: string;
  student_id?: string;
  student_name?: string;
}

const DataInquiry = () => {
  const [selectedTable, setSelectedTable] = useState<TableType>("students");
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCounselingDialogOpen, setIsCounselingDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<MonthlyStudent | null>(null);
  const [counselorName, setCounselorName] = useState("");
  const [counselingDate, setCounselingDate] = useState(new Date().toISOString().split('T')[0]);
  const [counselingContent, setCounselingContent] = useState("");
  const [isSavingCounseling, setIsSavingCounseling] = useState(false);
  const [monthlyRawData, setMonthlyRawData] = useState<any[]>([]);
  const [meritsRawData, setMeritsRawData] = useState<any[]>([]);
  const [demeritsRawData, setDemeritsRawData] = useState<any[]>([]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState({ email: "", name: "", studentId: "" });
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isBulkEmailDialogOpen, setIsBulkEmailDialogOpen] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState("");
  const [bulkEmailBody, setBulkEmailBody] = useState("");
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false);
  const [studentGroups, setStudentGroups] = useState<any[]>([]);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
  const [teacherGroups, setTeacherGroups] = useState<any[]>([]);
  const [isTeacherEditDialogOpen, setIsTeacherEditDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [searchDepartment, setSearchDepartment] = useState("");
  const [searchSubject, setSearchSubject] = useState("");

  // 모바일 기기 감지 함수
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // 전화번호 클릭 핸들러
  const handlePhoneClick = async (phoneNumber: string, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isMobileDevice()) {
      // 모바일: 문자 앱 열기
      window.location.href = `sms:${phoneNumber}`;
    } else {
      // PC: 클립보드에 이름과 전화번호 복사
      try {
        const copyText = `${name}: ${phoneNumber}`;
        await navigator.clipboard.writeText(copyText);
        toast.success(`복사되었습니다: ${copyText}`);
      } catch (err) {
        toast.error("복사에 실패했습니다");
      }
    }
  };

  // 학생 그룹 로드
  const loadStudentGroups = async () => {
    try {
      const userString = localStorage.getItem("auth_user");
      if (!userString) {
        console.log("그룹 로드: 사용자 정보 없음");
        return;
      }

      const user = JSON.parse(userString);
      console.log("학생 그룹 로드 시작:", user.type, user.id);

      // Set session for RLS
      if (user.type === "admin") {
        await supabase.rpc("set_admin_session", { admin_id_input: user.id });
      } else if (user.type === "teacher") {
        await supabase.rpc("set_teacher_session", { teacher_id_input: user.id });
      }

      const { data, error } = await supabase
        .from("student_groups")
        .select("*")
        .eq("admin_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("학생 그룹 조회 에러:", error);
        throw error;
      }

      console.log("학생 그룹 로드 완료:", data?.length || 0, "개", data);
      setStudentGroups(data || []);
    } catch (error: any) {
      console.error("학생 그룹 로드 실패:", error);
      toast.error("학생 그룹 목록을 불러오는데 실패했습니다");
    }
  };

  // 교사 그룹 로드
  const loadTeacherGroups = async () => {
    try {
      const userString = localStorage.getItem("auth_user");
      if (!userString) {
        console.log("교사 그룹 로드: 사용자 정보 없음");
        return;
      }

      const user = JSON.parse(userString);
      console.log("교사 그룹 로드 시작:", user.type, user.id);

      // Set session for RLS
      if (user.type === "admin") {
        await supabase.rpc("set_admin_session", { admin_id_input: user.id });
      } else if (user.type === "teacher") {
        await supabase.rpc("set_teacher_session", { teacher_id_input: user.id });
      }

      const { data, error } = await supabase
        .from("teacher_groups")
        .select("*")
        .eq("admin_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("교사 그룹 조회 에러:", error);
        throw error;
      }

      console.log("교사 그룹 로드 완료:", data?.length || 0, "개", data);
      setTeacherGroups(data || []);
    } catch (error: any) {
      console.error("교사 그룹 로드 실패:", error);
      toast.error("교사 그룹 목록을 불러오는데 실패했습니다");
    }
  };

  // 템플릿 로드
  const loadTemplates = async () => {
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        console.log("템플릿 로드: 사용자 인증 정보 없음");
        return;
      }

      const user = JSON.parse(authUser);
      console.log("템플릿 로드 시작:", user.type, user.id);

      // RPC 함수를 통해 템플릿 조회
      const { data, error } = await supabase
        .rpc("admin_get_email_templates", { admin_id_input: user.id });

      if (error) {
        console.error("템플릿 조회 에러:", error);
        throw error;
      }
      
      console.log("템플릿 로드 완료:", data?.length || 0, "개", data);
      setTemplates(data || []);
      
      if (!data || data.length === 0) {
        toast.info("등록된 템플릿이 없습니다. 템플릿 탭에서 템플릿을 먼저 생성해주세요.");
      }
    } catch (error: any) {
      console.error("템플릿 로드 실패:", error);
      toast.error("템플릿을 불러오는데 실패했습니다: " + error.message);
    }
  };

  // 템플릿 선택 핸들러
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setEmailSubject(template.subject);
      setEmailBody(template.body);
    }
  };

  // 이메일 클릭 핸들러
  const handleEmailClick = async (email: string, name: string, studentId?: string) => {
    // 템플릿 로드
    await loadTemplates();
    
    // 현재 로그인한 사용자 정보 가져오기
    const userString = localStorage.getItem("auth_user");
    let senderInfo = "";
    
    if (userString) {
      try {
        const user = JSON.parse(userString);
        const userType = user.type === "teacher" ? "교사" : user.type === "admin" ? "관리자" : "사용자";
        senderInfo = `발신자: ${user.name || user.email || "알 수 없음"} (${userType})`;
      } catch (e) {
        senderInfo = "발신자: 로그인 사용자";
      }
    }

    // 이메일 작성 다이얼로그 열기
    setEmailRecipient({ email, name, studentId: studentId || "" });
    setSelectedTemplateId("");
    setEmailSubject(`${name}님께 문의드립니다`);
    setEmailBody(
      `안녕하세요 ${name}님,\n\n` +
      `문의 내용을 입력해주세요.\n\n` +
      `---\n` +
      `${senderInfo}\n` +
      `발신 시각: ${new Date().toLocaleString('ko-KR')}`
    );
    setIsEmailDialogOpen(true);
  };

  // 이메일 발송 핸들러
  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const userString = localStorage.getItem("auth_user");
      if (!userString) {
        throw new Error("로그인이 필요합니다");
      }

      const user = JSON.parse(userString);

      // Set session based on user type
      if (user.type === "admin") {
        await supabase.rpc("set_admin_session", { admin_id_input: user.id });
      } else if (user.type === "teacher") {
        await supabase.rpc("set_teacher_session", { teacher_id_input: user.id });
      }

      // 이메일 발송 이력 저장
      await supabase.from("email_history").insert({
        sender_id: user.id,
        sender_type: user.type,
        sender_name: user.name || user.email || "알 수 없음",
        recipient_email: emailRecipient.email,
        recipient_name: emailRecipient.name,
        recipient_student_id: emailRecipient.studentId || null,
        subject: emailSubject,
        body: emailBody,
      });

      // Gmail 작성 창 열기
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&to=${emailRecipient.email}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
        '_blank'
      );

      toast.success("이메일 작성 창이 열렸습니다");
      setIsEmailDialogOpen(false);
      setEmailSubject("");
      setEmailBody("");
    } catch (error: any) {
      console.error("이메일 발송 실패:", error);
      toast.error(error.message || "이메일 발송에 실패했습니다");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // 학생 선택/해제 핸들러
  const handleToggleStudent = (studentId: string, checked: boolean) => {
    const newSet = new Set(selectedStudents);
    if (checked) {
      newSet.add(studentId);
    } else {
      newSet.delete(studentId);
    }
    setSelectedStudents(newSet);
  };

  // 전체 선택/해제
  const handleToggleAllStudents = (checked: boolean) => {
    if (checked && selectedTable === "students") {
      const allStudentIds = new Set(data.map((row: any) => row.학번));
      setSelectedStudents(allStudentIds);
    } else {
      setSelectedStudents(new Set());
    }
  };

  // 교사 선택/해제 핸들러
  const handleToggleTeacher = (teacherEmail: string, checked: boolean) => {
    const newSet = new Set(selectedTeachers);
    if (checked) {
      newSet.add(teacherEmail);
    } else {
      newSet.delete(teacherEmail);
    }
    setSelectedTeachers(newSet);
  };

  // 교사 전체 선택/해제
  const handleToggleAllTeachers = (checked: boolean) => {
    if (checked && selectedTable === "teachers") {
      const allTeacherEmails = new Set(data.map((row: any) => row.이메일));
      setSelectedTeachers(allTeacherEmails);
    } else {
      setSelectedTeachers(new Set());
    }
  };

  // 일괄 발송 다이얼로그 열기
  const handleOpenBulkEmailDialog = async () => {
    if (selectedStudents.size === 0) {
      toast.error("학생을 선택해주세요");
      return;
    }

    // 템플릿 로드
    await loadTemplates();
    
    setSelectedTemplateId("");
    setBulkEmailSubject("학부모님께 안내 드립니다");
    setBulkEmailBody("안녕하세요 학부모님,\n\n내용을 입력해주세요.\n\n감사합니다.");
    setIsBulkEmailDialogOpen(true);
  };

  // 일괄 발송용 템플릿 선택
  const handleBulkTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setBulkEmailSubject(template.subject);
      setBulkEmailBody(template.body);
    }
  };

  // 그룹 저장
  const handleSaveGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("그룹명을 입력해주세요");
      return;
    }

    const isStudentTable = selectedTable === "students";
    const isTeacherTable = selectedTable === "teachers";

    if (isStudentTable && selectedStudents.size === 0) {
      toast.error("학생을 선택해주세요");
      return;
    }

    if (isTeacherTable && selectedTeachers.size === 0) {
      toast.error("교사를 선택해주세요");
      return;
    }

    setIsSavingGroup(true);
    try {
      const userString = localStorage.getItem("auth_user");
      if (!userString) throw new Error("로그인이 필요합니다");

      const user = JSON.parse(userString);
      console.log("그룹 저장 시작:", newGroupName, 
        isStudentTable ? `학생 수: ${selectedStudents.size}` : `교사 수: ${selectedTeachers.size}`);

      // Set session for RLS
      if (user.type === "admin") {
        await supabase.rpc("set_admin_session", { admin_id_input: user.id });
      } else if (user.type === "teacher") {
        await supabase.rpc("set_teacher_session", { teacher_id_input: user.id });
      }

      if (isStudentTable) {
        const groupData = {
          admin_id: user.id,
          group_name: newGroupName,
          student_ids: Array.from(selectedStudents),
        };
        
        console.log("저장할 학생 그룹 데이터:", groupData);

        const { data, error } = await supabase
          .from("student_groups")
          .insert(groupData)
          .select();

        if (error) {
          console.error("학생 그룹 저장 에러:", error);
          throw error;
        }

        console.log("학생 그룹 저장 완료:", data);
        toast.success(`"${newGroupName}" 학생 그룹이 저장되었습니다`);
        await loadStudentGroups();
      } else if (isTeacherTable) {
        const groupData = {
          admin_id: user.id,
          group_name: newGroupName,
          teacher_ids: Array.from(selectedTeachers),
        };
        
        console.log("저장할 교사 그룹 데이터:", groupData);

        const { data, error } = await supabase
          .from("teacher_groups")
          .insert(groupData)
          .select();

        if (error) {
          console.error("교사 그룹 저장 에러:", error);
          throw error;
        }

        console.log("교사 그룹 저장 완료:", data);
        toast.success(`"${newGroupName}" 교사 그룹이 저장되었습니다`);
        await loadTeacherGroups();
      }

      setIsGroupDialogOpen(false);
      setNewGroupName("");
    } catch (error: any) {
      console.error("그룹 저장 실패:", error);
      toast.error(error.message || "그룹 저장에 실패했습니다");
    } finally {
      setIsSavingGroup(false);
    }
  };

  // 그룹 불러오기
  const handleLoadGroup = async (groupId: string) => {
    try {
      const group = studentGroups.find((g) => g.id === groupId);
      if (!group) return;

      // 해당 그룹의 학생 ID들을 선택 상태로 설정
      setSelectedStudents(new Set(group.student_ids));
      toast.success(`"${group.group_name}" 그룹을 불러왔습니다 (${group.student_ids.length}명)`);
    } catch (error: any) {
      console.error("그룹 불러오기 실패:", error);
      toast.error("그룹 불러오기에 실패했습니다");
    }
  };

  // 그룹 삭제
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`"${groupName}" 그룹을 삭제하시겠습니까?`)) return;

    try {
      const userString = localStorage.getItem("auth_user");
      if (!userString) throw new Error("로그인이 필요합니다");

      const user = JSON.parse(userString);

      // Set session for RLS
      if (user.type === "admin") {
        await supabase.rpc("set_admin_session", { admin_id_input: user.id });
      } else if (user.type === "teacher") {
        await supabase.rpc("set_teacher_session", { teacher_id_input: user.id });
      }

      const { error } = await supabase.from("student_groups").delete().eq("id", groupId);

      if (error) throw error;

      toast.success(`"${groupName}" 그룹이 삭제되었습니다`);
      loadStudentGroups();
    } catch (error: any) {
      console.error("그룹 삭제 실패:", error);
      toast.error("그룹 삭제에 실패했습니다");
    }
  };

  // 교사 그룹 불러오기
  const handleLoadTeacherGroup = async (groupId: string) => {
    try {
      const group = teacherGroups.find((g) => g.id === groupId);
      if (!group) return;

      // 해당 그룹의 교사 이메일들을 선택 상태로 설정
      setSelectedTeachers(new Set(group.teacher_ids));
      toast.success(`"${group.group_name}" 그룹을 불러왔습니다 (${group.teacher_ids.length}명)`);
    } catch (error: any) {
      console.error("교사 그룹 불러오기 실패:", error);
      toast.error("교사 그룹 불러오기에 실패했습니다");
    }
  };

  // 교사 그룹 삭제
  const handleDeleteTeacherGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`"${groupName}" 그룹을 삭제하시겠습니까?`)) return;

    try {
      const userString = localStorage.getItem("auth_user");
      if (!userString) throw new Error("로그인이 필요합니다");

      const user = JSON.parse(userString);

      // Set session for RLS
      if (user.type === "admin") {
        await supabase.rpc("set_admin_session", { admin_id_input: user.id });
      } else if (user.type === "teacher") {
        await supabase.rpc("set_teacher_session", { teacher_id_input: user.id });
      }

      const { error } = await supabase.from("teacher_groups").delete().eq("id", groupId);

      if (error) throw error;

      toast.success(`"${groupName}" 그룹이 삭제되었습니다`);
      loadTeacherGroups();
    } catch (error: any) {
      console.error("교사 그룹 삭제 실패:", error);
      toast.error("교사 그룹 삭제에 실패했습니다");
    }
  };

  // 일괄 이메일 발송
  const handleSendBulkEmail = async () => {
    setIsSendingBulkEmail(true);
    try {
      const userString = localStorage.getItem("auth_user");
      if (!userString) {
        throw new Error("로그인이 필요합니다");
      }

      const user = JSON.parse(userString);

      const selectedStudentIds = Array.from(selectedStudents);
      const studentsToEmail = data
        .filter((row: any) => selectedStudentIds.includes(row.학번))
        .map((student: any) => {
          const email = student.이메일 || student.gmail;
          return {
            studentId: student.학번,
            name: student.이름,
            email: email,
            hasValidEmail: email && email !== '-' && email.trim() !== '' && email.includes('@')
          };
        })
        .filter((student: any) => student.hasValidEmail)
        .map(({ studentId, name, email }) => ({ studentId, name, email }));

      console.log("선택된 학생 수:", selectedStudentIds.length);
      console.log("유효한 이메일을 가진 학생:", studentsToEmail);

      if (studentsToEmail.length === 0) {
        toast.error("선택한 학생 중 유효한 이메일이 있는 학생이 없습니다");
        return;
      }

      // Resend를 통한 자동 발송
      const { data: result, error } = await supabase.functions.invoke("send-bulk-email", {
        body: {
          adminId: user.id,
          subject: bulkEmailSubject,
          body: bulkEmailBody,
          students: studentsToEmail,
        },
      });

      if (error) throw error;

      toast.success(
        `이메일 발송 완료!\n성공: ${result.totalSent}건, 실패: ${result.totalFailed}건`,
        { duration: 5000 }
      );
      
      setIsBulkEmailDialogOpen(false);
      setSelectedStudents(new Set());
      setBulkEmailSubject("");
      setBulkEmailBody("");
    } catch (error: any) {
      console.error("일괄 이메일 발송 실패:", error);
      toast.error(error.message || "일괄 이메일 발송에 실패했습니다");
    } finally {
      setIsSendingBulkEmail(false);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }

    let csvHeader: string;
    let csvRows: string[];

    // 이달의 학생 테이블의 경우 상세 내역 포함
    if (selectedTable === "monthly" && monthlyRawData.length > 0) {
      csvHeader = "날짜,학생,학번,추천교사,구분,사유,증빙사진,상담첨부파일";
      csvRows = monthlyRawData.map(row => {
        const date = new Date(row.created_at).toLocaleDateString('ko-KR');
        const studentName = row.student_name || "-";
        const studentId = row.student_id || "-";
        const teacher = row.teacher_name || "-";
        const category = row.category || "-";
        const reason = (row.reason || "-").replace(/,/g, " ").replace(/\n/g, " ");
        
        // 이미지 URL에서 파일명 추출 및 하이퍼링크 생성
        let imageDisplay = "-";
        if (row.image_url && row.image_url !== "-") {
          const fileName = row.image_url.split('/').pop() || "이미지";
          // Excel에서 클릭 가능한 하이퍼링크 수식 생성
          imageDisplay = `=HYPERLINK("${row.image_url}","${fileName}")`;
        }
        
        // 상담 첨부파일 하이퍼링크 생성 (여러 개인 경우 모두 포함)
        let counselingAttachments = "-";
        if (row.counseling_attachments && row.counseling_attachments.length > 0) {
          counselingAttachments = row.counseling_attachments
            .map((url: string, idx: number) => {
              const fileName = url.split('/').pop() || `첨부${idx + 1}`;
              return `=HYPERLINK("${url}","${fileName}")`;
            })
            .join(" | ");
        }
        
        return `${date},${studentName},${studentId},${teacher},${category},"${reason}",${imageDisplay},"${counselingAttachments}"`;
      });
    } else if (selectedTable === "merits" && meritsRawData.length > 0) {
      csvHeader = "날짜,학생,교사,카테고리,사유,점수,증빙사진";
      csvRows = meritsRawData.map(row => {
        const date = new Date(row.created_at).toLocaleDateString('ko-KR');
        const studentName = `${row.student_name} (${row.student_grade}-${row.student_class})`;
        const teacher = row.teacher_name || "-";
        const category = row.category;
        const reason = (row.reason || "-").replace(/,/g, " ").replace(/\n/g, " ");
        const score = row.score;
        
        // 이미지 URL에서 파일명 추출 및 하이퍼링크 생성
        let imageDisplay = "-";
        if (row.image_url && row.image_url !== "-") {
          const fileName = row.image_url.split('/').pop() || "이미지";
          imageDisplay = `=HYPERLINK("${row.image_url}","${fileName}")`;
        }
        
        return `${date},${studentName},${teacher},${category},"${reason}",${score},${imageDisplay}`;
      });
    } else if (selectedTable === "demerits" && demeritsRawData.length > 0) {
      csvHeader = "날짜,학생,교사,카테고리,사유,점수,증빙사진";
      csvRows = demeritsRawData.map(row => {
        const date = new Date(row.created_at).toLocaleDateString('ko-KR');
        const studentName = `${row.student_name} (${row.student_grade}-${row.student_class})`;
        const teacher = row.teacher_name || "-";
        const category = row.category;
        const reason = (row.reason || "-").replace(/,/g, " ").replace(/\n/g, " ");
        const score = row.score;
        
        // 이미지 URL에서 파일명 추출 및 하이퍼링크 생성
        let imageDisplay = "-";
        if (row.image_url && row.image_url !== "-") {
          const fileName = row.image_url.split('/').pop() || "이미지";
          imageDisplay = `=HYPERLINK("${row.image_url}","${fileName}")`;
        }
        
        return `${date},${studentName},${teacher},${category},"${reason}",${score},${imageDisplay}`;
      });
    } else {
      // 기존 방식대로 처리
      csvHeader = columns.join(",");
      csvRows = data.map(row => 
        columns.map(col => {
          const value = row[col]?.toString() || "";
          return value.includes(",") || value.includes("\n") ? `"${value}"` : value;
        }).join(",")
      );
    }
    
    // BOM 추가 (한글 깨짐 방지)
    const BOM = "\uFEFF";
    const csvContent = BOM + csvHeader + "\n" + csvRows.join("\n");
    
    // Blob 생성 및 다운로드
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const tableNames: Record<TableType, string> = {
      students: "학생",
      teachers: "교사",
      homeroom: "담임반",
      merits: "상점",
      demerits: "벌점",
      monthly: "이달의학생",
      departments: "학과"
    };
    link.download = `${tableNames[selectedTable]}_${timestamp}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("CSV 파일이 다운로드되었습니다");
  };

  const handleOpenCounselingDialog = (student: MonthlyStudent) => {
    setSelectedStudent(student);
    setCounselorName("");
    setCounselingDate(new Date().toISOString().split('T')[0]);
    setCounselingContent("");
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setIsCounselingDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setAttachmentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSaveCounseling = async () => {
    if (!selectedStudent?.student_id) {
      toast.error("학생 정보를 찾을 수 없습니다");
      return;
    }

    if (!counselorName.trim()) {
      toast.error("상담사 이름을 입력해주세요");
      return;
    }

    if (!counselingContent.trim()) {
      toast.error("상담 내용을 입력해주세요");
      return;
    }

    setIsSavingCounseling(true);

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }

      const parsedUser = JSON.parse(authUser);
      if ((parsedUser.type !== "admin" && parsedUser.type !== "teacher") || !parsedUser.id) {
        toast.error("권한이 필요합니다");
        return;
      }

      // Set admin or teacher session for RLS
      if (parsedUser.type === "admin") {
        await supabase.rpc("set_admin_session", {
          admin_id_input: parsedUser.id
        });
      } else if (parsedUser.type === "teacher") {
        await supabase.rpc("set_teacher_session", {
          teacher_id_input: parsedUser.id
        });
      }

      let attachmentUrl = null;

      // 첨부 파일 업로드
      if (attachmentFile) {
        const fileExt = attachmentFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `counseling/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('evidence-photos')
          .upload(filePath, attachmentFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('evidence-photos')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
      }

      const { error } = await supabase
        .from("career_counseling")
        .insert({
          student_id: selectedStudent.student_id,
          counselor_name: counselorName.trim(),
          counseling_date: counselingDate,
          content: counselingContent.trim(),
          admin_id: parsedUser.id,
          attachment_url: attachmentUrl
        });

      if (error) throw error;

      toast.success("상담 기록이 저장되었습니다");
      setIsCounselingDialogOpen(false);
      handleRemoveAttachment();
    } catch (error: any) {
      toast.error(error.message || "상담 기록 저장에 실패했습니다");
    } finally {
      setIsSavingCounseling(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error("삭제할 항목을 선택해주세요");
      return;
    }

    if (!confirm(`선택한 ${selectedIds.size}개 항목을 삭제하시겠습니까?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("인증이 필요합니다");
        return;
      }

      const parsedUser = JSON.parse(authUser);
      
      // Set session for RLS
      if (parsedUser.type === "admin") {
        await supabase.rpc("set_admin_session", {
          admin_id_input: parsedUser.id
        });
      } else if (parsedUser.type === "teacher") {
        await supabase.rpc("set_teacher_session", {
          teacher_id_input: parsedUser.id
        });
      }

      const idsToDelete = Array.from(selectedIds);
      let tableName = "";
      
      if (selectedTable === "merits") {
        tableName = "merits";
      } else if (selectedTable === "demerits") {
        tableName = "demerits";
      } else if (selectedTable === "monthly") {
        tableName = "monthly";
      }

      if (!tableName) {
        toast.error("이 테이블에서는 삭제할 수 없습니다");
        return;
      }

      const { error } = await supabase
        .from(tableName as "merits" | "demerits" | "monthly")
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      toast.success(`${idsToDelete.length}개 항목이 삭제되었습니다`);
      setSelectedIds(new Set());
      handleQuery(); // 다시 조회
    } catch (error: any) {
      toast.error(error.message || "삭제에 실패했습니다");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = new Set<string>();
      if (selectedTable === "merits") {
        meritsRawData.forEach((item: any) => item.id && ids.add(item.id));
      } else if (selectedTable === "demerits") {
        demeritsRawData.forEach((item: any) => item.id && ids.add(item.id));
      } else if (selectedTable === "monthly") {
        monthlyRawData.forEach((item: any) => item.id && ids.add(item.id));
      }
      setSelectedIds(ids);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  // 교사 편집 다이얼로그 열기
  const handleOpenTeacherEdit = (teacher: any) => {
    setEditingTeacher({
      email: teacher.이메일,
      name: teacher.이름,
      phone: teacher.전화번호,
      grade: teacher.학년 === "-" ? null : teacher.학년,
      class: teacher.반 === "-" ? null : teacher.반,
      department: teacher.부서 === "-" ? "" : teacher.부서,
      subject: teacher.담당교과 === "-" ? "" : teacher.담당교과,
      isHomeroom: teacher.담임여부 === "담임"
    });
    setIsTeacherEditDialogOpen(true);
  };

  // 교사 정보 저장
  const handleSaveTeacher = async () => {
    if (!editingTeacher) return;

    setIsSavingTeacher(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }

      const parsedUser = JSON.parse(authUser);
      const adminId = parsedUser.id;

      // Set admin session
      await supabase.rpc("set_admin_session", {
        admin_id_input: adminId
      });

      // 교사 정보 업데이트
      const { error } = await supabase
        .from('teachers')
        .update({
          name: editingTeacher.name,
          call_t: editingTeacher.phone,
          grade: editingTeacher.grade,
          class: editingTeacher.class,
          department: editingTeacher.department || null,
          subject: editingTeacher.subject || null,
          is_homeroom: editingTeacher.isHomeroom
        })
        .eq('teacher_email', editingTeacher.email);

      if (error) throw error;

      toast.success("교사 정보가 수정되었습니다");
      setIsTeacherEditDialogOpen(false);
      setEditingTeacher(null);
      
      // 목록 새로고침
      handleQuery();
    } catch (error) {
      console.error("Error updating teacher:", error);
      toast.error("교사 정보 수정에 실패했습니다");
    } finally {
      setIsSavingTeacher(false);
    }
  };

  const handleQuery = async () => {
    setIsLoading(true);
    
    try {
      // 관리자 ID 가져오기
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        setIsLoading(false);
        return;
      }
      
      const parsedUser = JSON.parse(authUser);
      if ((parsedUser.type !== "admin" && parsedUser.type !== "teacher") || !parsedUser.id) {
        toast.error("권한이 필요합니다");
        setIsLoading(false);
        return;
      }
      
      const adminId = parsedUser.id;
      const trimmedSearch = searchTerm.trim().slice(0, 100);
      let result;

      if (selectedTable === "students") {
        let searchGrade: number | null = null;
        let searchClass: number | null = null;
        let searchText: string | null = null;

        if (trimmedSearch) {
          // 숫자인 경우 학년이나 반 또는 학번으로 검색
          if (!isNaN(Number(trimmedSearch))) {
            const searchNum = trimmedSearch;
            
            // 세 자리 이상 숫자인 경우: 학번(student_id)으로 직접 검색
            if (searchNum.length >= 3) {
              // Set session for RLS
              if (parsedUser.type === "admin") {
                await supabase.rpc("set_admin_session", {
                  admin_id_input: adminId
                });
              } else if (parsedUser.type === "teacher") {
                await supabase.rpc("set_teacher_session", {
                  teacher_id_input: adminId
                });
              }

              const { data: studentData, error: queryError } = await supabase
                .from('students')
                .select(`
                  student_id,
                  name,
                  grade,
                  class,
                  number,
                  student_call,
                  gmail,
                  departments(name)
                `)
                .eq('student_id', trimmedSearch);

              if (queryError) throw queryError;

              if (studentData && studentData.length > 0) {
                result = studentData.map(student => ({
                  "학번": student.student_id,
                  "이름": student.name,
                  "학년": student.grade,
                  "반": student.class,
                  "번호": student.number,
                  "학과": (student.departments as any)?.name || "",
                  "전화번호": student.student_call || "",
                  "이메일": student.gmail || ""
                }));
              } else {
                result = [];
                toast.info(`학번 ${trimmedSearch}인 학생을 찾을 수 없습니다`);
              }
              
              setData(result || []);
              if (result && result.length > 0) {
                setColumns(Object.keys(result[0]));
              } else {
                setColumns([]);
              }
              setIsLoading(false);
              return;
            }
            // 두 자리 숫자인 경우: 첫 자리=학년, 둘째 자리=반
            else if (searchNum.length === 2) {
              searchGrade = parseInt(searchNum[0]);
              searchClass = parseInt(searchNum[1]);
            }
            // 한 자리 숫자인 경우: 학년으로 검색 + 총 인원 표시
            else {
              searchGrade = parseInt(trimmedSearch);
              
              // Set session for RLS
              if (parsedUser.type === "admin") {
                await supabase.rpc("set_admin_session", {
                  admin_id_input: adminId
                });
              } else if (parsedUser.type === "teacher") {
                await supabase.rpc("set_teacher_session", {
                  teacher_id_input: adminId
                });
              }

              // 학년 총 인원 조회 및 토스트 표시
              const { count } = await supabase
                .from('students')
                .select('*', { count: 'exact', head: true })
                .eq('grade', searchGrade);
              
              if (count !== null) {
                toast.success(`${searchGrade}학년 총 인원: ${count}명`);
              }
            }
          } else {
            // 문자인 경우 이름으로 검색
            searchText = trimmedSearch;
          }
        } else {
          // 검색어가 없을 때: 전교생 조회 + 총 인원 표시
          if (parsedUser.type === "admin") {
            await supabase.rpc("set_admin_session", {
              admin_id_input: adminId
            });
          } else if (parsedUser.type === "teacher") {
            await supabase.rpc("set_teacher_session", {
              teacher_id_input: adminId
            });
          }

          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true });
          
          if (count !== null) {
            toast.success(`전교생 총 인원: ${count}명`);
          }
        }

        const { data, error: queryError } = await supabase.rpc("admin_get_students", {
          admin_id_input: adminId,
          search_text: searchText,
          search_grade: searchGrade,
          search_class: searchClass
        });

        if (queryError) throw queryError;

        result = data?.map(row => ({
          "학번": row.student_id,
          "이름": row.name,
          "학년": row.grade,
          "반": row.class,
          "번호": row.number,
          "학과": row.dept_name,
          "전화번호": row.student_call,
          "이메일": row.gmail,
          "학부모전화1": row.parents_call1,
          "학부모전화2": row.parents_call2
        }));

      } else if (selectedTable === "teachers") {
        let searchGrade: number | null = null;
        let searchClass: number | null = null;
        let searchText: string | null = null;
        let searchDept: string | null = null;
        let searchSubj: string | null = null;

        if (trimmedSearch) {
          // 숫자인 경우 학년이나 반으로 검색
          if (!isNaN(Number(trimmedSearch))) {
            const searchNum = trimmedSearch;
            
            // 두 자리 숫자인 경우: 첫 자리=학년, 둘째 자리=반
            if (searchNum.length === 2) {
              searchGrade = parseInt(searchNum[0]);
              searchClass = parseInt(searchNum[1]);
            } else {
              searchGrade = parseInt(trimmedSearch);
            }
          } else {
            // 문자인 경우 이름으로 검색
            searchText = trimmedSearch;
          }
        }

        // state의 값 사용
        searchDept = searchDepartment.trim() || null;
        searchSubj = searchSubject.trim() || null;

        const { data, error: queryError } = await supabase.rpc("admin_get_teachers", {
          admin_id_input: adminId,
          search_text: searchText,
          search_grade: searchGrade,
          search_class: searchClass,
          search_department: searchDept,
          search_subject: searchSubj
        });

        if (queryError) throw queryError;

        result = data?.map(row => ({
          "이름": row.name,
          "전화번호": row.call_t,
          "이메일": row.teacher_email,
          "학년": row.grade || "-",
          "반": row.class || "-",
          "담임여부": row.is_homeroom ? "담임" : "-",
          "학과": row.dept_name,
          "부서": row.department,
          "담당교과": row.subject
        }));

        // 전체 교사 인원수 알림
        toast.success(`전체 교사 인원: ${result?.length || 0}명`);

      } else if (selectedTable === "homeroom") {
        let searchGrade: number | null = null;
        let searchClass: number | null = null;

        if (trimmedSearch) {
          // 숫자로만 검색 (학년, 반)
          if (!isNaN(Number(trimmedSearch))) {
            const searchNum = trimmedSearch;
            
            // 두 자리 숫자인 경우: 첫 자리=학년, 둘째 자리=반 (예: 38 → 3학년 8반)
            if (searchNum.length === 2) {
              searchGrade = parseInt(searchNum[0]);
              searchClass = parseInt(searchNum[1]);
            } else {
              searchGrade = parseInt(trimmedSearch);
            }
          } else {
            toast.info("담임반은 학년반 번호로 검색해주세요 (예: 38 → 3학년 8반)");
            result = [];
          }
        }

        if (result === undefined) {
          const { data, error: queryError } = await supabase.rpc("admin_get_homeroom", {
            admin_id_input: adminId,
            search_grade: searchGrade,
            search_class: searchClass
          });

          if (queryError) throw queryError;

          result = data?.map(row => ({
            "연도": row.year,
            "학년": row.grade,
            "반": row.class,
            "담임교사": row.teacher_name
          }));
        }

      } else if (selectedTable === "merits") {
        let searchText = null;
        let searchGrade = null;
        let searchClass = null;
        let searchNumber = null;
        let targetStudentId = null;

        if (trimmedSearch) {
          if (!isNaN(Number(trimmedSearch))) {
            // 3자리 이상 숫자: 학년반번호 (예: 386 -> 3학년 8반 6번)
            if (trimmedSearch.length >= 3) {
              searchGrade = parseInt(trimmedSearch[0]);
              searchClass = parseInt(trimmedSearch[1]);
              searchNumber = parseInt(trimmedSearch.substring(2));
              
              // 학년/반/번호로 학생 찾기
              const { data: studentData } = await supabase
                .from('students')
                .select('student_id')
                .eq('grade', searchGrade)
                .eq('class', searchClass)
                .eq('number', searchNumber)
                .maybeSingle();
              
              if (studentData) {
                targetStudentId = studentData.student_id;
                searchText = studentData.student_id; // student_id로 검색
              }
            }
            // 2자리 숫자: 학년반 (예: 38 -> 3학년 8반)
            else if (trimmedSearch.length === 2) {
              searchGrade = parseInt(trimmedSearch[0]);
              searchClass = parseInt(trimmedSearch[1]);
            }
            // 1자리 숫자: 학년
            else {
              searchGrade = parseInt(trimmedSearch);
            }
          } else {
            searchText = trimmedSearch;
          }
        }

        let data;
        let queryError;

        // 교사 로그인 시 자신이 부여한 상점만 조회
        if (parsedUser.type === "teacher") {
          let query = supabase
            .from("merits")
            .select(`
              id,
              created_at,
              category,
              reason,
              score,
              image_url,
              student_id,
              students!inner(name, grade, class),
              teachers(name)
            `)
            .eq('teacher_id', parsedUser.id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (searchGrade) query = query.eq('students.grade', searchGrade);
          if (searchClass) query = query.eq('students.class', searchClass);
          if (searchText) {
            query = query.or(`student_id.ilike.%${searchText}%,students.name.ilike.%${searchText}%`);
          }

          const response = await query;
          data = response.data?.map((row: any) => ({
            id: row.id,
            created_at: row.created_at,
            student_name: row.students?.name,
            student_grade: row.students?.grade,
            student_class: row.students?.class,
            teacher_name: row.teachers?.name,
            category: row.category,
            reason: row.reason,
            score: row.score,
            image_url: row.image_url
          }));
          queryError = response.error;
        } else {
          const { data: rpcData, error } = await supabase.rpc("admin_get_merits", {
            admin_id_input: adminId,
            search_text: searchText,
            search_grade: searchGrade,
            search_class: searchClass
          });
          data = rpcData;
          queryError = error;
        }

        if (queryError) throw queryError;

        // 원본 데이터 저장 (CSV용 및 ID 포함)
        setMeritsRawData(data || []);

        result = data?.map((row: any) => ({
          "날짜": new Date(row.created_at).toLocaleDateString('ko-KR'),
          "학생": `${row.student_name} (${row.student_grade}-${row.student_class})`,
          "교사": row.teacher_name || "-",
          "카테고리": row.category,
          "사유": row.reason || "-",
          "점수": row.score
        }));

      } else if (selectedTable === "demerits") {
        let searchText = null;
        let searchGrade = null;
        let searchClass = null;
        let searchNumber = null;
        let targetStudentId = null;

        if (trimmedSearch) {
          if (!isNaN(Number(trimmedSearch))) {
            // 3자리 이상 숫자: 학년반번호 (예: 386 -> 3학년 8반 6번)
            if (trimmedSearch.length >= 3) {
              searchGrade = parseInt(trimmedSearch[0]);
              searchClass = parseInt(trimmedSearch[1]);
              searchNumber = parseInt(trimmedSearch.substring(2));
              
              // 학년/반/번호로 학생 찾기
              const { data: studentData } = await supabase
                .from('students')
                .select('student_id')
                .eq('grade', searchGrade)
                .eq('class', searchClass)
                .eq('number', searchNumber)
                .maybeSingle();
              
              if (studentData) {
                targetStudentId = studentData.student_id;
                searchText = studentData.student_id; // student_id로 검색
              }
            }
            // 2자리 숫자: 학년반 (예: 38 -> 3학년 8반)
            else if (trimmedSearch.length === 2) {
              searchGrade = parseInt(trimmedSearch[0]);
              searchClass = parseInt(trimmedSearch[1]);
            }
            // 1자리 숫자: 학년
            else {
              searchGrade = parseInt(trimmedSearch);
            }
          } else {
            searchText = trimmedSearch;
          }
        }

        let data;
        let queryError;

        // 교사 로그인 시 자신이 부여한 벌점만 조회
        if (parsedUser.type === "teacher") {
          let query = supabase
            .from("demerits")
            .select(`
              id,
              created_at,
              category,
              reason,
              score,
              image_url,
              student_id,
              students!inner(name, grade, class),
              teachers(name)
            `)
            .eq('teacher_id', parsedUser.id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (searchGrade) query = query.eq('students.grade', searchGrade);
          if (searchClass) query = query.eq('students.class', searchClass);
          if (searchText) {
            query = query.or(`student_id.ilike.%${searchText}%,students.name.ilike.%${searchText}%`);
          }

          const response = await query;
          data = response.data?.map((row: any) => ({
            id: row.id,
            created_at: row.created_at,
            student_name: row.students?.name,
            student_grade: row.students?.grade,
            student_class: row.students?.class,
            teacher_name: row.teachers?.name,
            category: row.category,
            reason: row.reason,
            score: row.score,
            image_url: row.image_url
          }));
          queryError = response.error;
        } else {
          const { data: rpcData, error } = await supabase.rpc("admin_get_demerits", {
            admin_id_input: adminId,
            search_text: searchText,
            search_grade: searchGrade,
            search_class: searchClass
          });
          data = rpcData;
          queryError = error;
        }

        if (queryError) throw queryError;

        // 원본 데이터 저장 (CSV용 및 ID 포함)
        setDemeritsRawData(data || []);

        result = data?.map((row: any) => ({
          "날짜": new Date(row.created_at).toLocaleDateString('ko-KR'),
          "학생": `${row.student_name} (${row.student_grade}-${row.student_class})`,
          "교사": row.teacher_name || "-",
          "카테고리": row.category,
          "사유": row.reason || "-",
          "점수": row.score
        }));

      } else if (selectedTable === "monthly") {
        let searchText = null;
        let searchGrade = null;
        let searchClass = null;
        let searchNumber = null;
        let targetStudentId = null;

        if (trimmedSearch) {
          if (!isNaN(Number(trimmedSearch))) {
            // 3자리 이상 숫자: 학년반번호 (예: 386 -> 3학년 8반 6번)
            if (trimmedSearch.length >= 3) {
              searchGrade = parseInt(trimmedSearch[0]);
              searchClass = parseInt(trimmedSearch[1]);
              searchNumber = parseInt(trimmedSearch.substring(2));
              
              // 학년/반/번호로 학생 찾기
              const { data: studentData } = await supabase
                .from('students')
                .select('student_id')
                .eq('grade', searchGrade)
                .eq('class', searchClass)
                .eq('number', searchNumber)
                .maybeSingle();
              
              if (studentData) {
                targetStudentId = studentData.student_id;
              }
            }
            // 2자리 숫자: 학년반 (예: 38 -> 3학년 8반)
            else if (trimmedSearch.length === 2) {
              searchGrade = parseInt(trimmedSearch[0]);
              searchClass = parseInt(trimmedSearch[1]);
            }
            // 1자리 숫자: 학년
            else {
              searchGrade = parseInt(trimmedSearch);
            }
          } else {
            // 문자인 경우 이름으로 검색
            searchText = trimmedSearch;
          }
        }

        let data;
        let queryError;

        // 교사 로그인 시 자신이 추천한 이달의 학생만 조회
        if (parsedUser.type === "teacher") {
          let query = supabase
            .from("monthly")
            .select(`
              id,
              created_at,
              year,
              month,
              category,
              reason,
              image_url,
              student_id,
              students!inner(name, grade, class),
              teachers(name)
            `)
            .eq('teacher_id', parsedUser.id)
            .order('year', { ascending: false })
            .order('month', { ascending: false })
            .limit(50);

          if (searchGrade) query = query.eq('students.grade', searchGrade);
          if (searchClass) query = query.eq('students.class', searchClass);
          if (searchText) {
            query = query.or(`student_id.ilike.%${searchText}%,students.name.ilike.%${searchText}%`);
          }

          const response = await query;
          data = response.data?.map((row: any) => ({
            id: row.id,
            created_at: row.created_at,
            year: row.year,
            month: row.month,
            student_id: row.student_id,
            student_name: row.students?.name,
            student_grade: row.students?.grade,
            student_class: row.students?.class,
            teacher_name: row.teachers?.name,
            category: row.category,
            reason: row.reason,
            image_url: row.image_url
          }));
          queryError = response.error;
        } else {
          const { data: rpcData, error } = await supabase.rpc("admin_get_monthly", {
            admin_id_input: adminId,
            search_text: searchText,
            search_grade: searchGrade,
            search_class: searchClass
          });
          data = rpcData;
          queryError = error;
        }

        if (queryError) throw queryError;

        // 학년반번호로 검색한 경우 해당 학생만 필터링
        let filteredData = data;
        if (targetStudentId) {
          filteredData = data?.filter((row: any) => row.student_id === targetStudentId);
        }

        // 각 학생의 상담 기록 첨부파일 조회 (모든 첨부파일)
        const studentIds = [...new Set(filteredData?.map((row: any) => row.student_id) || [])] as string[];
        const counselingData: { [key: string]: string[] } = {};
        
        for (const studentId of studentIds) {
          const { data: counselingRecords } = await supabase
            .from('career_counseling')
            .select('attachment_url')
            .eq('student_id', studentId)
            .not('attachment_url', 'is', null)
            .order('created_at', { ascending: false });
          
          if (counselingRecords && counselingRecords.length > 0) {
            counselingData[studentId] = counselingRecords.map(r => r.attachment_url);
          }
        }

        // 원본 데이터에 상담 첨부파일 추가
        const enrichedData = filteredData?.map((row: any) => ({
          ...row,
          counseling_attachments: counselingData[row.student_id] || []
        }));

        // 원본 데이터 저장 (CSV용 및 ID 포함)
        setMonthlyRawData(enrichedData || []);

        // 학생별로 그룹화하여 추천 횟수 누적
        const groupedData = enrichedData?.reduce((acc: any, row: any) => {
          const studentKey = row.student_name;
          if (!acc[studentKey]) {
            acc[studentKey] = {
              student_id: row.student_id,
              student_name: row.student_name,
              student_grade: row.student_grade,
              student_class: row.student_class,
              count: 0,
              years: new Set(),
              months: new Set()
            };
          }
          acc[studentKey].count += 1;
          acc[studentKey].years.add(row.year);
          acc[studentKey].months.add(row.month);
          return acc;
        }, {});

        // 추천횟수 기준 내림차순 정렬
        result = Object.values(groupedData || {})
          .sort((a: any, b: any) => b.count - a.count)
          .map((group: any) => ({
            "학생": `${group.student_name}(${group.student_id})`,
            "추천횟수": group.count,
            "연도": Array.from(group.years).sort().join(", "),
            "월": Array.from(group.months).sort((a: number, b: number) => a - b).join(", "),
            student_id: group.student_id,
            student_name: group.student_name
          }));

      } else {
        // departments
        const { data, error: queryError } = await supabase
          .from(selectedTable)
          .select("code, name")
          .limit(50);

        if (queryError) throw queryError;
        result = data?.map(row => ({
          "학과코드": row.code,
          "학과명": row.name
        }));
      }

      if (result && result.length > 0) {
        setColumns(Object.keys(result[0]));
        setData(result);
        setOriginalData(result);
        
        // 학생 테이블을 조회한 경우 그룹 목록도 로드
        if (selectedTable === "students") {
          loadStudentGroups();
        }
        // 교사 테이블을 조회한 경우 그룹 목록도 로드
        if (selectedTable === "teachers") {
          loadTeacherGroups();
        }
      } else {
        setColumns([]);
        setData([]);
        setOriginalData([]);
        toast.info(trimmedSearch ? "검색 결과가 없습니다" : "데이터가 없습니다");
      }
    } catch (error: any) {
      toast.error(error.message || "조회에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>데이터 조회</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Select value={selectedTable} onValueChange={(value) => { setSelectedTable(value as TableType); setSearchTerm(""); setColumnFilters({}); setSearchDepartment(""); setSearchSubject(""); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="students">학생</SelectItem>
                <SelectItem value="teachers">교사</SelectItem>
                <SelectItem value="homeroom">담임반</SelectItem>
                <SelectItem value="merits">상점</SelectItem>
                <SelectItem value="demerits">벌점</SelectItem>
                <SelectItem value="monthly">이달의 학생</SelectItem>
                <SelectItem value="departments">학과</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={
                selectedTable === "students" ? "학생명, 학년, 학년반" :
                selectedTable === "teachers" ? "교사명, 학년, 반으로 검색" :
                selectedTable === "homeroom" ? "학년반으로 검색 (예: 38 → 3학년 8반)" :
                selectedTable === "merits" || selectedTable === "demerits" || selectedTable === "monthly" 
                  ? "학생명, 교사명, 학년반, 학년반번호로 검색" :
                "검색"
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleQuery()}
              className="max-w-xs"
              maxLength={100}
            />
            <Button onClick={handleQuery} disabled={isLoading}>
              {isLoading ? "조회 중..." : "조회"}
            </Button>
            {searchTerm && (
              <Button variant="outline" onClick={() => { 
                setSearchTerm(""); 
                setSearchDepartment(""); 
                setSearchSubject(""); 
                handleQuery(); 
              }}>
                초기화
              </Button>
            )}
            {Object.keys(columnFilters).length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setColumnFilters({})}
                className="text-xs"
              >
                필터 초기화 ({Object.keys(columnFilters).length})
              </Button>
            )}
          {data.length > 0 && (
            <>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV 내보내기
              </Button>
              {selectedTable === "students" && (
                <>
                  {console.log("드롭다운 렌더링 - 그룹 수:", studentGroups.length, studentGroups)}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[200px] justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        저장된 그룹 불러오기
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-2 bg-background" align="start">
                      {studentGroups.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          저장된 그룹이 없습니다
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {studentGroups.map((group) => (
                            <div
                              key={group.id}
                              className="flex items-center justify-between p-2 hover:bg-muted rounded-md group"
                            >
                              <button
                                onClick={() => {
                                  handleLoadGroup(group.id);
                                }}
                                className="flex-1 text-left text-sm"
                              >
                                {group.group_name} ({group.student_ids.length}명)
                              </button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGroup(group.id, group.group_name);
                                }}
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </>
              )}
              {selectedTable === "students" && selectedStudents.size > 0 && (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => setIsGroupDialogOpen(true)}
                  >
                    그룹 저장 ({selectedStudents.size})
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={handleOpenBulkEmailDialog}
                  >
                    일괄 메시지 발송 ({selectedStudents.size})
                  </Button>
                </>
              )}
              {selectedTable === "teachers" && (
                <>
                  {console.log("교사 드롭다운 렌더링 - 그룹 수:", teacherGroups.length, teacherGroups)}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[200px] justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        저장된 교사 그룹 불러오기
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-2 bg-background" align="start">
                      {teacherGroups.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          저장된 그룹이 없습니다
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {teacherGroups.map((group) => (
                            <div
                              key={group.id}
                              className="flex items-center justify-between p-2 hover:bg-muted rounded-md group"
                            >
                              <button
                                onClick={() => {
                                  handleLoadTeacherGroup(group.id);
                                }}
                                className="flex-1 text-left text-sm"
                              >
                                {group.group_name} ({group.teacher_ids.length}명)
                              </button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTeacherGroup(group.id, group.group_name);
                                }}
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </>
              )}
              {selectedTable === "teachers" && selectedTeachers.size > 0 && (
                <Button 
                  variant="outline"
                  onClick={() => setIsGroupDialogOpen(true)}
                >
                  그룹 저장 ({selectedTeachers.size})
                </Button>
              )}
              {(selectedTable === "merits" || selectedTable === "demerits" || selectedTable === "monthly") && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0 || isDeleting}
                >
                  {isDeleting ? "삭제 중..." : `선택 삭제 (${selectedIds.size})`}
                </Button>
              )}
            </>
          )}
          </div>

          {data.length > 0 && (
            <div className="border rounded-lg overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectedTable === "students" && (
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedStudents.size > 0 && selectedStudents.size === data.length}
                          onChange={(e) => handleToggleAllStudents(e.target.checked)}
                          className="cursor-pointer"
                        />
                      </TableHead>
                    )}
                    {selectedTable === "teachers" && (
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedTeachers.size > 0 && selectedTeachers.size === data.length}
                          onChange={(e) => handleToggleAllTeachers(e.target.checked)}
                          className="cursor-pointer"
                        />
                      </TableHead>
                    )}
                    {(selectedTable === "merits" || selectedTable === "demerits" || selectedTable === "monthly") && (
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size > 0 && selectedIds.size === (
                            selectedTable === "merits" ? meritsRawData.length :
                            selectedTable === "demerits" ? demeritsRawData.length :
                            monthlyRawData.length
                          )}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="cursor-pointer"
                        />
                      </TableHead>
                    )}
                    {columns.filter(col => col !== 'student_id' && col !== 'student_name').map((col) => (
                      <TableHead key={col} className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{col}</span>
                          {selectedTable === "teachers" && (col === "부서" || col === "담당교과") && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 hover:bg-muted"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                                  </svg>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-2 bg-background border shadow-md z-50" align="start">
                                <div className="space-y-2">
                                  <div className="font-medium text-sm px-2">{col} 필터</div>
                                  <div className="max-h-60 overflow-y-auto space-y-1">
                                    <button
                                      onClick={() => {
                                        const newFilters = { ...columnFilters };
                                        delete newFilters[col];
                                        setColumnFilters(newFilters);
                                        // 검색 조건 초기화하고 전체 데이터 다시 조회
                                        setSearchTerm("");
                                        setSearchDepartment("");
                                        setSearchSubject("");
                                        // 약간의 지연 후 조회 (state 업데이트 후)
                                        setTimeout(() => handleQuery(), 100);
                                      }}
                                      className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted ${!columnFilters[col] ? 'bg-muted' : ''}`}
                                    >
                                      (전체)
                                    </button>
                                    {Array.from(new Set(originalData.map(row => row[col]).filter(Boolean))).sort().map((value) => (
                                      <button
                                        key={value}
                                        onClick={() => {
                                          // 검색 조건 초기화하고 해당 컬럼 값으로 서버 검색
                                          setSearchTerm("");
                                          setColumnFilters({}); // 클라이언트 필터 완전 초기화
                                          
                                          if (col === "부서") {
                                            setSearchDepartment(value as string);
                                            setSearchSubject("");
                                          } else if (col === "담당교과") {
                                            setSearchSubject(value as string);
                                            setSearchDepartment("");
                                          }
                                          
                                          // 약간의 지연 후 조회
                                          setTimeout(() => handleQuery(), 100);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted ${columnFilters[col] === value ? 'bg-muted' : ''}`}
                                      >
                                        {value}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </TableHead>
                    ))}
                    {selectedTable === "monthly" && (
                      <TableHead className="whitespace-nowrap">상담기록</TableHead>
                    )}
                    {selectedTable === "teachers" && (
                      <TableHead className="whitespace-nowrap">편집</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data
                    .filter(row => {
                      // 컬럼 필터 적용
                      return Object.entries(columnFilters).every(([col, filterValue]) => {
                        return row[col] === filterValue;
                      });
                    })
                    .map((row, idx) => {
                    const rawData = 
                      selectedTable === "merits" ? meritsRawData[idx] :
                      selectedTable === "demerits" ? demeritsRawData[idx] :
                      selectedTable === "monthly" ? monthlyRawData[idx] :
                      null;
                    
                    return (
                      <TableRow key={idx}>
                        {selectedTable === "students" && row["학번"] && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedStudents.has(row["학번"])}
                              onChange={(e) => handleToggleStudent(row["학번"], e.target.checked)}
                              className="cursor-pointer"
                            />
                          </TableCell>
                        )}
                        {selectedTable === "teachers" && row["이메일"] && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedTeachers.has(row["이메일"])}
                              onChange={(e) => handleToggleTeacher(row["이메일"], e.target.checked)}
                              className="cursor-pointer"
                            />
                          </TableCell>
                        )}
                        {(selectedTable === "merits" || selectedTable === "demerits" || selectedTable === "monthly") && rawData?.id && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(rawData.id)}
                              onChange={(e) => handleSelectOne(rawData.id, e.target.checked)}
                              className="cursor-pointer"
                            />
                          </TableCell>
                        )}
                        {columns.filter(col => col !== 'student_id' && col !== 'student_name').map((col) => {
                          const value = row[col]?.toString() || "-";
                          const isPhoneColumn = col === "전화번호" || col === "학부모전화1" || col === "학부모전화2";
                          const isEmailColumn = col === "이메일" || col.toLowerCase().includes("email");
                          const isValidPhone = value !== "-" && value.trim() !== "";
                          const isValidEmail = value !== "-" && value.trim() !== "" && value.includes("@");
                          const studentName = row["이름"] || row["name"] || "";
                          const studentId = row["학번"] || row["student_id"] || undefined;
                          
                          return (
                            <TableCell key={col} className="whitespace-nowrap">
                              {isPhoneColumn && isValidPhone ? (
                                <button
                                  onClick={(e) => handlePhoneClick(value, studentName, e)}
                                  className="text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                                  title={isMobileDevice() ? "문자 보내기" : "이름과 전화번호 복사"}
                                >
                                  {value}
                                </button>
                              ) : isEmailColumn && isValidEmail ? (
                                <button
                                  onClick={() => handleEmailClick(value, studentName, studentId)}
                                  className="text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                                  title="이메일 보내기"
                                >
                                  {value}
                                </button>
                              ) : (
                                value
                              )}
                            </TableCell>
                          );
                        })}
                        {selectedTable === "monthly" && (
                          <TableCell className="whitespace-nowrap">
                            {idx < 9 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCounselingDialog(row)}
                              >
                                <ClipboardEdit className="h-4 w-4 mr-1" />
                                기록
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                        )}
                        {selectedTable === "teachers" && (
                          <TableCell className="whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenTeacherEdit(row)}
                            >
                              <ClipboardEdit className="h-4 w-4 mr-1" />
                              편집
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 진로상담 기록 다이얼로그 */}
      <Dialog open={isCounselingDialogOpen} onOpenChange={setIsCounselingDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>상담 기록 - {selectedStudent?.학생}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="counselor-name">상담사 이름 *</Label>
              <Input
                id="counselor-name"
                value={counselorName}
                onChange={(e) => setCounselorName(e.target.value)}
                placeholder="상담사 이름을 입력하세요"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="counseling-date">상담 날짜 *</Label>
              <Input
                id="counseling-date"
                type="date"
                value={counselingDate}
                onChange={(e) => setCounselingDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="counseling-content">상담 내용 *</Label>
              <Textarea
                id="counseling-content"
                value={counselingContent}
                onChange={(e) => setCounselingContent(e.target.value)}
                placeholder="상담 내용을 상세히 입력하세요"
                rows={8}
                maxLength={2000}
              />
              <p className="text-sm text-muted-foreground">
                {counselingContent.length} / 2000자
              </p>
            </div>
            <div className="space-y-2">
              <Label>첨부 파일 (선택사항)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  파일
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  카메라
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {attachmentPreview && (
                <div className="relative mt-2 p-2 border rounded-lg">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1"
                    onClick={handleRemoveAttachment}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  {attachmentFile?.type.startsWith('image/') ? (
                    <img
                      src={attachmentPreview}
                      alt="첨부 파일 미리보기"
                      className="max-w-full max-h-48 object-contain mx-auto"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2">
                      <FileUp className="w-6 h-6" />
                      <span className="text-sm">{attachmentFile?.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCounselingDialogOpen(false)}
              disabled={isSavingCounseling}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveCounseling}
              disabled={isSavingCounseling}
            >
              {isSavingCounseling ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 교사 정보 편집 다이얼로그 */}
      <Dialog open={isTeacherEditDialogOpen} onOpenChange={setIsTeacherEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>교사 정보 편집</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-name">이름 *</Label>
              <Input
                id="teacher-name"
                value={editingTeacher?.name || ""}
                onChange={(e) => setEditingTeacher({...editingTeacher, name: e.target.value})}
                placeholder="교사 이름"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-phone">전화번호 *</Label>
              <Input
                id="teacher-phone"
                value={editingTeacher?.phone || ""}
                onChange={(e) => setEditingTeacher({...editingTeacher, phone: e.target.value})}
                placeholder="010-0000-0000"
                maxLength={20}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teacher-grade">학년</Label>
                <Input
                  id="teacher-grade"
                  type="number"
                  value={editingTeacher?.grade || ""}
                  onChange={(e) => setEditingTeacher({...editingTeacher, grade: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="학년"
                  min="1"
                  max="3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacher-class">반</Label>
                <Input
                  id="teacher-class"
                  type="number"
                  value={editingTeacher?.class || ""}
                  onChange={(e) => setEditingTeacher({...editingTeacher, class: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="반"
                  min="1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-department">부서</Label>
              <Input
                id="teacher-department"
                value={editingTeacher?.department || ""}
                onChange={(e) => setEditingTeacher({...editingTeacher, department: e.target.value})}
                placeholder="부서명"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-subject">담당교과</Label>
              <Input
                id="teacher-subject"
                value={editingTeacher?.subject || ""}
                onChange={(e) => setEditingTeacher({...editingTeacher, subject: e.target.value})}
                placeholder="담당교과"
                maxLength={100}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="teacher-homeroom"
                checked={editingTeacher?.isHomeroom || false}
                onCheckedChange={(checked) => setEditingTeacher({...editingTeacher, isHomeroom: checked})}
              />
              <Label htmlFor="teacher-homeroom" className="cursor-pointer">담임교사</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTeacherEditDialogOpen(false)}
              disabled={isSavingTeacher}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveTeacher}
              disabled={isSavingTeacher}
            >
              {isSavingTeacher ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 이메일 작성 다이얼로그 */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>이메일/메신저 작성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>템플릿 선택</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="템플릿을 선택하세요" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {templates.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      등록된 템플릿이 없습니다
                    </div>
                  ) : (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        [{template.template_type === 'email' ? '이메일' : '메신저'}] {template.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>수신자</Label>
              <Input
                value={`${emailRecipient.name} (${emailRecipient.email})`}
                disabled
              />
            </div>
            <div>
              <Label>제목</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="이메일 제목"
              />
            </div>
            <div>
              <Label>내용</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="이메일 내용을 입력하세요"
                rows={12}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
              disabled={isSendingEmail}
            >
              취소
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !emailSubject.trim() || !emailBody.trim()}
            >
              {isSendingEmail ? "발송 중..." : "발송"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 일괄 메시지 발송 다이얼로그 */}
      <Dialog open={isBulkEmailDialogOpen} onOpenChange={setIsBulkEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>일괄 메시지 발송</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>템플릿 선택</Label>
              <Select value={selectedTemplateId} onValueChange={handleBulkTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="템플릿을 선택하세요" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {templates.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      등록된 템플릿이 없습니다
                    </div>
                  ) : (
                    templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        [{template.template_type === 'email' ? '이메일' : '메신저'}] {template.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>수신자 ({selectedStudents.size}명)</Label>
              <div className="text-sm text-muted-foreground max-h-24 overflow-y-auto p-2 border rounded">
                {Array.from(selectedStudents).map((studentId) => {
                  const student = data.find((row: any) => row.학번 === studentId);
                  return student ? `${student.이름} (${studentId})` : studentId;
                }).join(', ')}
              </div>
            </div>
            <div>
              <Label>제목</Label>
              <Input
                value={bulkEmailSubject}
                onChange={(e) => setBulkEmailSubject(e.target.value)}
                placeholder="이메일 제목"
              />
            </div>
            <div>
              <Label>내용</Label>
              <Textarea
                value={bulkEmailBody}
                onChange={(e) => setBulkEmailBody(e.target.value)}
                placeholder="이메일 내용을 입력하세요"
                rows={12}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkEmailDialogOpen(false)}
              disabled={isSendingBulkEmail}
            >
              취소
            </Button>
            <Button
              onClick={handleSendBulkEmail}
              disabled={isSendingBulkEmail || !bulkEmailSubject.trim() || !bulkEmailBody.trim()}
            >
              {isSendingBulkEmail ? "발송 중..." : "일괄 발송"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 그룹 저장 다이얼로그 */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedTable === "students" ? "학생 그룹 저장" : "교사 그룹 저장"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>그룹명</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={selectedTable === "students" ? "예: 로봇 동아리, 축구부" : "예: 교무부, 수학과"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSavingGroup) {
                    handleSaveGroup();
                  }
                }}
              />
            </div>
            {selectedTable === "students" ? (
              <div>
                <Label>선택된 학생 ({selectedStudents.size}명)</Label>
                <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto p-2 border rounded">
                  {Array.from(selectedStudents).map((studentId) => {
                    const student = data.find((row: any) => row.학번 === studentId);
                    return student ? `${student.이름} (${studentId})` : studentId;
                  }).join(', ')}
                </div>
              </div>
            ) : (
              <div>
                <Label>선택된 교사 ({selectedTeachers.size}명)</Label>
                <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto p-2 border rounded">
                  {Array.from(selectedTeachers).map((teacherEmail) => {
                    const teacher = data.find((row: any) => row.이메일 === teacherEmail);
                    return teacher ? `${teacher.이름} (${teacherEmail})` : teacherEmail;
                  }).join(', ')}
                </div>
              </div>
            )}
            {selectedTable === "students" && studentGroups.length > 0 && (
              <div>
                <Label>기존 학생 그룹 목록</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded">
                  {studentGroups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between text-sm">
                      <span>{group.group_name} ({group.student_ids.length}명)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteGroup(group.id, group.group_name)}
                        className="h-6 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedTable === "teachers" && teacherGroups.length > 0 && (
              <div>
                <Label>기존 교사 그룹 목록</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded">
                  {teacherGroups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between text-sm">
                      <span>{group.group_name} ({group.teacher_ids.length}명)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTeacherGroup(group.id, group.group_name)}
                        className="h-6 px-2"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsGroupDialogOpen(false);
                setNewGroupName("");
              }}
              disabled={isSavingGroup}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveGroup}
              disabled={isSavingGroup || !newGroupName.trim()}
            >
              {isSavingGroup ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataInquiry;
