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

interface EmailTemplate {
  id: string;
  title: string;
  subject: string;
}

export const EmailHistory = () => {
  const [history, setHistory] = useState<EmailHistoryRecord[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [recipientType, setRecipientType] = useState<string>("all");
  const [teacherNameSearch, setTeacherNameSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("all");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailHistoryRecord | null>(null);
  const { toast } = useToast();

  // 템플릿 목록 로드
  const loadTemplates = async () => {
    try {
      const userString = localStorage.getItem("auth_user");
      if (!userString) return;

      const user = JSON.parse(userString);
      
      if (user.type === "admin") {
        await supabase.rpc("set_admin_session", { admin_id_input: user.id });
      } else if (user.type === "teacher") {
        await supabase.rpc("set_teacher_session", { teacher_id_input: user.id });
      }

      const { data, error } = await supabase.rpc("admin_get_email_templates", {
        admin_id_input: user.id,
        filter_type: null,
      });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error("템플릿 로드 실패:", error.message);
    }
  };

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
        
        // 교사 이름 검색 필터
        if (teacherNameSearch.trim()) {
          filteredData = filteredData.filter((record: EmailHistoryRecord) => 
            record.recipient_name.toLowerCase().includes(teacherNameSearch.toLowerCase())
          );
        }
        
        // 템플릿 필터 (제목으로 매칭)
        if (selectedTemplate && selectedTemplate !== "all") {
          const template = templates.find(t => t.id === selectedTemplate);
          if (template) {
            filteredData = filteredData.filter((record: EmailHistoryRecord) => 
              record.subject.includes(template.subject) || record.subject.includes(template.title)
            );
          }
        }
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
    loadTemplates();
  }, []);

  // 실시간 동기화 커스텀 훅 사용
  const handleRefresh = useCallback(() => {
    if (history.length > 0) {
      loadHistory();
    }
  }, [history.length, searchText, selectedGrade, selectedClass, recipientType, teacherNameSearch, selectedTemplate, templates]);

  useRealtimeSync({
    tables: EMAIL_HISTORY_TABLE.map(t => ({
      ...t,
      channelName: `email_history_${t.table}`,
    })),
    onRefresh: handleRefresh,
    enabled: history.length > 0,
    dependencies: [history.length, searchText, selectedGrade, selectedClass, recipientType, teacherNameSearch, selectedTemplate],
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
    setTeacherNameSearch("");
    setSelectedTemplate("all");
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-4">
            <div className="col-span-2 md:col-span-1">
              <Label className="text-xs md:text-sm">검색</Label>
              <Input
                placeholder="이름, 이메일, 제목 검색"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="h-9 md:h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs md:text-sm">수신자 유형</Label>
              <Select value={recipientType} onValueChange={(value) => {
                setRecipientType(value);
                // 유형 변경 시 관련 필터 초기화
                if (value !== "teacher") {
                  setTeacherNameSearch("");
                  setSelectedTemplate("all");
                }
                if (value !== "student") {
                  setSelectedGrade("all");
                  setSelectedClass("all");
                }
              }}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="student">학생</SelectItem>
                  <SelectItem value="teacher">교사</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 학생 수신자일 때 학년/반 필터 */}
            {recipientType !== "teacher" && (
              <>
                <div>
                  <Label className="text-xs md:text-sm">학년</Label>
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger className="h-9 md:h-10 text-sm">
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
                  <Label className="text-xs md:text-sm">반</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="h-9 md:h-10 text-sm">
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
              </>
            )}
            
            {/* 교사 수신자일 때 이름/템플릿 필터 */}
            {recipientType === "teacher" && (
              <>
                <div>
                  <Label className="text-xs md:text-sm">교사 이름</Label>
                  <Input
                    placeholder="교사 이름 검색"
                    value={teacherNameSearch}
                    onChange={(e) => setTeacherNameSearch(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="h-9 md:h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs md:text-sm">템플릿</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="h-9 md:h-10 text-sm">
                      <SelectValue placeholder="전체" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            <div className="col-span-2 md:col-span-1 flex items-end gap-2">
              <Button onClick={handleSearch} disabled={loading} className="flex-1 md:flex-none h-9 md:h-10 text-sm">
                조회
              </Button>
              <Button onClick={handleReset} variant="outline" disabled={loading} className="flex-1 md:flex-none h-9 md:h-10 text-sm">
                초기화
              </Button>
              <Button onClick={handleExportCSV} variant="outline" disabled={loading || history.length === 0} className="h-9 md:h-10 px-3">
                <Download className="h-4 w-4" />
                <span className="hidden md:inline ml-2">CSV</span>
              </Button>
            </div>
          </div>

          {/* 데스크톱 테이블 */}
          <div className="hidden md:block border rounded-lg overflow-x-auto">
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

          {/* 모바일 카드 레이아웃 */}
          <div className="md:hidden space-y-3">
            {history.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border rounded-lg">
                이메일 발송 이력이 없습니다
              </div>
            ) : (
              history.map((record) => (
                <div
                  key={record.id}
                  className="border rounded-lg p-4 space-y-2 bg-card cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedEmail(record)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{record.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(record.sent_at), "MM/dd HH:mm", { locale: ko })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        record.recipient_student_id 
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}>
                        {record.recipient_student_id ? "학생" : "교사"}
                      </span>
                      {record.opened ? (
                        <span className="text-xs text-green-600">✓ 읽음</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">미열람</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-muted-foreground truncate">
                      <span className="font-medium text-foreground">{record.recipient_name}</span>
                      <span className="mx-1">·</span>
                      <span className="truncate">{record.recipient_email}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    발신: {record.sender_name}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] md:w-auto overflow-hidden flex flex-col">
          <DialogHeader className="pr-12">
            <DialogTitle className="text-base md:text-lg">이메일 상세 내용</DialogTitle>
            <DialogDescription>
              {selectedEmail && format(new Date(selectedEmail.sent_at), "yyyy-MM-dd HH:mm", { locale: ko })}
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-3 md:space-y-4 overflow-y-auto pr-2">
              <div>
                <Label className="text-xs md:text-sm">발신자</Label>
                <p className="text-sm">
                  {selectedEmail.sender_name} ({selectedEmail.sender_type === "admin" ? "관리자" : "교사"})
                </p>
              </div>
              <div>
                <Label className="text-xs md:text-sm">수신자</Label>
                <p className="text-sm break-all">
                  {selectedEmail.recipient_name} ({selectedEmail.recipient_email})
                </p>
              </div>
              <div>
                <Label className="text-xs md:text-sm">제목</Label>
                <p className="text-sm">{selectedEmail.subject}</p>
              </div>
              <div>
                <Label className="text-xs md:text-sm">내용</Label>
                <div className="text-sm whitespace-pre-wrap border rounded-lg p-3 md:p-4 bg-muted max-h-[40vh] overflow-y-auto">
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