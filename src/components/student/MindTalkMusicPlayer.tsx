import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { 
  Music, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  X,
  Shuffle,
  Repeat,
  Heart,
  History,
  ListMusic,
  Save,
  FolderOpen,
  Trash2,
  Plus,
  Minimize2,
  Maximize2,
  GripVertical
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MusicTrack {
  id: string;
  title: string;
  category: string;
  file_path: string;
  duration_seconds?: number;
}

interface Playlist {
  id: string;
  playlist_name: string;
  music_ids: string[];
  created_at: string;
  updated_at: string;
}

// Public 폴더에 있는 기존 음악 파일들
const PUBLIC_MUSIC_FILES = [
  'music/walk-around.mp3',
  'music/ukulele-piano.mp3',
  'music/rainbow.mp3',
  'music/dream-up.mp3',
  'music/swing-machine.mp3',
  'music/rescue-me.mp3',
  'music/journey.mp3',
  'music/feel-good.mp3',
  'music/happy-children.mp3',
  'music/bliss.mp3',
];

const FAVORITES_KEY = 'mindtalk_music_favorites';
const MUSIC_PLAYER_ACTIVE_KEY = 'mindtalk_music_player_active';

interface MindTalkMusicPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
}

interface HistoryTrack extends MusicTrack {
  last_played_at: string;
}

