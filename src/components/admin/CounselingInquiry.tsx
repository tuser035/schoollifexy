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
import { FileText, Pencil, Trash2 } from "lucide-react";

interface CounselingRecord {
  id: string;
  counselor_name: string;
  counseling_date: string;
  content: string;
  created_at: string;
}

const CounselingInquiry = () => {
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

  const handleQuery = async () => {
    if (!studentId.trim()) {
      toast.error("학번을 입력해주세요");
      return;
    }

    setIsLoading(true);

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

      // 학생 정보 확인
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("name, student_id")
        .eq("student_id", studentId.trim())
        .single();

      if (studentError || !studentData) {
        toast.error("해당 학번의 학생을 찾을 수 없습니다");
        setRecords([]);
        setStudentName("");
        return;
      }

      setStudentName(studentData.name);

      // 상담 기록 조회
      const { data, error } = await supabase.rpc("admin_get_counseling_records", {
        admin_id_input: parsedUser.id,
        student_id_input: studentId.trim()
      });

      if (error) throw error;

      setRecords(data || []);

      if (!data || data.length === 0) {
        toast.info("상담 기록이 없습니다");
      }
    } catch (error: any) {
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

      // Set admin session for RLS
      await supabase.rpc("set_admin_session", {
        admin_id_input: parsedUser.id
      });

      const { error } = await supabase
        .from("career_counseling")
        .update({
          counselor_name: editCounselorName.trim(),
          counseling_date: editCounselingDate,
          content: editCounselingContent.trim()
        })
        .eq("id", selectedRecord.id);

      if (error) throw error;

      toast.success("상담 기록이 수정되었습니다");
      setIsEditDialogOpen(false);
      
      // 목록 새로고침
      await handleQuery();
    } catch (error: any) {
      toast.error(error.message || "수정에 실패했습니다");
    } finally {
      setIsSaving(false);
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

      // Set admin session for RLS
      await supabase.rpc("set_admin_session", {
        admin_id_input: parsedUser.id
      });

      const { error } = await supabase
        .from("career_counseling")
        .delete()
        .eq("id", recordToDelete.id);

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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>진로상담 기록 조회</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="학번을 입력하세요"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleQuery()}
              className="max-w-xs"
              maxLength={20}
            />
            <Button onClick={handleQuery} disabled={isLoading}>
              {isLoading ? "조회 중..." : "조회"}
            </Button>
            {studentId && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setStudentId("");
                  setStudentName("");
                  setRecords([]);
                }}
              >
                초기화
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
                    <TableHead>상담일</TableHead>
                    <TableHead>상담사</TableHead>
                    <TableHead>상담내용 미리보기</TableHead>
                    <TableHead>기록일시</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>진로상담 기록 수정</DialogTitle>
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
            >
              {isSaving ? "저장 중..." : "저장"}
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
            <AlertDialogAction
              onClick={handleDeleteRecord}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CounselingInquiry;
