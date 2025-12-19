import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Award, Trophy, Search, FileText, Check, Clock, Plus, Pencil, Trash2, Library, Calendar, RefreshCw, Upload, Bot, AlertTriangle } from "lucide-react";
import Papa from 'papaparse';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { analyzeAIContent, getAILevelLabel, getAILevelBadgeVariant } from "@/lib/aiDetection";

interface BookReportManagerProps {
  adminId: string;
}

interface BookReport {
  id: string;
  student_id: string;
  student_name: string;
  student_grade: number;
  student_class: number;
  student_number: number;
  dept_name: string;
  book_title: string;
  content: string;
  points_awarded: number;
  status: string;
  created_at: string;
}

interface LeaderboardEntry {
  student_id: string;
  name: string;
  grade: number;
  class: number;
  number: number;
  dept_name: string;
  total_reports: number;
  total_points: number;
}

interface RecommendedBook {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  year: number;
  quarter: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// 학기 정보 (1학기: 3-8월, 2학기: 9-2월)
const SEMESTERS = [
  { value: 1, label: "1학기 (3~8월)" },
  { value: 2, label: "2학기 (9~2월)" },
];

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

const BookReportManager: React.FC<BookReportManagerProps> = ({ adminId }) => {
  const [reports, setReports] = useState<BookReport[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchGrade, setSearchGrade] = useState<number | null>(null);
  const [searchClass, setSearchClass] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("reports");
  
  // 상세보기 다이얼로그
  const [selectedReport, setSelectedReport] = useState<BookReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [pointsToAward, setPointsToAward] = useState<string>("5");

  // 추천도서 관련 상태
  const [books, setBooks] = useState<RecommendedBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<number>(getCurrentYear());
  const [filterSemester, setFilterSemester] = useState<number | null>(null);
  const [isBookDialogOpen, setIsBookDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<RecommendedBook | null>(null);
  
  // 폼 상태
  const [formTitle, setFormTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formYear, setFormYear] = useState(getCurrentYear());
  const [formSemester, setFormSemester] = useState(getCurrentSemester());
  const [formOrder, setFormOrder] = useState(1);
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // CSV Import 관련 상태
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Array<{title: string; author: string; description: string}>>([]);
  const [importYear, setImportYear] = useState(getCurrentYear());
  const [importSemester, setImportSemester] = useState(getCurrentSemester());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadReports();
    loadLeaderboard();
  }, [adminId, statusFilter]);

