import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, RefreshCw, ChevronDown, Users, GraduationCap, CalendarIcon, X, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ko } from "date-fns/locale";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { cn } from "@/lib/utils";

interface EmailRecord {
  id: string;
  recipient_name: string;
  recipient_email: string;
  recipient_student_id: string | null;
  subject: string;
  body: string;
  sent_at: string;
}

const PAGE_SIZE = 5;

const EmailHistory = () => {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentDisplayCount, setStudentDisplayCount] = useState(PAGE_SIZE);
  const [teacherDisplayCount, setTeacherDisplayCount] = useState(PAGE_SIZE);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("student");
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const authUser = localStorage.getItem("auth_user");
    if (authUser) {
      const user = JSON.parse(authUser);
      setUserId(user.id);
    }
    loadEmails();
  }, []);

  const loadEmails = useCallback(async () => {
    try {
      setLoading(true);
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      await supabase.rpc("set_teacher_session", { teacher_id_input: user.id });
      
      const { data, error } = await supabase
        .from("email_history")
        .select("id, recipient_name, recipient_email, recipient_student_id, subject, body, sent_at")
        .eq("sender_id", user.id)
        .eq("sender_type", "teacher")
        .order("sent_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setEmails(data || []);
    } catch (error: any) {
      console.error("Error loading email history:", error);
      toast.error("이메일 이력 조회 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 실시간 동기화
  useRealtimeSync({
    tables: userId ? [
      {
        table: "email_history",
        channelName: `teacher-email-history-${userId}`,
        filter: `sender_id=eq.${userId}`,
        labels: {
          insert: "🔄 새 이메일이 발송되었습니다"
        }
      }
    ] : [],
    onRefresh: loadEmails,
    enabled: !!userId,
    dependencies: [userId]
  });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy-MM-dd HH:mm");
    } catch {
      return "-";
    }
  };

  const handleEmailClick = (email: EmailRecord) => {
    setSelectedEmail(email);
    setDetailDialogOpen(true);
  };

  const handleClearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // CSV 내보내기
  const handleExportCSV = () => {
    const currentEmails = activeTab === "student" ? studentEmails : teacherEmails;
    
    if (currentEmails.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }

    // CSV 헤더
    const headers = ["발송일시", "수신자", "이메일", "제목", "본문"];
    
    // CSV 데이터 생성
    const csvData = currentEmails.map(email => [
      formatDate(email.sent_at),
      email.recipient_name,
      email.recipient_email,
      email.subject,
      // 본문에서 HTML 태그 제거 및 특수문자 처리
      email.body.replace(/<[^>]*>/g, "").replace(/"/g, '""')
    ]);

    // CSV 문자열 생성
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // BOM 추가 (한글 깨짐 방지)
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    
    // 다운로드
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const dateStr = format(new Date(), "yyyyMMdd_HHmm");
    const typeStr = activeTab === "student" ? "학생" : "교사";
    
    link.setAttribute("href", url);
    link.setAttribute("download", `발송이력_${typeStr}_${dateStr}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${currentEmails.length}건의 이력을 내보냈습니다`);
  };

  // 날짜 필터링 적용
  const filteredEmails = useMemo(() => {
    if (!startDate && !endDate) return emails;
    
    return emails.filter(email => {
      const emailDate = new Date(email.sent_at);
      
      if (startDate && endDate) {
        return isWithinInterval(emailDate, {
          start: startOfDay(startDate),
          end: endOfDay(endDate)
        });
      }
      
      if (startDate) {
        return emailDate >= startOfDay(startDate);
      }
      
      if (endDate) {
        return emailDate <= endOfDay(endDate);
      }
      
      return true;
    });
  }, [emails, startDate, endDate]);

  // 학생/교사 구분
  const studentEmails = filteredEmails.filter(e => e.recipient_student_id !== null);
  const teacherEmails = filteredEmails.filter(e => e.recipient_student_id === null);

  const renderEmailTable = (
    emailList: EmailRecord[], 
    displayCount: number, 
    setDisplayCount: React.Dispatch<React.SetStateAction<number>>
  ) => {
    if (emailList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {startDate || endDate ? "해당 기간에 발송한 이메일이 없습니다" : "발송한 이메일이 없습니다"}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">발송일시</TableHead>
              <TableHead className="text-xs">수신자</TableHead>
              <TableHead className="text-xs">제목</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emailList.slice(0, displayCount).map((email) => (
              <TableRow 
                key={email.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleEmailClick(email)}
              >
                <TableCell className="text-xs py-2">{formatDate(email.sent_at)}</TableCell>
                <TableCell className="text-xs py-2">
                  <div>{email.recipient_name}</div>
                  <div className="text-muted-foreground text-[10px]">{email.recipient_email}</div>
                </TableCell>
                <TableCell className="text-xs py-2">
                  <div className="truncate max-w-[200px]">{email.subject}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {emailList.length > displayCount && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs text-muted-foreground"
            onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
          >
            <ChevronDown className="w-3 h-3 mr-1" />
            ... 더보기 ({emailList.length - displayCount}건)
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              발송 이력
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportCSV} 
                disabled={loading || filteredEmails.length === 0}
                title="CSV 내보내기"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={loadEmails} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* 날짜 필터 */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 text-xs justify-start",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-3 h-3 mr-1" />
                  {startDate ? format(startDate, "yyyy-MM-dd", { locale: ko }) : "시작일"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  locale={ko}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">~</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 text-xs justify-start",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-3 h-3 mr-1" />
                  {endDate ? format(endDate, "yyyy-MM-dd", { locale: ko }) : "종료일"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  locale={ko}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={handleClearDateFilter}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-4 text-muted-foreground">로딩 중...</div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-3">
                <TabsTrigger value="student" className="flex-1 text-xs gap-1">
                  <GraduationCap className="w-3 h-3" />
                  학생 ({studentEmails.length})
                </TabsTrigger>
                <TabsTrigger value="teacher" className="flex-1 text-xs gap-1">
                  <Users className="w-3 h-3" />
                  교사 ({teacherEmails.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="student" className="mt-0">
                {renderEmailTable(studentEmails, studentDisplayCount, setStudentDisplayCount)}
              </TabsContent>
              <TabsContent value="teacher" className="mt-0">
                {renderEmailTable(teacherEmails, teacherDisplayCount, setTeacherDisplayCount)}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* 이메일 상세보기 모달 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Mail className="w-4 h-4" />
              이메일 상세보기
            </DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                <span className="text-muted-foreground">발송일시</span>
                <span>{formatDate(selectedEmail.sent_at)}</span>
                
                <span className="text-muted-foreground">수신자</span>
                <span>{selectedEmail.recipient_name}</span>
                
                <span className="text-muted-foreground">이메일</span>
                <span className="text-primary">{selectedEmail.recipient_email}</span>
                
                <span className="text-muted-foreground">제목</span>
                <span className="font-medium">{selectedEmail.subject}</span>
              </div>
              
              <div className="border-t pt-4">
                <span className="text-sm text-muted-foreground block mb-2">본문</span>
                <div 
                  className="text-sm bg-muted/30 rounded-lg p-4 whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmailHistory;
