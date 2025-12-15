import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download, ClipboardEdit, FileUp, Camera, X, Send, Trash2, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import JSZip from "jszip";
import { useRealtimeSync, TableSubscription } from "@/hooks/use-realtime-sync";

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
  const [userType, setUserType] = useState<"admin" | "teacher">("admin");
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
  const [bulkStudentAttachmentFiles, setBulkStudentAttachmentFiles] = useState<File[]>([]);
  const [bulkStudentAttachmentPreviews, setBulkStudentAttachmentPreviews] = useState<{file: File, preview: string}[]>([]);
  const bulkStudentFileInputRef = useRef<HTMLInputElement>(null);
  const bulkStudentCameraInputRef = useRef<HTMLInputElement>(null);
  const [studentGroups, setStudentGroups] = useState<any[]>([]);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [emailSendResults, setEmailSendResults] = useState<any[]>([]);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<{ id: string; name: string } | null>(null);
  const [isTeacherEditDialogOpen, setIsTeacherEditDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const [isAddTeacherDialogOpen, setIsAddTeacherDialogOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState<any>({
    name: "",
    phone: "",
    email: "",
    grade: null,
    class: null,
    department: "",
    subject: "",
    isHomeroom: false,
    isAdmin: false
  });
  const [isStudentEditDialogOpen, setIsStudentEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isTeacherPrintDialogOpen, setIsTeacherPrintDialogOpen] = useState(false);
  const [isPhotoUploadDialogOpen, setIsPhotoUploadDialogOpen] = useState(false);
  const [isTeacherPhotoUploadDialogOpen, setIsTeacherPhotoUploadDialogOpen] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState<{ [key: string]: boolean }>({});
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [searchDepartment, setSearchDepartment] = useState("");
  const [searchSubject, setSearchSubject] = useState("");
  const [searchHomeroom, setSearchHomeroom] = useState("");
  const [searchDeptName, setSearchDeptName] = useState("");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState<Record<string, boolean>>({});
  const [departments, setDepartments] = useState<any[]>([]);
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    student_id: "",
    name: "",
    grade: "1",
    class: "1",
    number: "",
    dept_code: "none",
    student_call: "",
    gmail: "",
    parents_call1: "",
    parents_call2: ""
  });
  const [isAddingStudent, setIsAddingStudent] = useState(false);

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

      const { data, error } = await supabase.rpc("admin_get_student_groups", {
        admin_id_input: user.id
      });

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


  // 사용자 타입 가져오기
  useEffect(() => {
    const authUser = localStorage.getItem("auth_user");
    if (authUser) {
      const parsedUser = JSON.parse(authUser);
      setUserType(parsedUser.type);
    }
  }, []);

  // selectedTable이 변경될 때 그룹 로드
  useEffect(() => {
    if (selectedTable === "students") {
      loadStudentGroups();
    }
  }, [selectedTable]);

  // 실시간 동기화 커스텀 훅 사용
  const handleRefreshData = useCallback(() => {
    if (data.length > 0) {
      handleQuery({ showToast: false });
    }
  }, [data.length, selectedTable]);

  const dataInquiryTables: TableSubscription[] = [
    {
      table: 'students',
      channelName: 'datainquiry_students',
      labels: {
        insert: '🔄 학생이 추가되었습니다',
        update: '🔄 학생 정보가 수정되었습니다',
        delete: '🔄 학생이 삭제되었습니다',
      },
      condition: () => selectedTable === 'students' && data.length > 0,
    },
    {
      table: 'teachers',
      channelName: 'datainquiry_teachers',
      labels: {
        insert: '🔄 교사가 추가되었습니다',
        update: '🔄 교사 정보가 수정되었습니다',
        delete: '🔄 교사가 삭제되었습니다',
      },
      condition: () => selectedTable === 'teachers' && data.length > 0,
    },
    {
      table: 'merits',
      channelName: 'datainquiry_merits',
      labels: {
        insert: '🔄 상점이 추가되었습니다',
        update: '🔄 상점이 수정되었습니다',
        delete: '🔄 상점이 삭제되었습니다',
      },
      condition: () => selectedTable === 'merits' && data.length > 0,
    },
    {
      table: 'demerits',
      channelName: 'datainquiry_demerits',
      labels: {
        insert: '🔄 벌점이 추가되었습니다',
        update: '🔄 벌점이 수정되었습니다',
        delete: '🔄 벌점이 삭제되었습니다',
      },
      condition: () => selectedTable === 'demerits' && data.length > 0,
    },
    {
      table: 'monthly',
      channelName: 'datainquiry_monthly',
      labels: {
        insert: '🔄 이달의 학생이 추가되었습니다',
        update: '🔄 이달의 학생이 수정되었습니다',
        delete: '🔄 이달의 학생이 삭제되었습니다',
      },
      condition: () => selectedTable === 'monthly' && data.length > 0,
    },
  ];

  useRealtimeSync({
    tables: dataInquiryTables,
    onRefresh: handleRefreshData,
    enabled: data.length > 0,
    dependencies: [selectedTable, data.length],
  });

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

  // 그룹 저장 다이얼로그 열기
  const openGroupDialog = (e?: React.MouseEvent) => {
    try {
      e?.preventDefault();
      e?.stopPropagation();
    } catch {}
    console.log("그룹 저장 다이얼로그 열기");
    setIsGroupDialogOpen(true);
  };

  // 그룹 저장
  const handleSaveGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("그룹명을 입력해주세요");
      return;
    }

    if (selectedStudents.size === 0) {
      toast.error("학생을 선택해주세요");
      return;
    }

    setIsSavingGroup(true);
    try {
      const userString = localStorage.getItem("auth_user");
      if (!userString) throw new Error("로그인이 필요합니다");

      const user = JSON.parse(userString);
      console.log("그룹 저장 시작:", newGroupName, `학생 수: ${selectedStudents.size}`);

      const { data, error } = await supabase.rpc("admin_insert_student_group", {
        admin_id_input: user.id,
        group_name_input: newGroupName,
        student_ids_input: Array.from(selectedStudents)
      });

      if (error) {
        console.error("학생 그룹 저장 에러:", error);
        throw error;
      }

      console.log("학생 그룹 저장 완료:", data);
      toast.success(`"${newGroupName}" 학생 그룹이 저장되었습니다`);
      await loadStudentGroups();

      // 그룹 저장 후 상태 초기화
      setIsGroupDialogOpen(false);
      setNewGroupName("");
      setSelectedStudents(new Set());
      setColumnFilters({});
      setSearchTerm("");
      setSearchDepartment("");
      setSearchSubject("");
      
      // 전체 목록 다시 조회
      await handleQuery();
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
      setIsLoading(true);
      const group = studentGroups.find((g) => g.id === groupId);
      if (!group) return;

      // 세션 설정
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("로그인이 필요합니다");
        return;
      }

      const parsedUser = JSON.parse(authUser);
      const adminId = parsedUser.id;

      // 그룹의 학생 ID로 학생 데이터 조회
      const { data: studentsData, error } = await supabase.rpc("admin_get_students", {
        admin_id_input: adminId,
        search_text: null,
        search_grade: null,
        search_class: null
      });

      if (error) throw error;

      // 그룹에 포함된 학생만 필터링
      const filteredStudents = studentsData?.filter(student => 
        group.student_ids.includes(student.student_id)
      ) || [];

      // 데이터 포맷팅
      const formattedData = filteredStudents.map(row => ({
        "증명사진": row.photo_url,
        "학번": row.student_id,
        "이름": row.name,
        "학년": row.grade,
        "반": row.class,
        "번호": row.number,
        "학과": row.dept_name || '-',
        "전화번호": row.student_call || '-',
        "이메일": row.gmail || '-',
        "학부모전화1": row.parents_call1 || '-',
        "학부모전화2": row.parents_call2 || '-'
      }));

      setData(formattedData);
      setSelectedStudents(new Set(group.student_ids));
      toast.success(`"${group.group_name}" 그룹을 불러왔습니다 (${filteredStudents.length}명)`);
    } catch (error: any) {
      console.error("그룹 불러오기 실패:", error);
      toast.error("그룹 불러오기에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  // 그룹 삭제 확인 열기
  const handleOpenDeleteGroup = (groupId: string, groupName: string) => {
    setDeletingGroup({ id: groupId, name: groupName });
    setIsDeleteGroupDialogOpen(true);
  };

  // 그룹 삭제
  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;

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

      const { error, count } = await supabase.from("student_groups").delete({ count: 'exact' }).eq("id", deletingGroup.id);

      if (error) throw error;

      // 실제로 삭제된 행이 없으면 에러 처리
      if (count === 0) {
        toast.error("이 그룹을 삭제할 권한이 없습니다");
        setIsDeleteGroupDialogOpen(false);
        setDeletingGroup(null);
        return;
      }

      toast.success(`"${deletingGroup.name}" 그룹이 삭제되었습니다`);
      await loadStudentGroups();
      setIsDeleteGroupDialogOpen(false);
      setDeletingGroup(null);
    } catch (error: any) {
      console.error("그룹 삭제 실패:", error);
      toast.error("그룹 삭제에 실패했습니다");
      setIsDeleteGroupDialogOpen(false);
      setDeletingGroup(null);
    }
  };

  // 교사 그룹 불러오기


  // 학생 일괄 메시지 첨부파일 핸들러
  const handleBulkStudentAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: {file: File, preview: string}[] = [];

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          newPreviews.push({file, preview: reader.result as string});
          if (newPreviews.length === newFiles.length) {
            setBulkStudentAttachmentFiles(prev => [...prev, ...newFiles]);
            setBulkStudentAttachmentPreviews(prev => [...prev, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
        newFiles.push(file);
      } else {
        newFiles.push(file);
        newPreviews.push({file, preview: ''});
      }
    }

    if (newFiles.filter(f => !f.type.startsWith('image/')).length > 0) {
      setBulkStudentAttachmentFiles(prev => [...prev, ...newFiles.filter(f => !f.type.startsWith('image/'))]);
    }
  };

  const handleRemoveBulkStudentAttachment = (index: number) => {
    setBulkStudentAttachmentFiles(prev => prev.filter((_, i) => i !== index));
    setBulkStudentAttachmentPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAllBulkStudentAttachments = () => {
    setBulkStudentAttachmentFiles([]);
    setBulkStudentAttachmentPreviews([]);
    if (bulkStudentFileInputRef.current) bulkStudentFileInputRef.current.value = "";
    if (bulkStudentCameraInputRef.current) bulkStudentCameraInputRef.current.value = "";
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

      // 세션 설정 (파일 업로드를 위해) - 교사와 관리자 구분
      if (userType === "teacher") {
        await supabase.rpc("set_teacher_session", {
          teacher_id_input: user.id
        });
      } else {
        await supabase.rpc("set_admin_session", {
          admin_id_input: user.id
        });
      }

      // 여러 첨부파일 업로드
      const attachmentUrls: string[] = [];
      if (bulkStudentAttachmentFiles.length > 0) {
        for (const file of bulkStudentAttachmentFiles) {
          const fileExt = file.name.split('.').pop()?.toLowerCase();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `student-attachments/${fileName}`;

          // Content-Type 설정
          const contentType = file.type || 'application/octet-stream';

          const { error: uploadError } = await supabase.storage
            .from('counseling-attachments')
            .upload(filePath, file, {
              contentType: contentType,
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error("파일 업로드 실패:", uploadError);
            toast.error(`파일 업로드 실패: ${file.name}`);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('counseling-attachments')
            .getPublicUrl(filePath);
          
          attachmentUrls.push(publicUrl);

          // 파일 메타데이터 저장
          await supabase.from('file_metadata').insert({
            storage_path: filePath,
            original_filename: file.name,
            file_size: file.size,
            mime_type: contentType,
            bucket_name: 'counseling-attachments',
            uploaded_by: user.id
          });
        }
      }

      // 유효한 이메일 도메인
      const validDomains = ['sc.gyo6.net', 'gmail.com'];
      
      const isValidEmail = (email: string): boolean => {
        if (!email || email === '-' || email.trim() === '' || !email.includes('@')) {
          return false;
        }
        const domain = email.split('@')[1];
        return validDomains.includes(domain);
      };

      const selectedStudentIds = Array.from(selectedStudents);
      const allSelectedStudents = data
        .filter((row: any) => selectedStudentIds.includes(row.학번))
        .map((student: any) => {
          const email = student.이메일 || student.gmail;
          return {
            studentId: student.학번,
            name: student.이름,
            email: email,
            hasValidEmail: isValidEmail(email)
          };
        });
      
      const studentsToEmail = allSelectedStudents
        .filter((student: any) => student.hasValidEmail)
        .map(({ studentId, name, email }) => ({ studentId, name, email }));
      
      const studentsWithoutEmail = allSelectedStudents
        .filter((student: any) => !student.hasValidEmail);

      console.log("선택된 학생 수:", selectedStudentIds.length);
      console.log("유효한 이메일을 가진 학생:", studentsToEmail);
      console.log("이메일 없는 학생:", studentsWithoutEmail);

      if (studentsToEmail.length === 0) {
        toast.error("선택한 학생 중 유효한 이메일이 있는 학생이 없습니다");
        return;
      }

      // 첨부파일 URL들이 있으면 이메일 본문에 추가
      let emailBody = bulkEmailBody;
      let attachmentInfo = null;
      
      if (attachmentUrls.length > 0) {
        // 여러 파일이면 ZIP으로 압축
        if (attachmentUrls.length > 1) {
          try {
            const zip = new JSZip();
            
            // 모든 파일을 다운로드하여 ZIP에 추가
            for (let i = 0; i < bulkStudentAttachmentFiles.length; i++) {
              const file = bulkStudentAttachmentFiles[i];
              zip.file(file.name, file);
            }
            
            // ZIP 파일 생성
            const zipBlob = await zip.generateAsync({ type: "blob" });
            
            // 현재 날짜와 그룹명으로 파일명 생성
            const now = new Date();
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            // 선택된 학생들의 이름으로 그룹명 생성 (최대 3명까지 표시)
            const studentNamesList = studentsToEmail.slice(0, 3).map((s: any) => s.name);
            const groupName = studentNamesList.length > 0 
              ? studentNamesList.join(',') + (studentsToEmail.length > 3 ? '외' : '')
              : "학생그룹";
            const zipFileName = `${dateStr}-${groupName}.zip`;
            const zipFilePath = `student-attachments/${Date.now()}_${zipFileName}`;
            
            // ZIP 파일 업로드 - edge function 사용
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(zipBlob);
            });
            const base64Data = await base64Promise;
            
            const { data: uploadResult, error: zipUploadError } = await supabase.functions.invoke(
              'upload-counseling-attachment',
              {
                body: {
                  admin_id: user.id,
                  filename: zipFileName,
                  file_base64: base64Data,
                  content_type: 'application/zip'
                }
              }
            );
            
            if (!zipUploadError && uploadResult?.ok) {
              const publicUrl = uploadResult.publicUrl;
              
              attachmentInfo = {
                url: publicUrl,
                name: zipFileName,
                isZip: true
              };

              // ZIP 파일 메타데이터 저장
              await supabase.from('file_metadata').insert({
                storage_path: uploadResult.path,
                original_filename: zipFileName,
                file_size: zipBlob.size,
                mime_type: 'application/zip',
                bucket_name: 'counseling-attachments',
                uploaded_by: user.id
              });
            } else {
              console.error("ZIP 업로드 실패:", zipUploadError);
              // ZIP 실패시 개별 파일 정보 제공
              attachmentInfo = {
                files: attachmentUrls.map((url, index) => ({
                  url,
                  name: bulkStudentAttachmentFiles[index]?.name || `첨부파일${index + 1}`
                })),
                isZip: false
              };
            }
          } catch (zipError) {
            console.error("ZIP 생성 실패:", zipError);
            // ZIP 실패시 개별 파일 정보 제공
            attachmentInfo = {
              files: attachmentUrls.map((url, index) => ({
                url,
                name: bulkStudentAttachmentFiles[index]?.name || `첨부파일${index + 1}`
              })),
              isZip: false
            };
          }
        } else {
          // 단일 파일이면 그냥 정보 제공
          attachmentInfo = {
            url: attachmentUrls[0],
            name: bulkStudentAttachmentFiles[0]?.name || '첨부파일',
            isZip: false
          };
        }
      }

      // 이메일 없는 학생이 있으면 경고
      if (studentsWithoutEmail.length > 0) {
        const skippedNames = studentsWithoutEmail.map(s => s.name).join(", ");
        toast.warning(
          `${studentsWithoutEmail.length}명은 유효한 이메일이 없어 제외됩니다\n(${skippedNames})`,
          { duration: 5000 }
        );
      }

      // Resend를 통한 자동 발송
      const { data: result, error } = await supabase.functions.invoke("send-bulk-email", {
        body: {
          adminId: user.id,
          subject: bulkEmailSubject,
          body: emailBody,
          students: studentsToEmail,
          attachmentInfo: attachmentInfo
        },
      });

      if (error) throw error;

      // 발송 결과 저장 및 결과 다이얼로그 표시
      setEmailSendResults(result.results || []);
      setIsResultDialogOpen(true);
      
      setIsBulkEmailDialogOpen(false);
      setSelectedStudents(new Set());
      setBulkEmailSubject("");
      setBulkEmailBody("");
      setSelectedTemplateId("");
      handleClearAllBulkStudentAttachments();
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

    // 학생 테이블의 경우 업로드 순서와 일치하도록 특별 처리
    if (selectedTable === "students") {
      csvHeader = "student_id,name,grade,class,number,dept_code,student_call,gmail,parents_call1,parents_call2";
      csvRows = data.map(row => {
        const student_id = row["학번"] || "";
        const name = row["이름"] || "";
        const grade = row["학년"] || "";
        const classNum = row["반"] || "";
        const number = row["번호"] || "";
        const dept_code = row["학과"] || "";
        const student_call = row["전화번호"] || "";
        const gmail = row["이메일"] || "";
        const parents_call1 = row["학부모전화1"] || "";
        const parents_call2 = row["학부모전화2"] || "";
        
        return `${student_id},${name},${grade},${classNum},${number},${dept_code},${student_call},${gmail},${parents_call1},${parents_call2}`;
      });
    } else if (selectedTable === "teachers") {
      csvHeader = "teacher_email,name,grade,class,dept_code,call_t,is_homeroom,department,subject";
      csvRows = data.map(row => {
        const teacher_email = row["이메일"] || "";
        const name = row["이름"] || "";
        const grade = row["학년"] !== "-" ? row["학년"] : "";
        const classNum = row["반"] !== "-" ? row["반"] : "";
        const dept_code = row["학과"] || "";
        const call_t = row["전화번호"] || "";
        const is_homeroom = row["담임여부"] === "담임" ? "true" : "false";
        const department = row["부서"] || "";
        const subject = row["담당교과"] || "";
        
        return `${teacher_email},${name},${grade},${classNum},${dept_code},${call_t},${is_homeroom},${department},${subject}`;
      });
    } else if (selectedTable === "monthly" && monthlyRawData.length > 0) {
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
    // Get current logged in user's name
    const storedUser = localStorage.getItem("auth_user");
    let defaultCounselorName = "";
    
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.name) {
          defaultCounselorName = parsedUser.name;
        }
      } catch (e) {
        console.error("Failed to parse user data:", e);
      }
    }
    
    setSelectedStudent(student);
    setCounselorName(defaultCounselorName);
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
      console.log('User info:', parsedUser);
      if (parsedUser.type === "admin") {
        const { error: sessionError } = await supabase.rpc("set_admin_session", {
          admin_id_input: parsedUser.id
        });
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('세션 설정 중 오류가 발생했습니다');
        }
      } else if (parsedUser.type === "teacher") {
        const { error: sessionError } = await supabase.rpc("set_teacher_session", {
          teacher_id_input: parsedUser.id
        });
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('세션 설정 중 오류가 발생했습니다');
        }
      }

      let attachmentUrl = null;

      // 첨부 파일 업로드 (Edge Function 사용)
      if (attachmentFile) {
        const reader = new FileReader();
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(attachmentFile);
        });

        const uploadResponse = await supabase.functions.invoke('upload-counseling-attachment', {
          body: {
            admin_id: parsedUser.id,
            filename: attachmentFile.name,
            file_base64: fileBase64,
            content_type: attachmentFile.type,
          },
        });

        console.log('Upload response:', uploadResponse);

        if (uploadResponse.error) {
          console.error('Upload error:', uploadResponse.error);
          throw new Error('파일 업로드 중 오류가 발생했습니다');
        }

        if (!uploadResponse.data?.ok) {
          console.error('Upload failed:', uploadResponse.data);
          throw new Error(uploadResponse.data?.error || '파일 업로드 실패');
        }

        attachmentUrl = uploadResponse.data.publicUrl;
      }

      console.log('Inserting counseling record:', {
        student_id: selectedStudent.student_id,
        counselor_name: counselorName.trim(),
        counseling_date: counselingDate,
        content: counselingContent.trim(),
        admin_id: parsedUser.id,
        attachment_url: attachmentUrl
      });

      // Insert counseling record using RPC function
      const { data: recordId, error } = await supabase.rpc("insert_counseling_record", {
        p_student_id: selectedStudent.student_id,
        p_counselor_name: counselorName.trim(),
        p_counseling_date: counselingDate,
        p_content: counselingContent.trim(),
        p_admin_id: parsedUser.id,
        p_attachment_url: attachmentUrl
      });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

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
      originalEmail: teacher.이메일, // 원래 이메일 저장
      email: teacher.이메일,
      name: teacher.이름,
      phone: teacher.전화번호,
      grade: teacher.학년 === "-" ? null : teacher.학년,
      class: teacher.반 === "-" ? null : teacher.반,
      department: teacher.부서 === "-" ? "" : teacher.부서,
      subject: teacher.담당교과 === "-" ? "" : teacher.담당교과,
      isHomeroom: teacher.담임여부 === "담임",
      isAdmin: teacher.관리자여부 === "관리자"
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

      const { data, error } = await supabase.rpc("admin_update_teacher", {
        admin_id_input: parsedUser.id,
        original_email_input: editingTeacher.originalEmail,
        name_input: editingTeacher.name,
        call_t_input: editingTeacher.phone,
        teacher_email_input: editingTeacher.email,
        grade_input: editingTeacher.grade !== null && editingTeacher.grade !== undefined ? Number(editingTeacher.grade) : 0,
        class_input: editingTeacher.class !== null && editingTeacher.class !== undefined ? Number(editingTeacher.class) : 0,
        department_input: editingTeacher.department || '',
        subject_input: editingTeacher.subject || '',
        is_homeroom_input: editingTeacher.isHomeroom === true,
        is_admin_input: editingTeacher.isAdmin === true
      });

      if (error) throw error;

      toast.success("교사 정보가 수정되었습니다");
      setIsTeacherEditDialogOpen(false);
      setEditingTeacher(null);
      
      // 목록 새로고침
      handleQuery();
    } catch (error: any) {
      console.error("Error updating teacher:", error);
      
      // PostgreSQL unique constraint violation 에러 처리
      if (error.code === '23505') {
        if (error.message?.includes('call_t') || error.details?.includes('call_t')) {
          toast.error(`전화번호 ${editingTeacher.phone}는 이미 다른 교사가 사용 중입니다`);
        } else if (error.message?.includes('email') || error.details?.includes('email')) {
          toast.error(`이메일 ${editingTeacher.email}은 이미 다른 교사가 사용 중입니다`);
        } else {
          toast.error("중복된 값이 존재합니다");
        }
      } else if (error.message?.includes('이메일') && error.message?.includes('관리자')) {
        // 트리거에서 발생한 에러 (admins 테이블 email 충돌)
        toast.error(error.message);
      } else {
        toast.error("교사 정보 수정에 실패했습니다");
      }
    } finally {
      setIsSavingTeacher(false);
    }
  };

  // 교사 추가
  const handleAddTeacher = async () => {
    if (!newTeacher.name || !newTeacher.phone || !newTeacher.email) {
      toast.error("이름, 전화번호, 이메일은 필수 입력 항목입니다");
      return;
    }

    setIsSavingTeacher(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }

      const parsedUser = JSON.parse(authUser);

      const { data, error } = await supabase.rpc("admin_insert_teacher", {
        admin_id_input: parsedUser.id,
        name_input: newTeacher.name,
        call_t_input: newTeacher.phone,
        teacher_email_input: newTeacher.email,
        grade_input: newTeacher.grade || null,
        class_input: newTeacher.class || null,
        is_homeroom_input: newTeacher.isHomeroom,
        is_admin_input: newTeacher.isAdmin || false,
        dept_code_input: null,
        department_input: newTeacher.department || null,
        subject_input: newTeacher.subject || null
      });

      if (error) throw error;

      toast.success("교사가 추가되었습니다");
      setIsAddTeacherDialogOpen(false);
      setNewTeacher({
        name: "",
        phone: "",
        email: "",
        grade: null,
        class: null,
        department: "",
        subject: "",
        isHomeroom: false,
        isAdmin: false
      });
      
      // 목록 새로고침
      handleQuery();
    } catch (error: any) {
      console.error("Error adding teacher:", error);
      
      if (error.code === '23505') {
        if (error.message?.includes('call_t') || error.details?.includes('call_t')) {
          toast.error(`전화번호 ${newTeacher.phone}는 이미 다른 교사가 사용 중입니다`);
        } else if (error.message?.includes('email') || error.details?.includes('email')) {
          toast.error(`이메일 ${newTeacher.email}은 이미 다른 교사가 사용 중입니다`);
        } else {
          toast.error("중복된 값이 존재합니다");
        }
      } else {
        toast.error("교사 추가에 실패했습니다");
      }
    } finally {
      setIsSavingTeacher(false);
    }
  };

  // 교사 삭제
  const handleDeleteTeacher = async (teacherName: string, teacherEmail: string) => {
    if (!confirm(`정말로 "${teacherName}" 교사를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      // 관리자 ID 가져오기
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }

      const user = JSON.parse(authUser);

      const { data, error } = await supabase.rpc("admin_delete_teacher", {
        admin_id_input: user.id,
        teacher_email_input: teacherEmail
      });

      if (error) throw error;

      toast.success(`"${teacherName}" 교사가 삭제되었습니다`);
      
      // 목록 새로고침
      handleQuery();
    } catch (error: any) {
      console.error("교사 삭제 실패:", error);
      toast.error(error.message || "교사 삭제에 실패했습니다");
    }
  };

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    
    // 길이에 따라 포맷팅
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
    // 11자리 초과 시 11자리까지만
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  // 학생 편집 열기
  const handleOpenStudentEdit = (student: any) => {
    setEditingStudent({
      studentId: student.학번,
      name: student.이름,
      grade: student.학년,
      class: student.반,
      number: student.번호,
      deptName: student.학과,
      phone: student.학생전화 === "-" ? "" : student.학생전화,
      email: student.이메일 === "-" ? "" : student.이메일,
      parentPhone1: student.학부모전화1 === "-" ? "" : student.학부모전화1,
      parentPhone2: student.학부모전화2 === "-" ? "" : student.학부모전화2,
    });
    setIsStudentEditDialogOpen(true);
  };

  // 학생 정보 저장
  const handleSaveStudent = async () => {
    if (!editingStudent) return;

    setIsSavingStudent(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) throw new Error("관리자 인증이 필요합니다");

      const parsedUser = JSON.parse(authUser);

      const { data, error } = await supabase.rpc("admin_update_student", {
        admin_id_input: parsedUser.id,
        student_id_input: editingStudent.studentId,
        name_input: editingStudent.name,
        student_call_input: editingStudent.phone || '',
        gmail_input: editingStudent.email || '',
        parents_call1_input: editingStudent.parentPhone1 || '',
        parents_call2_input: editingStudent.parentPhone2 || ''
      });

      if (error) throw error;

      toast.success("학생 정보가 수정되었습니다");
      setIsStudentEditDialogOpen(false);
      setEditingStudent(null);
      
      // 목록 새로고침
      handleQuery();
    } catch (error) {
      console.error("Error updating student:", error);
      toast.error("학생 정보 수정에 실패했습니다");
    } finally {
      setIsSavingStudent(false);
    }
  };

  // 학생 삭제
  const handleDeleteStudent = async (studentName: string, studentId: string) => {
    if (!confirm(`정말로 "${studentName}" 학생을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }

      const user = JSON.parse(authUser);

      const { data, error } = await supabase.rpc("admin_delete_student", {
        admin_id_input: user.id,
        student_id_input: studentId
      });

      if (error) throw error;

      toast.success(`"${studentName}" 학생이 삭제되었습니다`);
      
      // 목록 새로고침
      handleQuery();
    } catch (error: any) {
      console.error("학생 삭제 실패:", error);
      toast.error(error.message || "학생 삭제에 실패했습니다");
    }
  };

  // 학과 목록 로드
  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error("학과 목록 로드 실패:", error);
      toast.error("학과 목록을 불러오는데 실패했습니다");
    }
  };

  // 학번 입력 시 자동으로 학년, 반, 번호 채우기
  const handleStudentIdChange = (value: string) => {
    setNewStudentData(prev => ({ ...prev, student_id: value }));
    
    // 학번이 2자리 이상일 때만 자동 채우기
    if (value.length >= 2) {
      const grade = value.charAt(0); // 첫째 자리: 학년
      const classNum = value.charAt(1); // 둘째 자리: 반
      const number = value.slice(2); // 나머지: 번호
      
      setNewStudentData(prev => ({
        ...prev,
        student_id: value,
        grade: grade,
        class: classNum,
        number: number
      }));
    }
  };

  // 신규 학생 추가
  const handleAddStudent = async () => {
    try {
      setIsAddingStudent(true);

      // 필수 입력 확인
      if (!newStudentData.student_id.trim() || !newStudentData.name.trim() || 
          !newStudentData.grade || !newStudentData.class || !newStudentData.number) {
        toast.error("학번, 이름, 학년, 반, 번호는 필수 입력 항목입니다");
        return;
      }

      // 관리자 ID 가져오기
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }

      const user = JSON.parse(authUser);
      
      // 학번 중복 체크 - admin_get_students 함수 사용
      const { data: existingStudents, error: checkError } = await supabase
        .rpc("admin_get_students", {
          admin_id_input: user.id,
          search_text: newStudentData.student_id.trim()
        });

      if (checkError) {
        console.error("학번 확인 오류:", checkError);
        throw checkError;
      }

      if (existingStudents && existingStudents.length > 0) {
        const exactMatch = existingStudents.find(s => s.student_id === newStudentData.student_id.trim());
        if (exactMatch) {
          toast.error("이미 존재하는 학번입니다");
          return;
        }
      }
      
      // 데이터베이스 함수를 사용하여 학생 추가 (RLS 자동 처리)
      const { data, error } = await supabase.rpc("admin_insert_student", {
        admin_id_input: user.id,
        student_id_input: newStudentData.student_id.trim(),
        name_input: newStudentData.name.trim(),
        grade_input: parseInt(newStudentData.grade),
        class_input: parseInt(newStudentData.class),
        number_input: parseInt(newStudentData.number),
        dept_code_input: newStudentData.dept_code && newStudentData.dept_code !== "none" ? newStudentData.dept_code : null,
        student_call_input: newStudentData.student_call.trim() || null,
        gmail_input: newStudentData.gmail.trim() || null,
        parents_call1_input: newStudentData.parents_call1.trim() || null,
        parents_call2_input: newStudentData.parents_call2.trim() || null
      });

      if (error) {
        console.error("학생 추가 오류:", error);
        throw error;
      }

      toast.success("신규 학생이 추가되었습니다");
      setIsAddStudentDialogOpen(false);
      
      // 폼 초기화
      setNewStudentData({
        student_id: "",
        name: "",
        grade: "1",
        class: "1",
        number: "",
        dept_code: "none",
        student_call: "",
        gmail: "",
        parents_call1: "",
        parents_call2: ""
      });

      // 목록 새로고침
      handleQuery();
    } catch (error: any) {
      console.error("학생 추가 실패:", error);
      toast.error(error.message || "학생 추가에 실패했습니다");
    } finally {
      setIsAddingStudent(false);
    }
  };

  // 교사 전용 즉시 조회 헬퍼 (필터 클릭 시 1회 클릭 적용)
  const queryTeachersImmediate = async (overrides?: { department?: string | null; subject?: string | null; homeroom?: string | null; deptName?: string | null }) => {
    setIsLoading(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) throw new Error("관리자 인증이 필요합니다");
      const parsedUser = JSON.parse(authUser);
      const adminId = parsedUser.id;

      // 세션 설정
      if (parsedUser.type === "admin") {
        await supabase.rpc("set_admin_session", { admin_id_input: adminId });
      } else if (parsedUser.type === "teacher") {
        await supabase.rpc("set_teacher_session", { teacher_id_input: adminId });
      }

      // overrides에 명시적으로 전달된 값(null 포함)을 우선 사용하고, 없으면 현재 상태값 사용
      const deptVal = (overrides && Object.prototype.hasOwnProperty.call(overrides, "department"))
        ? overrides.department
        : (searchDepartment.trim() || null);
      const subjVal = (overrides && Object.prototype.hasOwnProperty.call(overrides, "subject"))
        ? overrides.subject
        : (searchSubject.trim() || null);
      const homeroomVal = (overrides && Object.prototype.hasOwnProperty.call(overrides, "homeroom"))
        ? overrides.homeroom
        : (searchHomeroom.trim() || null);
      const deptNameVal = (overrides && Object.prototype.hasOwnProperty.call(overrides, "deptName"))
        ? overrides.deptName
        : (searchDeptName.trim() || null);

      const { data, error } = await supabase.rpc("admin_get_teachers", {
        admin_id_input: adminId,
        search_text: null,
        search_grade: null,
        search_class: null,
        search_department: deptVal,
        search_subject: subjVal,
        search_homeroom: homeroomVal,
        search_dept_name: deptNameVal,
      });
      if (error) throw error;

      const result = data?.map(row => ({
        "증명사진": row.photo_url,
        "이름": row.name,
        "전화번호": row.call_t,
        "이메일": row.teacher_email,
        "학년": row.grade || "-",
        "반": row.class || "-",
        "담임여부": row.is_homeroom ? "담임" : "-",
        "관리자여부": row.is_admin ? "관리자" : "-",
        "학과": row.dept_name,
        "부서": row.department,
        "담당교과": row.subject
      })) || [];

      setData(result);
      setColumns(result[0] ? Object.keys(result[0]) : []);
      setOriginalData(result); // 담당교과 필터 목록 업데이트를 위해 originalData 설정
      
      // RPC 결과의 길이를 사용하여 정확한 인원수 표시
      if (deptNameVal) {
        toast.success(`${deptNameVal} 교사: ${result.length}명`);
      } else if (homeroomVal) {
        toast.success(`${homeroomVal} 교사: ${result.length}명`);
      } else if (subjVal) {
        toast.success(`${subjVal} 교사: ${result.length}명`);
      } else if (deptVal) {
        toast.success(`${deptVal} 교사: ${result.length}명`);
      } else {
        toast.success(`전체 교사 인원: ${result.length}명`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "조회 실패");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuery = async (options?: { showToast?: boolean }) => {
    const showToast = options?.showToast !== false; // 기본값은 true
    setIsLoading(true);
    
    // 선택 유지: 검색/조회 시 기존 선택을 유지하여 누적되도록 함
    // setSelectedStudents(new Set());
    // setSelectedTeachers(new Set());
    
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

      // Set session for RLS (ensure policies recognize current user)
      if (parsedUser.type === "admin") {
        await supabase.rpc("set_admin_session", { admin_id_input: adminId });
      } else if (parsedUser.type === "teacher") {
        await supabase.rpc("set_teacher_session", { teacher_id_input: adminId });
      }

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
            
            // 세 자리 이상 숫자인 경우: 학번(student_id)으로 검색
            if (searchNum.length >= 3) {
              // admin_get_students 함수 사용
              const { data: studentData, error: queryError } = await supabase.rpc("admin_get_students", {
                admin_id_input: adminId,
                search_text: trimmedSearch
              });

              if (queryError) throw queryError;

              // 정확히 일치하는 학번 찾기
              const exactMatch = studentData?.find((s: any) => s.student_id === trimmedSearch);

              if (exactMatch) {
                result = [{
                  "증명사진": exactMatch.photo_url,
                  "학번": exactMatch.student_id,
                  "이름": exactMatch.name,
                  "학년": exactMatch.grade,
                  "반": exactMatch.class,
                  "번호": exactMatch.number,
                  "학과": exactMatch.dept_name,
                  "전화번호": exactMatch.student_call,
                  "이메일": exactMatch.gmail,
                  "학부모전화1": exactMatch.parents_call1,
                  "학부모전화2": exactMatch.parents_call2
                }];
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
            }
          } else {
            // 문자인 경우 이름으로 검색
            searchText = trimmedSearch;
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
          "증명사진": row.photo_url,
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

        // 조회 후 인원 알림
        if (showToast && result && result.length > 0) {
          if (searchGrade && searchClass) {
            toast.success(`${searchGrade}학년 ${searchClass}반 인원: ${result.length}명`);
          } else if (searchGrade) {
            toast.success(`${searchGrade}학년 총 인원: ${result.length}명`);
          } else if (!searchText) {
            toast.success(`전체 인원: ${result.length}명`);
          }
        }

      } else if (selectedTable === "teachers") {
        let searchGrade: number | null = null;
        let searchClass: number | null = null;
        let searchText: string | null = null;
        let searchDept: string | null = null;
        let searchSubj: string | null = null;

        if (trimmedSearch) {
          // 전화번호 패턴 검사 (010으로 시작하거나 하이픈이 포함된 경우)
          const isPhoneNumber = /^(010|011|016|017|018|019)/.test(trimmedSearch.replace(/-/g, '')) || 
                                trimmedSearch.includes('-');
          
          if (isPhoneNumber) {
            // 전화번호로 검색
            searchText = trimmedSearch;
          } else if (!isNaN(Number(trimmedSearch))) {
            // 숫자인 경우 학년이나 반으로 검색
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

        const { data, error: queryError } = await supabase.rpc("admin_get_teachers", {
          admin_id_input: adminId,
          search_text: searchText,
          search_grade: searchGrade,
          search_class: searchClass,
          search_department: searchDept,
          search_subject: searchSubj,
          search_dept_name: null,
          search_homeroom: null
        });

        if (queryError) throw queryError;

        result = data?.map(row => ({
          "증명사진": row.photo_url,
          "이름": row.name,
          "전화번호": row.call_t,
          "이메일": row.teacher_email,
          "학년": row.grade || "-",
          "반": row.class || "-",
          "담임여부": row.is_homeroom ? "담임" : "-",
          "관리자여부": row.is_admin ? "관리자" : "-",
          "학과": row.dept_name,
          "부서": row.department,
          "담당교과": row.subject
        }));

        // 전체 교사 인원수 알림 (showToast가 true일 때만)
        if (showToast) {
          toast.success(`전체 교사 인원: ${result?.length ?? 0}명`);
        }

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
          "점수": row.score,
          "증빙사진": row.image_url
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
          "점수": row.score,
          "증빙사진": row.image_url
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
        // monthly 테이블의 경우 컬럼 순서 명시적으로 설정
        if (selectedTable === "monthly") {
          setColumns(["학생", "추천횟수", "연도", "월"]);
        } else {
          setColumns(Object.keys(result[0]));
        }
        setData(result);
        setOriginalData(result);
        
        // 학생 테이블을 조회한 경우 그룹 목록도 로드
        if (selectedTable === "students") {
          loadStudentGroups();
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
            <Select value={selectedTable} onValueChange={(value) => { setSelectedTable(value as TableType); setSearchTerm(""); setColumnFilters({}); setSearchDepartment(""); setSearchSubject(""); setSearchHomeroom(""); setSearchDeptName(""); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="students">학생</SelectItem>
                <SelectItem value="teachers">교사</SelectItem>
                <SelectItem value="homeroom">담임반</SelectItem>
                {userType === "admin" && <SelectItem value="merits">상점</SelectItem>}
                {userType === "admin" && <SelectItem value="demerits">벌점</SelectItem>}
                {userType === "admin" && <SelectItem value="monthly">이달의 학생</SelectItem>}
                <SelectItem value="departments">학과</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={
                selectedTable === "students" ? "학생명, 학년, 학년반" :
                selectedTable === "teachers" ? "교사명, 폰번호, 학년, 학년반" :
                selectedTable === "homeroom" ? "학년반으로 검색 (예: 38 → 3학년 8반)" :
                selectedTable === "merits" || selectedTable === "demerits" || selectedTable === "monthly" 
                  ? "학생명, 교사명, 학년반, 학년반번호로 검색" :
                "검색"
              }
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                // 교사 테이블에서 전화번호 패턴인 경우 자동 포맷팅
                if (selectedTable === "teachers") {
                  const numbers = value.replace(/[^\d]/g, '');
                  // 010, 011 등으로 시작하고 3자리 이상인 경우 전화번호로 간주
                  if (numbers.length >= 3 && /^(010|011|016|017|018|019)/.test(numbers)) {
                    setSearchTerm(formatPhoneNumber(value));
                  } else {
                    setSearchTerm(value);
                  }
                } else {
                  setSearchTerm(value);
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleQuery()}
              className="w-full sm:max-w-xs"
              maxLength={100}
              type="search"
              inputMode="search"
              enterKeyHint="search"
            />
            <Button onClick={() => handleQuery()} disabled={isLoading}>
              {isLoading ? "조회 중..." : "검색"}
            </Button>
            <Button variant="outline" onClick={async () => { 
              setSearchTerm(""); 
              setSearchDepartment(""); 
              setSearchSubject(""); 
              setSearchHomeroom("");
              setSearchDeptName("");
              setColumnFilters({});
              
              // 선택 유지 (누적을 위해 초기화하지 않음)
              // if (selectedTable === "teachers") {
              //   setSelectedTeachers(new Set());
              // }
              
              // 교사 테이블인 경우 즉시 전체 조회
              if (selectedTable === "teachers") {
                await queryTeachersImmediate({ department: null, subject: null, homeroom: null, deptName: null });
              } else {
                // state 업데이트 후 조회
                setTimeout(() => handleQuery(), 150);
              }
            }} disabled={isLoading}>
              전체 조회
            </Button>
            {Object.keys(columnFilters).length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setColumnFilters({})}
                className="text-xs"
              >
              필터 초기화 ({Object.keys(columnFilters).length})
            </Button>
          )}
          {selectedTable === "teachers" && (
            <>
              {userType === "admin" && (
                <Button 
                  variant="default"
                  onClick={() => {
                    setNewTeacher({
                      name: "",
                      phone: "",
                      email: "",
                      grade: null,
                      class: null,
                      department: "",
                      subject: "",
                      isHomeroom: false,
                      isAdmin: false
                    });
                    setIsAddTeacherDialogOpen(true);
                  }}
                >
                  교사 추가
                </Button>
              )}
              {data.length > 0 && (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => setIsTeacherPrintDialogOpen(true)}
                  >
                    사진 출력
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setIsTeacherPhotoUploadDialogOpen(true)}
                  >
                    교사증명사진 업로드
                  </Button>
                </>
              )}
            </>
          )}
          {selectedTable === "students" && (
            <>
              {userType === "admin" && (
                <Button 
                  variant="default"
                  onClick={() => {
                    loadDepartments();
                    setIsAddStudentDialogOpen(true);
                  }}
                >
                  신규 학생 추가
                </Button>
              )}
              {data.length > 0 && (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => setIsPrintDialogOpen(true)}
                  >
                    사진 출력
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setIsPhotoUploadDialogOpen(true)}
                  >
                    학생증명사진 업로드
                  </Button>
                </>
              )}
            </>
          )}
          {data.length > 0 && (
            <>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV 내보내기
              </Button>
              {selectedTable === "students" && (
                <>
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
                                  handleOpenDeleteGroup(group.id, group.group_name);
                                }}
                                className="h-7 w-7 p-0 hover:bg-destructive/10 transition-colors"
                                title="그룹 삭제"
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
                    onClick={openGroupDialog}
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
                          className="cursor-pointer w-4 h-4"
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
                          className="cursor-pointer w-4 h-4"
                        />
                      </TableHead>
                    )}
                    {columns.filter(col => col !== 'student_id' && col !== 'student_name').map((col) => (
                      <TableHead key={col} className={
                        col === "증명사진" ? "w-16 sm:w-20 md:w-24" : 
                        col === "이름" ? "w-16 sm:w-20 md:w-24 whitespace-nowrap" : 
                        col === "학년" || col === "반" || col === "번호" ? "w-12 sm:w-14 md:w-16 whitespace-nowrap" : 
                        "whitespace-nowrap"
                      }>
                        <div className="flex items-center gap-2">
                          <span>{col}</span>
                          {selectedTable === "teachers" && (col === "부서" || col === "담당교과" || col === "담임여부" || col === "학과") && (
                            <Popover 
                              open={filterPopoverOpen[col] || false}
                              onOpenChange={(open) => setFilterPopoverOpen({...filterPopoverOpen, [col]: open})}
                            >
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
                                      onClick={async () => {
                                        const newFilters = { ...columnFilters };
                                        delete newFilters[col];
                                        setColumnFilters(newFilters);
                                        
                                        // 서버 검색 조건 초기화하고 즉시 재조회
                                        if (col === "부서") {
                                          setSearchDepartment("");
                                          setSearchSubject("");
                                          setSearchHomeroom("");
                                          setSearchDeptName("");
                                          setFilterPopoverOpen({...filterPopoverOpen, [col]: false});
                                          await queryTeachersImmediate({ department: null, subject: null, homeroom: null, deptName: null });
                                        } else if (col === "담당교과") {
                                          setSearchDepartment("");
                                          setSearchSubject("");
                                          setSearchHomeroom("");
                                          setSearchDeptName("");
                                          setFilterPopoverOpen({...filterPopoverOpen, [col]: false});
                                          await queryTeachersImmediate({ department: null, subject: null, homeroom: null, deptName: null });
                                        } else if (col === "담임여부") {
                                          setSearchDepartment("");
                                          setSearchSubject("");
                                          setSearchHomeroom("");
                                          setSearchDeptName("");
                                          setFilterPopoverOpen({...filterPopoverOpen, [col]: false});
                                          await queryTeachersImmediate({ department: null, subject: null, homeroom: null, deptName: null });
                                        } else if (col === "학과") {
                                          setSearchDepartment("");
                                          setSearchSubject("");
                                          setSearchHomeroom("");
                                          setSearchDeptName("");
                                          setFilterPopoverOpen({...filterPopoverOpen, [col]: false});
                                          await queryTeachersImmediate({ department: null, subject: null, homeroom: null, deptName: null });
                                        }
                                      }}
                                      className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted ${!columnFilters[col] ? 'bg-muted' : ''}`}
                                    >
                                      (전체)
                                    </button>
                                    {Array.from(new Set(originalData.map(row => row[col]).filter(Boolean))).sort().map((value) => (
                                      <button
                                        key={value}
                                        onClick={() => {
                                          // 검색 조건 초기화
                                          setSearchTerm("");
                                          
                                          if (col === "부서") {
                                            setSearchDepartment(value as string);
                                            setSearchSubject("");
                                            setSearchHomeroom("");
                                            setSearchDeptName("");
                                            setColumnFilters({}); // 서버 사이드 필터는 columnFilters 사용 안 함
                                            setFilterPopoverOpen({...filterPopoverOpen, [col]: false});
                                            void queryTeachersImmediate({ department: value as string, subject: undefined, homeroom: undefined, deptName: undefined });
                                          } else if (col === "담당교과") {
                                            setSearchSubject(value as string);
                                            setSearchDepartment("");
                                            setSearchHomeroom("");
                                            setSearchDeptName("");
                                            setColumnFilters({}); // 서버 사이드 필터는 columnFilters 사용 안 함
                                            setFilterPopoverOpen({...filterPopoverOpen, [col]: false});
                                            void queryTeachersImmediate({ department: undefined, subject: value as string, homeroom: undefined, deptName: undefined });
                                          } else if (col === "담임여부") {
                                            setSearchHomeroom(value as string);
                                            setSearchDepartment("");
                                            setSearchSubject("");
                                            setSearchDeptName("");
                                            setColumnFilters({}); // 서버 사이드 필터는 columnFilters 사용 안 함
                                            setFilterPopoverOpen({...filterPopoverOpen, [col]: false});
                                            void queryTeachersImmediate({ department: undefined, subject: undefined, homeroom: value as string, deptName: undefined });
                                          } else if (col === "학과") {
                                            setSearchDeptName(value as string);
                                            setSearchDepartment("");
                                            setSearchSubject("");
                                            setSearchHomeroom("");
                                            setColumnFilters({}); // 서버 사이드 필터는 columnFilters 사용 안 함
                                            setFilterPopoverOpen({...filterPopoverOpen, [col]: false});
                                            void queryTeachersImmediate({ department: undefined, subject: undefined, homeroom: undefined, deptName: value as string });
                                          }
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
                    {(selectedTable === "teachers" || selectedTable === "students") && (
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
                              className="cursor-pointer w-4 h-4"
                            />
                          </TableCell>
                        )}
                        {(selectedTable === "merits" || selectedTable === "demerits" || selectedTable === "monthly") && rawData?.id && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(rawData.id)}
                              onChange={(e) => handleSelectOne(rawData.id, e.target.checked)}
                              className="cursor-pointer w-4 h-4"
                            />
                          </TableCell>
                        )}
                        {columns.filter(col => col !== 'student_id' && col !== 'student_name').map((col) => {
                          const value = row[col]?.toString() || "-";
                          const isPhotoColumn = col === "증명사진";
                          const isEvidenceColumn = col === "증빙사진";
                          const isPhoneColumn = col === "전화번호" || col === "학부모전화1" || col === "학부모전화2";
                          const isEmailColumn = col === "이메일" || col.toLowerCase().includes("email");
                          const isValidPhone = value !== "-" && value.trim() !== "";
                          const isValidEmail = value !== "-" && value.trim() !== "" && value.includes("@");
                          const studentName = row["이름"] || row["name"] || "";
                          const studentId = row["학번"] || row["student_id"] || undefined;
                          const studentGrade = row["학년"] || "";
                          const studentClass = row["반"] || "";
                          const studentNumber = row["번호"] || "";
                          
                          return (
                            <TableCell key={col} className={
                              col === "증명사진" || col === "증빙사진" ? "whitespace-nowrap p-2" : 
                              col === "이름" ? "whitespace-nowrap max-w-[80px] sm:max-w-[100px] md:max-w-[120px] truncate" : 
                              col === "학년" || col === "반" || col === "번호" ? "whitespace-nowrap text-center p-2" : 
                              "whitespace-nowrap"
                            }>
                              {isPhotoColumn ? (
                                <div className="flex flex-col items-center gap-1 py-1">
                                  {value && value !== "-" && value !== "null" ? (
                                    <img 
                                      src={value} 
                                      alt={`${studentName} 증명사진`}
                                      className="w-12 h-16 sm:w-16 sm:h-20 md:w-20 md:h-28 object-cover rounded border"
                                      onError={(e) => {
                                        e.currentTarget.src = "/placeholder.svg";
                                      }}
                                    />
                                  ) : (
                                    <div className="w-12 h-16 sm:w-16 sm:h-20 md:w-20 md:h-28 bg-muted rounded border flex items-center justify-center text-muted-foreground text-xs">
                                      사진 없음
                                    </div>
                                  )}
                                  <div className="text-center">
                                    <div className="text-xs sm:text-sm font-semibold">{studentGrade}-{studentClass}-{studentNumber}</div>
                                    <div className="text-xs sm:text-sm truncate max-w-[60px] sm:max-w-[80px] md:max-w-[100px]">{studentName}</div>
                                  </div>
                                </div>
                              ) : isEvidenceColumn ? (
                                <div className="flex justify-center">
                                  {value && row[col] && Array.isArray(row[col]) && row[col].length > 0 ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedImages(row[col]);
                                        setIsImageDialogOpen(true);
                                      }}
                                    >
                                      <Camera className="h-4 w-4 mr-1" />
                                      보기 ({row[col].length})
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">없음</span>
                                  )}
                                </div>
                              ) : isPhoneColumn && isValidPhone ? (
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
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenTeacherEdit(row)}
                              >
                                <ClipboardEdit className="h-4 w-4 mr-1" />
                                편집
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteTeacher(row["이름"], row["이메일"])}
                                className="h-8 w-8 p-0 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                        {selectedTable === "students" && (
                          <TableCell className="whitespace-nowrap">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenStudentEdit(row)}
                              >
                                <ClipboardEdit className="h-4 w-4 mr-1" />
                                편집
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteStudent(row["이름"], row["학번"])}
                                className="h-8 w-8 p-0 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
                              </Button>
                            </div>
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
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">상담 기록 - {selectedStudent?.학생}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              학생의 진로 상담 내용을 기록합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="counselor-name" className="text-sm">상담사 이름 *</Label>
              <Input
                id="counselor-name"
                value={counselorName}
                onChange={(e) => setCounselorName(e.target.value)}
                placeholder="상담사 이름을 입력하세요"
                maxLength={50}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="counseling-date" className="text-sm">상담 날짜 *</Label>
              <Input
                id="counseling-date"
                type="date"
                value={counselingDate}
                onChange={(e) => setCounselingDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="counseling-content" className="text-sm">상담 내용 *</Label>
              <Textarea
                id="counseling-content"
                value={counselingContent}
                onChange={(e) => setCounselingContent(e.target.value)}
                placeholder="상담 내용을 상세히 입력하세요"
                rows={8}
                maxLength={2000}
                className="text-sm min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                {counselingContent.length} / 2000자
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">첨부 파일 (선택사항)</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm"
                  size="sm"
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  파일
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  className="text-sm"
                  size="sm"
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
                <div className="relative mt-2 p-2 border rounded-lg inline-block">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-background border shadow-sm"
                    onClick={handleRemoveAttachment}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  {attachmentFile?.type.startsWith('image/') ? (
                    <img 
                      src={attachmentPreview} 
                      alt="첨부 파일 미리보기" 
                      className="w-[50px] h-[50px] rounded object-cover"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2">
                      <FileUp className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm truncate">{attachmentFile?.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCounselingDialogOpen(false)}
              disabled={isSavingCounseling}
              className="w-full sm:w-auto"
            >
              취소
            </Button>
            <Button 
              onClick={handleSaveCounseling} 
              disabled={isSavingCounseling}
              className="w-full sm:w-auto"
            >
              {isSavingCounseling ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 교사 정보 편집 다이얼로그 */}
      <Dialog open={isTeacherEditDialogOpen} onOpenChange={setIsTeacherEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0">
          <DialogHeader className="shrink-0 pb-4">
            <DialogTitle>교사 정보 편집</DialogTitle>
            <DialogDescription>교사의 정보를 수정할 수 있습니다.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 px-1">
            {editingTeacher && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>이름</Label>
                    <Input 
                      value={editingTeacher.name}
                      onChange={(e) => setEditingTeacher({...editingTeacher, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>전화번호</Label>
                    <Input 
                      value={editingTeacher.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, ''); // 숫자만 추출
                        let formatted = value;
                        
                        if (value.length <= 3) {
                          formatted = value;
                        } else if (value.length <= 7) {
                          formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
                        } else if (value.length <= 11) {
                          formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}`;
                        } else {
                          formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
                        }
                        
                        setEditingTeacher({...editingTeacher, phone: formatted});
                      }}
                      placeholder="010-0000-0000"
                      maxLength={13}
                    />
                  </div>
                </div>
                <div>
                  <Label>이메일</Label>
                  <Input 
                    value={editingTeacher.email}
                    onChange={(e) => setEditingTeacher({...editingTeacher, email: e.target.value})}
                    placeholder="example@email.com"
                    type="email"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>학년 (담임인 경우)</Label>
                    <Input 
                      value={editingTeacher.grade || ""}
                      onChange={(e) => setEditingTeacher({...editingTeacher, grade: e.target.value ? Number(e.target.value) : null})}
                      placeholder="1, 2, 3"
                      type="number"
                    />
                  </div>
                  <div>
                    <Label>반 (담임인 경우)</Label>
                    <Input 
                      value={editingTeacher.class || ""}
                      onChange={(e) => setEditingTeacher({...editingTeacher, class: e.target.value ? Number(e.target.value) : null})}
                      placeholder="1-10"
                      type="number"
                    />
                  </div>
                </div>
                <div>
                  <Label>부서</Label>
                  <Input 
                    value={editingTeacher.department || ""}
                    onChange={(e) => setEditingTeacher({...editingTeacher, department: e.target.value})}
                    placeholder="예: 교무부, 학생부"
                  />
                </div>
                <div>
                  <Label>담당교과</Label>
                  <Input 
                    value={editingTeacher.subject || ""}
                    onChange={(e) => setEditingTeacher({...editingTeacher, subject: e.target.value})}
                    placeholder="예: 국어, 수학"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isHomeroom"
                    checked={editingTeacher.isHomeroom}
                    onCheckedChange={(checked) => setEditingTeacher({...editingTeacher, isHomeroom: checked as boolean})}
                  />
                  <Label htmlFor="isHomeroom" className="cursor-pointer">담임 여부</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isAdmin"
                    checked={editingTeacher.isAdmin || false}
                    onCheckedChange={(checked) => setEditingTeacher({...editingTeacher, isAdmin: checked as boolean})}
                  />
                  <Label htmlFor="isAdmin" className="cursor-pointer">관리자 여부</Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="shrink-0 pt-4">
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

      {/* 교사 추가 다이얼로그 */}
      <Dialog open={isAddTeacherDialogOpen} onOpenChange={setIsAddTeacherDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0">
          <DialogHeader className="shrink-0 pb-4">
            <DialogTitle>교사 추가</DialogTitle>
            <DialogDescription>새로운 교사를 추가합니다.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 px-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>이름 *</Label>
                <Input
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({...newTeacher, name: e.target.value})}
                  placeholder="교사명"
                />
              </div>
              <div>
                <Label>전화번호 *</Label>
                <Input
                  value={newTeacher.phone}
                  onChange={(e) => {
                    const value = e.target.value;
                    const digitsOnly = value.replace(/\D/g, '');
                    let formatted = digitsOnly;
                    
                    if (digitsOnly.length <= 3) {
                      formatted = digitsOnly;
                    } else if (digitsOnly.length <= 7) {
                      formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
                    } else if (digitsOnly.length <= 11) {
                      formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
                    } else {
                      formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7, 11)}`;
                    }
                    
                    setNewTeacher({...newTeacher, phone: formatted});
                  }}
                  placeholder="010-0000-0000"
                  maxLength={13}
                />
              </div>
            </div>
            <div>
              <Label>이메일 *</Label>
              <Input
                type="email"
                value={newTeacher.email}
                onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})}
                placeholder="teacher@gbe.kr"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>학년</Label>
                <Input
                  type="number"
                  value={newTeacher.grade || ""}
                  onChange={(e) => setNewTeacher({...newTeacher, grade: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="학년"
                />
              </div>
              <div>
                <Label>반</Label>
                <Input
                  type="number"
                  value={newTeacher.class || ""}
                  onChange={(e) => setNewTeacher({...newTeacher, class: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="반"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>부서</Label>
                <Input
                  value={newTeacher.department}
                  onChange={(e) => setNewTeacher({...newTeacher, department: e.target.value})}
                  placeholder="부서"
                />
              </div>
              <div>
                <Label>담당교과</Label>
                <Input
                  value={newTeacher.subject}
                  onChange={(e) => setNewTeacher({...newTeacher, subject: e.target.value})}
                  placeholder="담당교과"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isHomeroomNew"
                  checked={newTeacher.isHomeroom}
                  onCheckedChange={(checked) => setNewTeacher({...newTeacher, isHomeroom: checked === true})}
                />
                <Label htmlFor="isHomeroomNew" className="cursor-pointer">담임 여부</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isAdminNew"
                  checked={newTeacher.isAdmin}
                  onCheckedChange={(checked) => setNewTeacher({...newTeacher, isAdmin: checked === true})}
                />
                <Label htmlFor="isAdminNew" className="cursor-pointer">관리자 여부</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsAddTeacherDialogOpen(false)}
              disabled={isSavingTeacher}
            >
              취소
            </Button>
            <Button
              onClick={handleAddTeacher}
              disabled={isSavingTeacher}
            >
              {isSavingTeacher ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 학생 정보 편집 다이얼로그 */}
      <Dialog open={isStudentEditDialogOpen} onOpenChange={setIsStudentEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0">
          <DialogHeader className="shrink-0 pb-4">
            <DialogTitle>학생 정보 편집</DialogTitle>
            <DialogDescription>학생의 정보를 수정할 수 있습니다.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 px-1">
            {editingStudent && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>학번</Label>
                    <Input value={editingStudent.studentId} disabled />
                  </div>
                  <div>
                    <Label>이름</Label>
                    <Input 
                      value={editingStudent.name}
                      onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>학년</Label>
                    <Input value={editingStudent.grade} disabled />
                  </div>
                  <div>
                    <Label>반</Label>
                    <Input value={editingStudent.class} disabled />
                  </div>
                  <div>
                    <Label>번호</Label>
                    <Input value={editingStudent.number} disabled />
                  </div>
                </div>
                <div>
                  <Label>학과</Label>
                  <Input value={editingStudent.deptName || "-"} disabled />
                </div>
                <div>
                  <Label>학생 전화번호</Label>
                  <Input 
                    value={editingStudent.phone}
                    onChange={(e) => setEditingStudent({...editingStudent, phone: formatPhoneNumber(e.target.value)})}
                    placeholder="010-0000-0000"
                    maxLength={13}
                  />
                </div>
                <div>
                  <Label>이메일</Label>
                  <Input 
                    value={editingStudent.email}
                    onChange={(e) => setEditingStudent({...editingStudent, email: e.target.value})}
                    placeholder="example@email.com"
                    type="email"
                  />
                </div>
                <div>
                  <Label>학부모 전화번호 1</Label>
                  <Input 
                    value={editingStudent.parentPhone1}
                    onChange={(e) => setEditingStudent({...editingStudent, parentPhone1: formatPhoneNumber(e.target.value)})}
                    placeholder="010-0000-0000"
                    maxLength={13}
                  />
                </div>
                <div>
                  <Label>학부모 전화번호 2</Label>
                  <Input 
                    value={editingStudent.parentPhone2}
                    onChange={(e) => setEditingStudent({...editingStudent, parentPhone2: formatPhoneNumber(e.target.value)})}
                    placeholder="010-0000-0000"
                    maxLength={13}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="shrink-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsStudentEditDialogOpen(false)}
              disabled={isSavingStudent}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveStudent}
              disabled={isSavingStudent}
            >
              {isSavingStudent ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 그룹 저장 다이얼로그 */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>학생 그룹 저장</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>선택된 학생 ({selectedStudents.size}명)</Label>
              <div className="text-sm text-muted-foreground max-h-24 overflow-y-auto p-2 border rounded">
                {Array.from(selectedStudents).map((studentId) => {
                  const student = data.find((row: any) => row.학번 === studentId);
                  return student ? `${student.이름} (${studentId})` : studentId;
                }).join(', ')}
              </div>
            </div>
            <div>
              <Label>그룹명</Label>
              <Input
                placeholder="그룹명을 입력하세요"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGroupDialogOpen(false)}
              disabled={isSavingGroup}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveGroup}
              disabled={isSavingGroup}
            >
              {isSavingGroup ? "저장 중..." : "저장"}
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
            <div>
              <Label>첨부파일 ({bulkStudentAttachmentFiles.length}개)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => bulkStudentFileInputRef.current?.click()}
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  파일 선택
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => bulkStudentCameraInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  카메라
                </Button>
                {bulkStudentAttachmentFiles.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllBulkStudentAttachments}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    전체 삭제
                  </Button>
                )}
              </div>
              <input
                ref={bulkStudentFileInputRef}
                type="file"
                multiple
                accept="*/*"
                onChange={handleBulkStudentAttachmentUpload}
                className="hidden"
              />
              <input
                ref={bulkStudentCameraInputRef}
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={handleBulkStudentAttachmentUpload}
                className="hidden"
              />
              {bulkStudentAttachmentPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {bulkStudentAttachmentPreviews.map((item, index) => (
                    <div key={index} className="relative group">
                      {item.preview ? (
                        <img
                          src={item.preview}
                          alt={`첨부 ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-full h-20 flex items-center justify-center bg-muted rounded border">
                          <FileUp className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveBulkStudentAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <p className="text-xs truncate mt-1">{item.file.name}</p>
                    </div>
                  ))}
                </div>
              )}
              {bulkStudentAttachmentFiles.filter(f => !f.type.startsWith('image/')).length > 0 && (
                <div className="mt-2 space-y-1">
                  {bulkStudentAttachmentFiles.map((file, index) => {
                    if (file.type.startsWith('image/')) return null;
                    return (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <FileUp className="w-4 h-4" />
                        <span className="flex-1 truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveBulkStudentAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
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

      {/* 발송 결과 다이얼로그 */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>일괄 메시지 발송 결과</DialogTitle>
            <DialogDescription>
              총 {emailSendResults.length}건 중 
              성공 {emailSendResults.filter(r => r.success).length}건, 
              실패 {emailSendResults.filter(r => !r.success).length}건
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>학생</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>메시지</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailSendResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.student}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{result.email}</TableCell>
                    <TableCell>
                      {result.success ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ 성공
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ✗ 실패
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {result.success ? '발송 완료' : result.error || '알 수 없는 오류'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsResultDialogOpen(false)}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 신규 학생 추가 Dialog */}
      <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>신규 학생 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student-id">학번 *</Label>
                <Input
                  id="student-id"
                  value={newStudentData.student_id}
                  onChange={(e) => handleStudentIdChange(e.target.value)}
                  placeholder="예: 11512 (학년+반+번호)"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-name">이름 *</Label>
                <Input
                  id="student-name"
                  value={newStudentData.name}
                  onChange={(e) => setNewStudentData({...newStudentData, name: e.target.value})}
                  placeholder="학생 이름"
                  maxLength={50}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student-grade">학년 *</Label>
                <Select
                  value={newStudentData.grade}
                  onValueChange={(value) => setNewStudentData({...newStudentData, grade: value})}
                >
                  <SelectTrigger id="student-grade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1학년</SelectItem>
                    <SelectItem value="2">2학년</SelectItem>
                    <SelectItem value="3">3학년</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-class">반 *</Label>
                <Select
                  value={newStudentData.class}
                  onValueChange={(value) => setNewStudentData({...newStudentData, class: value})}
                >
                  <SelectTrigger id="student-class">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <SelectItem key={num} value={num.toString()}>{num}반</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-number">번호 *</Label>
                <Input
                  id="student-number"
                  type="number"
                  value={newStudentData.number}
                  onChange={(e) => setNewStudentData({...newStudentData, number: e.target.value})}
                  placeholder="번호"
                  min="1"
                  max="99"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-dept">학과</Label>
              <Select
                value={newStudentData.dept_code}
                onValueChange={(value) => setNewStudentData({...newStudentData, dept_code: value})}
              >
                <SelectTrigger id="student-dept">
                  <SelectValue placeholder="학과 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안 함</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.code} value={dept.code}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-phone">학생 전화번호</Label>
              <Input
                id="student-phone"
                value={newStudentData.student_call}
                onChange={(e) => setNewStudentData({...newStudentData, student_call: formatPhoneNumber(e.target.value)})}
                placeholder="010-0000-0000"
                maxLength={13}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-email">이메일</Label>
              <Input
                id="student-email"
                type="email"
                value={newStudentData.gmail}
                onChange={(e) => setNewStudentData({...newStudentData, gmail: e.target.value})}
                placeholder="student@example.com"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-parent1">학부모 전화번호 1</Label>
              <Input
                id="student-parent1"
                value={newStudentData.parents_call1}
                onChange={(e) => setNewStudentData({...newStudentData, parents_call1: formatPhoneNumber(e.target.value)})}
                placeholder="010-0000-0000"
                maxLength={13}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-parent2">학부모 전화번호 2</Label>
              <Input
                id="student-parent2"
                value={newStudentData.parents_call2}
                onChange={(e) => setNewStudentData({...newStudentData, parents_call2: formatPhoneNumber(e.target.value)})}
                placeholder="010-0000-0000"
                maxLength={13}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              * 표시는 필수 입력 항목입니다. 초기 비밀번호는 '12345678'로 설정됩니다.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddStudentDialogOpen(false)}
              disabled={isAddingStudent}
            >
              취소
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={isAddingStudent || !newStudentData.student_id.trim() || !newStudentData.name.trim() || !newStudentData.number}
            >
              {isAddingStudent ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 학생 증명사진 업로드 다이얼로그 */}
      <Dialog open={isPhotoUploadDialogOpen} onOpenChange={setIsPhotoUploadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>학생 증명사진 업로드</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {data.map((student: any, index: number) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="w-24 h-32 border rounded overflow-hidden bg-muted flex-shrink-0">
                    {student['증명사진'] ? (
                      <img 
                        src={student['증명사진']} 
                        alt={student['이름']}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        사진 없음
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {student['학년']}학년 {student['반']}반 {student['번호']}번 {student['이름']}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      학번: {student['학번']}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      id={`photo-${student['학번']}`}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        console.log('파일 선택:', { 
                          학번: student['학번'], 
                          이름: student['이름'],
                          file: file?.name,
                          fileSize: file?.size,
                          fileType: file?.type
                        });

                        if (!file) {
                          console.warn('파일이 선택되지 않음');
                          try { (e.currentTarget as HTMLInputElement).value = ''; } catch {}
                          return;
                        }

                        if (!file.type.startsWith('image/')) {
                          toast.error('이미지 파일만 업로드 가능합니다');
                          try { (e.currentTarget as HTMLInputElement).value = ''; } catch {}
                          return;
                        }

                        // 파일 크기 체크 (5MB)
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('파일 크기는 5MB 이하여야 합니다');
                          try { (e.currentTarget as HTMLInputElement).value = ''; } catch {}
                          return;
                        }

                        setUploadingPhotos(prev => ({ ...prev, [student['학번']]: true }));
                        console.log('업로드 시작:', student['학번']);

                        try {
                          const authUser = localStorage.getItem('auth_user');
                          if (!authUser) throw new Error('관리자 인증이 필요합니다');
                          
                          const user = JSON.parse(authUser);
                          if (!user.id) throw new Error('관리자 ID를 찾을 수 없습니다');

                          console.log('관리자 인증 완료:', user.id);

                          // 관리자 세션 설정
                          await supabase.rpc('set_admin_session', { 
                            admin_id_input: user.id 
                          });

                          console.log('세션 설정 완료');

                          // 파일명: 학번.확장자
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${student['학번']}.${fileExt}`;
                          const filePath = `${fileName}`;

                          // 엣지 함수로 업로드 처리 (RLS 우회, 보안 검증 포함)
                          const oldPath = student['증명사진'] ? student['증명사진'].split('/').pop() : null;

                          console.log('Base64 변환 시작');
                          const toBase64 = (file: File) =>
                            new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(reader.result as string);
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            });

                          const imageBase64 = await toBase64(file);
                          console.log('Base64 변환 완료, 길이:', imageBase64.length);

                          console.log('Edge Function 호출 시작');
                          const { data: fnData, error: fnError } = await supabase.functions.invoke('upload-student-photo', {
                            body: {
                              admin_id: user.id,
                              student_id: student['학번'],
                              filename: file.name,
                              content_type: file.type,
                              image_base64: imageBase64,
                              old_path: oldPath,
                            },
                          });

                          console.log('Edge Function 응답:', { fnData, fnError });

                          if (fnError) {
                            console.error('Edge Function 에러:', fnError);
                            throw fnError;
                          }
                          if (!fnData?.ok) {
                            console.error('업로드 실패:', fnData?.error);
                            throw new Error(fnData?.error || '업로드 실패');
                          }

                          console.log('업로드 성공, URL:', fnData.publicUrl);

                          // 즉시 UI 업데이트 (로컬 상태)
                          setData(prevData => 
                            prevData.map(item => 
                              item['학번'] === student['학번'] 
                                ? { ...item, '증명사진': `${fnData.publicUrl}?t=${Date.now()}` }
                                : item
                            )
                          );

                          toast.success('사진이 업로드되었습니다');
                          
                          // 백그라운드에서 데이터 새로고침
                          setTimeout(() => handleQuery(), 500);
                        } catch (error: any) {
                          console.error('업로드 에러 (학번: ' + student['학번'] + '):', error);
                          toast.error(error.message || '업로드에 실패했습니다');
                        } finally {
                          setUploadingPhotos(prev => ({ ...prev, [student['학번']]: false }));
                          // 같은 파일 재선택 시 onChange가 다시 트리거되도록 value 초기화
                          try { (e.currentTarget as HTMLInputElement).value = ''; } catch {}
                          console.log('업로드 완료 (finally):', student['학번']);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => document.getElementById(`photo-${student['학번']}`)?.click()}
                      disabled={uploadingPhotos[student['학번']]}
                    >
                      {uploadingPhotos[student['학번']] ? '업로드 중...' : '사진 선택'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPhotoUploadDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 교사 증명사진 업로드 다이얼로그 */}
      <Dialog open={isTeacherPhotoUploadDialogOpen} onOpenChange={setIsTeacherPhotoUploadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>교사 증명사진 업로드</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {data.map((teacher: any) => (
                <div key={teacher['전화번호']} className="border p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {teacher['증명사진'] ? (
                        <img 
                          src={`${teacher['증명사진']}?t=${Date.now()}`} 
                          alt={teacher['이름']} 
                          className="w-24 h-32 object-cover rounded"
                        />
                      ) : (
                        <div className="w-24 h-32 bg-muted rounded flex items-center justify-center text-muted-foreground text-sm">
                          사진 없음
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{teacher['이름']}</div>
                      <div className="text-sm text-muted-foreground">전화번호: {teacher['전화번호']}</div>
                      <div className="text-sm text-muted-foreground">이메일: {teacher['이메일']}</div>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      id={`teacher-photo-${teacher['전화번호']}`}
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        console.log('파일 선택:', { 
                          전화번호: teacher['전화번호'], 
                          이름: teacher['이름'],
                          file: file?.name,
                          fileSize: file?.size,
                          fileType: file?.type
                        });

                        if (!file) {
                          console.warn('파일이 선택되지 않음');
                          try { (e.currentTarget as HTMLInputElement).value = ''; } catch {}
                          return;
                        }

                        if (!file.type.startsWith('image/')) {
                          toast.error('이미지 파일만 업로드 가능합니다');
                          try { (e.currentTarget as HTMLInputElement).value = ''; } catch {}
                          return;
                        }

                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('파일 크기는 5MB 이하여야 합니다');
                          try { (e.currentTarget as HTMLInputElement).value = ''; } catch {}
                          return;
                        }

                        setUploadingPhotos(prev => ({ ...prev, [teacher['전화번호']]: true }));
                        console.log('업로드 시작:', teacher['전화번호']);

                        try {
                          const authUser = localStorage.getItem('auth_user');
                          if (!authUser) throw new Error('관리자 인증이 필요합니다');
                          
                          const user = JSON.parse(authUser);
                          if (!user.id) throw new Error('관리자 ID를 찾을 수 없습니다');

                          console.log('관리자 인증 완료:', user.id);

                          await supabase.rpc('set_admin_session', { 
                            admin_id_input: user.id 
                          });

                          console.log('세션 설정 완료');

                          const oldPath = teacher['증명사진'] ? teacher['증명사진'].split('/').pop() : null;

                          console.log('Base64 변환 시작');
                          const toBase64 = (file: File) =>
                            new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(reader.result as string);
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            });

                          const imageBase64 = await toBase64(file);
                          console.log('Base64 변환 완료, 길이:', imageBase64.length);

                          console.log('Edge Function 호출 시작');
                          const { data: fnData, error: fnError } = await supabase.functions.invoke('upload-photo', {
                            body: {
                              admin_id: user.id,
                              target_type: 'teacher',
                              target_id: teacher['전화번호'],
                              filename: file.name,
                              content_type: file.type,
                              image_base64: imageBase64,
                              old_path: oldPath,
                            },
                          });

                          console.log('Edge Function 응답:', { fnData, fnError });

                          if (fnError) {
                            console.error('Edge Function 에러:', fnError);
                            throw fnError;
                          }
                          if (!fnData?.ok) {
                            console.error('업로드 실패:', fnData?.error);
                            throw new Error(fnData?.error || '업로드 실패');
                          }

                          console.log('업로드 성공, URL:', fnData.publicUrl);

                          setData(prevData => 
                            prevData.map(item => 
                              item['전화번호'] === teacher['전화번호'] 
                                ? { ...item, '증명사진': `${fnData.publicUrl}?t=${Date.now()}` }
                                : item
                            )
                          );

                          toast.success('사진이 업로드되었습니다');
                          
                          setTimeout(() => handleQuery(), 500);
                        } catch (error: any) {
                          console.error('업로드 에러 (전화번호: ' + teacher['전화번호'] + '):', error);
                          toast.error(error.message || '업로드에 실패했습니다');
                        } finally {
                          setUploadingPhotos(prev => ({ ...prev, [teacher['전화번호']]: false }));
                          try { (e.currentTarget as HTMLInputElement).value = ''; } catch {}
                          console.log('업로드 완료 (finally):', teacher['전화번호']);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => document.getElementById(`teacher-photo-${teacher['전화번호']}`)?.click()}
                      disabled={uploadingPhotos[teacher['전화번호']]}
                    >
                      {uploadingPhotos[teacher['전화번호']] ? '업로드 중...' : '사진 선택'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTeacherPhotoUploadDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 사진 출력 다이얼로그 */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto p-0">
          <div className="print-container">
            <div className="no-print p-4 border-b flex justify-between items-center">
              <DialogTitle>학생 증명사진 출력</DialogTitle>
              <div className="flex gap-2">
                <Button onClick={() => window.print()}>
                  인쇄
                </Button>
                <Button variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
                  닫기
                </Button>
              </div>
            </div>
            <div className="p-8 print-page">
              <style>{`
                @media print {
                  .no-print {
                    display: none !important;
                  }
                  .print-page {
                    padding: 0 !important;
                    margin: 0 !important;
                  }
                  .print-container {
                    width: 210mm !important;
                    min-height: 297mm !important;
                  }
                  body {
                    print-color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                  }
                  @page {
                    size: A4;
                    margin: 10mm;
                  }
                }
                .photo-grid {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 20px;
                  width: 100%;
                }
                .photo-item {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
                .photo-box {
                  width: 120px;
                  height: 160px;
                  border: 1px solid #ddd;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
                  background: #f5f5f5;
                  margin-bottom: 8px;
                }
                .photo-box img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                }
                .photo-label {
                  text-align: center;
                  font-size: 12px;
                  font-weight: 500;
                  line-height: 1.3;
                }
              `}</style>
              <div className="photo-grid">
                {data.map((student: any, index: number) => (
                  <div key={index} className="photo-item">
                    <div className="photo-box">
                      {student['증명사진'] ? (
                        <img 
                          src={student['증명사진']} 
                          alt={student['이름']}
                          onError={(e) => {
                            e.currentTarget.src = '';
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="text-muted-foreground text-xs">사진 없음</div>
                      )}
                    </div>
                    <div className="photo-label">
                      <div>{student['이름']}({student['번호']})</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 교사 사진 출력 다이얼로그 */}
      <Dialog open={isTeacherPrintDialogOpen} onOpenChange={setIsTeacherPrintDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto p-0">
          <div className="print-container">
            <div className="no-print p-4 border-b flex justify-between items-center">
              <DialogTitle>교사 증명사진 출력</DialogTitle>
              <div className="flex gap-2">
                <Button onClick={() => window.print()}>
                  인쇄
                </Button>
                <Button variant="outline" onClick={() => setIsTeacherPrintDialogOpen(false)}>
                  닫기
                </Button>
              </div>
            </div>
            <div className="p-8 print-page">
              <style>{`
                @media print {
                  .no-print {
                    display: none !important;
                  }
                  .print-page {
                    padding: 0 !important;
                    margin: 0 !important;
                  }
                  .print-container {
                    width: 210mm !important;
                    min-height: 297mm !important;
                  }
                  body {
                    print-color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                  }
                  @page {
                    size: A4;
                    margin: 10mm;
                  }
                }
                .photo-grid {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 20px;
                  width: 100%;
                }
                .photo-item {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
                .photo-box {
                  width: 120px;
                  height: 160px;
                  border: 1px solid #ddd;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
                  background: #f5f5f5;
                  margin-bottom: 8px;
                }
                .photo-box img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                }
                .photo-label {
                  text-align: center;
                  font-size: 11px;
                  font-weight: 500;
                  line-height: 1.3;
                }
              `}</style>
              <div className="photo-grid">
                {data.map((teacher: any, index: number) => (
                  <div key={index} className="photo-item">
                    <div className="photo-box">
                      {teacher['증명사진'] ? (
                        <img 
                          src={teacher['증명사진']} 
                          alt={teacher['이름']}
                          onError={(e) => {
                            e.currentTarget.src = '';
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="text-muted-foreground text-xs">사진 없음</div>
                      )}
                    </div>
                    <div className="photo-label">
                      <div>{teacher['이름']}</div>
                      {teacher['부서'] && <div className="text-xs text-muted-foreground">{teacher['부서']}</div>}
                      <div className="text-xs text-muted-foreground">{teacher['담당교과'] || teacher['부서'] || ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 그룹 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteGroupDialogOpen} onOpenChange={setIsDeleteGroupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>그룹 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingGroup?.name}" 그룹을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingGroup(null)}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 증빙사진 보기 다이얼로그 */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>증빙사진</DialogTitle>
            <DialogDescription>
              등록된 증빙사진을 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {selectedImages.map((imageUrl, index) => (
              <div key={index} className="border rounded-lg p-2 flex flex-col">
                <div className="relative w-full aspect-square">
                  <img 
                    src={imageUrl} 
                    alt={`증빙사진 ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-contain rounded"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                </div>
                <div className="text-center mt-2 text-sm text-muted-foreground">
                  사진 {index + 1}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataInquiry;
