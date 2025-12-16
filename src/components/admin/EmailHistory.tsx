import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useRealtimeSync, EMAIL_HISTORY_TABLE } from "@/hooks/use-realtime-sync";
import { Download } from "lucide-react";

interface EmailHistoryRecord {
  id: string;
  sender_name: string;
  sender_type: string;
  recipient_email: string;
  recipient_name: string;
  recipient_student_id?: string | null;
  subject: string;
  body: string;
  sent_at: string;
  opened?: boolean;
  opened_at?: string;
}

export const EmailHistory = () => {
  const [history, setHistory] = useState<EmailHistoryRecord[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [recipientType, setRecipientType] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailHistoryRecord | null>(null);
  const { toast } = useToast();

  const loadHistory = async () => {
    setLoading(true);
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

      const { data, error } = await supabase.rpc("admin_get_email_history", {
        admin_id_input: user.id,
        search_text: searchText || null,
        search_grade: selectedGrade && selectedGrade !== "all" ? parseInt(selectedGrade) : null,
        search_class: selectedClass && selectedClass !== "all" ? parseInt(selectedClass) : null,
      });

      if (error) throw error;
      
      // 수신자 유형 필터링
      let filteredData = data || [];
      if (recipientType === "student") {
        filteredData = filteredData.filter((record: EmailHistoryRecord) => record.recipient_student_id !== null);
      } else if (recipientType === "teacher") {
        filteredData = filteredData.filter((record: EmailHistoryRecord) => record.recipient_student_id === null);
      }
      
      setHistory(filteredData);
    } catch (error: any) {
      toast({
        title: "이메일 이력 조회 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // 실시간 동기화 커스텀 훅 사용
  const handleRefresh = useCallback(() => {
    if (history.length > 0) {
      loadHistory();
    }
  }, [history.length, searchText, selectedGrade, selectedClass, recipientType]);

  useRealtimeSync({
    tables: EMAIL_HISTORY_TABLE.map(t => ({
      ...t,
      channelName: `email_history_${t.table}`,
    })),
    onRefresh: handleRefresh,
    enabled: history.length > 0,
    dependencies: [history.length, searchText, selectedGrade, selectedClass, recipientType],
    useShadcnToast: true,
  });

  const handleSearch = () => {
    loadHistory();
  };

  const handleReset = () => {
    setSearchText("");
    setSelectedGrade("all");
    setSelectedClass("all");
    setRecipientType("all");
    setTimeout(() => loadHistory(), 100);
  };

  const handleExportCSV = () => {
    if (history.length === 0) {
      toast({
        title: "내보내기 실패",
        description: "내보낼 데이터가 없습니다",
        variant: "destructive",
      });
      return;
    }

    // CSV 헤더
    const headers = ["발송일시", "발신자", "발신자유형", "수신자유형", "수신자", "수신이메일", "제목", "읽음상태", "읽은시간"];
    
    // CSV 데이터 생성
    const csvData = history.map((record) => [
      format(new Date(record.sent_at), "yyyy-MM-dd HH:mm:ss"),
      record.sender_name,
      record.sender_type === "admin" ? "관리자" : "교사",
      record.recipient_student_id ? "학생" : "교사",
      record.recipient_name,
      record.recipient_email,
      `"${record.subject.replace(/"/g, '""')}"`,
      record.opened ? "읽음" : "미열람",
      record.opened_at ? format(new Date(record.opened_at), "yyyy-MM-dd HH:mm:ss") : "-",
    ]);

    // BOM 추가 (한글 인코딩)
    const BOM = "\uFEFF";
    const csvContent = BOM + [headers.join(","), ...csvData.map((row) => row.join(","))].join("\n");

    // 다운로드
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `이메일발송이력_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "내보내기 완료",
      description: `${history.length}건의 이메일 이력을 CSV로 저장했습니다`,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>이메일 발송 이력</CardTitle>
          <CardDescription>이메일 발송 이력을 조회할 수 있습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <Label>검색</Label>
              <Input
                placeholder="이름, 이메일, 제목 검색"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div>
              <Label>수신자 유형</Label>
              <Select value={recipientType} onValueChange={setRecipientType}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="student">학생</SelectItem>
                  <SelectItem value="teacher">교사</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>학년</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="1">1학년</SelectItem>
                  <SelectItem value="2">2학년</SelectItem>
                  <SelectItem value="3">3학년</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>반</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}반
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} disabled={loading}>
                조회
              </Button>
              <Button onClick={handleReset} variant="outline" disabled={loading}>
                초기화
              </Button>
              <Button onClick={handleExportCSV} variant="outline" disabled={loading || history.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>발송일시</TableHead>
                  <TableHead>발신자</TableHead>
                  <TableHead>수신자유형</TableHead>
                  <TableHead>수신자</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>읽음 상태</TableHead>
                  <TableHead>상세</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      이메일 발송 이력이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(new Date(record.sent_at), "yyyy-MM-dd HH:mm", { locale: ko })}
                      </TableCell>
                      <TableCell>
                        {record.sender_name} ({record.sender_type === "admin" ? "관리자" : "교사"})
                      </TableCell>
                      <TableCell>
                        <span className={record.recipient_student_id ? "text-blue-600" : "text-orange-600"}>
                          {record.recipient_student_id ? "학생" : "교사"}
                        </span>
                      </TableCell>
                      <TableCell>{record.recipient_name}</TableCell>
                      <TableCell>{record.recipient_email}</TableCell>
                      <TableCell className="max-w-xs truncate">{record.subject}</TableCell>
                      <TableCell>
                        {record.opened ? (
                          <div className="flex flex-col text-sm">
                            <span className="text-green-600 font-medium">✓ 읽음</span>
                            {record.opened_at && (
                              <span className="text-muted-foreground text-xs">
                                {format(new Date(record.opened_at), "MM/dd HH:mm", { locale: ko })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">미열람</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedEmail(record)}
                        >
                          보기
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pr-12">
            <DialogTitle>이메일 상세 내용</DialogTitle>
            <DialogDescription>
              {selectedEmail && format(new Date(selectedEmail.sent_at), "yyyy-MM-dd HH:mm", { locale: ko })}
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4 overflow-y-auto pr-2">
              <div>
                <Label>발신자</Label>
                <p className="text-sm">
                  {selectedEmail.sender_name} ({selectedEmail.sender_type === "admin" ? "관리자" : "교사"})
                </p>
              </div>
              <div>
                <Label>수신자</Label>
                <p className="text-sm">
                  {selectedEmail.recipient_name} ({selectedEmail.recipient_email})
                </p>
              </div>
              <div>
                <Label>제목</Label>
                <p className="text-sm">{selectedEmail.subject}</p>
              </div>
              <div>
                <Label>내용</Label>
                <div className="text-sm whitespace-pre-wrap border rounded-lg p-4 bg-muted">
                  {selectedEmail.body}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};