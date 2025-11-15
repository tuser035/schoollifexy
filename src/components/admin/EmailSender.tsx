import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EmailSenderProps {
  templateId: string;
  templateTitle: string;
}

const EmailSender = ({ templateId, templateTitle }: EmailSenderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [recipientType, setRecipientType] = useState<"all" | "filtered">("all");
  const [grade, setGrade] = useState<string>("");
  const [classNum, setClassNum] = useState<string>("");

  const handleSend = async () => {
    try {
      setIsSending(true);
      
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("로그인이 필요합니다");
        return;
      }

      const user = JSON.parse(authUser);

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          adminId: user.id,
          templateId: templateId,
          recipientType: recipientType,
          grade: grade ? parseInt(grade) : undefined,
          class: classNum ? parseInt(classNum) : undefined,
        },
      });

      if (error) throw error;

      toast.success(
        `이메일 발송 완료\n성공: ${data.totalSent}건, 실패: ${data.totalFailed}건`,
        { duration: 5000 }
      );
      
      setIsOpen(false);
      setRecipientType("all");
      setGrade("");
      setClassNum("");
    } catch (error: any) {
      console.error("Email send error:", error);
      toast.error("이메일 발송 실패: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
      >
        <Send className="w-4 h-4 mr-2" />
        발송
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이메일 발송</DialogTitle>
            <DialogDescription>
              "{templateTitle}" 템플릿으로 학생들의 Gmail에 이메일을 발송합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>발송 대상</Label>
              <Select value={recipientType} onValueChange={(v) => setRecipientType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 학생</SelectItem>
                  <SelectItem value="filtered">학년/반 선택</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recipientType === "filtered" && (
              <>
                <div>
                  <Label>학년</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="학년 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">전체</SelectItem>
                      <SelectItem value="1">1학년</SelectItem>
                      <SelectItem value="2">2학년</SelectItem>
                      <SelectItem value="3">3학년</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>반</Label>
                  <Select value={classNum} onValueChange={setClassNum}>
                    <SelectTrigger>
                      <SelectValue placeholder="반 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">전체</SelectItem>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}반
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSending}>
              취소
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? "발송 중..." : "발송하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmailSender;
