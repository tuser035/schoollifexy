import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download, ClipboardEdit, FileUp, Camera, X } from "lucide-react";

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
          "이메일": row.gmail
        }));

      } else if (selectedTable === "teachers") {
        let searchGrade: number | null = null;
        let searchClass: number | null = null;
        let searchText: string | null = null;

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

        const { data, error: queryError } = await supabase.rpc("admin_get_teachers", {
          admin_id_input: adminId,
          search_text: searchText,
          search_grade: searchGrade,
          search_class: searchClass
        });

        if (queryError) throw queryError;

        result = data?.map(row => ({
          "이름": row.name,
          "전화번호": row.call_t,
          "이메일": row.teacher_email,
          "학년": row.grade || "-",
          "반": row.class || "-",
          "담임여부": row.is_homeroom ? "담임" : "-",
          "학과": row.dept_name
        }));

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
      } else {
        setColumns([]);
        setData([]);
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
            <Select value={selectedTable} onValueChange={(value) => { setSelectedTable(value as TableType); setSearchTerm(""); }}>
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
                selectedTable === "students" ? "학생명, 학년, 반으로 검색" :
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
              <Button variant="outline" onClick={() => { setSearchTerm(""); handleQuery(); }}>
                초기화
              </Button>
            )}
          {data.length > 0 && (
            <>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV 내보내기
              </Button>
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
                        {col}
                      </TableHead>
                    ))}
                    {selectedTable === "monthly" && (
                      <TableHead className="whitespace-nowrap">상담기록</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, idx) => {
                    const rawData = 
                      selectedTable === "merits" ? meritsRawData[idx] :
                      selectedTable === "demerits" ? demeritsRawData[idx] :
                      selectedTable === "monthly" ? monthlyRawData[idx] :
                      null;
                    
                    return (
                      <TableRow key={idx}>
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
                        {columns.filter(col => col !== 'student_id' && col !== 'student_name').map((col) => (
                          <TableCell key={col} className="whitespace-nowrap">
                            {row[col]?.toString() || "-"}
                          </TableCell>
                        ))}
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
    </div>
  );
};

export default DataInquiry;
