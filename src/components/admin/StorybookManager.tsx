import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  BookOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Eye, 
  EyeOff,
  Image as ImageIcon,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Save
} from 'lucide-react';

interface Storybook {
  id: string;
  book_number: number;
  title: string;
  cover_image_url: string | null;
  description: string | null;
  page_count: number;
  is_published: boolean;
  created_at: string;
}

interface StorybookPage {
  id: string;
  page_number: number;
  image_url: string | null;
  text_content: string | null;
}

interface StorybookManagerProps {
  adminId: string;
}

export default function StorybookManager({ adminId }: StorybookManagerProps) {
  const [books, setBooks] = useState<Storybook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Storybook | null>(null);
  const [pages, setPages] = useState<StorybookPage[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Storybook | null>(null);
  
  // Form states
  const [newBookNumber, setNewBookNumber] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  
  // Page editing states
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [pageText, setPageText] = useState('');
  const [pageImagePreview, setPageImagePreview] = useState<string | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadBooks();
  }, [adminId]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_get_storybooks', {
        admin_id_input: adminId
      });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading books:', error);
      toast.error('동화책 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const loadPages = async (bookId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_get_storybook_pages', {
        admin_id_input: adminId,
        book_id_input: bookId
      });

      if (error) throw error;
      setPages(data || []);
      
      // Load first page content
      if (data && data.length > 0) {
        const firstPage = data.find((p: StorybookPage) => p.page_number === 1);
        if (firstPage) {
          setPageText(firstPage.text_content || '');
          setPageImagePreview(firstPage.image_url || null);
        }
      }
    } catch (error) {
      console.error('Error loading pages:', error);
    }
  };

  const handleCreateBook = async () => {
    if (!newBookNumber || !newTitle) {
      toast.error('일련번호와 제목을 입력해주세요');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('admin_insert_storybook', {
        admin_id_input: adminId,
        book_number_input: parseInt(newBookNumber),
        title_input: newTitle,
        description_input: newDescription || null
      });

      if (error) throw error;

      toast.success('동화책이 생성되었습니다');
      setIsCreateDialogOpen(false);
      setNewBookNumber('');
      setNewTitle('');
      setNewDescription('');
      loadBooks();
    } catch (error: any) {
      console.error('Error creating book:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('이미 존재하는 일련번호입니다');
      } else {
        toast.error('동화책 생성에 실패했습니다');
      }
    }
  };

  const handleSelectBook = (book: Storybook) => {
    setSelectedBook(book);
    setCurrentPageNumber(1);
    setPageText('');
    setPageImagePreview(null);
    setCoverImagePreview(book.cover_image_url);
    loadPages(book.id);
    setIsEditDialogOpen(true);
  };

  const handleTogglePublish = async (book: Storybook) => {
    try {
      const { error } = await supabase.rpc('admin_publish_storybook', {
        admin_id_input: adminId,
        book_id_input: book.id,
        publish_input: !book.is_published
      });

      if (error) throw error;

      toast.success(book.is_published ? '발행이 취소되었습니다' : '동화책이 발행되었습니다');
      loadBooks();
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast.error('발행 상태 변경에 실패했습니다');
    }
  };

  const handleDeleteBook = async () => {
    if (!bookToDelete) return;

    try {
      const { error } = await supabase.rpc('admin_delete_storybook', {
        admin_id_input: adminId,
        book_id_input: bookToDelete.id
      });

      if (error) throw error;

      toast.success('동화책이 삭제되었습니다');
      setIsDeleteDialogOpen(false);
      setBookToDelete(null);
      loadBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('동화책 삭제에 실패했습니다');
    }
  };

  const handleImageUpload = async (file: File, type: 'cover' | 'page') => {
    if (!selectedBook) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;

        const { data, error } = await supabase.functions.invoke('upload-storybook-image', {
          body: {
            admin_id: adminId,
            book_id: selectedBook.id,
            page_number: type === 'page' ? currentPageNumber : null,
            filename: file.name,
            image_base64: base64,
            image_type: type
          }
        });

        if (error) throw error;

        if (type === 'cover') {
          setCoverImagePreview(data.publicUrl);
          await supabase.rpc('admin_update_storybook_cover', {
            admin_id_input: adminId,
            book_id_input: selectedBook.id,
            cover_image_url_input: data.publicUrl
          });
          toast.success('표지 이미지가 업로드되었습니다');
        } else {
          setPageImagePreview(data.publicUrl);
          await supabase.rpc('admin_upsert_storybook_page', {
            admin_id_input: adminId,
            book_id_input: selectedBook.id,
            page_number_input: currentPageNumber,
            image_url_input: data.publicUrl,
            text_content_input: pageText || null
          });
          toast.success('페이지 이미지가 업로드되었습니다');
          loadPages(selectedBook.id);
        }

        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('이미지 업로드에 실패했습니다');
      setUploading(false);
    }
  };

  const handleSavePageText = async () => {
    if (!selectedBook) return;

    try {
      await supabase.rpc('admin_upsert_storybook_page', {
        admin_id_input: adminId,
        book_id_input: selectedBook.id,
        page_number_input: currentPageNumber,
        image_url_input: pageImagePreview || null,
        text_content_input: pageText || null
      });

      toast.success('페이지가 저장되었습니다');
      loadPages(selectedBook.id);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('저장에 실패했습니다');
    }
  };

  const handlePageChange = (newPageNumber: number) => {
    // Save current page first
    handleSavePageText();
    
    // Load new page content
    const page = pages.find(p => p.page_number === newPageNumber);
    setCurrentPageNumber(newPageNumber);
    setPageText(page?.text_content || '');
    setPageImagePreview(page?.image_url || null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-amber-600" />
            인문학 동화책 관리
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadBooks}>
              <RefreshCw className="w-4 h-4 mr-1" />
              새로고침
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-1" />
                  새 동화책
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 동화책 만들기</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>일련번호</Label>
                    <Input
                      type="number"
                      placeholder="예: 1"
                      value={newBookNumber}
                      onChange={(e) => setNewBookNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>제목</Label>
                    <Input
                      placeholder="동화책 제목"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>설명 (선택)</Label>
                    <Textarea
                      placeholder="동화책 설명"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCreateBook} className="w-full bg-amber-600 hover:bg-amber-700">
                    생성하기
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : books.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              등록된 동화책이 없습니다
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">번호</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-20">페이지</TableHead>
                  <TableHead className="w-20">상태</TableHead>
                  <TableHead className="w-32">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell className="font-medium">{book.book_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {book.cover_image_url && (
                          <img 
                            src={book.cover_image_url} 
                            alt={book.title}
                            className="w-10 h-14 object-cover rounded"
                          />
                        )}
                        <span>{book.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>{book.page_count}쪽</TableCell>
                    <TableCell>
                      <Badge variant={book.is_published ? 'default' : 'secondary'}>
                        {book.is_published ? '발행' : '비공개'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSelectBook(book)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleTogglePublish(book)}
                        >
                          {book.is_published ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setBookToDelete(book);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Book Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {selectedBook?.title} 편집
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="cover">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cover">표지</TabsTrigger>
              <TabsTrigger value="pages">본문 페이지</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cover" className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                {coverImagePreview ? (
                  <img 
                    src={coverImagePreview} 
                    alt="표지"
                    className="max-h-64 rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="w-48 h-64 bg-muted rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <Label htmlFor="cover-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700">
                      <Upload className="w-4 h-4" />
                      표지 이미지 업로드
                    </div>
                  </Label>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, 'cover');
                    }}
                    disabled={uploading}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="pages" className="space-y-4">
              {/* Page Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPageNumber - 1)}
                  disabled={currentPageNumber <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </Button>
                <span className="font-medium">
                  {currentPageNumber} 페이지
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPageNumber + 1)}
                >
                  다음
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Page Editor - Side by Side Layout */}
              <div className="grid grid-cols-2 gap-4">
                {/* Left: Image */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <ImageIcon className="w-4 h-4" />
                    삽화 (왼쪽 페이지)
                  </Label>
                  <div className="border rounded-lg p-4 min-h-[300px] flex flex-col items-center justify-center bg-muted/30">
                    {pageImagePreview ? (
                      <img 
                        src={pageImagePreview} 
                        alt={`${currentPageNumber}페이지`}
                        className="max-h-60 rounded"
                      />
                    ) : (
                      <ImageIcon className="w-16 h-16 text-muted-foreground" />
                    )}
                    <Label htmlFor="page-image-upload" className="cursor-pointer mt-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white text-sm rounded hover:bg-amber-700">
                        <Upload className="w-3 h-3" />
                        이미지 업로드
                      </div>
                    </Label>
                    <input
                      id="page-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'page');
                      }}
                      disabled={uploading}
                    />
                  </div>
                </div>

                {/* Right: Text */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    텍스트 (오른쪽 페이지)
                  </Label>
                  <Textarea
                    value={pageText}
                    onChange={(e) => setPageText(e.target.value)}
                    placeholder="이 페이지의 텍스트를 입력하세요..."
                    className="min-h-[300px] resize-none"
                  />
                </div>
              </div>

              <Button onClick={handleSavePageText} className="w-full">
                <Save className="w-4 h-4 mr-1" />
                이 페이지 저장
              </Button>

              {/* Page List */}
              <div className="mt-4">
                <Label>페이지 목록</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Array.from({ length: Math.max(selectedBook?.page_count || 0, currentPageNumber) }, (_, i) => i + 1).map((num) => {
                    const page = pages.find(p => p.page_number === num);
                    const hasContent = page?.image_url || page?.text_content;
                    return (
                      <Button
                        key={num}
                        variant={currentPageNumber === num ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(num)}
                        className={hasContent ? 'border-amber-500' : ''}
                      >
                        {num}
                      </Button>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePageChange((selectedBook?.page_count || 0) + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>동화책 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{bookToDelete?.title}"을(를) 삭제하시겠습니까? 
              모든 페이지와 이미지가 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBook} className="bg-destructive hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
