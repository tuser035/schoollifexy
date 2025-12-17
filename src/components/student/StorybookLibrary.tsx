import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  BookMarked,
  CheckCircle2,
  Star,
  PenLine,
  Send
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

interface Review {
  id: string;
  book_id: string;
  book_title: string;
  content: string;
  rating: number;
  created_at: string;
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
  
  // Review states
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [showMyReviews, setShowMyReviews] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadBooks();
    loadMyReviews();
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

  const loadMyReviews = async () => {
    try {
      const { data, error } = await supabase.rpc('student_get_reviews', {
        student_id_input: studentId
      });

      if (error) throw error;
      setMyReviews(data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
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
        toast.success('동화책을 다 읽었습니다! 🎉 독후감을 작성해보세요!');
        // Show review dialog after completing
        setTimeout(() => {
          setIsReviewDialogOpen(true);
        }, 1000);
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

  const handleSubmitReview = async () => {
    if (!selectedBook) return;
    if (!reviewContent.trim()) {
      toast.error('독후감 내용을 입력해주세요');
      return;
    }

    setSubmittingReview(true);
    try {
      const { error } = await supabase.rpc('student_save_review', {
        student_id_input: studentId,
        book_id_input: selectedBook.id,
        content_input: reviewContent,
        rating_input: reviewRating
      });

      if (error) throw error;

      toast.success('독후감이 저장되었습니다! 📝');
      setIsReviewDialogOpen(false);
      setReviewContent('');
      setReviewRating(5);
      loadMyReviews();
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error('독후감 저장에 실패했습니다');
    } finally {
      setSubmittingReview(false);
    }
  };

  const openReviewDialog = (book: Storybook) => {
    setSelectedBook(book);
    // Check if already has review
    const existingReview = myReviews.find(r => r.book_id === book.id);
    if (existingReview) {
      setReviewContent(existingReview.content);
      setReviewRating(existingReview.rating);
    } else {
      setReviewContent('');
      setReviewRating(5);
    }
    setIsReviewDialogOpen(true);
  };

  const currentPageData = pages.find(p => p.page_number === currentPage);

  return (
    <div className="p-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-amber-800">
            <BookOpen className="w-7 h-7" />
            인문학 서점
          </h2>
          <p className="text-muted-foreground mt-1">매일 한 권씩 읽어보세요</p>
        </div>
        <Button 
          variant={showMyReviews ? "default" : "outline"}
          onClick={() => setShowMyReviews(!showMyReviews)}
          className={showMyReviews ? "bg-amber-600 hover:bg-amber-700" : "border-amber-300"}
        >
          <PenLine className="w-4 h-4 mr-1" />
          내 독후감 ({myReviews.length})
        </Button>
      </div>

      {/* My Reviews Section */}
      {showMyReviews && (
        <Card className="mb-6 border-amber-200">
          <CardContent className="pt-4">
            <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <PenLine className="w-5 h-5" />
              내가 쓴 독후감
            </h3>
            {myReviews.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">아직 작성한 독후감이 없습니다</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {myReviews.map((review) => (
                  <div key={review.id} className="p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-amber-900">{review.book_title}</span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(review.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
            {books.map((book) => {
              const hasReview = myReviews.some(r => r.book_id === book.id);
              return (
                <div
                  key={book.id}
                  className="relative group"
                >
                  {/* Book Spine */}
                  <div 
                    className="relative bg-gradient-to-r from-amber-100 to-amber-50 rounded-sm shadow-lg transform transition-transform group-hover:-translate-y-2 group-hover:rotate-[-2deg] cursor-pointer"
                    style={{ 
                      height: '180px',
                      width: '100%',
                      minWidth: '50px'
                    }}
                    onClick={() => openBook(book)}
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

                    {/* Has Review Indicator */}
                    {hasReview && (
                      <div className="absolute top-1 left-1">
                        <PenLine className="w-4 h-4 text-blue-500 bg-white rounded-full p-0.5" />
                      </div>
                    )}
                  </div>
                  
                  {/* Book Number */}
                  <div className="absolute -top-2 -left-1 bg-amber-600 text-white text-xs px-1.5 py-0.5 rounded font-bold shadow">
                    {book.book_number}
                  </div>

                  {/* Write Review Button (appears on hover for completed books) */}
                  {book.is_completed && (
                    <Button
                      size="sm"
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-600 hover:bg-amber-700 text-xs px-2 py-1 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        openReviewDialog(book);
                      }}
                    >
                      <PenLine className="w-3 h-3 mr-1" />
                      독후감
                    </Button>
                  )}
                </div>
              );
            })}
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
              {selectedBook?.is_completed && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsReviewDialogOpen(true)}
                  className="text-white hover:bg-amber-700"
                >
                  <PenLine className="w-4 h-4 mr-1" />
                  독후감
                </Button>
              )}
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

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5 text-amber-600" />
              독후감 작성
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedBook?.title}
              </p>
            </div>
            
            <div>
              <Label>별점</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1"
                  >
                    <Star 
                      className={`w-6 h-6 transition-colors ${
                        star <= reviewRating 
                          ? 'text-yellow-500 fill-yellow-500' 
                          : 'text-gray-300 hover:text-yellow-400'
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>독후감</Label>
              <Textarea
                placeholder="책을 읽고 느낀 점을 자유롭게 작성해주세요..."
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                rows={6}
                className="mt-1"
              />
            </div>

            <Button 
              onClick={handleSubmitReview} 
              className="w-full bg-amber-600 hover:bg-amber-700"
              disabled={submittingReview}
            >
              <Send className="w-4 h-4 mr-1" />
              {submittingReview ? '저장 중...' : '독후감 저장'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}