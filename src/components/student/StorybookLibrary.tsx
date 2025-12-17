import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSwipe } from '@/hooks/use-swipe';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  BookMarked,
  CheckCircle2,
  Star,
  PenLine,
  Send,
  Smartphone,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings2,
  Heart,
  Users,
  Globe
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
  is_public?: boolean;
}

interface PublicReview {
  id: string;
  student_id: string;
  student_name: string;
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
  const [reviewIsPublic, setReviewIsPublic] = useState(false);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [publicReviews, setPublicReviews] = useState<PublicReview[]>([]);
  const [showMyReviews, setShowMyReviews] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Bookmark states
  const [pageBookmarks, setPageBookmarks] = useState<number[]>([]);

  // TTS states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.9);
  const [showSpeedControl, setShowSpeedControl] = useState(false);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Fullscreen states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const readerContainerRef = useRef<HTMLDivElement>(null);

  // Celebration states
  const [showCelebration, setShowCelebration] = useState(false);

  // TTS Functions
  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) {
      toast.error('이 브라우저는 음성 읽기를 지원하지 않습니다');
      return;
    }

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = speechRate;
    utterance.pitch = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast.error('음성 읽기 중 오류가 발생했습니다');
    };

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [stopSpeaking, speechRate]);

  // Fullscreen Functions
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        if (readerContainerRef.current) {
          await readerContainerRef.current.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      toast.error('전체화면 전환에 실패했습니다');
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Stop speaking when reader closes or page changes
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  useEffect(() => {
    stopSpeaking();
  }, [currentPage, stopSpeaking]);

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

  const loadBookmarks = async (bookId: string) => {
    try {
      const { data, error } = await supabase.rpc('student_get_page_bookmarks', {
        student_id_input: studentId,
        book_id_input: bookId
      });
      if (error) throw error;
      setPageBookmarks(data?.map((b: { page_number: number }) => b.page_number) || []);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const toggleBookmark = async () => {
    if (!selectedBook) return;
    try {
      const { data, error } = await supabase.rpc('student_toggle_page_bookmark', {
        student_id_input: studentId,
        book_id_input: selectedBook.id,
        page_number_input: currentPage
      });
      if (error) throw error;
      
      if (data) {
        setPageBookmarks(prev => [...prev, currentPage]);
        toast.success('북마크가 추가되었습니다 ❤️');
      } else {
        setPageBookmarks(prev => prev.filter(p => p !== currentPage));
        toast.success('북마크가 제거되었습니다');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('북마크 처리에 실패했습니다');
    }
  };

  const loadPublicReviews = async (bookId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_public_reviews', {
        book_id_input: bookId
      });
      if (error) throw error;
      setPublicReviews((data || []).filter((r: PublicReview) => r.student_id !== studentId));
    } catch (error) {
      console.error('Error loading public reviews:', error);
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
      loadBookmarks(book.id);
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
        // Show celebration animation
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 4000);
        
        toast.success('동화책을 다 읽었습니다! 🎉 독후감을 작성해보세요!');
        // Show review dialog after completing
        setTimeout(() => {
          setIsReviewDialogOpen(true);
        }, 2000);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  // Celebration confetti component
  const CelebrationOverlay = () => {
    if (!showCelebration) return null;
    
    const confettiColors = ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
    const confettiCount = 50;
    
    return (
      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        {/* Confetti particles */}
        {[...Array(confettiCount)].map((_, i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 0.5;
          const duration = 2 + Math.random() * 2;
          const color = confettiColors[i % confettiColors.length];
          const size = 8 + Math.random() * 8;
          const rotation = Math.random() * 360;
          
          return (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${left}%`,
                top: '-20px',
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                transform: `rotate(${rotation}deg)`,
                animation: `confetti-fall ${duration}s ease-out ${delay}s forwards`,
              }}
            />
          );
        })}
        
        {/* Center celebration message */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/95 rounded-2xl p-8 shadow-2xl transform animate-bounce-in text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-amber-600 mb-2">축하합니다!</h2>
            <p className="text-lg text-gray-600">동화책을 완독했어요!</p>
            <div className="flex justify-center gap-2 mt-4 text-3xl">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>⭐</span>
              <span className="animate-bounce" style={{ animationDelay: '100ms' }}>📚</span>
              <span className="animate-bounce" style={{ animationDelay: '200ms' }}>🏆</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    const newPage = direction === 'prev' ? currentPage - 1 : currentPage + 1;
    
    if (newPage < 1 || newPage > pages.length) return;
    
    setCurrentPage(newPage);
    
    // Check if completed
    const isCompleted = newPage === pages.length;
    saveProgress(newPage, isCompleted);
  };

  // Swipe handlers for mobile navigation
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (currentPage < pages.length) {
        handlePageChange('next');
      }
    },
    onSwipeRight: () => {
      if (currentPage > 1) {
        handlePageChange('prev');
      }
    },
    threshold: 50,
  });

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

      // Update visibility if public
      const existingReview = myReviews.find(r => r.book_id === selectedBook.id);
      if (existingReview && reviewIsPublic !== existingReview.is_public) {
        await supabase.rpc('student_update_review_visibility', {
          student_id_input: studentId,
          review_id_input: existingReview.id,
          is_public_input: reviewIsPublic
        });
      }

      toast.success('독후감이 저장되었습니다! 📝');
      setIsReviewDialogOpen(false);
      setReviewContent('');
      setReviewRating(5);
      setReviewIsPublic(false);
      loadMyReviews();
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error('독후감 저장에 실패했습니다');
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleReviewVisibility = async (reviewId: string, isPublic: boolean) => {
    try {
      const { error } = await supabase.rpc('student_update_review_visibility', {
        student_id_input: studentId,
        review_id_input: reviewId,
        is_public_input: isPublic
      });
      if (error) throw error;
      toast.success(isPublic ? '독후감이 공개되었습니다' : '독후감이 비공개되었습니다');
      loadMyReviews();
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('설정 변경에 실패했습니다');
    }
  };

  const openReviewDialog = (book: Storybook) => {
    setSelectedBook(book);
    loadPublicReviews(book.id);
    // Check if already has review
    const existingReview = myReviews.find(r => r.book_id === book.id);
    if (existingReview) {
      setReviewContent(existingReview.content);
      setReviewRating(existingReview.rating);
      setReviewIsPublic(existingReview.is_public || false);
    } else {
      setReviewContent('');
      setReviewRating(5);
      setReviewIsPublic(false);
    }
    setIsReviewDialogOpen(true);
  };

  const currentPageData = pages.find(p => p.page_number === currentPage);

  return (
    <div className="p-4">
      {/* Celebration Animation Overlay */}
      <CelebrationOverlay />
      
      <Accordion type="single" collapsible defaultValue="storybook-library" className="w-full">
        <AccordionItem value="storybook-library" className="border-amber-200">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2 text-amber-800">
              <BookOpen className="w-6 h-6" />
              <span className="text-xl font-bold">이지영의 인문학서점</span>
              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">
                {books.length}권
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center justify-between mb-4 pt-2">
              <p className="text-muted-foreground text-sm">매일 한 권씩 읽어보세요</p>
              <Button 
                variant={showMyReviews ? "default" : "outline"}
                size="sm"
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
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleReviewVisibility(review.id, !review.is_public)}
                          className="h-6 px-2"
                          title={review.is_public ? '공개됨 - 클릭하여 비공개' : '비공개 - 클릭하여 공개'}
                        >
                          {review.is_public ? (
                            <Globe className="w-3 h-3 text-green-600" />
                          ) : (
                            <Users className="w-3 h-3 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString('ko-KR')}
                      </p>
                      {review.is_public && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> 공개중
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          책꽂이를 정리하는 중...
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          아직 등록된 동화책이 없습니다
        </div>
      ) : (
        /* Book List */
        <div className="space-y-2">
          {books.map((book) => {
            const hasReview = myReviews.some(r => r.book_id === book.id);
            return (
              <div
                key={book.id}
                className="flex items-center gap-3 p-2 bg-amber-50 hover:bg-amber-100 rounded-lg cursor-pointer transition-colors border border-amber-200"
                onClick={() => openBook(book)}
              >
                {/* Cover Thumbnail */}
                <div className="w-12 h-16 flex-shrink-0 rounded overflow-hidden bg-amber-100 border border-amber-200">
                  {book.cover_image_url ? (
                    <img 
                      src={book.cover_image_url} 
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <BookOpen className="w-5 h-5 text-amber-600" />
                    </div>
                  )}
                </div>
                
                {/* Book Number */}
                <Badge className="bg-amber-600 text-white min-w-[28px] justify-center text-xs">
                  {book.book_number}
                </Badge>
                
                {/* Book Title */}
                <span className="flex-1 font-medium text-amber-900 text-sm">{book.title}</span>
                
                {/* Status Badges */}
                <div className="flex items-center gap-2">
                  {hasReview && (
                    <span title="독후감 작성됨">
                      <PenLine className="w-4 h-4 text-blue-500" />
                    </span>
                  )}
                  {book.is_completed ? (
                    <span title="완독">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </span>
                  ) : book.last_page > 0 ? (
                    <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">
                      {book.last_page}p
                    </Badge>
                  ) : null}
                  <ChevronRight className="w-5 h-5 text-amber-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Book Reader Dialog - Mobile Optimized */}
      <Dialog open={isReaderOpen} onOpenChange={(open) => {
        if (!open) {
          stopSpeaking();
          if (isFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        }
        closeReader();
      }}>
        <DialogContent 
          ref={readerContainerRef}
          className={`max-w-5xl w-full p-0 overflow-hidden bg-amber-50 ${
            isFullscreen ? 'h-screen max-h-screen rounded-none' : 'h-[100dvh] md:h-[90vh] landscape:h-[100dvh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-2 md:p-3 bg-amber-800 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span className="font-medium text-sm md:text-base truncate">{selectedBook?.title}</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs md:text-sm">
                {currentPage} / {pages.length}
              </Badge>
              
              {/* TTS Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                  } else {
                    const text = currentPageData?.text_content;
                    if (text) {
                      speakText(text);
                    } else {
                      toast.error('읽을 텍스트가 없습니다');
                    }
                  }
                }}
                className="text-white hover:bg-amber-700 p-1 md:p-2"
                title={isSpeaking ? '읽기 중지' : '음성 읽기'}
              >
                {isSpeaking ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>

              {/* Speed Control */}
              <Popover open={showSpeedControl} onOpenChange={setShowSpeedControl}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-white hover:bg-amber-700 p-1 md:p-2"
                    title="읽기 속도"
                  >
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">읽기 속도</Label>
                      <span className="text-sm text-muted-foreground">{speechRate.toFixed(1)}x</span>
                    </div>
                    <Slider
                      value={[speechRate]}
                      onValueChange={(value) => setSpeechRate(value[0])}
                      min={0.5}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>느리게</span>
                      <span>보통</span>
                      <span>빠르게</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Fullscreen Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleFullscreen}
                className="text-white hover:bg-amber-700 p-1 md:p-2"
                title={isFullscreen ? '전체화면 종료' : '전체화면'}
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </Button>

              {/* Bookmark Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleBookmark}
                className={`p-1 md:p-2 ${pageBookmarks.includes(currentPage) ? 'text-red-400 hover:bg-red-900/50' : 'text-white hover:bg-amber-700'}`}
                title={pageBookmarks.includes(currentPage) ? '북마크 해제' : '북마크'}
              >
                <Heart className={`w-4 h-4 ${pageBookmarks.includes(currentPage) ? 'fill-red-400' : ''}`} />
              </Button>

              {selectedBook?.is_completed && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsReviewDialogOpen(true)}
                  className="text-white hover:bg-amber-700 hidden md:flex"
                >
                  <PenLine className="w-4 h-4 mr-1" />
                  독후감
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => {
                stopSpeaking();
                if (isFullscreen) {
                  document.exitFullscreen().catch(() => {});
                }
                closeReader();
              }} className="text-white hover:bg-amber-700 p-1 md:p-2">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Swipe Hint + TTS indicator */}
          <div className="md:hidden flex items-center justify-center gap-2 py-1 bg-amber-200 text-amber-800 text-xs">
            {isSpeaking ? (
              <>
                <Volume2 className="w-3 h-3 animate-pulse" />
                <span>읽는 중... (버튼을 눌러 중지)</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3 h-3" />
                <span>좌우로 밀어서 페이지 넘기기</span>
              </>
            )}
          </div>

          {/* Book Content - Responsive with Swipe */}
          <div 
            className="flex-1 flex items-center justify-center p-2 md:p-4 overflow-hidden touch-pan-y"
            {...swipeHandlers}
          >
            {/* Mobile Single Page View */}
            <div className="md:hidden w-full h-full flex flex-col bg-white rounded-lg shadow-xl overflow-hidden">
              {currentPage === 1 && pages.length > 0 && (
                <div className="flex-1 flex flex-col overflow-y-auto">
                  {/* Title Page Mobile */}
                  <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-100 to-amber-50 min-h-[200px]">
                    {selectedBook?.cover_image_url && (
                      <img 
                        src={selectedBook.cover_image_url} 
                        alt="표지"
                        className="max-h-32 rounded-lg shadow-lg mb-3"
                      />
                    )}
                    <h1 className="text-xl font-bold text-amber-900 text-center">
                      {selectedBook?.title}
                    </h1>
                    <p className="text-amber-700 mt-1 text-sm">#{selectedBook?.book_number}</p>
                  </div>
                  {/* First Page Content Mobile */}
                  <div className="p-4 flex-1">
                    {currentPageData?.image_url && (
                      <img 
                        src={currentPageData.image_url} 
                        alt={`${currentPage}페이지`}
                        className="w-full rounded-lg mb-3 max-h-48 object-contain"
                      />
                    )}
                    {currentPageData?.text_content && (() => {
                      const lines = currentPageData.text_content.split('\n');
                      const subtitle = lines[0];
                      const bodyText = lines.slice(1).join('\n');
                      return (
                        <div>
                          {subtitle && (
                            <p className="text-lg font-semibold leading-relaxed text-amber-700 mb-2">
                              📖 {subtitle}
                            </p>
                          )}
                          {bodyText && (
                            <p className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap indent-4">
                              {bodyText}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {currentPage > 1 && currentPageData && (
                <div className="flex-1 flex flex-col overflow-y-auto">
                  {/* Image Section Mobile */}
                  {currentPageData.image_url && (
                    <div className="flex-shrink-0 bg-amber-50 p-3 flex justify-center">
                      <img 
                        src={currentPageData.image_url} 
                        alt={`${currentPage}페이지 삽화`}
                        className="max-h-40 object-contain rounded-lg shadow"
                      />
                    </div>
                  )}
                  {/* Text Section Mobile */}
                  <div className="flex-1 p-4 bg-white">
                    {currentPageData.text_content ? (() => {
                      const lines = currentPageData.text_content.split('\n');
                      const subtitle = lines[0];
                      const bodyText = lines.slice(1).join('\n');
                      return (
                        <div>
                          {subtitle && (
                            <p className="text-lg font-semibold leading-relaxed text-amber-700 mb-2">
                              📖 {subtitle}
                            </p>
                          )}
                          {bodyText && (
                            <p className="text-base leading-relaxed text-gray-800 whitespace-pre-wrap indent-4">
                              {bodyText}
                            </p>
                          )}
                        </div>
                      );
                    })() : (
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

            {/* Desktop Two Page Spread */}
            <div className="hidden md:flex bg-white rounded-lg shadow-2xl max-h-full overflow-hidden">
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
                    {currentPageData?.text_content && (() => {
                      const lines = currentPageData.text_content.split('\n');
                      const subtitle = lines[0];
                      const bodyText = lines.slice(1).join('\n');
                      return (
                        <div>
                          {subtitle && (
                            <p className="text-xl font-semibold leading-relaxed text-amber-700 mb-3">
                              📖 {subtitle}
                            </p>
                          )}
                          {bodyText && (
                            <p className="text-lg leading-relaxed text-gray-800 whitespace-pre-wrap indent-6">
                              {bodyText}
                            </p>
                          )}
                        </div>
                      );
                    })()}
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
                    {currentPageData.text_content ? (() => {
                      const lines = currentPageData.text_content.split('\n');
                      const subtitle = lines[0];
                      const bodyText = lines.slice(1).join('\n');
                      return (
                        <div>
                          {subtitle && (
                            <p className="text-xl font-semibold leading-relaxed text-amber-700 mb-3">
                              📖 {subtitle}
                            </p>
                          )}
                          {bodyText && (
                            <p className="text-lg leading-relaxed text-gray-800 whitespace-pre-wrap indent-6">
                              {bodyText}
                            </p>
                          )}
                        </div>
                      );
                    })() : (
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

          {/* Navigation - Responsive */}
          <div className="flex items-center justify-between p-2 md:p-4 bg-amber-100">
            <Button
              variant="outline"
              onClick={() => handlePageChange('prev')}
              disabled={currentPage <= 1}
              className="border-amber-300 px-2 md:px-4"
              size="sm"
            >
              <ChevronLeft className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">이전</span>
            </Button>
            
            <div className="flex gap-1 max-w-[60%] overflow-x-auto">
              {pages.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
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
              className="border-amber-300 px-2 md:px-4"
              size="sm"
            >
              <span className="hidden md:inline">다음</span>
              <ChevronRight className="w-4 h-4 md:ml-1" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5 text-amber-600" />
              독후감
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="write" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="write">
                <PenLine className="w-4 h-4 mr-1" />
                내 독후감
              </TabsTrigger>
              <TabsTrigger value="others">
                <Users className="w-4 h-4 mr-1" />
                친구들 ({publicReviews.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="write" className="space-y-4 mt-4">
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

              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-600" />
                  <span className="text-sm">친구들에게 공개하기</span>
                </div>
                <Switch
                  checked={reviewIsPublic}
                  onCheckedChange={setReviewIsPublic}
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
            </TabsContent>
            
            <TabsContent value="others" className="mt-4">
              {publicReviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>아직 공개된 독후감이 없습니다</p>
                  <p className="text-sm">첫 번째로 독후감을 공개해보세요!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {publicReviews.map((review) => (
                    <div key={review.id} className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800">{review.student_name}</span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
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
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}