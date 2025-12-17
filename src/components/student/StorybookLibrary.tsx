import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  BookMarked,
  CheckCircle2
} from 'lucide-react';

interface Storybook {
  id: string;
  book_number: number;
  title: string;
  cover_image_url: string | null;
  description: string | null;
  page_count: number;
  last_page: number;
  is_completed: boolean;
}

interface StorybookPage {
  id: string;
  page_number: number;
  image_url: string | null;
  text_content: string | null;
}

interface StorybookLibraryProps {
  studentId: string;
}

export default function StorybookLibrary({ studentId }: StorybookLibraryProps) {
  const [books, setBooks] = useState<Storybook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Storybook | null>(null);
  const [pages, setPages] = useState<StorybookPage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  useEffect(() => {
    loadBooks();
  }, [studentId]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('student_get_storybooks', {
        student_id_input: studentId
      });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading books:', error);
      toast.error('동화책을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const openBook = async (book: Storybook) => {
    try {
      setSelectedBook(book);
      setCurrentPage(book.last_page > 0 ? book.last_page : 1);

      const { data, error } = await supabase.rpc('student_get_storybook_pages', {
        student_id_input: studentId,
        book_id_input: book.id
      });

      if (error) throw error;
      setPages(data || []);
      setIsReaderOpen(true);
    } catch (error) {
      console.error('Error loading pages:', error);
      toast.error('동화책을 여는데 실패했습니다');
    }
  };

  const saveProgress = async (pageNum: number, completed: boolean = false) => {
    if (!selectedBook) return;

    try {
      await supabase.rpc('student_update_reading_progress', {
        student_id_input: studentId,
        book_id_input: selectedBook.id,
        last_page_input: pageNum,
        is_completed_input: completed
      });

      if (completed) {
        toast.success('동화책을 다 읽었습니다! 🎉');
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
    
    if (newPage < 1 || newPage > pages.length) return;
    
    setCurrentPage(newPage);
    
    // Check if completed
    const isCompleted = newPage === pages.length;
    saveProgress(newPage, isCompleted);
  };

  const closeReader = () => {
    if (selectedBook) {
      saveProgress(currentPage);
    }
    setIsReaderOpen(false);
    setSelectedBook(null);
    setPages([]);
    loadBooks(); // Refresh to update progress
  };

  const currentPageData = pages.find(p => p.page_number === currentPage);

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-amber-800">
          <BookOpen className="w-7 h-7" />
          인문학 서점
        </h2>
        <p className="text-muted-foreground mt-1">매일 한 권씩 읽어보세요</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          책꽂이를 정리하는 중...
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          아직 등록된 동화책이 없습니다
        </div>
      ) : (
        /* Bookshelf Style Grid */
        <div className="bg-gradient-to-b from-amber-900 to-amber-800 rounded-lg p-6 shadow-xl">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
            {books.map((book) => (
              <div
                key={book.id}
                className="relative group cursor-pointer"
                onClick={() => openBook(book)}
              >
                {/* Book Spine */}
                <div 
                  className="relative bg-gradient-to-r from-amber-100 to-amber-50 rounded-sm shadow-lg transform transition-transform group-hover:-translate-y-2 group-hover:rotate-[-2deg]"
                  style={{ 
                    height: '180px',
                    width: '100%',
                    minWidth: '50px'
                  }}
                >
                  {book.cover_image_url ? (
                    <img 
                      src={book.cover_image_url} 
                      alt={book.title}
                      className="w-full h-full object-cover rounded-sm"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-b from-amber-200 to-amber-100">
                      <span className="text-xs font-bold text-amber-900 text-center leading-tight">
                        {book.book_number}
                      </span>
                      <BookOpen className="w-6 h-6 text-amber-700 my-1" />
                      <span className="text-[10px] text-amber-800 text-center leading-tight line-clamp-3">
                        {book.title}
                      </span>
                    </div>
                  )}
                  
                  {/* Reading Progress Indicator */}
                  {book.is_completed ? (
                    <div className="absolute top-1 right-1">
                      <CheckCircle2 className="w-4 h-4 text-green-500 bg-white rounded-full" />
                    </div>
                  ) : book.last_page > 0 ? (
                    <div className="absolute top-1 right-1">
                      <BookMarked className="w-4 h-4 text-amber-600 bg-white rounded-full p-0.5" />
                    </div>
                  ) : null}
                </div>
                
                {/* Book Number */}
                <div className="absolute -top-2 -left-1 bg-amber-600 text-white text-xs px-1.5 py-0.5 rounded font-bold shadow">
                  {book.book_number}
                </div>
              </div>
            ))}
          </div>
          
          {/* Shelf */}
          <div className="h-3 bg-amber-950 rounded-b-lg mt-2 shadow-inner" />
        </div>
      )}

      {/* Book Reader Dialog */}
      <Dialog open={isReaderOpen} onOpenChange={closeReader}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden bg-amber-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-amber-800 text-white">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              <span className="font-medium">{selectedBook?.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                {currentPage} / {pages.length}
              </Badge>
              <Button variant="ghost" size="sm" onClick={closeReader} className="text-white hover:bg-amber-700">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Book Content - Two Page Spread */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <div className="flex bg-white rounded-lg shadow-2xl max-h-full overflow-hidden">
              {/* Title Page (Page 1) */}
              {currentPage === 1 && pages.length > 0 && (
                <div className="flex">
                  {/* Left - Title */}
                  <div className="w-[350px] h-[500px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-amber-100 to-amber-50 border-r border-amber-200">
                    {selectedBook?.cover_image_url && (
                      <img 
                        src={selectedBook.cover_image_url} 
                        alt="표지"
                        className="max-h-48 rounded-lg shadow-lg mb-4"
                      />
                    )}
                    <h1 className="text-2xl font-bold text-amber-900 text-center">
                      {selectedBook?.title}
                    </h1>
                    <p className="text-amber-700 mt-2">#{selectedBook?.book_number}</p>
                  </div>
                  
                  {/* Right - First Page Content */}
                  <div className="w-[350px] h-[500px] p-6 overflow-y-auto">
                    {currentPageData?.image_url && (
                      <img 
                        src={currentPageData.image_url} 
                        alt={`${currentPage}페이지`}
                        className="w-full rounded-lg mb-4"
                      />
                    )}
                    {currentPageData?.text_content && (
                      <p className="text-lg leading-relaxed text-gray-800 whitespace-pre-wrap">
                        {currentPageData.text_content}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Regular Pages (After Page 1) */}
              {currentPage > 1 && currentPageData && (
                <div className="flex">
                  {/* Left - Image */}
                  <div className="w-[350px] h-[500px] flex items-center justify-center bg-amber-50 border-r border-amber-200 p-4">
                    {currentPageData.image_url ? (
                      <img 
                        src={currentPageData.image_url} 
                        alt={`${currentPage}페이지 삽화`}
                        className="max-w-full max-h-full object-contain rounded-lg shadow"
                      />
                    ) : (
                      <div className="text-muted-foreground flex flex-col items-center">
                        <BookOpen className="w-16 h-16 mb-2" />
                        <span>삽화가 없습니다</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Right - Text */}
                  <div className="w-[350px] h-[500px] p-6 overflow-y-auto bg-white">
                    {currentPageData.text_content ? (
                      <p className="text-lg leading-relaxed text-gray-800 whitespace-pre-wrap">
                        {currentPageData.text_content}
                      </p>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        내용이 없습니다
                      </div>
                    )}
                    <div className="text-right text-sm text-amber-600 mt-4">
                      - {currentPage} -
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between p-4 bg-amber-100">
            <Button
              variant="outline"
              onClick={() => handlePageChange('prev')}
              disabled={currentPage <= 1}
              className="border-amber-300"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              이전
            </Button>
            
            <div className="flex gap-1">
              {pages.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx + 1 === currentPage 
                      ? 'bg-amber-600' 
                      : idx + 1 < currentPage 
                        ? 'bg-amber-400' 
                        : 'bg-amber-200'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => handlePageChange('next')}
              disabled={currentPage >= pages.length}
              className="border-amber-300"
            >
              다음
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
