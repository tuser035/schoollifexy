import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Music, 
  Upload, 
  Trash2, 
  Play, 
  Pause, 
  RefreshCw,
  Plus,
  Loader2,
  BarChart3,
  X,
  FileAudio,
  CheckSquare,
  FolderEdit
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

interface PendingFile {
  file: File;
  title: string;
  category: string;
}

interface MindTalkMusicProps {
  adminId: string;
}

const CATEGORIES = ['힐링', '활력', '위로', '집중', '휴식'];

// Public 폴더에 있는 기존 음악 파일들 (직접 업로드된 것이 아닌)
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

const isPublicMusicFile = (filePath: string) => PUBLIC_MUSIC_FILES.includes(filePath);

export default function MindTalkMusic({ adminId }: MindTalkMusicProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [bulkCategory, setBulkCategory] = useState('힐링');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [bulkEditCategory, setBulkEditCategory] = useState('힐링');
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

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

  const processFiles = useCallback((files: FileList | File[]) => {
    const audioFiles = Array.from(files).filter(file => {
      if (!file.type.startsWith('audio/')) {
        toast.error(`${file.name}: 오디오 파일만 업로드할 수 있습니다`);
        return false;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name}: 파일 크기는 20MB 이하여야 합니다`);
        return false;
      }
      return true;
    });

    const newPendingFiles: PendingFile[] = audioFiles.map(file => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ''),
      category: bulkCategory
    }));

    setPendingFiles(prev => [...prev, ...newPendingFiles]);
    if (audioFiles.length > 0) {
      toast.success(`${audioFiles.length}개 파일이 추가되었습니다`);
    }
  }, [bulkCategory]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const updatePendingFile = (index: number, updates: Partial<PendingFile>) => {
    setPendingFiles(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadSingleFile = async (pendingFile: PendingFile): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const { error } = await supabase.functions.invoke('upload-mindtalk-music', {
            body: {
              fileName: pendingFile.file.name,
              fileBase64: base64,
              title: pendingFile.title.trim(),
              category: pendingFile.category,
              adminId
            }
          });
          resolve(!error);
        } catch {
          resolve(false);
        }
      };
      reader.onerror = () => resolve(false);
      reader.readAsDataURL(pendingFile.file);
    });
  };

  const handleBulkUpload = async () => {
    if (pendingFiles.length === 0) {
      toast.error('업로드할 파일이 없습니다');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setCurrentUploadIndex(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingFiles.length; i++) {
      setCurrentUploadIndex(i + 1);
      const success = await uploadSingleFile(pendingFiles[i]);
      if (success) successCount++;
      else failCount++;
      setUploadProgress(((i + 1) / pendingFiles.length) * 100);
    }

    setIsUploading(false);
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (failCount === 0) {
      toast.success(`${successCount}개 파일 업로드 완료`);
    } else {
      toast.warning(`${successCount}개 성공, ${failCount}개 실패`);
    }
    loadTracks();
  };

  // 일괄 선택 관련 함수
  const toggleTrackSelection = (trackId: string) => {
    setSelectedTrackIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  const selectAllTracks = () => {
    if (selectedTrackIds.size === tracks.length) {
      setSelectedTrackIds(new Set());
    } else {
      setSelectedTrackIds(new Set(tracks.map(t => t.id)));
    }
  };

  const clearSelection = () => {
    setSelectedTrackIds(new Set());
  };

  // 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedTrackIds.size === 0) return;

    try {
      await supabase.rpc('set_admin_session', { admin_id_input: adminId });

      const tracksToDelete = tracks.filter(t => selectedTrackIds.has(t.id));
      
      // Delete from storage (only non-public files)
      for (const track of tracksToDelete) {
        if (!track.file_path.startsWith('music/')) {
          await supabase.storage.from('mindtalk-music').remove([track.file_path]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('mindtalk_music')
        .delete()
        .in('id', Array.from(selectedTrackIds));

      if (error) throw error;

      toast.success(`${selectedTrackIds.size}개 음악이 삭제되었습니다`);
      setSelectedTrackIds(new Set());
      setShowBulkDeleteConfirm(false);
      loadTracks();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('일괄 삭제에 실패했습니다');
    }
  };

  // 일괄 카테고리 변경
  const handleBulkCategoryChange = async () => {
    if (selectedTrackIds.size === 0) return;

    try {
      await supabase.rpc('set_admin_session', { admin_id_input: adminId });

      const { error } = await supabase
        .from('mindtalk_music')
        .update({ category: bulkEditCategory })
        .in('id', Array.from(selectedTrackIds));

      if (error) throw error;

      toast.success(`${selectedTrackIds.size}개 음악의 카테고리가 변경되었습니다`);
      setSelectedTrackIds(new Set());
      loadTracks();
    } catch (error) {
      console.error('Bulk category change failed:', error);
      toast.error('카테고리 변경에 실패했습니다');
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

      // Delete from storage if it's NOT a public folder file
      if (!isPublicMusicFile(track.file_path)) {
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
      // Public 폴더에 있는 기존 파일은 직접 경로로, 나머지는 Storage에서
      const url = isPublicMusicFile(track.file_path)
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
            음악 추가 (드래그 앤 드롭 / 일괄 업로드)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Drag and Drop Zone */}
          <div
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              isDragging 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-purple-500' : 'text-gray-400'}`} />
            <p className="text-sm text-muted-foreground">
              {isDragging ? '파일을 놓으세요' : '클릭하거나 파일을 드래그하여 업로드'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              여러 파일 선택 가능 (MP3, WAV 등, 최대 20MB)
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Bulk Category Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">기본 카테고리:</Label>
            <Select value={bulkCategory} onValueChange={setBulkCategory}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">(새로 추가되는 파일에 적용)</span>
          </div>

          {/* Pending Files List */}
          {pendingFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">대기 중인 파일 ({pendingFiles.length}개)</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPendingFiles([])}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  전체 삭제
                </Button>
              </div>
              <ScrollArea className="h-[200px] border rounded-lg p-2">
                <div className="space-y-2">
                  {pendingFiles.map((pf, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <FileAudio className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <Input
                        value={pf.title}
                        onChange={(e) => updatePendingFile(index, { title: e.target.value })}
                        className="h-8 text-sm flex-1"
                        placeholder="제목"
                      />
                      <Select 
                        value={pf.category} 
                        onValueChange={(v) => updatePendingFile(index, { category: v })}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => removePendingFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>업로드 중... ({currentUploadIndex}/{pendingFiles.length})</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Upload Button */}
          <Button 
            onClick={handleBulkUpload} 
            disabled={pendingFiles.length === 0 || isUploading}
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
                {pendingFiles.length > 0 ? `${pendingFiles.length}개 파일 업로드` : '업로드'}
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
              음악 목록 ({tracks.length}개)
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadTracks}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Bulk Actions */}
          {tracks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllTracks}
                className="text-xs"
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                {selectedTrackIds.size === tracks.length ? '선택 해제' : '전체 선택'}
              </Button>
              {selectedTrackIds.size > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">
                    {selectedTrackIds.size}개 선택됨
                  </span>
                  <div className="flex items-center gap-1">
                    <Select value={bulkEditCategory} onValueChange={setBulkEditCategory}>
                      <SelectTrigger className="w-20 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkCategoryChange}
                      className="text-xs"
                    >
                      <FolderEdit className="w-3 h-3 mr-1" />
                      카테고리 변경
                    </Button>
                  </div>
                  <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-red-500 border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        일괄 삭제
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>음악 일괄 삭제</AlertDialogTitle>
                        <AlertDialogDescription>
                          선택한 {selectedTrackIds.size}개 음악을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkDelete}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-xs"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          )}

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
                      selectedTrackIds.has(track.id) 
                        ? 'bg-purple-50 border-purple-300' 
                        : track.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={selectedTrackIds.has(track.id)}
                        onCheckedChange={() => toggleTrackSelection(track.id)}
                        className="flex-shrink-0"
                      />
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
