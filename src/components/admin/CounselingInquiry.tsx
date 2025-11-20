import { useState } from "react";
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
        <CardHeader>
          <CardTitle>상담 기록 조회</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative max-w-xs">
              <Input
                placeholder="학번, 이름, 학년반, 학년반번호 (예: 38, 386)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleQuery()}
                className="pr-8"
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
            <Button onClick={handleQuery} disabled={isLoading}>
              {isLoading ? "조회 중..." : "조회"}
            </Button>
            {records.length > 0 && (
              <Button onClick={handleExportCSV} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                CSV 내보내기
              </Button>
            )}
          </div>

          {studentName && (
            <div className="text-sm text-muted-foreground">
              학생: <span className="font-medium text-foreground">{studentName}</span> ({studentId})
            </div>
          )}

          {records.length > 0 && (
            <div className="border rounded-lg overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {(studentName.includes("전체") || studentName.includes("학년")) && <TableHead>학생</TableHead>}
                    <TableHead>상담일</TableHead>
                    <TableHead>상담사</TableHead>
                    <TableHead>상담내용 미리보기</TableHead>
                    <TableHead>기록일시</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: any) => (
                    <TableRow key={record.id}>
                      {(studentName.includes("전체") || studentName.includes("학년")) && (
                        <TableCell className="whitespace-nowrap">
                          {record.studentName} ({record.studentId})
                        </TableCell>
                      )}
                      <TableCell className="whitespace-nowrap">
                        {new Date(record.counseling_date).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.counselor_name}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {record.content.substring(0, 50)}
                        {record.content.length > 50 ? "..." : ""}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(record.created_at).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowDetail(record)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            보기
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditDialog(record)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            수정
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDeleteDialog(record)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            삭제
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>진로상담 상세 내역</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">학생</div>
                  <div className="text-base">{studentName} ({studentId})</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">상담사</div>
                  <div className="text-base">{selectedRecord.counselor_name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">상담일</div>
                  <div className="text-base">
                    {new Date(selectedRecord.counseling_date).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">기록일시</div>
                  <div className="text-base">
                    {new Date(selectedRecord.created_at).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">상담 내용</div>
                <div className="border rounded-lg p-4 bg-muted/30 whitespace-pre-wrap">
                  {selectedRecord.content}
                </div>
              </div>
              {selectedRecord.attachment_url && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">첨부 파일</div>
                  <a 
                    href={selectedRecord.attachment_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:underline"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    첨부 파일 다운로드
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>상담 기록 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-counselor-name">상담사 이름 *</Label>
              <Input
                id="edit-counselor-name"
                value={editCounselorName}
                onChange={(e) => setEditCounselorName(e.target.value)}
                placeholder="상담사 이름을 입력하세요"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-counseling-date">상담 날짜 *</Label>
              <Input
                id="edit-counseling-date"
                type="date"
                value={editCounselingDate}
                onChange={(e) => setEditCounselingDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-counseling-content">상담 내용 *</Label>
              <Textarea
                id="edit-counseling-content"
                value={editCounselingContent}
                onChange={(e) => setEditCounselingContent(e.target.value)}
                placeholder="진로상담 내용을 상세히 입력하세요"
                rows={8}
                maxLength={2000}
              />
              <p className="text-sm text-muted-foreground">
                {editCounselingContent.length} / 2000자
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-attachment">첨부 파일 (선택사항)</Label>
              {selectedRecord?.attachment_url && !editAttachmentFile && (
                <div className="text-sm text-muted-foreground mb-2">
                  <a 
                    href={selectedRecord.attachment_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:underline"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    현재 첨부 파일
                  </a>
                </div>
              )}
              <Input
                id="edit-attachment"
                type="file"
                onChange={(e) => setEditAttachmentFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.hwp,.jpg,.jpeg,.png"
              />
              {editAttachmentFile && (
                <p className="text-sm text-muted-foreground">
                  선택된 파일: {editAttachmentFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving || isUploading}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving || isUploading}
            >
              {isUploading ? "파일 업로드 중..." : isSaving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상담 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 상담 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              {recordToDelete && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <div className="text-sm">
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
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={handleDeleteRecord}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
