import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface EmailRecord {
  id: string;
  recipient_name: string;
  recipient_email: string;
  subject: string;
  body: string;
  sent_at: string;
}

const PAGE_SIZE = 10;

const EmailHistory = () => {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { data, error } = await supabase.rpc("teacher_get_email_history", {
        teacher_id_input: user.id
      });

      if (error) throw error;
      setEmails(data || []);
    } catch (error: any) {
      console.error("Error loading email history:", error);
      toast.error("이메일 이력 조회 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy-MM-dd HH:mm");
    } catch {
      return "-";
    }
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
        ) : emails.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">발송한 이메일이 없습니다</div>
        ) : (
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
                {emails.slice(0, displayCount).map((email) => (
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
            {emails.length > displayCount && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-xs text-muted-foreground"
                onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
              >
                <ChevronDown className="w-3 h-3 mr-1" />
                ... 더보기 ({emails.length - displayCount}건)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailHistory;
