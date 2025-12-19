import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Send, Award, Check, Clock, FileText, Info, Upload } from "lucide-react";

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

interface RecommendedBook {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  display_order: number;
}

// 학기 정보 (1학기: 3-8월, 2학기: 9-2월)
const getCurrentSemester = () => {
  const month = new Date().getMonth() + 1;
  return (month >= 3 && month <= 8) ? 1 : 2;
};

const getCurrentYear = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  // 1-2월은 전년도 2학기
  if (month <= 2) {
    return now.getFullYear() - 1;
  }
  return now.getFullYear();
};

const getSemesterLabel = (semester: number) => {
  return semester === 1 ? "1학기 (3~8월)" : "2학기 (9~2월)";
};

const BookReportForm: React.FC<BookReportFormProps> = ({
  studentId,
  studentName,
  studentGrade,
  studentClass,
  studentNumber,
  deptName
}) => {
  const [reports, setReports] = useState<BookReport[]>([]);
  const [recommendedBooks, setRecommendedBooks] = useState<RecommendedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("write");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSemester = getCurrentSemester();
  const currentYear = getCurrentYear();

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 독후감 목록과 추천도서 동시 로드
      const [reportsResult, booksResult] = await Promise.all([
        supabase.rpc('student_get_book_reports', { student_id_input: studentId }),
        supabase.rpc('student_get_current_recommended_books', { student_id_input: studentId })
      ]);

      if (reportsResult.error) throw reportsResult.error;
      if (booksResult.error) throw booksResult.error;
      
      setReports(reportsResult.data || []);
      setRecommendedBooks(booksResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
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
      loadData();
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

  const handleTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      toast.error('txt 파일만 업로드 가능합니다');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        // 공백 정리 및 길이 체크
        const trimmedText = text.trim();
        if (trimmedText.length > 1000) {
          toast.warning(`파일 내용이 1000자를 초과하여 잘렸습니다 (${trimmedText.length}자 → 1000자)`);
          setContent(trimmedText.substring(0, 1000));
        } else {
          setContent(trimmedText);
          toast.success('파일이 성공적으로 불러왔습니다');
        }
      }
    };
    reader.onerror = () => {
      toast.error('파일 읽기 중 오류가 발생했습니다');
    };
    reader.readAsText(file, 'UTF-8');
    
    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currentYear}년 {getSemesterLabel(currentSemester)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            추천도서 {recommendedBooks.length}권
          </span>
        </div>
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
              제출: {reports.length}/{recommendedBooks.length || 7}권
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
              {recommendedBooks.length === 0 ? (
                <div className="text-center py-6 border rounded-lg bg-muted/50">
                  <Info className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    현재 학기에 등록된 추천도서가 없습니다
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    관리자가 추천도서를 등록하면 여기에 표시됩니다
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {recommendedBooks.map((book, idx) => {
                    const isSubmitted = submittedBooks.includes(book.title);
                    return (
                      <div key={book.id} className="flex items-center gap-2">
                        <Button
                          variant={selectedBook === book.title ? "default" : "outline"}
                          className={`flex-1 justify-start text-left h-auto py-2 ${isSubmitted ? 'opacity-50' : ''}`}
                          onClick={() => !isSubmitted && setSelectedBook(book.title)}
                          disabled={isSubmitted}
                        >
                          <span className="mr-2">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <div>{book.title}</div>
                            {book.author && (
                              <div className="text-xs opacity-70">{book.author}</div>
                            )}
                          </div>
                          {isSubmitted && (
                            <Badge className="ml-auto bg-green-500 text-white text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              제출완료
                            </Badge>
                          )}
                        </Button>
                        {!isSubmitted && (
                          <>
                            <input
                              type="file"
                              accept=".txt"
                              className="hidden"
                              id={`txt-upload-${book.id}`}
                              onChange={(e) => {
                                setSelectedBook(book.title);
                                handleTxtUpload(e);
                              }}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                              onClick={() => document.getElementById(`txt-upload-${book.id}`)?.click()}
                              title="txt 파일 업로드"
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
