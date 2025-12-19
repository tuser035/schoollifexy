import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Send, Award, Check, Clock, FileText } from "lucide-react";

interface BookReportFormProps {
  studentId: string;
  studentName: string;
  studentGrade: number;
  studentClass: number;
  studentNumber: number;
  deptName?: string;
}

interface BookReport {
  id: string;
  book_title: string;
  content: string;
  points_awarded: number;
  status: string;
  created_at: string;
}

// 7권의 책 목록
const BOOK_TITLES = [
  "호밀밭의 파수꾼",
  "변신",
  "프랑켄슈타인",
  "데미안",
  "동물농장",
  "젊은 베르테르의 슬픔",
  "지킬박사와 하이드"
];

const BookReportForm: React.FC<BookReportFormProps> = ({
  studentId,
  studentName,
  studentGrade,
  studentClass,
  studentNumber,
  deptName
}) => {
  const [reports, setReports] = useState<BookReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("write");

  useEffect(() => {
    loadReports();
  }, [studentId]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('student_get_book_reports', {
        student_id_input: studentId
      });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBook) {
      toast.error('책을 선택해주세요');
      return;
    }

    if (content.length < 500) {
      toast.error(`독후감은 최소 500자 이상이어야 합니다. (현재 ${content.length}자)`);
      return;
    }

    if (content.length > 1000) {
      toast.error(`독후감은 최대 1000자까지 작성 가능합니다. (현재 ${content.length}자)`);
      return;
    }

    // 이미 제출한 책인지 확인
    if (reports.some(r => r.book_title === selectedBook)) {
      toast.error('이미 해당 책의 독후감을 제출했습니다');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.rpc('student_submit_book_report', {
        student_id_input: studentId,
        book_title_input: selectedBook,
        content_input: content
      });

      if (error) throw error;

      toast.success('독후감이 성공적으로 제출되었습니다!');
      setContent("");
      setSelectedBook(null);
      loadReports();
      setActiveTab("history");
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast.error(error.message || '독후감 제출에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const getSubmittedBooks = () => reports.map(r => r.book_title);
  const submittedBooks = getSubmittedBooks();
  const totalPoints = reports.reduce((sum, r) => sum + (r.points_awarded || 0), 0);

  const getStatusBadge = (status: string, points: number) => {
    if (status === 'approved') {
      return (
        <Badge className="bg-green-500 text-white">
          <Check className="w-3 h-3 mr-1" />
          승인됨 ({points}점)
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        검토 대기중
      </Badge>
    );
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          독후감 쓰기
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          시간을 건너온 일곱 개의 문 - 입문자를 위한 고전문학
        </p>
      </CardHeader>
      <CardContent>
        {/* 학생 정보 */}
        <div className="bg-muted/50 p-3 rounded-lg mb-4 text-sm">
          <p><strong>{studentName}</strong></p>
          <p className="text-muted-foreground">
            {studentGrade}학년 {studentClass}반 {studentNumber}번
            {deptName && ` • ${deptName}`}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">
              제출: {reports.length}/7권
            </Badge>
            <Badge className="bg-primary">
              <Award className="w-3 h-3 mr-1" />
              총 {totalPoints}점
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="write">
              <FileText className="w-4 h-4 mr-1" />
              작성하기
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="w-4 h-4 mr-1" />
              제출 내역
            </TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="space-y-4">
            {/* 책 선택 */}
            <div>
              <label className="text-sm font-medium mb-2 block">책 선택</label>
              <div className="grid grid-cols-1 gap-2">
                {BOOK_TITLES.map((title, idx) => {
                  const isSubmitted = submittedBooks.includes(title);
                  return (
                    <Button
                      key={idx}
                      variant={selectedBook === title ? "default" : "outline"}
                      className={`justify-start text-left h-auto py-2 ${isSubmitted ? 'opacity-50' : ''}`}
                      onClick={() => !isSubmitted && setSelectedBook(title)}
                      disabled={isSubmitted}
                    >
                      <span className="mr-2">{idx + 1}.</span>
                      {title}
                      {isSubmitted && (
                        <Badge className="ml-auto bg-green-500 text-white text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          제출완료
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* 독후감 작성 */}
            {selectedBook && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    "{selectedBook}" 독후감
                  </label>
                  <span className={`text-xs ${
                    content.length < 500 ? 'text-destructive' : 
                    content.length > 1000 ? 'text-destructive' : 
                    'text-green-500'
                  }`}>
                    {content.length}/1000자 (최소 500자)
                  </span>
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="독후감을 작성해주세요. (500자 이상 1000자 이하)"
                  className="min-h-[200px] resize-none"
                  maxLength={1000}
                />
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting || content.length < 500 || content.length > 1000}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? '제출 중...' : '독후감 제출'}
                </Button>
              </div>
            )}

            {!selectedBook && (
              <p className="text-sm text-muted-foreground text-center py-4">
                위에서 책을 선택하여 독후감을 작성해주세요
              </p>
            )}
          </TabsContent>

          <TabsContent value="history">
            {loading ? (
              <p className="text-center text-muted-foreground py-4">로딩 중...</p>
            ) : reports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                아직 제출한 독후감이 없습니다
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {reports.map((report) => (
                    <Card key={report.id} className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-sm">{report.book_title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(report.status, report.points_awarded)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {report.content}
                      </p>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BookReportForm;
