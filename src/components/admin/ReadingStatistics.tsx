import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  BarChart3, 
  RefreshCw, 
  Search, 
  BookOpen,
  Star,
  Download
} from 'lucide-react';

interface ReadingStats {
  student_id: string;
  student_name: string;
  student_grade: number;
  student_class: number;
  student_number: number;
  total_books_read: number;
  completed_books: number;
  total_reviews: number;
  avg_rating: number | null;
}

interface ReadingStatisticsProps {
  adminId: string;
}

export default function ReadingStatistics({ adminId }: ReadingStatisticsProps) {
  const [stats, setStats] = useState<ReadingStats[]>([]);
  const [filteredStats, setFilteredStats] = useState<ReadingStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  useEffect(() => {
    loadStats();
  }, [adminId]);

  useEffect(() => {
    filterStats();
  }, [stats, searchText, gradeFilter, classFilter]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_get_reading_statistics', {
        admin_id_input: adminId
      });

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast.error('통계를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const filterStats = () => {
    let result = [...stats];

    if (searchText) {
      result = result.filter(s => 
        s.student_name.includes(searchText) || 
        s.student_id.includes(searchText)
      );
    }

    if (gradeFilter !== 'all') {
      result = result.filter(s => s.student_grade === parseInt(gradeFilter));
    }

    if (classFilter !== 'all') {
      result = result.filter(s => s.student_class === parseInt(classFilter));
    }

    setFilteredStats(result);
  };

  const exportCSV = () => {
    const headers = ['학년', '반', '번호', '이름', '학번', '열람 수', '완독 수', '독후감 수', '평균별점'];
    const rows = filteredStats.map(s => [
      s.student_grade,
      s.student_class,
      s.student_number,
      s.student_name,
      s.student_id,
      s.total_books_read,
      s.completed_books,
      s.total_reviews,
      s.avg_rating ?? ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `읽기통계_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV 파일이 다운로드되었습니다');
  };

  // Summary stats
  const totalReaders = stats.length;
  const totalBooksRead = stats.reduce((acc, s) => acc + s.total_books_read, 0);
  const totalCompleted = stats.reduce((acc, s) => acc + s.completed_books, 0);
  const totalReviews = stats.reduce((acc, s) => acc + s.total_reviews, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">독서 학생</p>
                <p className="text-2xl font-bold text-amber-600">{totalReaders}명</p>
              </div>
              <BookOpen className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 열람</p>
                <p className="text-2xl font-bold text-blue-600">{totalBooksRead}권</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">완독</p>
                <p className="text-2xl font-bold text-green-600">{totalCompleted}권</p>
              </div>
              <BookOpen className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">독후감</p>
                <p className="text-2xl font-bold text-purple-600">{totalReviews}편</p>
              </div>
              <Star className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-amber-600" />
            학생별 읽기 통계
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadStats}>
              <RefreshCw className="w-4 h-4 mr-1" />
              새로고침
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={filteredStats.length === 0}>
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="이름 또는 학번 검색"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="학년" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="1">1학년</SelectItem>
                <SelectItem value="2">2학년</SelectItem>
                <SelectItem value="3">3학년</SelectItem>
              </SelectContent>
            </Select>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="반" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {[1,2,3,4,5,6,7,8,9,10].map(c => (
                  <SelectItem key={c} value={c.toString()}>{c}반</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
          ) : filteredStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              읽기 기록이 있는 학생이 없습니다
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">학년</TableHead>
                    <TableHead className="w-16">반</TableHead>
                    <TableHead className="w-16">번호</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead className="w-20 text-center">열람</TableHead>
                    <TableHead className="w-20 text-center">완독</TableHead>
                    <TableHead className="w-20 text-center">독후감</TableHead>
                    <TableHead className="w-24 text-center">평균별점</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStats.map((s) => (
                    <TableRow key={s.student_id}>
                      <TableCell>{s.student_grade}</TableCell>
                      <TableCell>{s.student_class}</TableCell>
                      <TableCell>{s.student_number}</TableCell>
                      <TableCell className="font-medium">{s.student_name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{s.total_books_read}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default" className="bg-green-600">{s.completed_books}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{s.total_reviews}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {s.avg_rating ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span>{s.avg_rating}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}