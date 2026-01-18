import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Send, MessageCircleHeart, Loader2, Music, History, ExternalLink, Youtube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import MindTalkMusicPlayer from './MindTalkMusicPlayer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface YouTubeHistory {
  id: string;
  song_title: string;
  artist_name: string;
  youtube_url: string;
  listened_at: string;
}

interface MindTalkProps {
  studentId: string;
  studentName: string;
  studentGrade: number;
  studentClass: number;
  studentNumber: number;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// 태그 카테고리별 분류
const TAG_CATEGORIES = {
  '심리': {
    color: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    tags: [
      { label: '우울·무기력', prompt: '요즘 아무것도 하기 싫어. 그냥 계속 피곤하고 무기력해.' },
      { label: '불안·스트레스', prompt: '사소한 일에도 자꾸 걱정이 커져. 항상 불안한 느낌이 들어.' },
      { label: '분노·짜증', prompt: '요즘 별일 아닌데도 짜증이 나. 화를 조절하기가 어려워.' },
    ]
  },
  '관계': {
    color: 'bg-pink-100 text-pink-700 hover:bg-pink-200',
    tags: [
      { label: '친구 관계', prompt: '친구랑 말다툼을 했는데 먼저 사과해야 할지 고민돼.' },
      { label: '선생님·부모님', prompt: '부모님이 내 얘기를 안 들어주시는 것 같아. 집에서는 혼나는 일이 많아서 스트레스야.' },
      { label: '외로움', prompt: '요즘 너무 외롭고 말할 사람이 없어. 누구랑 이야기하고 싶긴 한데 뭘 말해야 할지 모르겠어.' },
    ]
  },
  '진로·학습': {
    color: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    tags: [
      { label: '진로 고민', prompt: '내가 어떤 진로가 어울릴지 모르겠어. 하고 싶은 일은 있는데 부모님이 반대해.' },
      { label: '공부 스트레스', prompt: '곧 시험인데 너무 불안해. 공부는 해야 하는데 의욕이 안 생겨.' },
      { label: '성적 고민', prompt: '성적이랑 적성이 안 맞는 것 같아. 공부 계획을 세워도 지키질 못해.' },
    ]
  },
  '성장': {
    color: 'bg-green-100 text-green-700 hover:bg-green-200',
    tags: [
      { label: '자기 이해', prompt: '내 강점을 알고 싶어. 내 자신을 더 이해하고 싶어.' },
      { label: '마음 관리', prompt: '마음을 관리하는 연습을 해보고 싶어. 좀 더 나은 하루를 보내고 싶은데 어떻게 시작하면 좋을까?' },
      { label: '작은 목표', prompt: '작은 목표부터 차근차근 해보고 싶어.' },
    ]
  }
};

// 위험 단어 목록
// 기본 키워드 (DB 로드 실패 시 사용)
const DEFAULT_DANGEROUS_WORDS = ['자살', '죽고 싶', '자해'];

const getInitialMessage = (studentName: string): Message => ({
  role: 'assistant',
  content: `**${studentName}** 안녕! 나는 마음톡이야❤️\n\n오늘 하루는 어땠어? 혹시 마음에 걸리는 게 있거나, 그냥 이야기하고 싶은 거 있으면 편하게 말해줘.\n\n아래 태그 중에서 지금 네 마음과 가까운 걸 골라도 좋고, 그냥 하고 싶은 말을 적어도 돼 💬`
});

// 사용 가능 시간 체크 (평일 오후 4:30 ~ 6:30) - 2026년 1월 1일부터 적용
const isWithinAllowedHours = (): { allowed: boolean; message: string } => {
  const now = new Date();
  
  // 시간 제한 적용 시작일: 2026년 1월 1일 (2025년까지는 테스트 모드)
  const restrictionStartDate = new Date(2026, 0, 1); // 월은 0부터 시작 (0 = 1월)
  
  // 적용 시작일 이전이면 제한 없이 허용
  if (now < restrictionStartDate) {
    return { allowed: true, message: '' };
  }
  
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes; // 현재 시간을 분으로 변환
  
  const startTime = 16 * 60 + 30; // 오후 4:30 = 990분
  const endTime = 18 * 60 + 30;   // 오후 6:30 = 1110분
  
  // 주말 체크 (토요일=6, 일요일=0)
  if (day === 0 || day === 6) {
    return { 
      allowed: false, 
      message: '마음톡은 평일(월~금) 오후 4:30 ~ 6:30에만 이용할 수 있어요 📅' 
    };
  }
  
  // 시간 체크
  if (currentTime < startTime || currentTime > endTime) {
    return { 
      allowed: false, 
      message: '마음톡은 오후 4:30 ~ 6:30에만 이용할 수 있어요 ⏰' 
    };
  }
  
  return { allowed: true, message: '' };
};

export default function MindTalk({ studentId, studentName, studentGrade, studentClass, studentNumber, isOpen: controlledIsOpen, onOpenChange }: MindTalkProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [youtubeHistory, setYoutubeHistory] = useState<YouTubeHistory[]>([]);
  const initialMessage = getInitialMessage(studentName);
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dangerCount, setDangerCount] = useState(0);
  const [dangerousWords, setDangerousWords] = useState<string[]>(DEFAULT_DANGEROUS_WORDS);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 고위험 키워드 로드 (DB에서)
  useEffect(() => {
    const loadKeywords = async () => {
      const { data, error } = await supabase
        .from('mindtalk_keywords')
        .select('keyword')
        .eq('is_active', true);
      
      if (!error && data && data.length > 0) {
        setDangerousWords(data.map(k => k.keyword));
      }
    };
    loadKeywords();
  }, []);