  useEffect(() => {
    loadBooks();
  }, [adminId, filterYear, filterSemester]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_get_book_reports', {
        admin_id_input: adminId,
        status_filter: statusFilter === "all" ? null : statusFilter
      });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('독후감 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_book_report_leaderboard', {
        admin_id_input: adminId,
        search_grade: searchGrade,
        search_class: searchClass
      });

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const loadBooks = async () => {
    try {
      setBooksLoading(true);
      const { data, error } = await supabase.rpc('admin_get_recommended_books', {
        admin_id_input: adminId,
        year_filter: filterYear || null,
        quarter_filter: filterSemester || null
      });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading books:', error);
      toast.error('추천도서 목록을 불러오는데 실패했습니다');
    } finally {
      setBooksLoading(false);
    }
  };

  const handleAwardPoints = async () => {
    if (!selectedReport) return;

    try {
      const points = parseInt(pointsToAward);
      if (isNaN(points) || points < 0) {
        toast.error('올바른 포인트를 입력하세요');
        return;
      }

      const { error } = await supabase.rpc('admin_award_book_report_points', {
        admin_id_input: adminId,
        report_id_input: selectedReport.id,
        points_input: points
      });

      if (error) throw error;

      toast.success(`${selectedReport.student_name}에게 ${points}점이 지급되었습니다`);
      setIsDetailOpen(false);
      loadReports();
      loadLeaderboard();
    } catch (error: any) {
      console.error('Error awarding points:', error);
      toast.error(error.message || '포인트 지급에 실패했습니다');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 text-white"><Check className="w-3 h-3 mr-1" />승인됨</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />대기중</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 추천도서 관련 함수들
  const resetBookForm = () => {
    setFormTitle("");
    setFormAuthor("");
    setFormDescription("");
    setFormYear(getCurrentYear());
    setFormSemester(getCurrentSemester());
    setFormOrder(1);
    setFormActive(true);
    setEditingBook(null);
  };

  const openEditBookDialog = (book: RecommendedBook) => {
    setEditingBook(book);
    setFormTitle(book.title);
    setFormAuthor(book.author || "");
    setFormDescription(book.description || "");
    setFormYear(book.year);
    setFormSemester(book.quarter);
    setFormOrder(book.display_order);
    setFormActive(book.is_active);
    setIsBookDialogOpen(true);
  };

  const handleBookSubmit = async () => {
    if (!formTitle.trim()) {
      toast.error('도서 제목을 입력해주세요');
      return;
    }

    try {
      setSubmitting(true);

      if (editingBook) {
        const { error } = await supabase.rpc('admin_update_recommended_book', {
          admin_id_input: adminId,
          book_id_input: editingBook.id,
          title_input: formTitle.trim(),
          author_input: formAuthor.trim() || null,
          description_input: formDescription.trim() || null,
          display_order_input: formOrder,
          is_active_input: formActive
        });

        if (error) throw error;
        toast.success('추천도서가 수정되었습니다');
      } else {
        const { error } = await supabase.rpc('admin_insert_recommended_book', {
          admin_id_input: adminId,
          title_input: formTitle.trim(),
          author_input: formAuthor.trim() || null,
          description_input: formDescription.trim() || null,
          year_input: formYear,
          quarter_input: formSemester,
          display_order_input: formOrder
        });

        if (error) throw error;
        toast.success('추천도서가 추가되었습니다');
      }

      setIsBookDialogOpen(false);
      resetBookForm();
      loadBooks();
    } catch (error: any) {
      console.error('Error saving book:', error);
      toast.error(error.message || '저장에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (!confirm(`"${bookTitle}"을(를) 삭제하시겠습니까?`)) return;

    try {
      const { error } = await supabase.rpc('admin_delete_recommended_book', {
        admin_id_input: adminId,
        book_id_input: bookId
      });

      if (error) throw error;
      toast.success('추천도서가 삭제되었습니다');
      loadBooks();
    } catch (error: any) {
      console.error('Error deleting book:', error);
      toast.error(error.message || '삭제에 실패했습니다');
    }
  };

  // CSV 파일 처리
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const data = results.data as Array<Record<string, string>>;
        const preview = data.map(row => ({
          title: row['제목'] || row['title'] || row['도서명'] || '',
          author: row['저자'] || row['author'] || '',
          description: row['설명'] || row['description'] || row['내용'] || ''
        })).filter(item => item.title.trim() !== '');
        
        setCsvPreview(preview);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast.error('CSV 파일을 읽는데 실패했습니다');
      }
    });
  };

  const handleCsvImport = async () => {
    if (csvPreview.length === 0) {
      toast.error('가져올 도서가 없습니다');
      return;
    }

    try {
      setImporting(true);
      let successCount = 0;

      for (let i = 0; i < csvPreview.length; i++) {
        const book = csvPreview[i];
        const { error } = await supabase.rpc('admin_insert_recommended_book', {
          admin_id_input: adminId,
          title_input: book.title.trim(),
          author_input: book.author.trim() || null,
          description_input: book.description.trim() || null,
          year_input: importYear,
          quarter_input: importSemester,
          display_order_input: i + 1
        });

        if (!error) {
          successCount++;
        } else {
          console.error(`Error importing book "${book.title}":`, error);
        }
      }

      toast.success(`${successCount}권의 추천도서가 추가되었습니다`);
      setIsImportDialogOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      loadBooks();
    } catch (error: any) {
      console.error('Error importing books:', error);
      toast.error(error.message || '가져오기에 실패했습니다');
    } finally {
      setImporting(false);
    }
  };

  const getSemesterLabel = (semester: number) => {
    return SEMESTERS.find(s => s.value === semester)?.label || `${semester}학기`;
  };

  // 연도 옵션 생성
  const yearOptions = [getCurrentYear() - 1, getCurrentYear(), getCurrentYear() + 1];

  // 학기별 도서 그룹화
  const groupedBooks = books.reduce((acc, book) => {
    const key = `${book.year}-S${book.quarter}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(book);
    return acc;
  }, {} as Record<string, RecommendedBook[]>);

  // 현재 학기 추천도서 (독후감 목록에 표시용)
  const currentSemesterBooks = books.filter(b => 
    b.year === getCurrentYear() && 
    b.quarter === getCurrentSemester() && 
    b.is_active
  );

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <BookOpen className="w-6 h-6" />
          독후감 관리
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          학기별 추천도서 관리 및 독후감 평가
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            독후감 목록
          </TabsTrigger>
          <TabsTrigger value="books" className="flex items-center gap-2">
            <Library className="w-4 h-4" />
            추천도서 관리
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            포인트 순위
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {/* 필터 */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="상태 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="pending">대기중</SelectItem>
                    <SelectItem value="approved">승인됨</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={loadReports} variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-1" />
                  새로고침
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 현재 학기 추천 도서 목록 안내 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Library className="w-4 h-4" />
                {getCurrentYear()}년 {getSemesterLabel(getCurrentSemester())} 추천 도서
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentSemesterBooks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  등록된 추천도서가 없습니다. "추천도서 관리" 탭에서 도서를 추가해주세요.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentSemesterBooks
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((book, idx) => (
                      <Badge key={book.id} variant="outline" className="text-xs">
                        {idx + 1}. {book.title}
                      </Badge>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 독후감 목록 테이블 */}
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">로딩 중...</p>
              ) : reports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">제출된 독후감이 없습니다</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">학생</TableHead>
                        <TableHead className="text-xs">학년/반</TableHead>
                        <TableHead className="text-xs">책 제목</TableHead>
                        <TableHead className="text-xs">AI 의심도</TableHead>
                        <TableHead className="text-xs">상태</TableHead>
                        <TableHead className="text-xs">포인트</TableHead>
                        <TableHead className="text-xs">제출일</TableHead>
                        <TableHead className="text-xs">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => {
                        const aiResult = analyzeAIContent(report.content);
                        return (
                          <TableRow key={report.id}>
                            <TableCell className="text-xs font-medium">
                              {report.student_name}
                            </TableCell>
                            <TableCell className="text-xs">
                              {report.student_grade}-{report.student_class}-{report.student_number}
                            </TableCell>
                            <TableCell className="text-xs">{report.book_title}</TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant={getAILevelBadgeVariant(aiResult.level)} className="text-xs gap-1">
                                      <Bot className="w-3 h-3" />
                                      {aiResult.score}%
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>AI 작성 의심도: {getAILevelLabel(aiResult.level)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>{getStatusBadge(report.status)}</TableCell>
                            <TableCell className="text-xs font-medium text-primary">
                              {report.points_awarded > 0 ? `${report.points_awarded}점` : '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {new Date(report.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setPointsToAward(report.points_awarded > 0 ? String(report.points_awarded) : "5");
                                  setIsDetailOpen(true);
                                }}
                              >
                                상세
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="books" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Library className="w-5 h-5" />
                  학기별 추천도서 관리
                </CardTitle>
                <Dialog open={isBookDialogOpen} onOpenChange={(open) => {
                  setIsBookDialogOpen(open);
                  if (!open) resetBookForm();
                }}>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                      <Upload className="w-4 h-4 mr-1" />
                      CSV 가져오기
                    </Button>
                    <Button size="sm" onClick={() => setIsBookDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      추천도서 추가
                    </Button>
                  </div>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingBook ? '추천도서 수정' : '추천도서 추가'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>도서 제목 *</Label>
                        <Input
                          value={formTitle}
                          onChange={(e) => setFormTitle(e.target.value)}
                          placeholder="도서 제목"
                        />
                      </div>
                      <div>
                        <Label>저자</Label>
                        <Input
                          value={formAuthor}
                          onChange={(e) => setFormAuthor(e.target.value)}
                          placeholder="저자명"
                        />
                      </div>
                      <div>
                        <Label>설명</Label>
                        <Textarea
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="도서 설명"
                          rows={3}
                        />
                      </div>
                      {!editingBook && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>연도</Label>
                            <Select
                              value={formYear.toString()}
                              onValueChange={(v) => setFormYear(parseInt(v))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {yearOptions.map(y => (
                                  <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>학기</Label>
                            <Select
                              value={formSemester.toString()}
                              onValueChange={(v) => setFormSemester(parseInt(v))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SEMESTERS.map(s => (
                                  <SelectItem key={s.value} value={s.value.toString()}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>표시 순서</Label>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            value={formOrder}
                            onChange={(e) => setFormOrder(parseInt(e.target.value) || 1)}
                          />
                        </div>
                        {editingBook && (
                          <div className="flex items-center gap-2 pt-6">
                            <Switch
                              checked={formActive}
                              onCheckedChange={setFormActive}
                            />
                            <Label>활성화</Label>
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={handleBookSubmit} 
                        disabled={submitting}
                        className="w-full"
                      >
                        {submitting ? '저장 중...' : editingBook ? '수정' : '추가'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* CSV Import Dialog */}
                <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
                  setIsImportDialogOpen(open);
                  if (!open) {
                    setCsvFile(null);
                    setCsvPreview([]);
                  }
                }}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        CSV로 추천도서 가져오기
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="p-3 bg-muted rounded-lg text-sm">
                        <p className="font-medium mb-2">CSV 파일 형식 안내:</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                          <li>첫 행: 헤더 (제목, 저자, 설명)</li>
                          <li>필수 열: 제목 (또는 title, 도서명)</li>
                          <li>선택 열: 저자 (또는 author), 설명 (또는 description, 내용)</li>
                        </ul>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>연도</Label>
                          <Select
                            value={importYear.toString()}
                            onValueChange={(v) => setImportYear(parseInt(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {yearOptions.map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>학기</Label>
                          <Select
                            value={importSemester.toString()}
                            onValueChange={(v) => setImportSemester(parseInt(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SEMESTERS.map(s => (
                                <SelectItem key={s.value} value={s.value.toString()}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>CSV 파일 선택</Label>
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={handleCsvFileChange}
                          className="mt-1"
                        />
                      </div>

                      {csvPreview.length > 0 && (
                        <div>
                          <Label className="mb-2 block">미리보기 ({csvPreview.length}권)</Label>
                          <ScrollArea className="h-48 border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">순서</TableHead>
                                  <TableHead className="text-xs">제목</TableHead>
                                  <TableHead className="text-xs">저자</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {csvPreview.map((book, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="text-xs">{idx + 1}</TableCell>
                                    <TableCell className="text-xs font-medium">{book.title}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {book.author || '-'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        </div>
                      )}

                      <Button 
                        onClick={handleCsvImport} 
                        disabled={importing || csvPreview.length === 0}
                        className="w-full"
                      >
                        {importing ? '가져오는 중...' : `${csvPreview.length}권 가져오기`}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-sm text-muted-foreground">
                1학기(3~8월), 2학기(9~다음해 2월) 추천도서를 관리합니다
              </p>
            </CardHeader>
            <CardContent>
              {/* 필터 */}
              <div className="flex gap-3 mb-4">
                <Select
                  value={filterYear.toString()}
                  onValueChange={(v) => setFilterYear(parseInt(v))}
                >
                  <SelectTrigger className="w-32">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterSemester?.toString() || "all"}
                  onValueChange={(v) => setFilterSemester(v === "all" ? null : parseInt(v))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="전체 학기" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 학기</SelectItem>
                    {SEMESTERS.map(s => (
                      <SelectItem key={s.value} value={s.value.toString()}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={loadBooks}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {/* 도서 목록 */}
              {booksLoading ? (
                <p className="text-center text-muted-foreground py-8">로딩 중...</p>
              ) : books.length === 0 ? (
                <div className="text-center py-8">
                  <Library className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">등록된 추천도서가 없습니다</p>
                  <p className="text-sm text-muted-foreground">위의 "추천도서 추가" 버튼을 클릭하여 도서를 등록하세요</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  {Object.entries(groupedBooks)
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .map(([key, groupBooks]) => {
                      const [year, semester] = key.split('-S');
                      const isCurrentSemester = 
                        parseInt(year) === getCurrentYear() && 
                        parseInt(semester) === getCurrentSemester();
                      
                      return (
                        <div key={key} className="mb-6">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{year}년 {getSemesterLabel(parseInt(semester))}</h3>
                            {isCurrentSemester && (
                              <Badge className="bg-primary">현재 학기</Badge>
                            )}
                            <Badge variant="outline">{groupBooks.length}권</Badge>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">순서</TableHead>
                                <TableHead>도서명</TableHead>
                                <TableHead>저자</TableHead>
                                <TableHead className="w-20">상태</TableHead>
                                <TableHead className="w-24 text-right">관리</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {groupBooks
                                .sort((a, b) => a.display_order - b.display_order)
                                .map((book) => (
                                  <TableRow key={book.id}>
                                    <TableCell>{book.display_order}</TableCell>
                                    <TableCell className="font-medium">
                                      {book.title}
                                      {book.description && (
                                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                                          {book.description}
                                        </p>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {book.author || '-'}
                                    </TableCell>
                                    <TableCell>
                                      {book.is_active ? (
                                        <Badge className="bg-green-500">활성</Badge>
                                      ) : (
                                        <Badge variant="secondary">비활성</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => openEditBookDialog(book)}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteBook(book.id, book.title)}
                                        >
                                          <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          {/* 필터 */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                <Select 
                  value={searchGrade?.toString() || "all"} 
                  onValueChange={(v) => setSearchGrade(v === "all" ? null : parseInt(v))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="학년" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 학년</SelectItem>
                    <SelectItem value="1">1학년</SelectItem>
                    <SelectItem value="2">2학년</SelectItem>
                    <SelectItem value="3">3학년</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={searchClass?.toString() || "all"} 
                  onValueChange={(v) => setSearchClass(v === "all" ? null : parseInt(v))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="반" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 반</SelectItem>
                    {[1,2,3,4,5,6,7,8,9,10].map(c => (
                      <SelectItem key={c} value={c.toString()}>{c}반</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={loadLeaderboard} variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-1" />
                  조회
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 순위 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                독후감 포인트 순위
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">순위 데이터가 없습니다</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-12">순위</TableHead>
                        <TableHead className="text-xs">학생</TableHead>
                        <TableHead className="text-xs">학년/반/번</TableHead>
                        <TableHead className="text-xs">학과</TableHead>
                        <TableHead className="text-xs">독후감 수</TableHead>
                        <TableHead className="text-xs">총 포인트</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((entry, idx) => (
                        <TableRow key={entry.student_id}>
                          <TableCell className="text-sm font-bold">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{entry.name}</TableCell>
                          <TableCell className="text-xs">
                            {entry.grade}-{entry.class}-{entry.number}
                          </TableCell>
                          <TableCell className="text-xs">{entry.dept_name || '-'}</TableCell>
                          <TableCell className="text-sm">{entry.total_reports}권</TableCell>
                          <TableCell className="text-sm font-bold text-primary">
                            {entry.total_points}점
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 상세 보기 다이얼로그 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              독후감 상세 - {selectedReport?.book_title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedReport && (() => {
            const aiResult = analyzeAIContent(selectedReport.content);
            return (
            <div className="space-y-4">
              {/* 학생 정보 */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm">
                  <strong>학생:</strong> {selectedReport.student_name}
                </p>
                <p className="text-sm">
                  <strong>학년/반/번:</strong> {selectedReport.student_grade}-{selectedReport.student_class}-{selectedReport.student_number}
                </p>
                <p className="text-sm">
                  <strong>학과:</strong> {selectedReport.dept_name || '-'}
                </p>
                <p className="text-sm">
                  <strong>제출일:</strong> {new Date(selectedReport.created_at).toLocaleString()}
                </p>
                <p className="text-sm">
                  <strong>글자 수:</strong> {selectedReport.content.length}자
                </p>
              </div>

              {/* AI 분석 결과 */}
              <div className={`border rounded-lg p-4 ${
                aiResult.level === 'high' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' :
                aiResult.level === 'medium' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20' :
                'border-green-300 bg-green-50 dark:bg-green-950/20'
              }`}>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  AI 작성 분석 결과
                  {aiResult.level === 'high' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                </h4>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">AI 의심도</p>
                    <p className="text-2xl font-bold">
                      <Badge variant={getAILevelBadgeVariant(aiResult.level)} className="text-lg px-3 py-1">
                        {aiResult.score}% ({getAILevelLabel(aiResult.level)})
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">분석 지표</p>
                    <div className="text-xs space-y-1 mt-1">
                      <p>어휘 다양성(TTR): {aiResult.details.ttr}</p>
                      <p>평균 문장 길이: {aiResult.details.avgSentenceLength}자</p>
                      <p>문장 길이 편차: {aiResult.details.sentenceLengthVariance}</p>
                      <p>접속사 비율: {aiResult.details.connectorRatio}</p>
                    </div>
                  </div>
                </div>

                {aiResult.indicators.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">감지된 패턴:</p>
                    <div className="flex flex-wrap gap-1">
                      {aiResult.indicators.map((indicator, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {indicator}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3 italic">
                  ※ 이 분석은 통계적 패턴 기반이며 참고용입니다. 최종 판단은 교사의 검토가 필요합니다.
                </p>
              </div>

              {/* 독후감 내용 */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">독후감 내용</h4>
                <ScrollArea className="h-[200px]">
                  <p className="text-sm whitespace-pre-wrap">{selectedReport.content}</p>
                </ScrollArea>
              </div>

              {/* 포인트 지급 */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">포인트 지급:</label>
                <Input
                  type="number"
                  value={pointsToAward}
                  onChange={(e) => setPointsToAward(e.target.value)}
                  className="w-24"
                  min="0"
                />
                <span className="text-sm text-muted-foreground">점</span>
              </div>
            </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAwardPoints} className="gap-1">
              <Award className="w-4 h-4" />
              {selectedReport?.status === 'approved' ? '포인트 수정' : '승인 및 포인트 지급'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookReportManager;
