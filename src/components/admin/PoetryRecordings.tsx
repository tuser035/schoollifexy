import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Mic, 
  Play, 
  Pause, 
  Search, 
  Download,
  Users,
  BookOpen,
  Award,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Recording {
  id: string;
  student_id: string;
  student_name: string;
  student_grade: number;
  student_class: number;
  student_number: number;
  collection_id: string;
  collection_title: string;
  poem_id: string;
  poem_title: string;
  recording_url: string;
  duration_seconds: number | null;
  points_awarded: number | null;
  created_at: string;
}

interface Statistics {
  total_recordings: number;
  total_students: number;
  total_points_awarded: number;
  completed_collections: number;
}

interface PoetryCollection {
  id: string;
  title: string;
  poet: string;
}

interface PoetryRecordingsProps {
  adminId: string;
}

export default function PoetryRecordings({ adminId }: PoetryRecordingsProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [collections, setCollections] = useState<PoetryCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadData();
  }, [adminId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 통계 로드
      const { data: statsData, error: statsError } = await supabase.rpc('admin_get_poetry_statistics', {
        admin_id_input: adminId
      });
      
      if (statsError) throw statsError;
      if (statsData && statsData.length > 0) {
        setStatistics(statsData[0]);
      }

      // 시집 목록 로드
      const { data: collectionsData, error: collectionsError } = await supabase.rpc('admin_get_poetry_collections', {
        admin_id_input: adminId
      });
      
      if (collectionsError) throw collectionsError;
      setCollections(collectionsData || []);

      // 녹음 목록 로드
      await loadRecordings();
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('데이터 로딩 실패');
    } finally {
      setLoading(false);
    }
  };

  const loadRecordings = async (collectionId?: string) => {
    try {
      const params: { admin_id_input: string; collection_id_input?: string } = {
        admin_id_input: adminId
      };
      
      if (collectionId && collectionId !== 'all') {
        params.collection_id_input = collectionId;
      }

      const { data, error } = await supabase.rpc('admin_get_poetry_recordings', params);
      
      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Error loading recordings:', error);
      toast.error('녹음 목록 로딩 실패');
    }
  };

  const handleCollectionChange = (value: string) => {
    setSelectedCollection(value);
    loadRecordings(value === 'all' ? undefined : value);
  };

  const playRecording = (recording: Recording) => {
    if (playingId === recording.id) {
      // 재생 중이면 정지
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
    } else {
      // 이전 오디오 정지
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // 새 오디오 재생
      const audio = new Audio(recording.recording_url);
      audio.onended = () => setPlayingId(null);
      audio.onpause = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingId(recording.id);
    }
  };

  const filteredRecordings = recordings.filter(r => 
    searchText === '' || 
    r.student_name.includes(searchText) ||
    r.student_id.includes(searchText) ||
    r.poem_title.includes(searchText) ||
    r.collection_title.includes(searchText)
  );

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Mic className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">총 녹음</p>
                  <p className="text-2xl font-bold">{statistics.total_recordings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">참여 학생</p>
                  <p className="text-2xl font-bold">{statistics.total_students}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">지급 포인트</p>
                  <p className="text-2xl font-bold">{statistics.total_points_awarded}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">완독 시집</p>
                  <p className="text-2xl font-bold">{statistics.completed_collections}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 필터 및 검색 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            시 낭독 녹음 조회
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="학생명, 학번, 시 제목으로 검색..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedCollection} onValueChange={handleCollectionChange}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="시집 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 시집</SelectItem>
                {collections.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>

          {/* 녹음 목록 테이블 */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>학생</TableHead>
                  <TableHead>시집</TableHead>
                  <TableHead>시 제목</TableHead>
                  <TableHead className="text-center">포인트</TableHead>
                  <TableHead>녹음일시</TableHead>
                  <TableHead className="text-center">재생</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredRecordings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      녹음 데이터가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecordings.map((recording) => (
                    <TableRow key={recording.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{recording.student_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {recording.student_grade}-{recording.student_class} {recording.student_number}번
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {recording.collection_title}
                        </Badge>
                      </TableCell>
                      <TableCell>{recording.poem_title}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-100 text-green-700">
                          +{recording.points_awarded || 0}점
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(recording.created_at), 'MM/dd HH:mm', { locale: ko })}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant={playingId === recording.id ? 'default' : 'outline'}
                            onClick={() => playRecording(recording)}
                            className="h-8 w-8 p-0"
                          >
                            {playingId === recording.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(recording.recording_url, '_blank')}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredRecordings.length > 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              총 {filteredRecordings.length}개의 녹음
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
