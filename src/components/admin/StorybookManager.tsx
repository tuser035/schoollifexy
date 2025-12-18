import { useState, useEffect, useRef } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import Papa from 'papaparse';
import ReactMarkdown from 'react-markdown';
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
  Save,
  FileSpreadsheet,
  Download,
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';

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
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Storybook | null>(null);
  const [previewBook, setPreviewBook] = useState<Storybook | null>(null);
  const [previewPages, setPreviewPages] = useState<StorybookPage[]>([]);
  const [previewPageNumber, setPreviewPageNumber] = useState(1);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  
  // TTS states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  
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
  const [pageSaving, setPageSaving] = useState(false);
  // CSV upload states
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // Description editing state
  const [editDescription, setEditDescription] = useState('');
  
  // Tab state for edit dialog
  const [editActiveTab, setEditActiveTab] = useState('cover');
  
  // Auto move to next page after save
  const [autoMoveEnabled, setAutoMoveEnabled] = useState(true);
  
  // Publish confirmation dialog
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [bookToPublish, setBookToPublish] = useState<Storybook | null>(null);
  
  // Recently edited book highlight
  const [recentlyEditedBookId, setRecentlyEditedBookId] = useState<string | null>(null);
  
  // Clear highlight after 3 seconds
  useEffect(() => {
    if (recentlyEditedBookId) {
      const timer = setTimeout(() => {
        setRecentlyEditedBookId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [recentlyEditedBookId]);

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

  const loadPages = async (bookId: string, targetPageNumber?: number) => {
    try {
      const { data, error } = await supabase.rpc('admin_get_storybook_pages', {
        admin_id_input: adminId,
        book_id_input: bookId
      });

      if (error) throw error;
      setPages(data || []);
      
      // Load target page content (default to page 1 if not specified)
      const pageToLoad = targetPageNumber || 1;
      if (data && data.length > 0) {
        const page = data.find((p: StorybookPage) => p.page_number === pageToLoad);
        if (page) {
          setPageText(page.text_content || '');
          setPageImagePreview(page.image_url || null);
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
    setEditDescription(book.description || '');
    setEditActiveTab('cover'); // Reset to cover tab when opening
    loadPages(book.id);
    setIsEditDialogOpen(true);
  };

  const handleSaveDescription = async () => {
    if (!selectedBook) return;
    
    try {
      const { error } = await supabase.rpc('admin_update_storybook_description', {
        admin_id_input: adminId,
        book_id_input: selectedBook.id,
        description_input: editDescription
      });

      if (error) throw error;
      toast.success('설명이 저장되었습니다');
      loadBooks();
      
      // 자동으로 본문 페이지 탭으로 전환
      setEditActiveTab('pages');
    } catch (error) {
      console.error('Error saving description:', error);
      toast.error('설명 저장에 실패했습니다');
    }
  };

  const handlePreviewBook = async (book: Storybook) => {
    try {
      const { data, error } = await supabase.rpc('admin_get_storybook_pages', {
        admin_id_input: adminId,
        book_id_input: book.id
      });

      if (error) throw error;
      
      setPreviewBook(book);
      setPreviewPages(data || []);
      setPreviewPageNumber(1);
      setIsPreviewDialogOpen(true);
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('미리보기를 불러오는데 실패했습니다');
    }
  };

  // TTS functions
  const handleTTS = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!text) {
      toast.error('읽을 텍스트가 없습니다');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = speechRate;
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const stopTTS = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Stop TTS when page changes or dialog closes
  useEffect(() => {
    stopTTS();
  }, [previewPageNumber, isPreviewDialogOpen]);

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

  const handleConfirmPublish = async () => {
    if (!bookToPublish) return;
    
    try {
      const { error } = await supabase.rpc('admin_publish_storybook', {
        admin_id_input: adminId,
        book_id_input: bookToPublish.id,
        publish_input: true
      });

      if (error) throw error;

      toast.success('동화책이 발행되었습니다');
      loadBooks();
    } catch (error) {
      console.error('Error publishing book:', error);
      toast.error('발행에 실패했습니다');
    } finally {
      setIsPublishConfirmOpen(false);
      setBookToPublish(null);
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
          loadPages(selectedBook.id, currentPageNumber);
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

  const handleSavePageText = async (moveToNext: boolean = false) => {
    if (!selectedBook) return;

    try {
      await supabase.rpc('admin_upsert_storybook_page', {
        admin_id_input: adminId,
        book_id_input: selectedBook.id,
        page_number_input: currentPageNumber,
        image_url_input: pageImagePreview || null,
        text_content_input: pageText || null
      });

      // 다음 페이지 데이터 로드하여 마지막 페이지인지 확인
      const { data: freshPages } = await supabase.rpc('admin_get_storybook_pages', {
        admin_id_input: adminId,
        book_id_input: selectedBook.id
      });
      
      if (freshPages) {
        setPages(freshPages);
      }
      
      // 현재 페이지가 마지막 페이지인지 확인 (콘텐츠가 있는 마지막 페이지)
      const maxPageWithContent = freshPages?.reduce((max: number, p: { page_number: number; image_url: string | null; text_content: string | null }) => {
        if (p.image_url || p.text_content) {
          return Math.max(max, p.page_number);
        }
        return max;
      }, 0) || 0;
      
      const isLastPage = currentPageNumber >= maxPageWithContent && currentPageNumber > 0;
      
      // 명시적으로 다음 페이지로 이동 요청된 경우
      if (moveToNext) {
        // 마지막 페이지에서 다음으로 이동하려는 경우 - 편집 완료
        if (isLastPage && (pageImagePreview || pageText)) {
          toast.success('🎉 편집이 완료되었습니다!', { 
            description: `총 ${currentPageNumber}페이지 편집 완료`,
            duration: 3000 
          });
          loadBooks(); // 페이지 수 업데이트
          setRecentlyEditedBookId(selectedBook.id); // 하이라이트 표시
          setIsEditDialogOpen(false); // 편집 다이얼로그 닫기
          
          // 미발행 상태인 경우 발행 확인 다이얼로그 표시
          if (!selectedBook.is_published) {
            setBookToPublish(selectedBook);
            setIsPublishConfirmOpen(true);
          }
          return;
        }
        
        const nextPageNumber = currentPageNumber + 1;
        const nextPage = freshPages?.find((p: { page_number: number }) => p.page_number === nextPageNumber);
        setCurrentPageNumber(nextPageNumber);
        setPageText(nextPage?.text_content || '');
        setPageImagePreview(nextPage?.image_url || null);
        
        toast.success(`${nextPageNumber}페이지로 이동했습니다`, { duration: 1500 });
      } else {
        toast.success('페이지가 저장되었습니다');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('저장에 실패했습니다');
    }
  };
  
  // 저장 없이 페이지 내용만 로드 (handlePageChange 내부용)
  const saveCurrentPageQuietly = async () => {
    if (!selectedBook) return;
    
    try {
      await supabase.rpc('admin_upsert_storybook_page', {
        admin_id_input: adminId,
        book_id_input: selectedBook.id,
        page_number_input: currentPageNumber,
        image_url_input: pageImagePreview || null,
        text_content_input: pageText || null
      });
    } catch (error) {
      console.error('Silent save error:', error);
    }
  };

  const handlePageChange = async (newPageNumber: number) => {
    if (!selectedBook || pageSaving) return;
    
    // 이전 페이지로 이동 (1페이지 미만 방지)
    if (newPageNumber < 1) return;
    
    setPageSaving(true);
    
    try {
      // Save current page first (quietly, without toast and auto-move)
      await saveCurrentPageQuietly();
      
      // Reload pages to get fresh data
      const { data: freshPages } = await supabase.rpc('admin_get_storybook_pages', {
        admin_id_input: adminId,
        book_id_input: selectedBook.id
      });
      
      if (freshPages) {
        setPages(freshPages);
      }
      
      // 마지막 페이지 번호 계산 (콘텐츠가 있는 마지막 페이지)
      const maxPageWithContent = freshPages?.reduce((max: number, p: { page_number: number; image_url: string | null; text_content: string | null }) => {
        if (p.image_url || p.text_content) {
          return Math.max(max, p.page_number);
        }
        return max;
      }, 0) || 0;
      
      // 마지막 페이지에서 다음으로 이동하려는 경우 - 자동 발행
      // 조건: 4페이지 이상 콘텐츠가 있고, 현재 페이지가 마지막 콘텐츠 페이지이며, 다음 페이지로 이동하려 할 때
      const isOnLastContentPage = currentPageNumber === maxPageWithContent;
      const hasEnoughContent = maxPageWithContent >= 4;
      const isMovingToNextPage = newPageNumber > currentPageNumber;
      
      if (isMovingToNextPage && isOnLastContentPage && hasEnoughContent) {
        // 미발행 상태인 경우 자동 발행
        if (!selectedBook.is_published) {
          await supabase.rpc('admin_publish_storybook', {
            admin_id_input: adminId,
            book_id_input: selectedBook.id,
            publish_input: true
          });
          
          toast.success('📚 발행되었습니다!', { 
            description: `"${selectedBook.title}" 총 ${maxPageWithContent}페이지`,
            duration: 3000 
          });
        } else {
          toast.success('🎉 편집이 완료되었습니다!', { 
            description: `총 ${maxPageWithContent}페이지`,
            duration: 3000 
          });
        }
        
        loadBooks();
        setRecentlyEditedBookId(selectedBook.id);
        setIsEditDialogOpen(false);
        return;
      }
      
      // Load new page content from fresh data
      const page = freshPages?.find((p: { page_number: number }) => p.page_number === newPageNumber);
      setCurrentPageNumber(newPageNumber);
      
      // Clear/initialize for new page
      setPageText(page?.text_content || '');
      setPageImagePreview(page?.image_url || null);
      
      toast.success(`${newPageNumber}페이지로 이동했습니다`);
    } catch (error) {
      console.error('Page change error:', error);
      toast.error('페이지 이동에 실패했습니다');
    } finally {
      setPageSaving(false);
    }
  };

  // CSV bulk upload handler
  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvUploading(true);
    setCsvProgress(0);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as { 번호: string; 제목: string; 설명?: string }[];
        const total = rows.length;
        let success = 0;
        let failed = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row.번호 || !row.제목) {
            failed++;
            continue;
          }

          try {
            await supabase.rpc('admin_insert_storybook', {
              admin_id_input: adminId,
              book_number_input: parseInt(row.번호),
              title_input: row.제목,
              description_input: row.설명 || null
            });
            success++;
          } catch (error) {
            failed++;
          }

          setCsvProgress(Math.round(((i + 1) / total) * 100));
        }

        setCsvUploading(false);
        setIsCsvDialogOpen(false);
        if (csvInputRef.current) csvInputRef.current.value = '';
        
        toast.success(`${success}권 등록 완료${failed > 0 ? `, ${failed}건 실패` : ''}`);
        loadBooks();
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        toast.error('CSV 파일을 읽는데 실패했습니다');
        setCsvUploading(false);
      }
    });
  };

  const downloadCsvTemplate = () => {
    const headers = ['번호', '제목', '설명'];
    const example = ['1', '아기돼지 삼형제', '유명한 동화'];
    const csvContent = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '동화책_일괄등록_양식.csv';
    link.click();
    toast.success('CSV 양식이 다운로드되었습니다');
  };

  const handleDownloadBookContent = async (book: Storybook) => {
    try {
      const { data, error } = await supabase.rpc('admin_get_storybook_pages', {
        admin_id_input: adminId,
        book_id_input: book.id
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('다운로드할 페이지가 없습니다');
        return;
      }

      const csvData = data.map((page: StorybookPage) => ({
        '페이지번호': page.page_number,
        '이미지URL': page.image_url || '',
        '텍스트내용': page.text_content || ''
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${book.title}_내용.csv`;
      link.click();
      toast.success(`"${book.title}" 내용이 다운로드되었습니다`);
    } catch (error) {
      console.error('Error downloading book content:', error);
      toast.error('다운로드에 실패했습니다');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-amber-600" />
              인문학 서점
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">이지영의 지혜의 강</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={loadBooks}>
              <RefreshCw className="w-4 h-4 mr-1" />
              새로고침
            </Button>
            <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                  CSV 일괄등록
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>CSV 일괄 등록</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    CSV 파일로 여러 동화책을 한 번에 등록할 수 있습니다.
                    <br />필수 컬럼: 번호, 제목 / 선택 컬럼: 설명
                  </div>
                  <Button variant="outline" onClick={downloadCsvTemplate} className="w-full">
                    <Download className="w-4 h-4 mr-1" />
                    CSV 양식 다운로드
                  </Button>
                  <div>
                    <Label htmlFor="csv-upload">CSV 파일 선택</Label>
                    <Input
                      id="csv-upload"
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      disabled={csvUploading}
                      className="mt-1"
                    />
                  </div>
                  {csvUploading && (
                    <div className="space-y-2">
                      <Progress value={csvProgress} />
                      <p className="text-sm text-center text-muted-foreground">{csvProgress}% 처리 중...</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-1" />
                  새 동화책
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>새 동화책 만들기</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                  <div>
                    <Label>설명 (마크다운 지원)</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {/* 입력 영역 */}
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">입력</p>
                        <Textarea
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                          placeholder="마크다운 형식으로 입력하세요...&#10;&#10;예시:&#10;# 제목&#10;## 소제목&#10;**굵게** *기울임*&#10;- 목록 항목"
                          className="min-h-[150px] resize-none font-mono text-sm"
                        />
                      </div>
                      {/* 미리보기 영역 */}
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">미리보기</p>
                        <div className="min-h-[150px] p-3 border rounded-md bg-muted/30 overflow-auto prose prose-sm max-w-none">
                          {newDescription ? (
                            <ReactMarkdown>{newDescription}</ReactMarkdown>
                          ) : (
                            <p className="text-muted-foreground italic">미리보기가 여기에 표시됩니다...</p>
                          )}
                        </div>
                      </div>
                    </div>
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
                  <TableHead className="max-w-[200px]">설명</TableHead>
                  <TableHead className="w-20">페이지</TableHead>
                  <TableHead className="w-20">상태</TableHead>
                  <TableHead className="w-32">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.map((book) => (
                  <TableRow 
                    key={book.id}
                    className={recentlyEditedBookId === book.id ? 'bg-emerald-100 dark:bg-emerald-900/30 animate-pulse' : ''}
                  >
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
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                      {book.description || '-'}
                    </TableCell>
                    <TableCell>{book.page_count}쪽</TableCell>
                    <TableCell>
                      <Badge 
                        variant={book.is_published ? 'default' : 'secondary'}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleTogglePublish(book)}
                      >
                        {book.is_published ? '발행' : '비공개'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handlePreviewBook(book)}
                          title="미리보기"
                          className="text-amber-600 hover:text-amber-700"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSelectBook(book)}
                          title="편집"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownloadBookContent(book)}
                          title="내용 다운로드"
                          className="text-green-600 hover:text-green-700"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleTogglePublish(book)}
                          title={book.is_published ? '발행 취소' : '발행'}
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
          
          <Tabs value={editActiveTab} onValueChange={setEditActiveTab}>
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
              
              {/* Description Edit Section - Markdown */}
              <div className="mt-6 space-y-2">
                <Label className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  책 설명 (마크다운 지원)
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  {/* 입력 영역 */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">입력</p>
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="마크다운 형식으로 입력하세요...&#10;&#10;예시:&#10;# 제목&#10;## 소제목&#10;**굵게** *기울임*&#10;- 목록 항목"
                      className="min-h-[200px] resize-none font-mono text-sm"
                    />
                  </div>
                  {/* 미리보기 영역 */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">미리보기</p>
                    <div className="min-h-[200px] p-3 border rounded-md bg-muted/30 overflow-auto prose prose-sm max-w-none">
                      {editDescription ? (
                        <ReactMarkdown>{editDescription}</ReactMarkdown>
                      ) : (
                        <p className="text-muted-foreground italic">미리보기가 여기에 표시됩니다...</p>
                      )}
                    </div>
                  </div>
                </div>
                <Button onClick={handleSaveDescription} className="w-full bg-amber-600 hover:bg-amber-700">
                  <Save className="w-4 h-4 mr-1" />
                  설명 저장
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="pages" className="space-y-4">
              {/* Page Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPageNumber - 1)}
                  disabled={currentPageNumber <= 1 || pageSaving}
                >
                  {pageSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" />
                  )}
                  이전
                </Button>
                <span className="font-medium">
                  {pageSaving ? (
                    <span className="flex items-center gap-2 text-amber-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      저장 중...
                    </span>
                  ) : (
                    `${currentPageNumber} 페이지`
                  )}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPageNumber + 1)}
                  disabled={pageSaving}
                >
                  다음
                  {pageSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
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

              {/* Auto-move toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">저장 후 다음 페이지로 자동 이동</span>
                </div>
                <Switch 
                  checked={autoMoveEnabled} 
                  onCheckedChange={setAutoMoveEnabled}
                />
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

      {/* Publish Confirmation */}
      <AlertDialog open={isPublishConfirmOpen} onOpenChange={setIsPublishConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>동화책 발행</AlertDialogTitle>
            <AlertDialogDescription>
              "{bookToPublish?.title}"을(를) 발행하시겠습니까?
              발행하면 학생들이 이 동화책을 읽을 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              toast.info('📚 미발행 도서는 목록에서 발행 버튼을 눌러 언제든지 발행할 수 있습니다', { duration: 4000 });
              setBookToPublish(null);
            }}>
              나중에
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPublish} className="bg-emerald-600 hover:bg-emerald-700">
              발행하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={(open) => {
        if (!open) stopTTS();
        setIsPreviewDialogOpen(open);
        if (!open) setIsPreviewFullscreen(false);
      }}>
        <DialogContent className={`overflow-hidden p-0 ${isPreviewFullscreen ? 'max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none' : 'max-w-5xl max-h-[90vh]'}`}>
          <DialogHeader className="px-6 pt-4 pb-2 flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-600" />
              {previewBook?.title} - 미리보기
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPreviewFullscreen(!isPreviewFullscreen)}
              className="mr-8"
            >
              {isPreviewFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          </DialogHeader>
          
          <div className={`flex flex-col ${isPreviewFullscreen ? 'h-[calc(100vh-80px)]' : 'h-[70vh]'}`}>
            {/* Page Content */}
            <div className="flex-1 overflow-hidden">
              {previewPages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  등록된 페이지가 없습니다
                </div>
              ) : (
                <div className="grid grid-cols-2 h-full">
                  {/* Left: Image */}
                  <div className="bg-amber-50 flex items-center justify-center p-4 overflow-hidden">
                    {previewPages.find(p => p.page_number === previewPageNumber)?.image_url ? (
                      <img 
                        src={previewPages.find(p => p.page_number === previewPageNumber)?.image_url || ''}
                        alt={`${previewPageNumber}페이지`}
                        className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                      />
                    ) : (
                      <div className="text-muted-foreground flex flex-col items-center gap-2">
                        <ImageIcon className="w-16 h-16" />
                        <span>이미지 없음</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Right: Text */}
                  <div className="bg-amber-100/50 p-6 overflow-y-auto">
                    {(() => {
                      const currentPage = previewPages.find(p => p.page_number === previewPageNumber);
                      const textContent = currentPage?.text_content || '';
                      const lines = textContent.split('\n');
                      const subtitle = lines[0] || '';
                      const body = lines.slice(1).join('\n');
                      
                      return (
                        <div className="space-y-4">
                          {subtitle && (
                            <h3 className={`font-semibold text-amber-700 ${isPreviewFullscreen ? 'text-2xl' : 'text-xl'}`}>
                              📖 {subtitle}
                            </h3>
                          )}
                          {body && (
                            <div className={`leading-relaxed whitespace-pre-wrap indent-6 ${isPreviewFullscreen ? 'text-lg' : 'text-base'}`}>
                              {body}
                            </div>
                          )}
                          {!textContent && (
                            <div className="text-muted-foreground text-center py-8">
                              텍스트 없음
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
            
            {/* TTS Controls */}
            <div className="flex items-center justify-center gap-4 px-6 py-2 border-t bg-amber-50/50">
              <Button
                variant={isSpeaking ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  const currentPage = previewPages.find(p => p.page_number === previewPageNumber);
                  handleTTS(currentPage?.text_content || '');
                }}
                className={isSpeaking ? 'bg-amber-600 hover:bg-amber-700' : ''}
              >
                {isSpeaking ? <Pause className="w-4 h-4 mr-1" /> : <Volume2 className="w-4 h-4 mr-1" />}
                {isSpeaking ? '멈춤' : '읽어주기'}
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>속도</span>
                <Slider
                  value={[speechRate]}
                  onValueChange={([val]) => setSpeechRate(val)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="w-24"
                />
                <span className="w-8">{speechRate}x</span>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/30">
              <Button
                variant="outline"
                onClick={() => setPreviewPageNumber(prev => Math.max(1, prev - 1))}
                disabled={previewPageNumber <= 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                이전
              </Button>
              
              <div className="flex items-center gap-2">
                {previewPages.map((_, idx) => (
                  <Button
                    key={idx + 1}
                    variant={previewPageNumber === idx + 1 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewPageNumber(idx + 1)}
                    className="w-8 h-8 p-0"
                  >
                    {idx + 1}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                onClick={() => setPreviewPageNumber(prev => Math.min(previewPages.length, prev + 1))}
                disabled={previewPageNumber >= previewPages.length}
              >
                다음
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
