import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
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
  Heart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MusicTrack {
  id: string;
  title: string;
  category: string;
  file_path: string;
  duration_seconds?: number;
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

interface MindTalkMusicPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MindTalkMusicPlayer({ isOpen, onClose }: MindTalkMusicPlayerProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
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
  const audioRef = useRef<HTMLAudioElement>(null);

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
  
  // 필터된 트랙 목록
  const filteredTracks = tracks.filter(t => {
    const categoryMatch = !selectedCategory || t.category === selectedCategory;
    const favoriteMatch = !showFavoritesOnly || favorites.has(t.id);
    return categoryMatch && favoriteMatch;
  });

  // Load music tracks
  useEffect(() => {
    if (isOpen) {
      loadTracks();
    }
  }, [isOpen]);

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
    
    // Increment play count
    await supabase.rpc('increment_music_play_count', { music_id_input: track.id });
    
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
    if (!currentTrack || filteredTracks.length === 0) return;
    
    const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack.id);
    let nextIndex: number;
    
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * filteredTracks.length);
    } else {
      nextIndex = (currentIndex + 1) % filteredTracks.length;
    }
    
    playTrack(filteredTracks[nextIndex]);
  };

  const playPrev = () => {
    if (!currentTrack || filteredTracks.length === 0) return;
    
    const currentIndex = filteredTracks.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? filteredTracks.length - 1 : currentIndex - 1;
    
    playTrack(filteredTracks[prevIndex]);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-gradient-to-b from-purple-900 via-purple-800 to-pink-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-white">
            <Music className="w-5 h-5" />
            <span className="font-medium">힐링 뮤직</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Now Playing */}
        {currentTrack && (
          <div className="p-6 text-center">
            <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-lg">
              <Music className={`w-16 h-16 text-white ${isPlaying ? 'animate-pulse' : ''}`} />
            </div>
            <h3 className="text-lg font-bold text-white truncate">{currentTrack.title}</h3>
            <p className="text-sm text-purple-200">{currentTrack.category}</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="px-6 pb-4">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-purple-200 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 pb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShuffle(!shuffle)}
            className={`text-white hover:bg-white/10 ${shuffle ? 'text-pink-400' : ''}`}
          >
            <Shuffle className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={playPrev}
            className="text-white hover:bg-white/10"
          >
            <SkipBack className="w-5 h-5" />
          </Button>
          <Button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-white text-purple-900 hover:bg-purple-100"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={playNext}
            className="text-white hover:bg-white/10"
          >
            <SkipForward className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRepeat(!repeat)}
            className={`text-white hover:bg-white/10 ${repeat ? 'text-pink-400' : ''}`}
          >
            <Repeat className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 px-6 pb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="text-white hover:bg-white/10"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume]}
            max={100}
            step={1}
            onValueChange={(v) => { setVolume(v[0]); setIsMuted(false); }}
            className="flex-1"
          />
        </div>

        {/* Playlist */}
        <div className="border-t border-white/10">
          <div className="px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-purple-200 font-medium">플레이리스트</p>
            <span className="text-xs text-purple-300">{filteredTracks.length}곡</span>
          </div>
          
          {/* Category & Favorites Filter */}
          <div className="px-4 pb-2 flex gap-1 flex-wrap">
            <button
              onClick={() => { setSelectedCategory(null); setShowFavoritesOnly(false); }}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                selectedCategory === null && !showFavoritesOnly
                  ? 'bg-pink-500 text-white'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setSelectedCategory(null); }}
              className={`px-2 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                showFavoritesOnly
                  ? 'bg-pink-500 text-white'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20'
              }`}
            >
              <Heart className={`w-3 h-3 ${showFavoritesOnly ? 'fill-white' : ''}`} />
              즐겨찾기
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setShowFavoritesOnly(false); }}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  selectedCategory === cat
                    ? 'bg-pink-500 text-white'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <ScrollArea className="h-40">
            {isLoading ? (
              <div className="p-4 text-center text-purple-200">로딩 중...</div>
            ) : filteredTracks.length === 0 ? (
              <div className="p-4 text-center text-purple-200">
                {showFavoritesOnly ? '즐겨찾기가 없습니다' : '음악이 없습니다'}
              </div>
            ) : (
              <div className="space-y-1 px-2 pb-2">
                {filteredTracks.map((track) => (
                  <div
                    key={track.id}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                      currentTrack?.id === track.id
                        ? 'bg-white/20 text-white'
                        : 'text-purple-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <button
                      onClick={() => playTrack(track)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="w-8 h-8 rounded bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                        {currentTrack?.id === track.id && isPlaying ? (
                          <div className="flex gap-0.5">
                            <span className="w-1 h-3 bg-pink-400 animate-pulse"></span>
                            <span className="w-1 h-4 bg-pink-400 animate-pulse" style={{ animationDelay: '0.1s' }}></span>
                            <span className="w-1 h-2 bg-pink-400 animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                          </div>
                        ) : (
                          <Music className="w-4 h-4" />
                        )}
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="text-sm font-medium truncate">{track.title}</p>
                        <p className="text-xs opacity-70">{track.category}</p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => toggleFavorite(track.id, e)}
                      className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                    >
                      <Heart 
                        className={`w-4 h-4 transition-colors ${
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
