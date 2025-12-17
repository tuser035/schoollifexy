import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Music, 
  Upload, 
  Trash2, 
  Play, 
  Pause, 
  RefreshCw,
  Plus,
  Loader2,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MusicTrack {
  id: string;
  title: string;
  category: string;
  file_path: string;
  duration_seconds: number | null;
  is_active: boolean;
  play_count: number;
  created_at: string;
}

interface MindTalkMusicProps {
  adminId: string;
}

const CATEGORIES = ['힐링', '활력', '위로', '집중', '휴식'];

export default function MindTalkMusic({ adminId }: MindTalkMusicProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('힐링');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_mindtalk_music', {
        admin_id_input: adminId
      });
      
      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error('Failed to load tracks:', error);
      toast.error('음악 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast.error('오디오 파일만 업로드할 수 있습니다');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error('파일 크기는 20MB 이하여야 합니다');
        return;
      }
      setSelectedFile(file);
      if (!newTitle) {
        setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !newTitle.trim()) {
      toast.error('파일과 제목을 입력해주세요');
      return;
    }

    setIsUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke('upload-mindtalk-music', {
          body: {
            fileName: selectedFile.name,
            fileBase64: base64,
            title: newTitle.trim(),
            category: newCategory,
            adminId
          }
        });

        if (error) throw error;

        toast.success('음악이 업로드되었습니다');
        setNewTitle('');
        setNewCategory('힐링');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadTracks();
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('업로드에 실패했습니다');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleActive = async (track: MusicTrack) => {
    try {
      // Set admin session first
      await supabase.rpc('set_admin_session', { admin_id_input: adminId });
      
      const { error } = await supabase
        .from('mindtalk_music')
        .update({ is_active: !track.is_active })
        .eq('id', track.id);

      if (error) throw error;

      setTracks(prev => prev.map(t => 
        t.id === track.id ? { ...t, is_active: !t.is_active } : t
      ));
      toast.success(track.is_active ? '음악이 비활성화되었습니다' : '음악이 활성화되었습니다');
    } catch (error) {
      console.error('Toggle failed:', error);
      toast.error('상태 변경에 실패했습니다');
    }
  };

  const deleteTrack = async (track: MusicTrack) => {
    try {
      // Set admin session
      await supabase.rpc('set_admin_session', { admin_id_input: adminId });

      // Delete from storage if it's a storage file
      if (!track.file_path.startsWith('music/')) {
        await supabase.storage.from('mindtalk-music').remove([track.file_path]);
      }

      // Delete from database
      const { error } = await supabase
        .from('mindtalk_music')
        .delete()
        .eq('id', track.id);

      if (error) throw error;

      setTracks(prev => prev.filter(t => t.id !== track.id));
      toast.success('음악이 삭제되었습니다');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('삭제에 실패했습니다');
    }
  };

  const playPreview = (track: MusicTrack) => {
    if (!audioRef.current) return;

    if (playingId === track.id) {
      audioRef.current.pause();
      setPlayingId(null);
    } else {
      const url = track.file_path.startsWith('music/') 
        ? `/${track.file_path}`
        : supabase.storage.from('mindtalk-music').getPublicUrl(track.file_path).data.publicUrl;
      
      audioRef.current.src = url;
      audioRef.current.play();
      setPlayingId(track.id);
    }
  };

  const totalPlays = tracks.reduce((sum, t) => sum + t.play_count, 0);
  const activeCount = tracks.filter(t => t.is_active).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{tracks.length}</p>
                <p className="text-xs text-muted-foreground">전체 음악</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">활성화</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalPlays}</p>
                <p className="text-xs text-muted-foreground">총 재생</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Form */}
      <Card className="border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-500" />
            새 음악 추가
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">파일 선택</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">제목</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="음악 제목"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">카테고리</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || !newTitle.trim() || isUploading}
            className="w-full bg-purple-500 hover:bg-purple-600"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                업로드
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Music List */}
      <Card className="border-purple-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-500" />
              음악 목록
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadTracks}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              로딩 중...
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
              등록된 음악이 없습니다
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      track.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => playPreview(track)}
                      >
                        {playingId === track.id ? (
                          <Pause className="w-4 h-4 text-purple-500" />
                        ) : (
                          <Play className="w-4 h-4 text-purple-500" />
                        )}
                      </Button>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{track.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {track.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            재생 {track.play_count}회
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={track.is_active}
                        onCheckedChange={() => toggleActive(track)}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>음악 삭제</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{track.title}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTrack(track)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Hidden audio element for preview */}
      <audio 
        ref={audioRef} 
        onEnded={() => setPlayingId(null)}
        onPause={() => setPlayingId(null)}
      />
    </div>
  );
}
