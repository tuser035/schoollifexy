import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Plus, Pencil, Trash2, Calendar, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface RecommendedBookManagerProps {
  adminId: string;
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

const QUARTERS = [
  { value: 1, label: "1분기 (1~3월)" },
  { value: 2, label: "2분기 (4~6월)" },
  { value: 3, label: "3분기 (7~9월)" },
  { value: 4, label: "4분기 (10~12월)" },
];

const getCurrentQuarter = () => Math.ceil((new Date().getMonth() + 1) / 3);
const getCurrentYear = () => new Date().getFullYear();

const RecommendedBookManager: React.FC<RecommendedBookManagerProps> = ({ adminId }) => {
  const [books, setBooks] = useState<RecommendedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<number>(getCurrentYear());
  const [filterQuarter, setFilterQuarter] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<RecommendedBook | null>(null);
  
  // 폼 상태
  const [formTitle, setFormTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formYear, setFormYear] = useState(getCurrentYear());
  const [formQuarter, setFormQuarter] = useState(getCurrentQuarter());
  const [formOrder, setFormOrder] = useState(1);
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBooks();
  }, [adminId, filterYear, filterQuarter]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_get_recommended_books', {
        admin_id_input: adminId,
        year_filter: filterYear || null,
        quarter_filter: filterQuarter || null
      });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading books:', error);
      toast.error('추천도서 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormTitle("");
    setFormAuthor("");
    setFormDescription("");
    setFormYear(getCurrentYear());
    setFormQuarter(getCurrentQuarter());
    setFormOrder(1);
    setFormActive(true);
    setEditingBook(null);
  };

  const openEditDialog = (book: RecommendedBook) => {
    setEditingBook(book);
    setFormTitle(book.title);
    setFormAuthor(book.author || "");
    setFormDescription(book.description || "");
    setFormYear(book.year);
    setFormQuarter(book.quarter);
    setFormOrder(book.display_order);
    setFormActive(book.is_active);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) {
      toast.error('도서 제목을 입력해주세요');
      return;
    }

    try {
      setSubmitting(true);

      if (editingBook) {
        // 수정
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
        // 추가
        const { error } = await supabase.rpc('admin_insert_recommended_book', {
          admin_id_input: adminId,
          title_input: formTitle.trim(),
          author_input: formAuthor.trim() || null,
          description_input: formDescription.trim() || null,
          year_input: formYear,
          quarter_input: formQuarter,
          display_order_input: formOrder
        });

        if (error) throw error;
        toast.success('추천도서가 추가되었습니다');
      }

      setIsDialogOpen(false);
      resetForm();
      loadBooks();
    } catch (error: any) {
      console.error('Error saving book:', error);
      toast.error(error.message || '저장에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (bookId: string, bookTitle: string) => {
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

  const getQuarterLabel = (quarter: number) => {
    return QUARTERS.find(q => q.value === quarter)?.label || `${quarter}분기`;
  };

  // 연도 옵션 생성 (현재년도 기준 -1 ~ +1)
  const yearOptions = [getCurrentYear() - 1, getCurrentYear(), getCurrentYear() + 1];

  // 분기별 도서 그룹화
  const groupedBooks = books.reduce((acc, book) => {
    const key = `${book.year}-Q${book.quarter}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(book);
    return acc;
  }, {} as Record<string, RecommendedBook[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              분기별 추천도서 관리
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  추천도서 추가
                </Button>
              </DialogTrigger>
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
                        <Label>분기</Label>
                        <Select
                          value={formQuarter.toString()}
                          onValueChange={(v) => setFormQuarter(parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUARTERS.map(q => (
                              <SelectItem key={q.value} value={q.value.toString()}>
                                {q.label}
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
                    onClick={handleSubmit} 
                    disabled={submitting}
                    className="w-full"
                  >
                    {submitting ? '저장 중...' : editingBook ? '수정' : '추가'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-sm text-muted-foreground">
            분기별로 추천도서 7권을 관리합니다. 1년에 총 21권 (분기별 7권 × 3분기)
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
              value={filterQuarter?.toString() || "all"}
              onValueChange={(v) => setFilterQuarter(v === "all" ? null : parseInt(v))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="전체 분기" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 분기</SelectItem>
                {QUARTERS.map(q => (
                  <SelectItem key={q.value} value={q.value.toString()}>
                    {q.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={loadBooks}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* 도서 목록 */}
          {loading ? (
            <p className="text-center text-muted-foreground py-8">로딩 중...</p>
          ) : books.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">등록된 추천도서가 없습니다</p>
              <p className="text-sm text-muted-foreground">위의 "추천도서 추가" 버튼을 클릭하여 도서를 등록하세요</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              {Object.entries(groupedBooks)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([key, groupBooks]) => {
                  const [year, quarter] = key.split('-Q');
                  const isCurrentQuarter = 
                    parseInt(year) === getCurrentYear() && 
                    parseInt(quarter) === getCurrentQuarter();
                  
                  return (
                    <div key={key} className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{year}년 {getQuarterLabel(parseInt(quarter))}</h3>
                        {isCurrentQuarter && (
                          <Badge className="bg-primary">현재 분기</Badge>
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
                                      onClick={() => openEditDialog(book)}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDelete(book.id, book.title)}
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
    </div>
  );
};

export default RecommendedBookManager;