export default function MindTalkMusicPlayer({ isOpen, onClose, studentId }: MindTalkMusicPlayerProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [historyTracks, setHistoryTracks] = useState<HistoryTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showHistoryOnly, setShowHistoryOnly] = useState(false);
  const [shuffleQueue, setShuffleQueue] = useState<string[]>([]);
  const [shuffleIndex, setShuffleIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Playlist states
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedForPlaylist, setSelectedForPlaylist] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  
  // Mini player state
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  // 로컬스토리지에서 즐겨찾기 불러오기
  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      try {
        setFavorites(new Set(JSON.parse(stored)));
      } catch (e) {
        console.error('Failed to parse favorites:', e);
      }
    }
  }, []);

  // 즐겨찾기 변경 시 로컬스토리지에 저장
  const toggleFavorite = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(trackId)) {
        newFavorites.delete(trackId);
      } else {
        newFavorites.add(trackId);
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...newFavorites]));
      return newFavorites;
    });
  };

  // 카테고리 목록 추출
  const categories = [...new Set(tracks.map(t => t.category))];
  
  // filteredTracks는 getFilteredTracks()로 대체됨 (아래에서 정의)

  // 셔플 큐 생성 함수 (Fisher-Yates 알고리즘)
  const generateShuffleQueue = (tracksList: MusicTrack[], currentTrackId?: string) => {
    const ids = tracksList.map(t => t.id);
    // Fisher-Yates shuffle
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    // 현재 트랙이 있으면 맨 앞으로 이동
    if (currentTrackId) {
      const idx = ids.indexOf(currentTrackId);
      if (idx > 0) {
        ids.splice(idx, 1);
        ids.unshift(currentTrackId);
      }
    }
    return ids;
  };

  // 셔플 모드 변경 시 큐 재생성
  useEffect(() => {
    if (shuffle && filteredTracks.length > 0) {
      const queue = generateShuffleQueue(filteredTracks, currentTrack?.id);
      setShuffleQueue(queue);
      setShuffleIndex(currentTrack ? 0 : -1);
    }
  }, [shuffle]);

  // 필터 변경 시 셔플 큐 재생성
  useEffect(() => {
    if (shuffle && filteredTracks.length > 0) {
      const queue = generateShuffleQueue(filteredTracks, currentTrack?.id);
      setShuffleQueue(queue);
      const newIndex = currentTrack ? queue.indexOf(currentTrack.id) : -1;
      setShuffleIndex(newIndex >= 0 ? newIndex : 0);
    }
  }, [selectedCategory, showFavoritesOnly, tracks.length]);

  // 단일 인스턴스 관리: 한 계정에서 하나의 플레이어만 열리도록
  useEffect(() => {
    if (!isOpen || !studentId) return;

    const instanceId = `${studentId}_${Date.now()}`;
    const activeKey = `${MUSIC_PLAYER_ACTIVE_KEY}_${studentId}`;

    // 다른 인스턴스가 이미 열려있는지 확인
    const existingInstance = localStorage.getItem(activeKey);
    if (existingInstance && existingInstance !== instanceId) {
      // 5초 이내에 생성된 인스턴스가 있으면 차단
      const [, timestamp] = existingInstance.split('_').slice(-1);
      const timeDiff = Date.now() - parseInt(timestamp || '0', 10);
      if (timeDiff < 60000) { // 1분 이내
        toast.error('다른 창에서 이미 힐링뮤직이 실행 중입니다.');
        onClose();
        return;
      }
    }

    // 현재 인스턴스를 활성 상태로 설정
    localStorage.setItem(activeKey, instanceId);

    // 다른 탭에서 플레이어가 열리면 현재 플레이어 닫기
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === activeKey && e.newValue && e.newValue !== instanceId) {
        toast.info('다른 창에서 힐링뮤직이 열렸습니다.');
        onClose();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      // 현재 인스턴스가 활성 상태일 때만 정리
      const currentActive = localStorage.getItem(activeKey);
      if (currentActive === instanceId) {
        localStorage.removeItem(activeKey);
      }
    };
  }, [isOpen, studentId, onClose]);

  // Load music tracks and playlists
  useEffect(() => {
    if (isOpen) {
      loadTracks();
      if (studentId) {
        loadHistory();
        loadPlaylists();
      }
    }
  }, [isOpen, studentId]);

  const loadTracks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_mindtalk_music');
      if (!error && data) {
        setTracks(data);
        if (data.length > 0 && !currentTrack) {
          setCurrentTrack(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!studentId) return;
    try {
      const { data, error } = await supabase.rpc('student_get_play_history', {
        student_id_input: studentId
      });
      if (!error && data) {
        // Map music_id to id for compatibility
        const mappedData = data.map((item: any) => ({
          id: item.music_id,
          title: item.title,
          category: item.category,
          file_path: item.file_path,
          duration_seconds: item.duration_seconds,
          last_played_at: item.last_played_at
        }));
        setHistoryTracks(mappedData.sort((a: HistoryTrack, b: HistoryTrack) => 
          new Date(b.last_played_at).getTime() - new Date(a.last_played_at).getTime()
        ));
      }
    } catch (error) {
      console.error('Failed to load play history:', error);
    }
  };

  // Playlist functions
  const loadPlaylists = async () => {
    if (!studentId) return;
    try {
      const { data, error } = await supabase.rpc('student_get_playlists', {
        student_id_input: studentId
      });
      if (!error && data) {
        setPlaylists(data);
      }
    } catch (error) {
      console.error('Failed to load playlists:', error);
    }
  };

  const savePlaylist = async () => {
    if (!studentId || !newPlaylistName.trim()) {
      toast.error('재생 목록 이름을 입력하세요');
      return;
    }
    if (selectedForPlaylist.size === 0) {
      toast.error('곡을 선택하세요');
      return;
    }
    
    try {
      const { error } = await supabase.rpc('student_save_playlist', {
        student_id_input: studentId,
        playlist_name_input: newPlaylistName.trim(),
        music_ids_input: Array.from(selectedForPlaylist)
      });
      
      if (error) throw error;
      
      toast.success('재생 목록이 저장되었습니다');
      setNewPlaylistName('');
      setSelectedForPlaylist(new Set());
      setIsSelectMode(false);
      loadPlaylists();
    } catch (error) {
      console.error('Failed to save playlist:', error);
      toast.error('저장 실패');
    }
  };

  const loadPlaylist = (playlist: Playlist) => {
    setActivePlaylist(playlist);
    setShowPlaylistPanel(false);
    toast.success(`"${playlist.playlist_name}" 불러옴`);
  };

  const deletePlaylist = async (playlistId: string) => {
    if (!studentId) return;
    try {
      const { error } = await supabase.rpc('student_delete_playlist', {
        student_id_input: studentId,
        playlist_id_input: playlistId
      });
      
      if (error) throw error;
      
      if (activePlaylist?.id === playlistId) {
        setActivePlaylist(null);
      }
      toast.success('삭제되었습니다');
      loadPlaylists();
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      toast.error('삭제 실패');
    }
  };

  const toggleSelectForPlaylist = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForPlaylist(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  // 필터된 트랙 - 활성 재생목록 포함
  const getFilteredTracks = () => {
    if (activePlaylist) {
      return tracks.filter(t => activePlaylist.music_ids.includes(t.id));
    }
    if (showHistoryOnly) {
      return historyTracks.map(h => ({ id: h.id, title: h.title, category: h.category, file_path: h.file_path, duration_seconds: h.duration_seconds }));
    }
    return tracks.filter(t => {
      const categoryMatch = !selectedCategory || t.category === selectedCategory;
      const favoriteMatch = !showFavoritesOnly || favorites.has(t.id);
      return categoryMatch && favoriteMatch;
    });
  };

  const filteredTracks = getFilteredTracks();

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (repeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        playNext();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [repeat, currentTrack, tracks]);

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const getAudioUrl = (filePath: string) => {
    // If file is in public folder (predefined list), use direct path
    if (PUBLIC_MUSIC_FILES.includes(filePath)) {
      return `/${filePath}`;
    }
    // Otherwise use Supabase storage
    const { data } = supabase.storage.from('mindtalk-music').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const playTrack = async (track: MusicTrack) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    
    // 셔플 모드에서 수동 선택 시 큐 인덱스 업데이트
    if (shuffle) {
      const idx = shuffleQueue.indexOf(track.id);
      if (idx >= 0) {
        setShuffleIndex(idx);
      }
    }
    
    // Increment play count
    await supabase.rpc('increment_music_play_count', { music_id_input: track.id });
    
    // 재생 히스토리 저장
    if (studentId) {
      await supabase.rpc('student_save_play_history', {
        student_id_input: studentId,
        music_id_input: track.id
      });
      // 히스토리 갱신
      loadHistory();
    }
    
    setTimeout(() => {
      audioRef.current?.play();
    }, 100);
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (filteredTracks.length === 0) return;
    
    if (shuffle) {
      // 셔플 큐에서 다음 곡 재생
      let nextIndex = shuffleIndex + 1;
      if (nextIndex >= shuffleQueue.length) {
        // 큐 끝에 도달하면 새로운 셔플 큐 생성
        const newQueue = generateShuffleQueue(filteredTracks);
        setShuffleQueue(newQueue);
        nextIndex = 0;
      }
      setShuffleIndex(nextIndex);
      const nextTrack = filteredTracks.find(t => t.id === shuffleQueue[nextIndex]);
      if (nextTrack) playTrack(nextTrack);
    } else {
      if (!currentTrack) {
        playTrack(filteredTracks[0]);
        return;
      }
      const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack.id);
      const nextIndex = (currentIndex + 1) % filteredTracks.length;
      playTrack(filteredTracks[nextIndex]);
    }
  };

  const playPrev = () => {
    if (filteredTracks.length === 0) return;
    
    if (shuffle) {
      // 셔플 큐에서 이전 곡 재생
      let prevIndex = shuffleIndex - 1;
      if (prevIndex < 0) {
        prevIndex = shuffleQueue.length - 1;
      }
      setShuffleIndex(prevIndex);
      const prevTrack = filteredTracks.find(t => t.id === shuffleQueue[prevIndex]);
      if (prevTrack) playTrack(prevTrack);
    } else {
      if (!currentTrack) {
        playTrack(filteredTracks[filteredTracks.length - 1]);
        return;
      }
      const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack.id);
      const prevIndex = currentIndex === 0 ? filteredTracks.length - 1 : currentIndex - 1;
      playTrack(filteredTracks[prevIndex]);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      startPosX: position.x,
      startPosY: position.y
    };
    setIsDragging(true);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !dragRef.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;
    
    // 화면 경계 내에서만 이동 가능하도록 제한
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 100;
    const newX = Math.max(-maxX, Math.min(maxX, dragRef.current.startPosX + deltaX));
    const newY = Math.max(-50, Math.min(maxY, dragRef.current.startPosY + deltaY));
    
    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  // Drag event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging]);

  // Reset position when closed
  useEffect(() => {
    if (!isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Mini Player Mode
  if (isMinimized) {
    return (
      <div 
        className="fixed z-[60] animate-scale-in right-2 sm:right-auto"
        style={{ 
          top: `calc(0.5rem + ${Math.max(0, position.y)}px)`,
          ...(window.innerWidth >= 640 ? {
            right: `calc(0.5rem - ${position.x}px)`,
          } : {})
        }}
      >
        <div 
          className="rounded-xl shadow-2xl overflow-hidden w-[200px] sm:w-[260px]" 
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)' }}
        >
          {/* Drag Handle */}
          <div 
            className="flex items-center justify-center py-1 cursor-grab active:cursor-grabbing border-b border-white/10"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <GripVertical className="w-4 h-4 text-white/50" />
          </div>
          
          <div className="flex items-center gap-2 p-2">
            {/* Album Art Mini */}
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
              <Music className={`w-5 h-5 text-white ${isPlaying ? 'animate-pulse' : ''}`} />
            </div>
            
            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{currentTrack?.title || '선택된 곡 없음'}</p>
              <p className="text-[10px] text-purple-200 truncate">{currentTrack?.category || ''}</p>
            </div>
            
            {/* Window Controls */}
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(false)}
                className="text-white hover:bg-white/20 h-6 w-6 p-0"
                title="확대"
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20 h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {/* Mini Playback Controls */}
          <div className="flex items-center justify-center gap-1 pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={playPrev}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlay}
              className="text-white hover:bg-white/20 h-9 w-9 p-0 bg-white/10 rounded-full"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={playNext}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Mini Progress Bar */}
          <div className="px-2 pb-2">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/60 transition-all duration-300"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-purple-200 mt-0.5">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
        
        {/* Hidden Audio Element */}
        {currentTrack && (
          <audio
            ref={audioRef}
            src={getAudioUrl(currentTrack.file_path)}
            preload="metadata"
          />
        )}
      </div>
    );
  }

  return (
    <div 
      className="fixed z-[60] inset-x-2 sm:inset-x-auto sm:w-[340px]"
      style={{ 
        top: `calc(0.5rem + ${position.y}px)`,
        ...(window.innerWidth >= 640 ? {
          left: position.x === 0 ? '0.5rem' : `calc(0.5rem + ${position.x}px)`,
          right: position.x === 0 ? 'auto' : 'auto',
        } : {})
      }}
    >
      <div className="rounded-2xl shadow-2xl overflow-hidden overflow-y-auto w-full sm:w-[340px] max-h-[80vh] sm:max-h-[90vh]" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)' }}>
        {/* Drag Handle */}
        <div 
          className="hidden sm:flex items-center justify-center py-1 cursor-grab active:cursor-grabbing border-b border-white/10"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <GripVertical className="w-4 h-4 text-white/50" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <div className="flex items-center gap-1.5 text-white">
            <Music className="w-3.5 h-3.5" />
            <span className="font-medium text-sm">힐링 뮤직</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="text-white hover:bg-white/10 h-7 w-7 p-0"
              title="최소화"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10 h-7 w-7 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Now Playing */}
        {currentTrack && (
          <div className="px-4 py-3 text-center">
            <div className="w-24 h-24 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-lg">
              <Music className={`w-11 h-11 text-white ${isPlaying ? 'animate-pulse' : ''}`} />
            </div>
            <h3 className="text-base font-bold text-white truncate">{currentTrack.title}</h3>
            <p className="text-xs text-purple-200">{currentTrack.category}</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="px-4 pb-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="cursor-pointer [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_.relative]:h-1"
          />
          <div className="flex justify-between text-[10px] text-purple-200 mt-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShuffle(!shuffle)}
            className={`text-white hover:bg-white/10 h-8 w-8 p-0 ${shuffle ? 'text-pink-400' : ''}`}
          >
            <Shuffle className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={playPrev}
            className="text-white hover:bg-white/10 h-8 w-8 p-0"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-white text-purple-900 hover:bg-purple-100"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={playNext}
            className="text-white hover:bg-white/10 h-8 w-8 p-0"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRepeat(!repeat)}
            className={`text-white hover:bg-white/10 h-8 w-8 p-0 ${repeat ? 'text-pink-400' : ''}`}
          >
            <Repeat className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 px-4 pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
            className="text-white hover:bg-white/10 h-7 w-7 p-0"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={100}
            step={1}
            onValueChange={(v) => { setVolume(v[0]); setIsMuted(false); }}
            className="flex-1 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_.relative]:h-1"
          />
        </div>

        {/* Playlist */}
        <div className="border-t border-white/10">
          <div className="px-3 py-1 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <p className="text-[10px] text-purple-200 font-medium">
                {activePlaylist ? activePlaylist.playlist_name : '플레이리스트'}
              </p>
              {activePlaylist && (
                <button
                  onClick={() => setActivePlaylist(null)}
                  className="text-[10px] text-pink-300 hover:text-pink-200"
                >
                  (해제)
                </button>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] text-purple-300">{filteredTracks.length}곡</span>
              {studentId && (
                <>
                  <button
                    onClick={() => setShowPlaylistPanel(!showPlaylistPanel)}
                    className={`p-0.5 rounded transition-colors ${showPlaylistPanel ? 'bg-pink-500 text-white' : 'text-purple-200 hover:bg-white/10'}`}
                    title="재생 목록 관리"
                  >
                    <ListMusic className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => { setIsSelectMode(!isSelectMode); setSelectedForPlaylist(new Set()); }}
                    className={`p-0.5 rounded transition-colors ${isSelectMode ? 'bg-pink-500 text-white' : 'text-purple-200 hover:bg-white/10'}`}
                    title="곡 선택하여 저장"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Playlist Panel */}
          {showPlaylistPanel && studentId && (
            <div className="px-3 pb-1 space-y-1 border-b border-white/10">
              <p className="text-[10px] text-purple-200 font-medium">내 재생 목록</p>
              {playlists.length === 0 ? (
                <p className="text-[10px] text-purple-300">저장된 재생 목록이 없습니다</p>
              ) : (
                <div className="space-y-0.5 max-h-20 overflow-y-auto">
                  {playlists.map((pl) => (
                    <div key={pl.id} className="flex items-center justify-between bg-white/5 rounded px-1.5 py-0.5">
                      <button
                        onClick={() => loadPlaylist(pl)}
                        className="flex-1 text-left text-[10px] text-purple-200 hover:text-white truncate"
                      >
                        <FolderOpen className="w-2.5 h-2.5 inline mr-0.5" />
                        {pl.playlist_name} ({pl.music_ids.length}곡)
                      </button>
                      <button
                        onClick={() => deletePlaylist(pl.id)}
                        className="p-0.5 text-purple-300 hover:text-red-400"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Select Mode - Save Playlist */}
          {isSelectMode && studentId && (
            <div className="px-3 pb-1 space-y-1 border-b border-white/10">
              <div className="flex items-center gap-1">
                <Input
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="재생 목록 이름"
                  className="h-6 text-[10px] bg-white/10 border-white/20 text-white placeholder:text-purple-300"
                />
                <Button
                  size="sm"
                  onClick={savePlaylist}
                  disabled={!newPlaylistName.trim() || selectedForPlaylist.size === 0}
                  className="h-6 px-1.5 bg-pink-500 hover:bg-pink-600 text-white text-[10px]"
                >
                  <Save className="w-2.5 h-2.5 mr-0.5" />
                  저장 ({selectedForPlaylist.size})
                </Button>
              </div>
              <p className="text-[10px] text-purple-300">아래 목록에서 곡을 선택하세요</p>
            </div>
          )}
          
          {/* Category & Favorites & History Filter */}
          <div className="px-3 py-1 flex gap-1 flex-wrap">
            <button
              onClick={() => { setSelectedCategory(null); setShowFavoritesOnly(false); setShowHistoryOnly(false); setActivePlaylist(null); }}
              className={`px-1.5 py-0.5 text-[10px] rounded-full transition-colors ${
                selectedCategory === null && !showFavoritesOnly && !showHistoryOnly && !activePlaylist
                  ? 'bg-pink-500 text-white'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20'
              }`}
            >
              전체
            </button>
            {studentId && (
              <button
                onClick={() => { setShowHistoryOnly(!showHistoryOnly); setShowFavoritesOnly(false); setSelectedCategory(null); setActivePlaylist(null); }}
                className={`px-1.5 py-0.5 text-[10px] rounded-full transition-colors flex items-center gap-0.5 ${
                  showHistoryOnly
                    ? 'bg-pink-500 text-white'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                <History className="w-2.5 h-2.5" />
                최근
              </button>
            )}
            <button
              onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setSelectedCategory(null); setShowHistoryOnly(false); setActivePlaylist(null); }}
              className={`px-1.5 py-0.5 text-[10px] rounded-full transition-colors flex items-center gap-0.5 ${
                showFavoritesOnly
                  ? 'bg-pink-500 text-white'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20'
              }`}
            >
              <Heart className={`w-2.5 h-2.5 ${showFavoritesOnly ? 'fill-white' : ''}`} />
              즐겨찾기
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setShowFavoritesOnly(false); setShowHistoryOnly(false); setActivePlaylist(null); }}
                className={`px-1.5 py-0.5 text-[10px] rounded-full transition-colors ${
                  selectedCategory === cat
                    ? 'bg-pink-500 text-white'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <ScrollArea className="h-36 [&_[data-radix-scroll-area-scrollbar]]:w-1.5 [&_[data-radix-scroll-area-thumb]]:bg-white/30">
            {isLoading ? (
              <div className="p-2 text-center text-purple-200 text-xs">로딩 중...</div>
            ) : filteredTracks.length === 0 ? (
              <div className="p-2 text-center text-purple-200 text-xs">
                {activePlaylist ? '재생 목록이 비어있습니다' : showHistoryOnly ? '재생 기록이 없습니다' : showFavoritesOnly ? '즐겨찾기가 없습니다' : '음악이 없습니다'}
              </div>
            ) : (
              <div className="space-y-0.5 px-2 pb-1">
                {filteredTracks.map((track) => (
                  <div
                    key={track.id}
                    className={`w-full flex items-center gap-1.5 py-1 px-1.5 rounded-md transition-colors ${
                      currentTrack?.id === track.id
                        ? 'bg-white/20 text-white'
                        : 'text-purple-200 hover:bg-white/10 hover:text-white'
                    } ${isSelectMode && selectedForPlaylist.has(track.id) ? 'ring-1 ring-pink-400' : ''}`}
                  >
                    {isSelectMode && (
                      <button
                        onClick={(e) => toggleSelectForPlaylist(track.id, e)}
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 text-[10px] ${
                          selectedForPlaylist.has(track.id)
                            ? 'bg-pink-500 border-pink-500 text-white'
                            : 'border-purple-400 text-transparent hover:border-pink-400'
                        }`}
                      >
                        {selectedForPlaylist.has(track.id) && '✓'}
                      </button>
                    )}
                    <button
                      onClick={() => playTrack(track)}
                      className="flex items-center gap-2 flex-1 min-w-0"
                    >
                      <div className="w-6 h-6 rounded bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                        {currentTrack?.id === track.id && isPlaying ? (
                          <div className="flex gap-0.5">
                            <span className="w-0.5 h-2 bg-pink-400 animate-pulse"></span>
                            <span className="w-0.5 h-3 bg-pink-400 animate-pulse" style={{ animationDelay: '0.1s' }}></span>
                            <span className="w-0.5 h-1.5 bg-pink-400 animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                          </div>
                        ) : (
                          <Music className="w-3 h-3" />
                        )}
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="text-xs font-medium truncate leading-tight">{track.title}</p>
                        <p className="text-[10px] opacity-70 leading-tight">{track.category}</p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => toggleFavorite(track.id, e)}
                      className="p-0.5 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                    >
                      <Heart 
                        className={`w-3 h-3 transition-colors ${
                          favorites.has(track.id) 
                            ? 'fill-pink-400 text-pink-400' 
                            : 'text-purple-300 hover:text-pink-300'
                        }`} 
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Hidden Audio Element */}
        {currentTrack && (
          <audio
            ref={audioRef}
            src={getAudioUrl(currentTrack.file_path)}
            preload="metadata"
          />
        )}
      </div>
    </div>
  );
}
