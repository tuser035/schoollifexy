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
  ChevronLeft,
  ChevronRight,
  Save,
  Download,
  Loader2,
  Play,
  Pause,
  Volume2,
  Maximize,
  Minimize,
  Link,
  ExternalLink,
  PenLine
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface Storybook {
  id: string;
  book_number: number;
  title: string;
  subtitle: string | null;
  cover_image_url: string | null;
  description: string | null;
  external_url: string | null;
  page_count: number;
  is_published: boolean;
  created_at: string;
  category: string | null;
}

// 카테고리 옵션
const CATEGORY_OPTIONS = [
  { value: 'recommended', label: '추천' },
  { value: 'philosophy', label: '철학' },
  { value: 'classic', label: '고전' },
  { value: 'science', label: '과학' },
  { value: 'history', label: '역사' },
  { value: 'art', label: '예술' },
  { value: 'poetry', label: '시집' },
];

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
  
  // Description editing state
  const [editDescription, setEditDescription] = useState('');
  
  // Tab state for edit dialog
  const [editActiveTab, setEditActiveTab] = useState('cover');
  
  // Auto move to next page after save
  const [autoMoveEnabled, setAutoMoveEnabled] = useState(true);
  
  // Publish confirmation dialog
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [bookToPublish, setBookToPublish] = useState<Storybook | null>(null);
  
  // Page delete confirmation dialog
  const [isPageDeleteDialogOpen, setIsPageDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<number | null>(null);
  
  // Recently edited book highlight
  const [recentlyEditedBookId, setRecentlyEditedBookId] = useState<string | null>(null);
  
  // Real-time update indicator
  const [realtimeUpdated, setRealtimeUpdated] = useState(false);
  
  // Title editing state
  const [editingTitleBookId, setEditingTitleBookId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  
  // Book number editing state
  const [editingBookNumberId, setEditingBookNumberId] = useState<string | null>(null);
  const [editingBookNumberValue, setEditingBookNumberValue] = useState<number>(0);
  
  // Description editing state
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [editingDescriptionValue, setEditingDescriptionValue] = useState('');
  
  // Inline cover image upload
  const [uploadingCoverBookId, setUploadingCoverBookId] = useState<string | null>(null);
  const inlineCoverInputRef = useRef<HTMLInputElement>(null);
  const [inlineCoverBookId, setInlineCoverBookId] = useState<string | null>(null);
  
  // Subtitle editing state
  const [editingSubtitleId, setEditingSubtitleId] = useState<string | null>(null);
  const [editingSubtitleValue, setEditingSubtitleValue] = useState('');
  
  // External URL dialog state
  const [isExternalUrlDialogOpen, setIsExternalUrlDialogOpen] = useState(false);
  const [externalUrlTitle, setExternalUrlTitle] = useState('');
  const [externalUrlValue, setExternalUrlValue] = useState('');
  const [externalUrlBookNumber, setExternalUrlBookNumber] = useState('');
  
  // Poetry dialog state
  const [isPoetryDialogOpen, setIsPoetryDialogOpen] = useState(false);
  const [poetryBookNumber, setPoetryBookNumber] = useState('');
  const [poetryTitle, setPoetryTitle] = useState('');
  const [poetryDescription, setPoetryDescription] = useState('');
  
  // Main content type tab state
  const [mainContentTab, setMainContentTab] = useState<'storybook' | 'poetry'>('storybook');
  
  // Poetry collection form state
  const [poetryCollectionTitle, setPoetryCollectionTitle] = useState('');
  const [poetryCollectionPoet, setPoetryCollectionPoet] = useState('');
  const [poetryPoemTitle, setPoetryPoemTitle] = useState('');
  const [poetryPoemContent, setPoetryPoemContent] = useState('');
  const [poetryHashtags, setPoetryHashtags] = useState('');
  const [savingPoetry, setSavingPoetry] = useState(false);
  
  // Poetry collections list state
  interface PoetryCollection {
    id: string;
    title: string;
    poet: string;
    hashtags: string[] | null;
    poem_count: number;
    is_published: boolean;
    cover_image_url: string | null;
    created_at: string;
  }
  const [poetryCollections, setPoetryCollections] = useState<PoetryCollection[]>([]);
  const [loadingPoetry, setLoadingPoetry] = useState(false);
  const [poetryToDelete, setPoetryToDelete] = useState<PoetryCollection | null>(null);
  const [isPoetryDeleteDialogOpen, setIsPoetryDeleteDialogOpen] = useState(false);
  
  // Poetry preview state
  interface Poem {
    id: string;
    title: string;
    content: string;
    poem_order: number;
  }
  const [selectedPoetryCollection, setSelectedPoetryCollection] = useState<PoetryCollection | null>(null);
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loadingPoems, setLoadingPoems] = useState(false);
  const [isPoetryPreviewOpen, setIsPoetryPreviewOpen] = useState(false);
  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);

  // Page count editing state
  const [editingPageCountId, setEditingPageCountId] = useState<string | null>(null);
  const [editingPageCountValue, setEditingPageCountValue] = useState<number>(0);
  
  // Category editing state
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  
  // Recommended books state (학기별 추천도서)
  interface RecommendedBook {
    id: string;
    title: string;
    author: string | null;
    description: string | null;
    year: number;
    quarter: number;
    display_order: number | null;
    is_active: boolean;
    created_at: string;
  }
  const [recommendedBooks, setRecommendedBooks] = useState<RecommendedBook[]>([]);
  const [loadingRecommendedBooks, setLoadingRecommendedBooks] = useState(false);
  const [newRecBookTitle, setNewRecBookTitle] = useState('');
  const [newRecBookAuthor, setNewRecBookAuthor] = useState('');
  const [newRecBookDescription, setNewRecBookDescription] = useState('');
  const [newRecBookYear, setNewRecBookYear] = useState(new Date().getFullYear());
  const [newRecBookQuarter, setNewRecBookQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [savingRecBook, setSavingRecBook] = useState(false);
  const [recBookToDelete, setRecBookToDelete] = useState<RecommendedBook | null>(null);
  const [isRecBookDeleteDialogOpen, setIsRecBookDeleteDialogOpen] = useState(false);
  const [editingRecBook, setEditingRecBook] = useState<RecommendedBook | null>(null);
  const [isRecBookEditDialogOpen, setIsRecBookEditDialogOpen] = useState(false);
  const [editRecBookTitle, setEditRecBookTitle] = useState('');
  const [editRecBookAuthor, setEditRecBookAuthor] = useState('');
  const [editRecBookDescription, setEditRecBookDescription] = useState('');
  const [editRecBookDisplayOrder, setEditRecBookDisplayOrder] = useState(1);
  
  // Clear highlight after 3 seconds
  useEffect(() => {
    if (recentlyEditedBookId) {
      const timer = setTimeout(() => {
        setRecentlyEditedBookId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [recentlyEditedBookId]);
  
  // Clear realtime indicator after 2 seconds
  useEffect(() => {
    if (realtimeUpdated) {
      const timer = setTimeout(() => {
        setRealtimeUpdated(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [realtimeUpdated]);

  useEffect(() => {
    loadBooks();
    loadPoetryCollections();
    loadRecommendedBooks();
  }, [adminId]);
  
  // Real-time subscription for storybooks
  useEffect(() => {
    const channel = supabase
      .channel('storybooks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'storybooks'
        },
        () => {
          setRealtimeUpdated(true);
          loadBooks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_get_storybooks', {
        admin_id_input: adminId
      });

      if (error) throw error;
      // RPC에서 subtitle, category를 반환하지 않으면 기본값 추가
      const booksWithDefaults = (data || []).map((book: any) => ({
        ...book,
        subtitle: book.subtitle ?? null,
        category: book.category ?? 'recommended'
      }));
      setBooks(booksWithDefaults);
    } catch (error) {
      console.error('Error loading books:', error);
      toast.error('동화책 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // Load poetry collections
  const loadPoetryCollections = async () => {
    try {
      setLoadingPoetry(true);
      const { data, error } = await supabase.rpc('admin_get_poetry_collections', {
        admin_id_input: adminId
      });

      if (error) throw error;
      setPoetryCollections(data || []);
    } catch (error) {
      console.error('Error loading poetry collections:', error);
      toast.error('시집 목록을 불러오는데 실패했습니다');
    } finally {
      setLoadingPoetry(false);
    }
  };

  // Load recommended books
  const loadRecommendedBooks = async () => {
    try {
      setLoadingRecommendedBooks(true);
      const { data, error } = await supabase.rpc('admin_get_recommended_books', {
        admin_id_input: adminId
      });

      if (error) throw error;
      setRecommendedBooks(data || []);
    } catch (error) {
      console.error('Error loading recommended books:', error);
      toast.error('추천도서 목록을 불러오는데 실패했습니다');
    } finally {
      setLoadingRecommendedBooks(false);
    }
  };

  // Create recommended book
  const handleCreateRecommendedBook = async () => {
    if (!newRecBookTitle.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }

    try {
      setSavingRecBook(true);
      const { error } = await supabase.rpc('admin_insert_recommended_book', {
        admin_id_input: adminId,
        title_input: newRecBookTitle.trim(),
        author_input: newRecBookAuthor.trim() || null,
        description_input: newRecBookDescription.trim() || null,
        year_input: newRecBookYear,
        quarter_input: newRecBookQuarter
      });

      if (error) throw error;

      toast.success('추천도서가 등록되었습니다');
      setNewRecBookTitle('');
      setNewRecBookAuthor('');
      setNewRecBookDescription('');
      loadRecommendedBooks();
    } catch (error) {
      console.error('Error creating recommended book:', error);
      toast.error('추천도서 등록에 실패했습니다');
    } finally {
      setSavingRecBook(false);
    }
  };

  // Update recommended book
  const handleUpdateRecommendedBook = async () => {
    if (!editingRecBook || !editRecBookTitle.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }

    try {
      setSavingRecBook(true);
      const { error } = await supabase.rpc('admin_update_recommended_book', {
        admin_id_input: adminId,
        book_id_input: editingRecBook.id,
        title_input: editRecBookTitle.trim(),
        author_input: editRecBookAuthor.trim() || null,
        description_input: editRecBookDescription.trim() || null,
        display_order_input: editRecBookDisplayOrder
      });

      if (error) throw error;

      toast.success('추천도서가 수정되었습니다');
      setIsRecBookEditDialogOpen(false);
      setEditingRecBook(null);
      loadRecommendedBooks();
    } catch (error) {
      console.error('Error updating recommended book:', error);
      toast.error('추천도서 수정에 실패했습니다');
    } finally {
      setSavingRecBook(false);
    }
  };

  // Delete recommended book
  const handleDeleteRecommendedBook = async () => {
    if (!recBookToDelete) return;

    try {
      const { error } = await supabase.rpc('admin_delete_recommended_book', {
        admin_id_input: adminId,
        book_id_input: recBookToDelete.id
      });

      if (error) throw error;

      toast.success('추천도서가 삭제되었습니다');
      setIsRecBookDeleteDialogOpen(false);
      setRecBookToDelete(null);
      loadRecommendedBooks();
    } catch (error) {
      console.error('Error deleting recommended book:', error);
      toast.error('추천도서 삭제에 실패했습니다');
    }
  };

  // Toggle recommended book active status
  const handleToggleRecommendedBookActive = async (book: RecommendedBook) => {
    try {
      const { error } = await supabase.rpc('admin_update_recommended_book', {
        admin_id_input: adminId,
        book_id_input: book.id,
        title_input: book.title,
        is_active_input: !book.is_active
      });

      if (error) throw error;

      toast.success(book.is_active ? '비활성화되었습니다' : '활성화되었습니다');
      loadRecommendedBooks();
    } catch (error) {
      console.error('Error toggling recommended book active:', error);
      toast.error('상태 변경에 실패했습니다');
    }
  };

  // Open edit dialog
  const openRecBookEditDialog = (book: RecommendedBook) => {
    setEditingRecBook(book);
    setEditRecBookTitle(book.title);
    setEditRecBookAuthor(book.author || '');
    setEditRecBookDescription(book.description || '');
    setEditRecBookDisplayOrder(book.display_order || 1);
    setIsRecBookEditDialogOpen(true);
  };

  // Toggle poetry collection publish status
  const handleTogglePoetryPublish = async (collection: PoetryCollection) => {
    try {
      const { error } = await supabase.rpc('admin_publish_poetry_collection', {
        admin_id_input: adminId,
        collection_id_input: collection.id,
        publish_input: !collection.is_published
      });

      if (error) throw error;

      toast.success(collection.is_published ? '발행이 취소되었습니다' : '시집이 발행되었습니다');
      loadPoetryCollections();
    } catch (error) {
      console.error('Error toggling poetry publish:', error);
      toast.error('발행 상태 변경에 실패했습니다');
    }
  };

  // Delete poetry collection
  const handleDeletePoetryCollection = async () => {
    if (!poetryToDelete) return;

    try {
      const { error } = await supabase.rpc('admin_delete_poetry_collection', {
        admin_id_input: adminId,
        collection_id_input: poetryToDelete.id
      });

      if (error) throw error;

      toast.success('시집이 삭제되었습니다');
      setIsPoetryDeleteDialogOpen(false);
      setPoetryToDelete(null);
      loadPoetryCollections();
    } catch (error) {
      console.error('Error deleting poetry collection:', error);
      toast.error('시집 삭제에 실패했습니다');
    }
  };

  // Load poems for preview
  const loadPoems = async (collection: PoetryCollection) => {
    try {
      setLoadingPoems(true);
      setSelectedPoetryCollection(collection);
      setIsPoetryPreviewOpen(true);
      setCurrentPoemIndex(0);
      
      const { data, error } = await supabase.rpc('admin_get_poems', {
        admin_id_input: adminId,
        collection_id_input: collection.id
      });

      if (error) throw error;
      setPoems(data || []);
    } catch (error) {
      console.error('Error loading poems:', error);
      toast.error('시 목록을 불러오는데 실패했습니다');
    } finally {
      setLoadingPoems(false);
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

  const handleCreateExternalUrlBook = async () => {
    if (!externalUrlBookNumber || !externalUrlTitle || !externalUrlValue) {
      toast.error('일련번호, 제목, URL을 모두 입력해주세요');
      return;
    }

    // URL 유효성 검사
    try {
      new URL(externalUrlValue);
    } catch {
      toast.error('올바른 URL 형식을 입력해주세요');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('admin_insert_storybook', {
        admin_id_input: adminId,
        book_number_input: parseInt(externalUrlBookNumber),
        title_input: externalUrlTitle,
        description_input: null,
        external_url_input: externalUrlValue
      });

      if (error) throw error;

      toast.success('외부 URL 동화책이 생성되었습니다');
      setIsExternalUrlDialogOpen(false);
      setExternalUrlBookNumber('');
      setExternalUrlTitle('');
      setExternalUrlValue('');
      loadBooks();
    } catch (error: any) {
      console.error('Error creating external URL book:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('이미 존재하는 일련번호입니다');
      } else {
        toast.error('동화책 생성에 실패했습니다');
      }
    }
  };

  const handleCreatePoetryBook = async () => {
    if (!poetryBookNumber || !poetryTitle) {
      toast.error('일련번호와 제목을 입력해주세요');
      return;
    }

    try {
      // 시집 생성 후 카테고리를 poetry로 업데이트
      const { data, error } = await supabase.rpc('admin_insert_storybook', {
        admin_id_input: adminId,
        book_number_input: parseInt(poetryBookNumber),
        title_input: poetryTitle,
        description_input: poetryDescription || null
      });

      if (error) throw error;

      // 생성된 책의 카테고리를 poetry로 업데이트
      if (data) {
        await supabase.rpc('admin_update_storybook_category', {
          admin_id_input: adminId,
          book_id_input: data,
          category_input: 'poetry'
        });
      }

      toast.success('시집이 생성되었습니다');
      setIsPoetryDialogOpen(false);
      setPoetryBookNumber('');
      setPoetryTitle('');
      setPoetryDescription('');
      loadBooks();
    } catch (error: any) {
      console.error('Error creating poetry book:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('이미 존재하는 일련번호입니다');
      } else {
        toast.error('시집 생성에 실패했습니다');
      }
    }
  };

  // 시집 컬렉션 저장 핸들러
  const handleSavePoetryCollection = async () => {
    if (!poetryCollectionTitle.trim() || !poetryCollectionPoet.trim()) {
      toast.error('시집 제목과 시인을 입력해주세요');
      return;
    }

    if (!poetryPoemTitle.trim() || !poetryPoemContent.trim()) {
      toast.error('시 제목과 내용을 입력해주세요');
      return;
    }

    setSavingPoetry(true);
    try {
      // 해시태그 파싱
      const hashtagsArray = poetryHashtags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // 시집 생성
      const { data: collectionId, error: collectionError } = await supabase.rpc('admin_insert_poetry_collection', {
        admin_id_input: adminId,
        title_input: poetryCollectionTitle.trim(),
        poet_input: poetryCollectionPoet.trim(),
        hashtags_input: hashtagsArray.length > 0 ? hashtagsArray : null
      });

      if (collectionError) throw collectionError;

      // 시 추가
      const { error: poemError } = await supabase.rpc('admin_insert_poem', {
        admin_id_input: adminId,
        collection_id_input: collectionId,
        title_input: poetryPoemTitle.trim(),
        content_input: poetryPoemContent.trim(),
        poem_order_input: 1
      });

      if (poemError) throw poemError;

      toast.success('시집이 성공적으로 저장되었습니다');
      
      // 폼 초기화
      setPoetryCollectionTitle('');
      setPoetryCollectionPoet('');
      setPoetryPoemTitle('');
      setPoetryPoemContent('');
      setPoetryHashtags('');
      
      // 시집 목록 새로고침
      loadPoetryCollections();
    } catch (error: any) {
      console.error('Error saving poetry collection:', error);
      toast.error('시집 저장에 실패했습니다');
    } finally {
      setSavingPoetry(false);
    }
  };

  // CSV 업로드로 시집 일괄 등록
  const handlePoetryCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data as any[];
          
          if (rows.length === 0) {
            toast.error('CSV 파일에 데이터가 없습니다');
            return;
          }

          // 첫 번째 행의 키로 헤더 확인
          const headers = Object.keys(rows[0]);
          console.log('CSV 헤더:', headers);
          
          // 헤더 정규화 함수
          const normalizeKey = (key: string) => key?.replace(/\s+/g, '').toLowerCase() || '';
          
          const findHeader = (...possibleNames: string[]) => {
            for (const header of headers) {
              const normalizedHeader = normalizeKey(header);
              for (const name of possibleNames) {
                if (normalizedHeader === normalizeKey(name)) {
                  return header;
                }
              }
            }
            return null;
          };
          
          const collectionTitleKey = findHeader('시집제목', '시집 제목', 'title');
          const poetKey = findHeader('시인', 'poet');
          const poemTitleKey = findHeader('시제목', '시 제목', 'poem_title');
          const poemContentKey = findHeader('시내용', '시 내용', 'content');
          const hashtagsKey = findHeader('해시태그', '해시 태그', 'hashtags');
          
          if (!collectionTitleKey || !poetKey || !poemTitleKey || !poemContentKey) {
            toast.error('CSV 첫 줄에 올바른 헤더가 필요합니다: 시집 제목, 시인, 시 제목, 시 내용');
            return;
          }

          // 시집별로 시들을 그룹화
          const collectionsMap = new Map<string, {
            poet: string;
            hashtags: string;
            poems: Array<{ title: string; content: string; order: number }>;
          }>();

          let skipCount = 0;
          
          for (const row of rows) {
            const collectionTitle = row[collectionTitleKey]?.trim() || '';
            const poet = row[poetKey]?.trim() || '';
            const poemTitle = row[poemTitleKey]?.trim() || '';
            const poemContent = row[poemContentKey]?.trim() || '';
            const hashtags = hashtagsKey ? (row[hashtagsKey]?.trim() || '') : '';

            if (!collectionTitle || !poet || !poemTitle || !poemContent) {
              console.log('Skipping row due to missing fields:', { collectionTitle, poet, poemTitle, poemContent: poemContent?.substring(0, 50) });
              skipCount++;
              continue;
            }

            const key = `${collectionTitle}|||${poet}`;
            if (!collectionsMap.has(key)) {
              collectionsMap.set(key, {
                poet,
                hashtags,
                poems: []
              });
            }

            const collection = collectionsMap.get(key)!;
            collection.poems.push({
              title: poemTitle.trim(),
              content: poemContent.trim(),
              order: collection.poems.length + 1
            });
          }

          let successCount = 0;
          let errorCount = 0;

          // 각 시집 생성 및 시 추가
          for (const [key, data] of collectionsMap) {
            const [collectionTitle] = key.split('|||');
            
            try {
              const hashtagsArray = data.hashtags
                .split(',')
                .map((tag: string) => tag.trim())
                .filter((tag: string) => tag.length > 0);

              // 시집 생성
              const { data: collectionId, error: collectionError } = await supabase.rpc('admin_insert_poetry_collection', {
                admin_id_input: adminId,
                title_input: collectionTitle.trim(),
                poet_input: data.poet.trim(),
                hashtags_input: hashtagsArray.length > 0 ? hashtagsArray : null
              });

              if (collectionError) {
                console.error('Error creating collection:', collectionTitle, collectionError);
                throw collectionError;
              }

              // 시집에 모든 시 추가
              for (const poem of data.poems) {
                const { error: poemError } = await supabase.rpc('admin_insert_poem', {
                  admin_id_input: adminId,
                  collection_id_input: collectionId,
                  title_input: poem.title,
                  content_input: poem.content,
                  poem_order_input: poem.order
                });

                if (poemError) {
                  console.error('Error creating poem:', poem.title, poemError);
                }
              }

              successCount++;
            } catch (error) {
              console.error('Error creating poetry collection:', collectionTitle, error);
              errorCount++;
            }
          }

          if (successCount > 0) {
            toast.success(`${successCount}개의 시집이 등록되었습니다 (총 ${rows.length - skipCount}편의 시)`);
          }
          if (errorCount > 0) {
            toast.error(`${errorCount}개의 시집 등록에 실패했습니다`);
          }
          if (skipCount > 0) {
            toast.warning(`${skipCount}개의 행이 필수 필드 누락으로 건너뛰었습니다`);
          }
        },
        error: (error) => {
          console.error('CSV parse error:', error);
          toast.error('CSV 파일 파싱에 실패했습니다');
        }
      });
    } catch (error) {
      console.error('Error reading CSV:', error);
      toast.error('CSV 파일을 읽는데 실패했습니다');
    }

    // Reset input
    e.target.value = '';
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
    // 외부 URL이 있는 경우 새 탭에서 열기
    if (book.external_url) {
      window.open(book.external_url, '_blank', 'noopener,noreferrer');
      return;
    }

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

  // Delete a specific page from preview
  const handleDeletePreviewPage = async () => {
    if (!previewBook || pageToDelete === null) return;
    
    try {
      const pageToRemove = previewPages.find(p => p.page_number === pageToDelete);
      if (!pageToRemove) {
        toast.error('삭제할 페이지를 찾을 수 없습니다');
        return;
      }

      // Set admin session first
      await supabase.rpc('set_admin_session', { admin_id_input: adminId });

      // Delete the page from database
      const { error: deleteError } = await supabase
        .from('storybook_pages')
        .delete()
        .eq('id', pageToRemove.id);

      if (deleteError) throw deleteError;

      // Update preview pages
      const updatedPages = previewPages.filter(p => p.page_number !== pageToDelete);
      setPreviewPages(updatedPages);
      
      // Adjust current page number if needed
      if (updatedPages.length === 0) {
        setPreviewPageNumber(1);
      } else if (previewPageNumber > updatedPages.length) {
        setPreviewPageNumber(updatedPages.length);
      }
      
      // 콘텐츠가 있는 페이지 수 계산 (이미지 또는 텍스트가 있는 페이지만)
      const pagesWithContent = updatedPages.filter(p => p.image_url || p.text_content).length;
      
      // Update page count using RPC function
      const { error: updateError } = await supabase.rpc('admin_update_storybook_page_count', {
        admin_id_input: adminId,
        book_id_input: previewBook.id,
        page_count_input: pagesWithContent
      });

      if (updateError) {
        console.error('Error updating page count:', updateError);
      }

      // Update local previewBook state
      setPreviewBook(prev => prev ? { ...prev, page_count: pagesWithContent } : null);

      toast.success(`${pageToDelete}페이지가 삭제되었습니다`);
      
      // Reload books to reflect changes in list
      await loadBooks();
      
      setIsPageDeleteDialogOpen(false);
      setPageToDelete(null);
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('페이지 삭제에 실패했습니다');
    }
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

  const handleUpdateCategory = async (bookId: string, newCategory: string) => {
    setSavingCategoryId(bookId);
    try {
      const { error } = await supabase.rpc('admin_update_storybook_category', {
        admin_id_input: adminId,
        book_id_input: bookId,
        category_input: newCategory
      });

      if (error) throw error;

      toast.success('카테고리가 변경되었습니다');
      loadBooks();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('카테고리 변경에 실패했습니다');
    } finally {
      setSavingCategoryId(null);
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

  const handleStartEditTitle = (book: Storybook) => {
    setEditingTitleBookId(book.id);
    setEditingTitleValue(book.title);
  };

  const handleSaveTitle = async () => {
    if (!editingTitleBookId || !editingTitleValue.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }

    try {
      const { error } = await supabase.rpc('admin_update_storybook_title', {
        admin_id_input: adminId,
        book_id_input: editingTitleBookId,
        title_input: editingTitleValue.trim()
      });

      if (error) throw error;

      toast.success('제목이 수정되었습니다');
      setEditingTitleBookId(null);
      setEditingTitleValue('');
      loadBooks();
    } catch (error) {
      console.error('Error updating title:', error);
      toast.error('제목 수정에 실패했습니다');
    }
  };

  const handleCancelEditTitle = () => {
    setEditingTitleBookId(null);
    setEditingTitleValue('');
  };

  const handleStartEditBookNumber = (book: Storybook) => {
    setEditingBookNumberId(book.id);
    setEditingBookNumberValue(book.book_number);
  };

  const handleSaveBookNumber = async () => {
    if (!editingBookNumberId || editingBookNumberValue < 1) {
      toast.error('유효한 일련번호를 입력해주세요');
      return;
    }

    try {
      const { error } = await supabase.rpc('admin_update_storybook_book_number', {
        admin_id_input: adminId,
        book_id_input: editingBookNumberId,
        book_number_input: editingBookNumberValue
      });

      if (error) throw error;

      toast.success('일련번호가 수정되었습니다');
      setEditingBookNumberId(null);
      loadBooks();
    } catch (error) {
      console.error('Error updating book number:', error);
      toast.error('일련번호 수정에 실패했습니다');
    }
  };

  const handleCancelEditBookNumber = () => {
    setEditingBookNumberId(null);
  };

  const handleStartEditInlineDescription = (book: Storybook) => {
    setEditingDescriptionId(book.id);
    setEditingDescriptionValue(book.description || '');
  };

  const handleSaveInlineDescription = async () => {
    if (!editingDescriptionId) return;

    try {
      const { error } = await supabase.rpc('admin_update_storybook_description', {
        admin_id_input: adminId,
        book_id_input: editingDescriptionId,
        description_input: editingDescriptionValue.trim()
      });

      if (error) throw error;

      toast.success('설명이 수정되었습니다');
      setEditingDescriptionId(null);
      setEditingDescriptionValue('');
      loadBooks();
    } catch (error) {
      console.error('Error updating description:', error);
      toast.error('설명 수정에 실패했습니다');
    }
  };

  const handleCancelInlineDescription = () => {
    setEditingDescriptionId(null);
    setEditingDescriptionValue('');
  };

  // Page count editing handlers
  const handleStartEditPageCount = (book: Storybook) => {
    setEditingPageCountId(book.id);
    setEditingPageCountValue(book.page_count);
  };

  const handleSavePageCount = async () => {
    if (!editingPageCountId || editingPageCountValue < 0) {
      toast.error('유효한 페이지 수를 입력해주세요');
      return;
    }

    try {
      const { error } = await supabase.rpc('admin_update_storybook_page_count', {
        admin_id_input: adminId,
        book_id_input: editingPageCountId,
        page_count_input: editingPageCountValue
      });

      if (error) throw error;

      toast.success('페이지 수가 수정되었습니다');
      setEditingPageCountId(null);
      loadBooks();
    } catch (error) {
      console.error('Error updating page count:', error);
      toast.error('페이지 수 수정에 실패했습니다');
    }
  };

  const handleCancelEditPageCount = () => {
    setEditingPageCountId(null);
  };

  const handleInlineCoverUpload = async (file: File, bookId: string) => {
    setUploadingCoverBookId(bookId);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;

        const { data, error } = await supabase.functions.invoke('upload-storybook-image', {
          body: {
            admin_id: adminId,
            book_id: bookId,
            page_number: null,
            filename: file.name,
            image_base64: base64,
            image_type: 'cover'
          }
        });

        if (error) throw error;

        await supabase.rpc('admin_update_storybook_cover', {
          admin_id_input: adminId,
          book_id_input: bookId,
          cover_image_url_input: data.publicUrl
        });

        toast.success('표지 이미지가 교체되었습니다');
        setUploadingCoverBookId(null);
        loadBooks();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Cover upload error:', error);
      toast.error('표지 이미지 업로드에 실패했습니다');
      setUploadingCoverBookId(null);
    }
  };

  const handleClickInlineCover = (bookId: string) => {
    setInlineCoverBookId(bookId);
    setTimeout(() => {
      inlineCoverInputRef.current?.click();
    }, 0);
  };

  const handleInlineCoverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && inlineCoverBookId) {
      handleInlineCoverUpload(file, inlineCoverBookId);
    }
    e.target.value = '';
    setInlineCoverBookId(null);
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
      
      // 콘텐츠가 있는 페이지 수 계산
      const pagesWithContent = freshPages?.filter((p: { image_url: string | null; text_content: string | null }) => 
        p.image_url || p.text_content
      ).length || 0;
      
      // 페이지 수 자동 업데이트
      if (pagesWithContent > 0) {
        await supabase.rpc('admin_update_storybook_page_count', {
          admin_id_input: adminId,
          book_id_input: selectedBook.id,
          page_count_input: pagesWithContent
        });
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

  // Sub-tab state for the main content area
  const [activeSubTab, setActiveSubTab] = useState<'humanities' | 'poetry' | 'recommended'>('humanities');

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as 'humanities' | 'poetry' | 'recommended')} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50">
          <TabsTrigger 
            value="humanities" 
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
          >
            인문학
          </TabsTrigger>
          <TabsTrigger 
            value="poetry" 
            className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
          >
            시집
          </TabsTrigger>
          <TabsTrigger 
            value="recommended" 
            className="data-[state=active]:bg-teal-500 data-[state=active]:text-white"
          >
            이번학기 추천도서
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className={activeSubTab === 'poetry' ? 'border-0 shadow-none bg-transparent' : ''}>
        <CardHeader className={`flex flex-row items-center justify-between pb-2 ${activeSubTab === 'poetry' ? 'hidden' : ''}`}>
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                {activeSubTab !== 'poetry' && <BookOpen className="w-5 h-5 text-amber-600" />}
                {activeSubTab === 'humanities' && '인문학 도서'}
                {activeSubTab === 'recommended' && '이번학기 추천도서'}
                {activeSubTab !== 'poetry' && realtimeUpdated && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-normal animate-pulse">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    실시간 업데이트
                  </span>
                )}
              </CardTitle>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* + 인문학 버튼 (새 동화책) - 인문학 탭에서만 표시 */}
            {activeSubTab === 'humanities' && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="w-4 h-4 mr-1" />
                    추가
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>새 인문학 도서 만들기</DialogTitle>
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
                          placeholder="도서 제목"
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
            )}
            
            {/* + 추천도서 버튼 - 이번학기 추천도서 탭에서만 표시 */}
            {activeSubTab === 'recommended' && (
              <Dialog open={isExternalUrlDialogOpen} onOpenChange={setIsExternalUrlDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="w-4 h-4 mr-1" />
                    추가
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ExternalLink className="w-5 h-5" />
                      이번학기 추천도서 등록
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>일련번호</Label>
                      <Input
                        type="number"
                        placeholder="예: 1"
                        value={externalUrlBookNumber}
                        onChange={(e) => setExternalUrlBookNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>제목</Label>
                      <Input
                        placeholder="도서 제목"
                        value={externalUrlTitle}
                        onChange={(e) => setExternalUrlTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>외부 URL</Label>
                      <Input
                        type="url"
                        placeholder="https://example.com/book"
                        value={externalUrlValue}
                        onChange={(e) => setExternalUrlValue(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        외부 사이트의 도서 URL을 입력하세요
                      </p>
                    </div>
                    <Button onClick={handleCreateExternalUrlBook} className="w-full bg-teal-600 hover:bg-teal-700">
                      등록하기
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          
          {/* Hidden input for inline cover upload */}
          <input
            ref={inlineCoverInputRef}
            type="file"
            accept="image/*"
            onChange={handleInlineCoverInputChange}
            className="hidden"
          />
          
          {activeSubTab === 'humanities' && (
            <>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
              ) : books.filter(b => b.category !== 'poetry' && !b.external_url).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 인문학 도서가 없습니다
                </div>
              ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-50 dark:bg-amber-950/30">
                  <TableHead className="w-16">번호</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-20 text-center">페이지</TableHead>
                  <TableHead className="w-24 text-center">발행</TableHead>
                  <TableHead className="w-32 text-center">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {books.filter(b => b.category !== 'poetry' && !b.external_url).map((book, index) => (
                  <TableRow 
                    key={book.id}
                    className={`hover:bg-amber-50/50 dark:hover:bg-amber-950/10 ${recentlyEditedBookId === book.id ? 'bg-emerald-100 dark:bg-emerald-900/30 animate-pulse' : ''}`}
                  >
                    <TableCell className="font-medium text-center">{book.book_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {book.cover_image_url ? (
                          <img 
                            src={book.cover_image_url} 
                            alt={book.title}
                            className="w-8 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-8 h-10 bg-amber-100 dark:bg-amber-900/30 rounded flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-amber-500" />
                          </div>
                        )}
                        <span className="font-medium">{book.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30">
                        {book.page_count}쪽
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={book.is_published}
                        onCheckedChange={() => handleTogglePublish(book)}
                        className="data-[state=checked]:bg-amber-600"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => handlePreviewBook(book)}
                          title="미리보기"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setBookToDelete(book);
                            setIsDeleteDialogOpen(true);
                          }}
                          title="삭제"
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
            </>
          )}

          {activeSubTab === 'recommended' && (
            <>
              {/* 등록된 추천도서 목록 */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    등록된 추천도서 목록 ({recommendedBooks.length}권)
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadRecommendedBooks}
                    disabled={loadingRecommendedBooks}
                  >
                    {loadingRecommendedBooks ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      '새로고침'
                    )}
                  </Button>
                </div>
                
                {loadingRecommendedBooks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                    <span className="ml-2 text-muted-foreground">추천도서 목록 불러오는 중...</span>
                  </div>
                ) : recommendedBooks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    등록된 추천도서가 없습니다. 아래 양식을 통해 새 추천도서를 등록해주세요.
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-teal-50 dark:bg-teal-950/30">
                          <TableHead className="w-16">번호</TableHead>
                          <TableHead>도서 제목</TableHead>
                          <TableHead>저자</TableHead>
                          <TableHead className="w-24 text-center">학기</TableHead>
                          <TableHead className="w-24 text-center">발행</TableHead>
                          <TableHead className="w-32 text-center">관리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recommendedBooks.map((book, index) => (
                          <TableRow key={book.id} className="hover:bg-teal-50/50 dark:hover:bg-teal-950/10">
                            <TableCell className="font-medium text-center">{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-10 bg-teal-100 dark:bg-teal-900/30 rounded flex items-center justify-center">
                                  <BookOpen className="w-4 h-4 text-teal-500" />
                                </div>
                                <span className="font-medium">{book.title}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{book.author || '-'}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-teal-50 dark:bg-teal-950/30">
                                {book.year}년 {book.quarter}분기
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={book.is_active}
                                onCheckedChange={() => handleToggleRecommendedBookActive(book)}
                                className="data-[state=checked]:bg-teal-600"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                  onClick={() => openRecBookEditDialog(book)}
                                  title="수정"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setRecBookToDelete(book);
                                    setIsRecBookDeleteDialogOpen(true);
                                  }}
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* 새 추천도서 등록 */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-2 mb-4">
                  <Plus className="w-5 h-5" />
                  새 추천도서 등록
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>제목 *</Label>
                    <Input
                      value={newRecBookTitle}
                      onChange={(e) => setNewRecBookTitle(e.target.value)}
                      placeholder="도서 제목을 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>저자</Label>
                    <Input
                      value={newRecBookAuthor}
                      onChange={(e) => setNewRecBookAuthor(e.target.value)}
                      placeholder="저자를 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>년도</Label>
                    <Input
                      type="number"
                      value={newRecBookYear}
                      onChange={(e) => setNewRecBookYear(parseInt(e.target.value) || new Date().getFullYear())}
                      min={2020}
                      max={2100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>분기</Label>
                    <select
                      value={newRecBookQuarter}
                      onChange={(e) => setNewRecBookQuarter(parseInt(e.target.value))}
                      className="w-full h-10 px-3 border rounded-md bg-background"
                    >
                      <option value={1}>1분기 (1-3월)</option>
                      <option value={2}>2분기 (4-6월)</option>
                      <option value={3}>3분기 (7-9월)</option>
                      <option value={4}>4분기 (10-12월)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>설명</Label>
                    <Textarea
                      value={newRecBookDescription}
                      onChange={(e) => setNewRecBookDescription(e.target.value)}
                      placeholder="도서에 대한 간단한 설명을 입력하세요"
                      rows={3}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreateRecommendedBook}
                  disabled={savingRecBook || !newRecBookTitle.trim()}
                  className="mt-4 bg-teal-600 hover:bg-teal-700"
                >
                  {savingRecBook ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      등록 중...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      추천도서 등록
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
          
          {activeSubTab === 'poetry' && (
            <div className="border rounded-lg p-6 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
              {/* 등록된 시집 목록 - 상단에 배치 */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    등록된 시집 목록 ({poetryCollections.length}권)
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadPoetryCollections}
                    disabled={loadingPoetry}
                  >
                    {loadingPoetry ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      '새로고침'
                    )}
                  </Button>
                </div>
                
                {loadingPoetry ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    <span className="ml-2 text-muted-foreground">시집 목록 불러오는 중...</span>
                  </div>
                ) : poetryCollections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    등록된 시집이 없습니다. 아래 양식을 통해 새 시집을 등록해주세요.
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-purple-50 dark:bg-purple-950/30">
                          <TableHead className="w-16">번호</TableHead>
                          <TableHead>시집 제목</TableHead>
                          <TableHead>시인</TableHead>
                          <TableHead className="w-20 text-center">시 수</TableHead>
                          <TableHead className="w-24 text-center">발행</TableHead>
                          <TableHead className="w-32 text-center">관리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {poetryCollections.map((collection, index) => (
                          <TableRow key={collection.id} className="hover:bg-purple-50/50 dark:hover:bg-purple-950/10">
                            <TableCell className="font-medium text-center">{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {collection.cover_image_url ? (
                                  <img 
                                    src={collection.cover_image_url} 
                                    alt={collection.title}
                                    className="w-8 h-10 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-8 h-10 bg-purple-100 dark:bg-purple-900/30 rounded flex items-center justify-center">
                                    <BookOpen className="w-4 h-4 text-purple-500" />
                                  </div>
                                )}
                                <span className="font-medium">{collection.title}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{collection.poet}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30">
                                {collection.poem_count}편
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={collection.is_published}
                                onCheckedChange={() => handleTogglePoetryPublish(collection)}
                                className="data-[state=checked]:bg-purple-600"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                  onClick={() => loadPoems(collection)}
                                  title="미리보기"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setPoetryToDelete(collection);
                                    setIsPoetryDeleteDialogOpen(true);
                                  }}
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* 새 시집 등록 - 하단에 배치 */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                    <PenLine className="w-5 h-5" />
                    새 시집 등록
                  </h3>
                  <div className="flex items-center gap-2">
                    <Dialog open={isPoetryDialogOpen} onOpenChange={setIsPoetryDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                          <Plus className="w-4 h-4 mr-1" />
                          추가
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>새 시집 만들기</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>일련번호</Label>
                              <Input
                                type="number"
                                placeholder="예: 1"
                                value={poetryBookNumber}
                                onChange={(e) => setPoetryBookNumber(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label>제목</Label>
                              <Input
                                placeholder="시집 제목"
                                value={poetryTitle}
                                onChange={(e) => setPoetryTitle(e.target.value)}
                              />
                            </div>
                          </div>
                          <div>
                            <Label>설명 (마크다운 지원)</Label>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">입력</p>
                                <Textarea
                                  value={poetryDescription}
                                  onChange={(e) => setPoetryDescription(e.target.value)}
                                  placeholder="마크다운 형식으로 입력하세요..."
                                  className="min-h-[150px] resize-none font-mono text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">미리보기</p>
                                <div className="min-h-[150px] p-3 border rounded-md bg-muted/30 overflow-auto prose prose-sm max-w-none">
                                  {poetryDescription ? (
                                    <ReactMarkdown>{poetryDescription}</ReactMarkdown>
                                  ) : (
                                    <p className="text-muted-foreground italic">미리보기가 여기에 표시됩니다...</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button onClick={handleCreatePoetryBook} className="w-full bg-purple-600 hover:bg-purple-700">
                            시집 생성하기
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Label htmlFor="poetry-csv-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors text-sm font-medium">
                        <Upload className="w-4 h-4" />
                        CSV 업로드
                      </div>
                    </Label>
                    <input
                      id="poetry-csv-upload"
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handlePoetryCsvUpload}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 왼쪽: 시집 정보 */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">시집 제목 *</Label>
                      <Input
                        placeholder="시집 제목을 입력하세요"
                        value={poetryCollectionTitle}
                        onChange={(e) => setPoetryCollectionTitle(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">시인 *</Label>
                      <Input
                        placeholder="시인 이름을 입력하세요"
                        value={poetryCollectionPoet}
                        onChange={(e) => setPoetryCollectionPoet(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">시 제목 *</Label>
                      <Input
                        placeholder="시 제목을 입력하세요"
                        value={poetryPoemTitle}
                        onChange={(e) => setPoetryPoemTitle(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">해시태그</Label>
                      <Input
                        placeholder="사랑, 자연, 희망 (쉼표로 구분)"
                        value={poetryHashtags}
                        onChange={(e) => setPoetryHashtags(e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        쉼표(,)로 구분하여 여러 태그를 입력하세요
                      </p>
                    </div>
                  </div>
                  
                  {/* 오른쪽: 시 내용 */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">시 내용 *</Label>
                      <Textarea
                        placeholder="시 내용을 입력하세요...&#10;&#10;예시:&#10;바람이 불면&#10;나뭇잎이 춤을 추고&#10;하늘은 파랗게 물들어간다"
                        value={poetryPoemContent}
                        onChange={(e) => setPoetryPoemContent(e.target.value)}
                        className="mt-1 min-h-[250px] resize-none font-serif"
                      />
                    </div>
                    
                    {poetryPoemContent && (
                      <div className="p-4 border rounded-lg bg-white dark:bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-2">미리보기</p>
                        <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed">
                          {poetryPoemContent}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={handleSavePoetryCollection}
                    disabled={savingPoetry || !poetryCollectionTitle.trim() || !poetryCollectionPoet.trim() || !poetryPoemTitle.trim() || !poetryPoemContent.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {savingPoetry ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-1" />
                        시집 저장
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
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
                  <div className="bg-amber-100/50 p-6 overflow-y-auto relative">
                    {/* Delete Page Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPageToDelete(previewPageNumber);
                        setIsPageDeleteDialogOpen(true);
                      }}
                      className="absolute top-2 right-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="현재 페이지 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    
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

      {/* Page Delete Confirmation */}
      <AlertDialog open={isPageDeleteDialogOpen} onOpenChange={setIsPageDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>페이지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {pageToDelete}페이지를 삭제하시겠습니까?
              삭제된 페이지는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPageToDelete(null)}>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePreviewPage} 
              className="bg-destructive hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Poetry Delete Confirmation */}
      <AlertDialog open={isPoetryDeleteDialogOpen} onOpenChange={setIsPoetryDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>시집 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{poetryToDelete?.title}" 시집을 삭제하시겠습니까?
              삭제된 시집은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPoetryToDelete(null)}>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePoetryCollection} 
              className="bg-destructive hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Poetry Preview Dialog */}
      <Dialog open={isPoetryPreviewOpen} onOpenChange={setIsPoetryPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <PenLine className="w-5 h-5" />
              {selectedPoetryCollection?.title}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {selectedPoetryCollection?.poet}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {loadingPoems ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : poems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              이 시집에 등록된 시가 없습니다.
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* 시 내용 */}
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-background rounded-lg border">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-purple-800 dark:text-purple-300">
                    {poems[currentPoemIndex]?.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentPoemIndex + 1} / {poems.length}
                  </p>
                </div>
                <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-center">
                  {poems[currentPoemIndex]?.content}
                </div>
              </div>
              
              {/* 네비게이션 */}
              {poems.length > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPoemIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentPoemIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    이전 시
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {poems.map((_, idx) => (
                      <Button
                        key={idx}
                        variant={currentPoemIndex === idx ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPoemIndex(idx)}
                        className={`w-8 h-8 p-0 ${currentPoemIndex === idx ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                      >
                        {idx + 1}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPoemIndex(prev => Math.min(poems.length - 1, prev + 1))}
                    disabled={currentPoemIndex >= poems.length - 1}
                  >
                    다음 시
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Recommended Book Delete Confirmation */}
      <AlertDialog open={isRecBookDeleteDialogOpen} onOpenChange={setIsRecBookDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>추천도서 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{recBookToDelete?.title}"을(를) 삭제하시겠습니까?
              삭제된 추천도서는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecBookToDelete(null)}>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRecommendedBook} 
              className="bg-destructive hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recommended Book Edit Dialog */}
      <Dialog open={isRecBookEditDialogOpen} onOpenChange={setIsRecBookEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              추천도서 수정
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>제목 *</Label>
              <Input
                value={editRecBookTitle}
                onChange={(e) => setEditRecBookTitle(e.target.value)}
                placeholder="도서 제목을 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label>저자</Label>
              <Input
                value={editRecBookAuthor}
                onChange={(e) => setEditRecBookAuthor(e.target.value)}
                placeholder="저자를 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label>표시 순서</Label>
              <Input
                type="number"
                value={editRecBookDisplayOrder}
                onChange={(e) => setEditRecBookDisplayOrder(parseInt(e.target.value) || 1)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={editRecBookDescription}
                onChange={(e) => setEditRecBookDescription(e.target.value)}
                placeholder="도서에 대한 간단한 설명을 입력하세요"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRecBookEditDialogOpen(false)}
              >
                취소
              </Button>
              <Button
                onClick={handleUpdateRecommendedBook}
                disabled={savingRecBook || !editRecBookTitle.trim()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {savingRecBook ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    저장
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
