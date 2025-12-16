import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Pencil, Trash2, Download, X } from "lucide-react";
import { useRealtimeSync, COUNSELING_TABLE } from "@/hooks/use-realtime-sync";

interface CounselingRecord {
  id: string;
  counselor_name: string;
  counseling_date: string;
  content: string;
  created_at: string;
  attachment_url: string | null;
}

const CounselingInquiry = () => {
  const [searchInput, setSearchInput] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [records, setRecords] = useState<CounselingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CounselingRecord | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editCounselorName, setEditCounselorName] = useState("");
  const [editCounselingDate, setEditCounselingDate] = useState("");
  const [editCounselingContent, setEditCounselingContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<CounselingRecord | null>(null);
  const [editAttachmentFile, setEditAttachmentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 실시간 동기화 커스텀 훅 사용
  const handleRefresh = useCallback(() => {
    if (records.length > 0) {
      handleQuery();
    }
  }, [records.length, searchInput]);

  useRealtimeSync({
    tables: COUNSELING_TABLE.map(t => ({
      ...t,
      channelName: `counseling_inquiry_${t.table}`,
    })),
    onRefresh: handleRefresh,
    enabled: records.length > 0,
    dependencies: [records.length, searchInput],
  });

  const handleQuery = async () => {
    setIsLoading(true);

    try {
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

      const input = searchInput.trim();
      
      // If input is empty, fetch all counseling records using RPC function
      if (!input) {
        const { data: allRecords, error: allRecordsError } = await supabase
          .rpc('admin_get_all_counseling_records', {
            admin_id_input: parsedUser.id
          });

        if (allRecordsError) {
          console.error('All records query error:', allRecordsError);
          toast.error("전체 상담기록 조회 중 오류가 발생했습니다");
          setIsLoading(false);
          return;
        }

        // Transform the data to match the component's expected structure
        const transformedRecords = (allRecords || []).map((record: any) => ({
          ...record,
          studentName: record.student_name || '-',
          studentId: record.student_id || '-'
        }));

        // Count unique students who have counseling records
        const uniqueStudents = new Set(
          transformedRecords.map(r => r.student_id).filter(id => id && id !== '-')
        );
        const totalCounseledStudents = uniqueStudents.size;

        setRecords(transformedRecords);
        setStudentName(`전체 상담 학생 (${totalCounseledStudents}명)`);
        setStudentId("");
        toast.success(`총 ${transformedRecords.length}건의 상담기록을 조회했습니다`);
        setIsLoading(false);
        return;
      }
      let searchText = null;
      let searchGrade = null;
      let searchClass = null;
      let isClassSearch = false;

      // 학년반 형식 체크 (예: 38 = 3학년 8반)
      if (/^\d{2}$/.test(input)) {
        const grade = parseInt(input[0]);
        const classNum = parseInt(input[1]);
        searchGrade = grade;
        searchClass = classNum;
        isClassSearch = true;
      }
      // 학년반번호 형식 체크 (예: 386 = 3학년 8반 6번)
      else if (/^\d{3,4}$/.test(input)) {
        const grade = parseInt(input[0]);
        let classNum, number;
        
        if (input.length === 3) {
          // 예: 386 → 3학년 8반 6번
          classNum = parseInt(input[1]);
          number = parseInt(input[2]);
        } else if (input.length === 4) {
          // 예: 1215 → 1학년 2반 15번
          classNum = parseInt(input[1]);
          number = parseInt(input.substring(2));
        }
        
        searchGrade = grade;
        searchClass = classNum;
        // number로 필터링은 결과를 받은 후 처리
      } else {
        // 학번 또는 이름으로 검색
        searchText = input;
      }

      // Use admin_get_students function with proper RLS permissions
      const { data: studentsData, error: studentsError } = await supabase.rpc('admin_get_students', {
        admin_id_input: parsedUser.id,
        search_text: searchText,
        search_grade: searchGrade,
        search_class: searchClass
      });

      if (studentsError) {
        console.error('Student query error:', studentsError);
        toast.error("학생 조회 중 오류가 발생했습니다");
        return;
      }

      if (!studentsData || studentsData.length === 0) {
        toast.error("해당 학생을 찾을 수 없습니다");
        setRecords([]);
        setStudentName("");
        setStudentId("");
        return;
      }

      // 학년반 전체 조회인 경우
      if (isClassSearch) {
        // 모든 상담 기록 조회
        const { data: allRecords, error: allRecordsError } = await supabase
          .rpc('admin_get_all_counseling_records', {
            admin_id_input: parsedUser.id
          });

        if (allRecordsError) {
          console.error('All records query error:', allRecordsError);
          toast.error("상담기록 조회 중 오류가 발생했습니다");
          setIsLoading(false);
          return;
        }

        // 해당 학년반 학생들의 student_id 목록
        const classStudentIds = studentsData.map(s => s.student_id);

        // 해당 학년반 학생들의 상담 기록만 필터링
        const filteredRecords = (allRecords || [])
          .filter((record: any) => classStudentIds.includes(record.student_id))
          .map((record: any) => ({
            ...record,
            studentName: record.student_name || '-',
            studentId: record.student_id || '-'
          }));

        setRecords(filteredRecords);
        setStudentName(`${searchGrade}학년 ${searchClass}반 전체`);
        setStudentId("");

        if (filteredRecords.length === 0) {
          toast.info("상담 기록이 없습니다");
        } else {
          toast.success(`${filteredRecords.length}건의 상담 기록을 찾았습니다`);
        }
        setIsLoading(false);
        return;
      }

      // 학년반번호 형식인 경우 번호로 추가 필터링
      let studentData = studentsData[0];
      if (/^\d{3,4}$/.test(input)) {
        const number = input.length === 3 ? parseInt(input[2]) : parseInt(input.substring(2));
        const filtered = studentsData.find(s => s.number === number);
        if (!filtered) {
          toast.error("해당 학생을 찾을 수 없습니다");
          setRecords([]);
          setStudentName("");
          setStudentId("");
          return;
        }
        studentData = filtered;
      }

      setStudentName(studentData.name);
      setStudentId(studentData.student_id);

      // 상담 기록 조회 - RPC 함수 사용으로 RLS 세션 자동 처리
      const { data, error } = await supabase.rpc('get_counseling_records', {
        p_admin_id: parsedUser.id,
        p_student_id: studentData.student_id
      });

      if (error) {
        console.error('Counseling records query error:', error);
        throw error;
      }

      setRecords(data || []);

      if (!data || data.length === 0) {
        toast.info("상담 기록이 없습니다");
      } else {
        toast.success(`${data.length}건의 상담 기록을 찾았습니다`);
      }
    } catch (error: any) {
      console.error('Query error:', error);
      toast.error(error.message || "조회에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowDetail = (record: CounselingRecord) => {
    setSelectedRecord(record);
    setIsDetailDialogOpen(true);
  };

  const handleOpenEditDialog = (record: CounselingRecord) => {
    setSelectedRecord(record);
    setEditCounselorName(record.counselor_name);
    setEditCounselingDate(record.counseling_date);
    setEditCounselingContent(record.content);
    setEditAttachmentFile(null);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRecord) return;

    if (!editCounselorName.trim()) {
      toast.error("상담사 이름을 입력해주세요");
      return;
    }

    if (!editCounselingContent.trim()) {
      toast.error("상담 내용을 입력해주세요");
      return;
    }

    setIsSaving(true);

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }

      const parsedUser = JSON.parse(authUser);
      if (parsedUser.type !== "admin" || !parsedUser.id) {
        toast.error("관리자 권한이 필요합니다");
        return;
      }

      let attachmentUrl = selectedRecord.attachment_url;

      // Upload new file if selected
      if (editAttachmentFile) {
        setIsUploading(true);
        const fileExt = editAttachmentFile.name.split('.').pop();
        const fileName = `${studentId}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('counseling-attachments')
          .upload(filePath, editAttachmentFile, {
            upsert: false
          });

        if (uploadError) {
          throw new Error(`파일 업로드 실패: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('counseling-attachments')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
        setIsUploading(false);
      }

      // Update counseling record using RPC function
      const { data, error } = await supabase.rpc("update_counseling_record", {
        p_admin_id: parsedUser.id,
        p_record_id: selectedRecord.id,
        p_counselor_name: editCounselorName.trim(),
        p_counseling_date: editCounselingDate,
        p_content: editCounselingContent.trim(),
        p_attachment_url: attachmentUrl
      });

      if (error) throw error;

      toast.success("상담 기록이 수정되었습니다");
      setIsEditDialogOpen(false);
      setEditAttachmentFile(null);
      
      // 목록 새로고침
      await handleQuery();
    } catch (error: any) {
      toast.error(error.message || "수정에 실패했습니다");
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handleOpenDeleteDialog = (record: CounselingRecord) => {
    setRecordToDelete(record);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }

      const parsedUser = JSON.parse(authUser);
      if (parsedUser.type !== "admin" || !parsedUser.id) {
        toast.error("관리자 권한이 필요합니다");
        return;
      }

      // Delete counseling record using RPC function
      const { data, error } = await supabase.rpc("delete_counseling_record", {
        p_admin_id: parsedUser.id,
        p_record_id: recordToDelete.id
      });

      if (error) throw error;

      toast.success("상담 기록이 삭제되었습니다");
      setIsDeleteDialogOpen(false);
      setRecordToDelete(null);
      
      // 목록 새로고침
      handleQuery();
    } catch (error: any) {
      toast.error(error.message || "삭제에 실패했습니다");
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }

    const headers = ["상담일자", "상담사", "상담내용", "등록일시"];
    const csvData = records.map(record => [
      record.counseling_date,
      record.counselor_name,
      `"${record.content.replace(/"/g, '""')}"`,
      new Date(record.created_at).toLocaleString("ko-KR")
    ]);

    const csvContent = [
      `학생정보: ${studentName} (${studentId})`,
      "",
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `상담기록_${studentName}_${studentId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("CSV 파일로 내보냈습니다");
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">상담 기록 조회</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative flex-1 sm:max-w-xs">
              <Input
                placeholder="학번, 이름, 학년반 (예: 38, 386)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleQuery()}
                className="pr-8 h-9 text-sm"
              />
              {searchInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                  onClick={() => {
                    setSearchInput("");
                    setStudentId("");
                    setStudentName("");
                    setRecords([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleQuery} disabled={isLoading} className="flex-1 sm:flex-none h-9 text-sm">
                {isLoading ? "조회 중..." : "조회"}
              </Button>
              {records.length > 0 && (
                <Button onClick={handleExportCSV} variant="outline" className="flex-1 sm:flex-none h-9 text-sm">
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">CSV 내보내기</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
              )}
            </div>
          </div>

          {studentName && (
            <div className="text-xs sm:text-sm text-muted-foreground">
              학생: <span className="font-medium text-foreground">{studentName}</span> {studentId && `(${studentId})`}
            </div>
          )}

          {records.length > 0 && (
            <div className="border rounded-lg overflow-auto max-h-[400px] sm:max-h-[500px] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    {(studentName.includes("전체") || studentName.includes("학년")) && <TableHead className="text-xs sm:text-sm">학생</TableHead>}
                    <TableHead className="text-xs sm:text-sm">상담일</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">상담사</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">상담내용</TableHead>
                    <TableHead className="text-xs sm:text-sm hidden lg:table-cell">기록일시</TableHead>
                    <TableHead className="text-xs sm:text-sm">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: any) => (
                    <TableRow key={record.id}>
                      {(studentName.includes("전체") || studentName.includes("학년")) && (
                        <TableCell className="whitespace-nowrap text-xs sm:text-sm py-2 sm:py-4">
                          {record.studentName}
                          <span className="hidden sm:inline"> ({record.studentId})</span>
                        </TableCell>
                      )}
                      <TableCell className="whitespace-nowrap text-xs sm:text-sm py-2 sm:py-4">
                        {new Date(record.counseling_date).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs sm:text-sm py-2 sm:py-4 hidden sm:table-cell">
                        {record.counselor_name}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs sm:text-sm py-2 sm:py-4 hidden md:table-cell">
                        {record.content.substring(0, 50)}
                        {record.content.length > 50 ? "..." : ""}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs sm:text-sm py-2 sm:py-4 hidden lg:table-cell">
                        {new Date(record.created_at).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell className="py-2 sm:py-4">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowDetail(record)}
                            className="h-7 sm:h-8 px-2 text-xs"
                          >
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                            <span className="hidden sm:inline">보기</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditDialog(record)}
                            className="h-7 sm:h-8 px-2 text-xs"
                          >
                            <Pencil className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                            <span className="hidden sm:inline">수정</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDeleteDialog(record)}
                            className="h-7 sm:h-8 px-2 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                            <span className="hidden sm:inline">삭제</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상담 상세 다이얼로그 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base sm:text-lg">진로상담 상세 내역</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 py-3 sm:py-4 pr-1 sm:pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">학생</div>
                  <div className="text-sm sm:text-base">{studentName} {studentId && `(${studentId})`}</div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">상담사</div>
                  <div className="text-sm sm:text-base">{selectedRecord.counselor_name}</div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">상담일</div>
                  <div className="text-sm sm:text-base">
                    {new Date(selectedRecord.counseling_date).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">기록일시</div>
                  <div className="text-sm sm:text-base">
                    {new Date(selectedRecord.created_at).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">상담 내용</div>
                <div className="border rounded-lg p-3 sm:p-4 bg-muted/30 whitespace-pre-wrap text-sm">
                  {selectedRecord.content}
                </div>
              </div>
              {selectedRecord.attachment_url && (
                <div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">선물 도서</div>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-primary hover:underline text-sm"
                    onClick={async () => {
                      try {
                        const response = await fetch(selectedRecord.attachment_url!);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        const urlParts = selectedRecord.attachment_url!.split('/');
                        const fileName = decodeURIComponent(urlParts.pop() || '선물도서');
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        toast.success("파일 다운로드 완료");
                      } catch (error) {
                        console.error('Download error:', error);
                        toast.error("파일 다운로드에 실패했습니다");
                      }
                    }}
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    첨부 파일 다운로드
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base sm:text-lg">상담 기록 수정</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 py-3 sm:py-4 pr-1 sm:pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="edit-counselor-name" className="text-xs sm:text-sm">상담사 이름 *</Label>
              <Input
                id="edit-counselor-name"
                value={editCounselorName}
                onChange={(e) => setEditCounselorName(e.target.value)}
                placeholder="상담사 이름을 입력하세요"
                maxLength={50}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="edit-counseling-date" className="text-xs sm:text-sm">상담 날짜 *</Label>
              <Input
                id="edit-counseling-date"
                type="date"
                value={editCounselingDate}
                onChange={(e) => setEditCounselingDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="edit-counseling-content" className="text-xs sm:text-sm">상담 내용 *</Label>
              <Textarea
                id="edit-counseling-content"
                value={editCounselingContent}
                onChange={(e) => setEditCounselingContent(e.target.value)}
                placeholder="진로상담 내용을 상세히 입력하세요"
                rows={6}
                maxLength={2000}
                className="text-sm resize-none min-h-[120px] sm:min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                {editCounselingContent.length} / 2000자
              </p>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="edit-attachment" className="text-xs sm:text-sm">선물 도서 (선택사항)</Label>
              {selectedRecord?.attachment_url && !editAttachmentFile && (
                <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                  <a 
                    href={selectedRecord.attachment_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                    현재 첨부 파일
                  </a>
                </div>
              )}
              <Input
                id="edit-attachment"
                type="file"
                onChange={(e) => setEditAttachmentFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.hwp,.jpg,.jpeg,.png"
                className="h-9 text-sm"
              />
              {editAttachmentFile && (
                <p className="text-xs text-muted-foreground">
                  선택된 파일: {editAttachmentFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 flex-col-reverse sm:flex-row gap-2 border-t pt-3 sm:pt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving || isUploading}
              className="w-full sm:w-auto h-9 text-sm"
            >
              취소
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving || isUploading}
              className="w-full sm:w-auto h-9 text-sm"
            >
              {isUploading ? "업로드 중..." : isSaving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">상담 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              정말로 이 상담 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              {recordToDelete && (
                <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-muted rounded-md">
                  <div className="text-xs sm:text-sm">
                    <div className="font-medium text-foreground">
                      상담일: {new Date(recordToDelete.counseling_date).toLocaleDateString('ko-KR')}
                    </div>
                    <div className="text-muted-foreground">
                      상담사: {recordToDelete.counselor_name}
                    </div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto h-9 text-sm mt-0">취소</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={handleDeleteRecord}
                className="w-full sm:w-auto h-9 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                삭제
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CounselingInquiry;