  // 버튼 표시 여부 체크 (1분마다 갱신)
  useEffect(() => {
    const checkVisibility = () => {
      const { allowed } = isWithinAllowedHours();
      setIsButtonVisible(allowed);
    };
    
    checkVisibility(); // 초기 체크
    const interval = setInterval(checkVisibility, 60000); // 1분마다 체크
    
    return () => clearInterval(interval);
  }, []);

  // MindTalk 열기 핸들러
  const handleOpenMindTalk = () => {
    setIsOpen(true);
  };

  // 대화 기록 불러오기
  useEffect(() => {
    if (isOpen && studentId) {
      loadMessages();
      loadDangerCount();
    }
  }, [isOpen, studentId]);

  // 스크롤 맨 아래로
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    const { data, error } = await supabase.rpc('student_get_mindtalk_messages', {
      student_id_input: studentId
    });

    if (!error && data && data.length > 0) {
      setMessages([initialMessage, ...data.map((m: any) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        created_at: m.created_at
      }))]);
    }
  };

  const loadDangerCount = async () => {
    const { data, error } = await supabase.rpc('get_mindtalk_danger_count', {
      student_id_input: studentId
    });

    if (!error && data !== null) {
      setDangerCount(data);
    }
  };

  // YouTube 청취 기록 불러오기
  const loadYoutubeHistory = async () => {
    const { data, error } = await supabase.rpc('student_get_youtube_history', {
      student_id_input: studentId,
      limit_count: 50
    });

    if (!error && data) {
      setYoutubeHistory(data as YouTubeHistory[]);
    }
  };

  // YouTube 링크 클릭 시 기록 저장
  const saveYoutubeHistory = async (songTitle: string, artistName: string, youtubeUrl: string) => {
    try {
      await supabase.rpc('student_save_youtube_history', {
        student_id_input: studentId,
        song_title_input: songTitle,
        artist_name_input: artistName,
        youtube_url_input: youtubeUrl
      });
      
      // 히스토리 새로고침
      loadYoutubeHistory();
      
      toast({
        title: '🎵 음악 기록 저장',
        description: `"${songTitle}" 청취 기록이 저장되었습니다.`,
      });
    } catch (error) {
      console.error('Failed to save youtube history:', error);
    }
  };

  // 메시지에서 YouTube 링크 파싱하여 클릭 가능하게 렌더링
  const renderMessageContent = (content: string) => {
    // YouTube 링크 패턴: 🎵 **곡명 - 가수명** 형태와 [텍스트](URL) 형태
    const youtubePattern = /🎵\s*\*\*([^*]+)\s*-\s*([^*]+)\*\*\s*\n?\[([^\]]+)\]\((https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = youtubePattern.exec(content)) !== null) {
      // 매치 전 텍스트 추가
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      const songTitle = match[1].trim();
      const artistName = match[2].trim();
      const linkText = match[3];
      const youtubeUrl = match[4];

      // YouTube 링크를 a 태그로 렌더링 (iframe 환경에서도 작동)
      parts.push(
        <div key={match.index} className="my-2 p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <Youtube className="w-5 h-5 text-red-500" />
            <span className="font-semibold text-gray-800">{songTitle} - {artistName}</span>
          </div>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => saveYoutubeHistory(songTitle, artistName, youtubeUrl)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            {linkText}
          </a>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // 남은 텍스트 추가
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    // 파싱된 부분이 없으면 원본 텍스트 반환
    if (parts.length === 0) {
      return content;
    }

    return parts;
  };

  const checkDangerousWords = (text: string): number => {
    let count = 0;
    dangerousWords.forEach(word => {
      if (text.includes(word)) {
        count++;
      }
    });
    return count;
  };

  const sendAlertToTeacher = async (totalCount: number) => {
    try {
      await supabase.functions.invoke('mindtalk-alert', {
        body: {
          studentId,
          studentName,
          studentGrade,
          studentClass,
          studentNumber,
          dangerousWordCount: totalCount
        }
      });
      console.log('Alert sent to homeroom teacher');
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  };

  const handleTagClick = (prompt: string) => {
    setInputValue(prompt);
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    await supabase.rpc('student_save_mindtalk_message', {
      student_id_input: studentId,
      role_input: role,
      content_input: content
    });
  };

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: inputValue.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // 위험 단어 체크
    const dangerWordsInMessage = checkDangerousWords(userMessage.content);
    if (dangerWordsInMessage > 0) {
      const { data: updateResult } = await supabase.rpc('update_mindtalk_danger_count', {
        student_id_input: studentId,
        increment_by: dangerWordsInMessage
      });

      if (updateResult && updateResult[0]) {
        const { total_count, should_alert } = updateResult[0];
        setDangerCount(total_count);

        if (should_alert) {
          await sendAlertToTeacher(total_count);
          await supabase.rpc('update_mindtalk_alert_sent', {
            student_id_input: studentId
          });
        }
      }
    }

    // 메시지 저장
    await saveMessage('user', userMessage.content);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mindtalk-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: messages.slice(1).concat(userMessage).map(m => ({
              role: m.role,
              content: m.content
            })),
            studentId,
            studentName
          }),
        }
      );

      if (!response.ok) {
        throw new Error('AI 응답 오류');
      }

      // Streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantContent
                  };
                  return newMessages;
                });
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // 어시스턴트 메시지 저장
      if (assistantContent) {
        await saveMessage('assistant', assistantContent);
      }

    } catch (error) {
      console.error('MindTalk error:', error);
      toast({
        title: '오류',
        description: '메시지 전송에 실패했습니다. 다시 시도해주세요.',
        variant: 'destructive'
      });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages, studentId, studentName]);

  // 음악 버튼 클릭 핸들러: 대화 저장 후 MindTalk 닫고 음악 플레이어 열기
  const handleMusicClick = () => {
    setIsOpen(false);
    setIsMusicOpen(true);
  };

  // 음악 플레이어에서 마음톡으로 돌아가기
  const handleReturnToChat = () => {
    setIsMusicOpen(false);
    setIsOpen(true);
  };

  return (
    <>
      {/* Floating Button - 허용 시간에만 표시 (음악 플레이어와 독립적으로 항상 표시) */}
      {isButtonVisible && (
        <button
          onClick={handleOpenMindTalk}
          className="fixed top-3 sm:top-4 right-3 sm:right-4 z-50 flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-xs sm:text-sm"
        >
          <MessageCircleHeart className="w-4 h-4" />
          <span className="font-medium">MindTalk</span>
        </button>
      )}

      {/* Music Player - 독립 플로팅 카드 */}
      <MindTalkMusicPlayer isOpen={isMusicOpen} onClose={() => setIsMusicOpen(false)} onReturnToChat={handleReturnToChat} studentId={studentId} />

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md h-[80vh] max-h-[600px] flex flex-col overflow-hidden bg-gradient-to-b from-purple-50 to-white">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircleHeart className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">마음톡</h2>
                  <p className="text-xs text-white/80">AI 마음 상담</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    loadYoutubeHistory();
                    setIsHistoryOpen(true);
                  }}
                  className="text-white hover:bg-white/20"
                  title="음악 청취 기록"
                >
                  <History className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMusicClick}
                  className="text-white hover:bg-white/20"
                  title="힐링 뮤직"
                >
                  <Music className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'bg-white shadow-md border border-purple-100'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{renderMessageContent(message.content)}</div>
                    </div>
                  </div>
                ))}

                {/* Tags - show only at start */}
                {messages.length === 1 && (
                  <div className="space-y-4 mt-4">
                    {Object.entries(TAG_CATEGORIES).map(([category, { color, tags }]) => (
                      <div key={category}>
                        <p className="text-xs text-gray-500 mb-2 font-medium">{category}</p>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <Badge
                              key={tag.label}
                              className={`cursor-pointer transition-all ${color}`}
                              onClick={() => handleTagClick(tag.prompt)}
                            >
                              {tag.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white shadow-md border border-purple-100 rounded-2xl px-4 py-3">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="마음에 있는 이야기를 들려줘..."
                  className="flex-1 border-purple-200 focus-visible:ring-purple-500"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* YouTube History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              음악 청취 기록
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {youtubeHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>아직 청취 기록이 없어요</p>
                <p className="text-sm mt-1">AI가 추천한 음악을 들어보세요!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {youtubeHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-gradient-to-r from-gray-50 to-red-50 rounded-lg border border-red-100"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.song_title}</p>
                        <p className="text-sm text-gray-500">{item.artist_name}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(item.listened_at), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
                        </p>
                      </div>
                      <a
                        href={item.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
