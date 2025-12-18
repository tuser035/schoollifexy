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

import ReactMarkdown from 'react-markdown';
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
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings2,
  Heart,
  Users,
  Globe,
  Info
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

  // Description modal state
  const [descriptionBook, setDescriptionBook] = useState<Storybook | null>(null);

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
      setCurrentPage(1);

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
            <h2 className="text-2xl font-bold text-storybook-emerald mb-2">축하합니다!</h2>
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

  // Swipe handlers for mobile
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => handlePageChange('next'),
    onSwipeRight: () => handlePageChange('prev'),
    threshold: 50
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
        <AccordionItem value="storybook-library" className="border-storybook-emerald/30">
          <AccordionTrigger className="hover:no-underline py-3">
            <div className="flex items-center gap-2 text-storybook-emerald-dark">
              <BookOpen className="w-6 h-6" />
              <span className="text-xl font-bold">이지영의 지혜의 강</span>
              <Badge variant="secondary" className="ml-2 bg-storybook-emerald-light text-storybook-emerald">
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
                className={showMyReviews ? "bg-storybook-emerald hover:bg-storybook-emerald-hover" : "border-storybook-emerald/50 text-storybook-emerald hover:bg-storybook-emerald-light"}
              >
                <PenLine className="w-4 h-4 mr-1" />
                내 독후감 ({myReviews.length})
              </Button>
            </div>

      {/* My Reviews Section */}
      {showMyReviews && (
        <Card className="mb-6 border-storybook-emerald/30">
          <CardContent className="pt-4">
            <h3 className="font-semibold text-storybook-emerald-dark mb-3 flex items-center gap-2">
              <PenLine className="w-5 h-5" />
              내가 쓴 독후감
            </h3>
            {myReviews.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">아직 작성한 독후감이 없습니다</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {myReviews.map((review) => (
                  <div key={review.id} className="p-3 bg-storybook-emerald-light rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-storybook-emerald-dark">{review.book_title}</span>
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
                className="flex items-start gap-3 p-3 bg-storybook-emerald-light hover:bg-storybook-emerald/10 rounded-lg cursor-pointer transition-colors border border-storybook-emerald/20"
                onClick={() => openBook(book)}
              >
                {/* Cover Thumbnail */}
                <div className="w-14 h-20 flex-shrink-0 rounded overflow-hidden bg-storybook-emerald-light border border-storybook-emerald/20">
                  {book.cover_image_url ? (
                    <img 
                      src={book.cover_image_url} 
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <BookOpen className="w-6 h-6 text-storybook-emerald" />
                    </div>
                  )}
                </div>
                
                {/* Book Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-storybook-emerald text-white min-w-[28px] justify-center text-xs">
                      {book.book_number}
                    </Badge>
                    <span className="font-medium text-storybook-emerald-dark text-sm truncate">{book.title}</span>
                  </div>
                  {book.description && (
                    <div className="flex items-end gap-1">
                      <div className="text-xs text-muted-foreground line-clamp-2 prose prose-xs max-w-none flex-1">
                        <ReactMarkdown>{book.description}</ReactMarkdown>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDescriptionBook(book);
                        }}
                        className="text-xs text-storybook-emerald hover:underline flex-shrink-0"
                      >
                        더보기
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Status Badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
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
                    <Badge variant="outline" className="text-xs border-storybook-emerald/50 text-storybook-emerald">
                      {book.last_page}p
                    </Badge>
                  ) : null}
                  <ChevronRight className="w-5 h-5 text-storybook-emerald/60" />
                </div>
              </div>
            );
          })}
        </div>
      )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Book Description Modal */}
      <Dialog open={!!descriptionBook} onOpenChange={(open) => !open && setDescriptionBook(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-storybook-emerald-dark">
              <BookOpen className="w-5 h-5" />
              {descriptionBook?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <ReactMarkdown>{descriptionBook?.description || ''}</ReactMarkdown>
          </div>
        </DialogContent>
      </Dialog>

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
          className={`max-w-[100vw] md:max-w-5xl w-full p-0 overflow-hidden bg-storybook-emerald-light ${
            isFullscreen ? 'h-screen max-h-screen rounded-none' : 'h-[100dvh] md:h-[90vh] landscape:h-[100dvh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-1.5 py-0.5 md:px-2 md:py-1 bg-storybook-emerald-dark text-white">
            <div className="flex items-center gap-0.5 min-w-0">
              <BookOpen className="w-3 h-3 flex-shrink-0" />
              <span className="font-medium text-[10px] md:text-xs truncate max-w-[80px] md:max-w-none">{selectedBook?.title}</span>
              {/* Description Popover */}
              {selectedBook?.description && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-white hover:bg-storybook-emerald p-0 h-auto"
                      title="책 설명"
                    >
                      <Info className="w-3 h-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 max-h-60 overflow-auto" align="start">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-storybook-emerald-dark">📖 책 설명</h4>
                      <div className="prose prose-sm max-w-none text-muted-foreground">
                        <ReactMarkdown>{selectedBook.description}</ReactMarkdown>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className="flex items-center gap-0 md:gap-0.5 flex-shrink-0">
              <Badge variant="secondary" className="bg-storybook-emerald-light text-storybook-emerald-dark text-[8px] md:text-[10px] px-1 py-0 h-4">
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
                className="text-white hover:bg-storybook-emerald p-0 h-auto"
                title={isSpeaking ? '읽기 중지' : '음성 읽기'}
              >
                {isSpeaking ? (
                  <VolumeX className="w-3 h-3" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
              </Button>

              {/* Speed Control */}
              <Popover open={showSpeedControl} onOpenChange={setShowSpeedControl}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-white hover:bg-storybook-emerald p-0 h-auto"
                    title="읽기 속도"
                  >
                    <Settings2 className="w-3 h-3" />
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
                className="text-white hover:bg-storybook-emerald p-0 h-auto"
                title={isFullscreen ? '전체화면 종료' : '전체화면'}
              >
                {isFullscreen ? (
                  <Minimize className="w-3 h-3" />
                ) : (
                  <Maximize className="w-3 h-3" />
                )}
              </Button>

              {/* Bookmark Button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleBookmark}
                className={`p-0 h-auto ${pageBookmarks.includes(currentPage) ? 'text-red-400 hover:bg-red-900/50' : 'text-white hover:bg-storybook-emerald'}`}
                title={pageBookmarks.includes(currentPage) ? '북마크 해제' : '북마크'}
              >
                <Heart className={`w-3 h-3 ${pageBookmarks.includes(currentPage) ? 'fill-red-400' : ''}`} />
              </Button>

              {selectedBook?.is_completed && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsReviewDialogOpen(true)}
                  className="text-white hover:bg-storybook-emerald hidden md:flex p-0.5 md:p-1 h-auto"
                >
                  <PenLine className="w-3.5 h-3.5 mr-1" />
                  <span className="text-xs">독후감</span>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => {
                stopSpeaking();
                if (isFullscreen) {
                  document.exitFullscreen().catch(() => {});
                }
                closeReader();
              }} className="text-white hover:bg-storybook-emerald p-1 md:p-2">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile TTS indicator */}
          {isSpeaking && (
            <div className="md:hidden flex items-center justify-center gap-2 py-1 bg-storybook-emerald-light text-storybook-emerald-dark text-xs">
              <Volume2 className="w-3 h-3 animate-pulse" />
              <span>읽는 중... (버튼을 눌러 중지)</span>
            </div>
          )}

          {/* Book Content */}
          <div 
            className="flex-1 flex items-center justify-center p-0 md:p-4 overflow-hidden"
          >
            {/* Mobile Single Page View */}
            <div 
              className="md:hidden w-full h-full flex flex-col bg-white rounded-lg shadow-xl overflow-hidden"
              {...swipeHandlers}
            >
              {currentPage === 1 && pages.length > 0 && (
                <div className="flex-1 flex flex-col overflow-y-auto">
                  {/* Title Page Mobile */}
                  <div className="flex flex-col items-center justify-center py-2 bg-gradient-to-br from-storybook-emerald-light to-white min-h-[150px]">
                    {selectedBook?.cover_image_url && (
                      <img 
                        src={selectedBook.cover_image_url} 
                        alt="표지"
                        className="max-h-28 rounded-lg shadow-lg mb-2"
                      />
                    )}
                    <h1 className="text-lg font-bold text-storybook-emerald-dark text-center">
                      {selectedBook?.title} <span className="text-[0.8em] font-normal text-storybook-emerald">#{selectedBook?.book_number}</span>
                    </h1>
                  </div>
                  {/* First Page Content Mobile */}
                  <div className="py-2 flex-1 flex flex-col items-center">
                    {currentPageData?.image_url && (
                      <img 
                        src={currentPageData.image_url} 
                        alt={`${currentPage}페이지`}
                        className="w-full rounded-lg mb-2 max-h-44 object-contain"
                      />
                    )}
                    {currentPageData?.text_content && (() => {
                      const lines = currentPageData.text_content.split('\n');
                      const subtitle = lines[0];
                      const bodyText = lines.slice(1).join('\n');
                      return (
                        <div className="w-full text-center">
                          {subtitle && (
                            <p className="text-base font-semibold leading-relaxed text-storybook-emerald mb-2">
                              📖 {subtitle}
                            </p>
                          )}
                          {bodyText && (
                            <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
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
                    <div className="flex-shrink-0 bg-storybook-emerald-light py-2 flex justify-center">
                      <img 
                        src={currentPageData.image_url} 
                        alt={`${currentPage}페이지 삽화`}
                        className="max-h-36 object-contain rounded-lg shadow"
                      />
                    </div>
                  )}
                  {/* Text Section Mobile */}
                  <div className="flex-1 py-2 bg-white flex flex-col items-center">
                    {currentPageData.text_content ? (() => {
                      const lines = currentPageData.text_content.split('\n');
                      const subtitle = lines[0];
                      const bodyText = lines.slice(1).join('\n');
                      return (
                        <div className="w-full text-center">
                          {subtitle && (
                            <p className="text-base font-semibold leading-relaxed text-storybook-emerald mb-2">
                              📖 {subtitle}
                            </p>
                          )}
                          {bodyText && (
                            <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
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
                    <div className="text-center text-xs text-storybook-emerald mt-2">
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
                  <div className="w-[350px] h-[500px] flex flex-col items-center justify-center p-8 bg-gradient-to-br from-storybook-emerald-light to-white border-r border-storybook-emerald/20">
                    {selectedBook?.cover_image_url && (
                      <img 
                        src={selectedBook.cover_image_url} 
                        alt="표지"
                        className="max-h-48 rounded-lg shadow-lg mb-4"
                      />
                    )}
                    <h1 className="text-2xl font-bold text-storybook-emerald-dark text-center">
                      {selectedBook?.title} <span className="text-[0.8em] font-normal text-storybook-emerald">#{selectedBook?.book_number}</span>
                    </h1>
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
                            <p className="text-xl font-semibold leading-relaxed text-storybook-emerald mb-3">
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
                  <div className="w-[350px] h-[500px] flex items-center justify-center bg-storybook-emerald-light border-r border-storybook-emerald/20 p-4">
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
                            <p className="text-xl font-semibold leading-relaxed text-storybook-emerald mb-3">
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
                    <div className="text-right text-sm text-storybook-emerald mt-4">
                      - {currentPage} -
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Page Dot Indicators Only */}
          <div className="flex items-center justify-center py-1 bg-storybook-emerald-light">
            <div className="flex items-center gap-1.5">
              {pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    currentPage === index + 1
                      ? 'bg-storybook-emerald w-4'
                      : 'bg-storybook-emerald/30 hover:bg-storybook-emerald/50'
                  }`}
                  aria-label={`${index + 1}페이지로 이동`}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5 text-storybook-emerald" />
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

              <div className="flex items-center justify-between p-3 bg-storybook-emerald-light rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-storybook-emerald" />
                  <span className="text-sm">친구들에게 공개하기</span>
                </div>
                <Switch
                  checked={reviewIsPublic}
                  onCheckedChange={setReviewIsPublic}
                />
              </div>

              <Button 
                onClick={handleSubmitReview} 
                className="w-full bg-storybook-emerald hover:bg-storybook-emerald-hover"
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