import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  BarChart3, 
  RefreshCw, 
  Search, 
  BookOpen,
  Star,
  Download,
  TrendingUp,
  Users,
  Trophy,
  Feather
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

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

interface PopularBook {
  book_id: string;
  book_number: number;
  title: string;
  cover_image_url: string | null;
  total_readers: number;
  completed_readers: number;
  avg_rating: number | null;
}

interface ReadingStatisticsProps {
  adminId: string;
}

const CHART_COLORS = ['#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6'];

export default function ReadingStatistics({ adminId }: ReadingStatisticsProps) {
  const [stats, setStats] = useState<ReadingStats[]>([]);
  const [filteredStats, setFilteredStats] = useState<ReadingStats[]>([]);
  const [popularBooks, setPopularBooks] = useState<PopularBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('popular');

  useEffect(() => {
    loadStats();
    loadPopularBooks();
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

  const loadPopularBooks = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_popular_storybooks', {
        admin_id_input: adminId
      });

      if (error) throw error;
      setPopularBooks(data || []);
    } catch (error) {
      console.error('Error loading popular books:', error);
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

  const refreshAll = () => {
    loadStats();
    loadPopularBooks();
  };

  // Summary stats
  const totalReaders = stats.length;
  const totalBooksRead = stats.reduce((acc, s) => acc + s.total_books_read, 0);
  const totalCompleted = stats.reduce((acc, s) => acc + s.completed_books, 0);
  const totalReviews = stats.reduce((acc, s) => acc + s.total_reviews, 0);

  // Chart data for popular books
  const chartData = popularBooks.slice(0, 10).map(book => ({
    name: book.title.length > 8 ? book.title.substring(0, 8) + '...' : book.title,
    fullTitle: book.title,
    readers: Number(book.total_readers),
    completed: Number(book.completed_readers),
    rating: book.avg_rating ? Number(book.avg_rating) : 0
  }));

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
              <Trophy className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">독후감</p>
                <p className="text-2xl font-bold text-purple-600">{totalReviews}개</p>
              </div>
              <Star className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Popular Books and Student Stats */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="popular" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            인기 동화책
          </TabsTrigger>
          <TabsTrigger value="poetry" className="flex items-center gap-2">
            <Feather className="w-4 h-4" />
            시집읽기
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            학생별 통계
          </TabsTrigger>
        </TabsList>

        {/* Popular Books Tab */}
        <TabsContent value="popular" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                인문학 TOP 10
              </CardTitle>
              <Button variant="outline" size="sm" onClick={refreshAll}>
                <RefreshCw className="w-4 h-4 mr-1" />
                새로고침
              </Button>
            </CardHeader>
            <CardContent>
              {popularBooks.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={80}
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border rounded-lg shadow-lg">
                                <p className="font-semibold text-amber-800">{data.fullTitle}</p>
                                <p className="text-sm">열람: {data.readers}명</p>
                                <p className="text-sm">완독: {data.completed}명</p>
                                {data.rating > 0 && <p className="text-sm">평균별점: ⭐ {data.rating}</p>}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="readers" name="열람" fill="#f59e0b">
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                      <Bar dataKey="completed" name="완독" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  아직 읽기 데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ranking Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">인기 순위</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">순위</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead className="text-center">열람</TableHead>
                      <TableHead className="text-center">완독</TableHead>
                      <TableHead className="text-center">평점</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {popularBooks.map((book, index) => (
                      <TableRow key={book.book_id}>
                        <TableCell>
                          {index < 3 ? (
                            <Badge className={
                              index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                            }>
                              {index + 1}위
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">{index + 1}위</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {book.cover_image_url && (
                              <img 
                                src={book.cover_image_url} 
                                alt={book.title} 
                                className="w-8 h-10 object-cover rounded"
                              />
                            )}
                            <span className="font-medium">{book.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{Number(book.total_readers)}명</TableCell>
                        <TableCell className="text-center">{Number(book.completed_readers)}명</TableCell>
                        <TableCell className="text-center">
                          {book.avg_rating ? (
                            <span className="flex items-center justify-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              {book.avg_rating}
                            </span>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {popularBooks.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          아직 읽기 데이터가 없습니다
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Poetry Tab */}
        <TabsContent value="poetry" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Feather className="w-5 h-5 text-purple-500" />
                시집 읽기 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                시집 읽기 통계 기능이 준비 중입니다.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="학생 검색..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-9"
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
                    {[1,2,3,4,5,6,7,8].map(c => (
                      <SelectItem key={c} value={c.toString()}>{c}반</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={refreshAll}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  새로고침
                </Button>
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-1" />
                  CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Student Table */}
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">로딩 중...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>학년</TableHead>
                        <TableHead>반</TableHead>
                        <TableHead>번호</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead className="text-center">열람</TableHead>
                        <TableHead className="text-center">완독</TableHead>
                        <TableHead className="text-center">독후감</TableHead>
                        <TableHead className="text-center">평균별점</TableHead>
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
                            <Badge variant="outline">{s.total_books_read}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-100 text-green-800">{s.completed_books}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{s.total_reviews}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {s.avg_rating ? (
                              <span className="flex items-center justify-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                {s.avg_rating.toFixed(1)}
                              </span>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredStats.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            데이터가 없습니다
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
