import { useState, useEffect } from "react";
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

interface EmailHistoryRecord {
  id: string;
  sender_name: string;
  sender_type: string;
  recipient_email: string;
  recipient_name: string;
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
      setHistory(data || []);
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

  // 페이지 포커스 시 데이터 새로고침
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && history.length > 0) {
        loadHistory();
      }
    };

    const handleFocus = () => {
      if (history.length > 0) {
        loadHistory();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [history.length, searchText, selectedGrade, selectedClass]);

  // 실시간 동기화 - email_history 테이블
  useEffect(() => {
    const emailChannel = supabase
      .channel('admin_email_history_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_history' },
        (payload) => {
          console.log('EmailHistory - Email changed:', payload);
          if (history.length > 0) {
            loadHistory();
          }
          if (payload.eventType === 'INSERT') {
            toast({
              title: "🔄 이메일이 발송되었습니다",
              description: "목록이 자동으로 갱신됩니다",
            });
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "🔄 이메일 정보가 수정되었습니다",
              description: "목록이 자동으로 갱신됩니다",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(emailChannel);
    };
  }, [history.length, searchText, selectedGrade, selectedClass]);

  const handleSearch = () => {
    loadHistory();
  };

  const handleReset = () => {
    setSearchText("");
    setSelectedGrade("all");
    setSelectedClass("all");
    setTimeout(() => loadHistory(), 100);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>이메일 발송 이력</CardTitle>
          <CardDescription>이메일 발송 이력을 조회할 수 있습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>발송일시</TableHead>
                  <TableHead>발신자</TableHead>
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
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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