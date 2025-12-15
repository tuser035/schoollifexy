import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, RefreshCw, ChevronDown, Users, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

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

      // teacher_get_email_history가 recipient_student_id를 반환하도록 수정 필요
      // 임시로 직접 쿼리 사용
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

  // 학생/교사 구분
  const studentEmails = emails.filter(e => e.recipient_student_id !== null);
  const teacherEmails = emails.filter(e => e.recipient_student_id === null);

  const renderEmailTable = (
    emailList: EmailRecord[], 
    displayCount: number, 
    setDisplayCount: React.Dispatch<React.SetStateAction<number>>
  ) => {
    if (emailList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">발송한 이메일이 없습니다</div>
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
              <TableRow key={email.id}>
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            발송 이력
          </div>
          <Button variant="ghost" size="sm" onClick={loadEmails} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
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
  );
};

export default EmailHistory;
