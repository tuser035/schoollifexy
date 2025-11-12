import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";

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
                    <TableHead>상세</TableHead>
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShowDetail(record)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          보기
                        </Button>
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
    </>
  );
};

export default CounselingInquiry;
