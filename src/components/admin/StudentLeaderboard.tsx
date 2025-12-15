import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award, TrendingUp, Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface StudentRank {
  student_id: string;
  name: string;
  grade: number;
  class: number;
  number: number;
  merits: number;
  demerits: number;
  monthly: number;
  total: number;
}

interface MonthlyTrend {
  month: string;
  total: number;
}

const StudentLeaderboard = () => {
  const [filterType, setFilterType] = useState<"all" | "grade" | "class">("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("1");
  const [selectedClass, setSelectedClass] = useState<string>("1");
  const [sortBy, setSortBy] = useState<"total" | "merits" | "demerits" | "monthly">("total");
  const [students, setStudents] = useState<StudentRank[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<MonthlyTrend[]>([]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }

      const parsedUser = JSON.parse(authUser);
      if ((parsedUser.type !== "admin" && parsedUser.type !== "teacher") || !parsedUser.id) {
        toast.error("권한이 필요합니다");
        return;
      }

      // 서버측 집계 RPC 사용 (student_id trim 처리로 공백 문제 해결)
      const { data: leaderboardData, error: leaderboardError } = await supabase.rpc(
        "admin_get_leaderboard",
        {
          admin_id_input: parsedUser.id,
          search_grade: filterType === "grade" || filterType === "class" ? parseInt(selectedGrade) : null,
          search_class: filterType === "class" ? parseInt(selectedClass) : null,
          year_input: null
        }
      );

      if (leaderboardError) throw leaderboardError;

      if (!leaderboardData || leaderboardData.length === 0) {
        setStudents([]);
        toast.info("해당 조건의 학생이 없습니다");
        return;
      }

      // 정렬 적용 (데이터베이스에서 이미 정렬되어 오지만 클라이언트 정렬 옵션 지원)
      const rankedStudents = [...leaderboardData].sort((a, b) => {
        if (sortBy === "total") return b.total - a.total;
        if (sortBy === "merits") return b.merits - a.merits;
        if (sortBy === "monthly") return b.monthly - a.monthly;
        return b.demerits - a.demerits;
      });

      setStudents(rankedStudents);
      toast.success(`${rankedStudents.length}명의 학생 순위 조회 완료`);
    } catch (error: any) {
      toast.error(error.message || "순위 조회에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMonthlyTrend = async (studentId: string) => {
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const parsedUser = JSON.parse(authUser);
      if ((parsedUser.type !== "admin" && parsedUser.type !== "teacher") || !parsedUser.id) return;

      // 관리자 또는 교사 세션 설정
      if (parsedUser.type === "admin") {
        await supabase.rpc("set_admin_session", {
          admin_id_input: parsedUser.id,
        });
      } else if (parsedUser.type === "teacher") {
        await supabase.rpc("set_teacher_session", {
          teacher_id_input: parsedUser.id,
        });
      }

      const currentYear = new Date().getFullYear();
      
      // 월별 상점
      const { data: meritsData, error: meritsError } = await supabase
        .from("merits")
        .select("created_at, score")
        .eq("student_id", studentId);

      if (meritsError) throw meritsError;

      // 월별 벌점
      const { data: demeritsData, error: demeritsError } = await supabase
        .from("demerits")
        .select("created_at, score")
        .eq("student_id", studentId);

      if (demeritsError) throw demeritsError;

      // 월별 집계
      const monthlyData: Record<number, number> = {};
      for (let i = 1; i <= 12; i++) {
        monthlyData[i] = 0;
      }

      meritsData?.forEach(merit => {
        const date = new Date(merit.created_at);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth() + 1;
          monthlyData[month] += merit.score;
        }
      });

      demeritsData?.forEach(demerit => {
        const date = new Date(demerit.created_at);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth() + 1;
          monthlyData[month] -= demerit.score;
        }
      });

      const trendArray = Object.entries(monthlyData).map(([month, total]) => ({
        month: `${month}월`,
        total
      }));

      setTrendData(trendArray);
    } catch (error: any) {
      toast.error(error.message || "추이 조회에 실패했습니다");
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground">{index + 1}</span>;
  };

  const getTotalBadgeVariant = (total: number) => {
    if (total >= 100) return "default";
    if (total >= 50) return "secondary";
    if (total >= 0) return "outline";
    return "destructive";
  };

  const exportToCSV = () => {
    if (students.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }

    const csvHeader = "순위,학번,이름,학년,반,번호,상점,벌점,이달의학생,순점수";
    const csvRows = students.map((student, index) => 
      `${index + 1},${student.student_id},${student.name},${student.grade},${student.class},${student.number},${student.merits},${student.demerits},${student.monthly},${student.total}`
    );
    
    const BOM = "\uFEFF";
    const csvContent = BOM + csvHeader + "\n" + csvRows.join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const timestamp = new Date().toISOString().slice(0, 10);
    let fileName = `리더보드_${timestamp}`;
    
    if (filterType === "grade") {
      fileName = `${selectedGrade}학년_리더보드_${timestamp}`;
    } else if (filterType === "class") {
      fileName = `${selectedGrade}학년_${selectedClass}반_리더보드_${timestamp}`;
    }
    
    link.download = `${fileName}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("CSV 파일이 다운로드되었습니다");
  };

  useEffect(() => {
    loadLeaderboard();
  }, [filterType, selectedGrade, selectedClass, sortBy]);

  useEffect(() => {
    if (selectedStudent) {
      loadMonthlyTrend(selectedStudent);
    }
  }, [selectedStudent]);

  // 페이지 포커스 시 데이터 새로고침
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadLeaderboard();
      }
    };

    const handleFocus = () => {
      loadLeaderboard();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [filterType, selectedGrade, selectedClass, sortBy]);

  // 실시간 동기화 - merits, demerits, monthly 테이블
  useEffect(() => {
    const meritsChannel = supabase
      .channel('leaderboard_merits_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'merits' },
        (payload) => {
          console.log('Leaderboard - Merits changed:', payload);
          loadLeaderboard();
          if (selectedStudent) {
            loadMonthlyTrend(selectedStudent);
          }
          if (payload.eventType === 'INSERT') {
            toast.info('🔄 상점이 추가되어 순위가 갱신됩니다');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('🔄 상점이 수정되어 순위가 갱신됩니다');
          } else if (payload.eventType === 'DELETE') {
            toast.info('🔄 상점이 삭제되어 순위가 갱신됩니다');
          }
        }
      )
      .subscribe();

    const demeritsChannel = supabase
      .channel('leaderboard_demerits_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demerits' },
        (payload) => {
          console.log('Leaderboard - Demerits changed:', payload);
          loadLeaderboard();
          if (selectedStudent) {
            loadMonthlyTrend(selectedStudent);
          }
          if (payload.eventType === 'INSERT') {
            toast.info('🔄 벌점이 추가되어 순위가 갱신됩니다');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('🔄 벌점이 수정되어 순위가 갱신됩니다');
          } else if (payload.eventType === 'DELETE') {
            toast.info('🔄 벌점이 삭제되어 순위가 갱신됩니다');
          }
        }
      )
      .subscribe();

    const monthlyChannel = supabase
      .channel('leaderboard_monthly_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly' },
        (payload) => {
          console.log('Leaderboard - Monthly changed:', payload);
          loadLeaderboard();
          if (payload.eventType === 'INSERT') {
            toast.info('🔄 이달의 학생이 추가되어 순위가 갱신됩니다');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('🔄 이달의 학생이 수정되어 순위가 갱신됩니다');
          } else if (payload.eventType === 'DELETE') {
            toast.info('🔄 이달의 학생이 삭제되어 순위가 갱신됩니다');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(meritsChannel);
      supabase.removeChannel(demeritsChannel);
      supabase.removeChannel(monthlyChannel);
    };
  }, [selectedStudent]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>학생 리더보드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">필터</label>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="grade">학년별</SelectItem>
                  <SelectItem value="class">학급별</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(filterType === "grade" || filterType === "class") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">학년</label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3].map((g) => (
                      <SelectItem key={g} value={g.toString()}>
                        {g}학년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterType === "class" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">반</label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
                      <SelectItem key={c} value={c.toString()}>
                        {c}반
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">정렬</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">순점수</SelectItem>
                  <SelectItem value="merits">상점</SelectItem>
                  <SelectItem value="demerits">벌점</SelectItem>
                  <SelectItem value="monthly">이달의 학생</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={loadLeaderboard} disabled={isLoading}>
              {isLoading ? "조회 중..." : "새로고침"}
            </Button>

            {students.length > 0 && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV 내보내기
              </Button>
            )}
          </div>

          {students.length > 0 && (
            <div className="border rounded-lg overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">순위</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>학년반</TableHead>
                    <TableHead className="text-right">상점</TableHead>
                    <TableHead className="text-right">벌점</TableHead>
                    <TableHead className="text-right">이달의학생</TableHead>
                    <TableHead className="text-right">순점수</TableHead>
                    <TableHead className="text-right">추이</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, index) => (
                    <TableRow key={student.student_id}>
                      <TableCell className="font-medium">
                        {getRankIcon(index)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {student.name}
                        {index < 3 && (
                          <Badge variant="outline" className="ml-2">
                            TOP {index + 1}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.grade}학년 {student.class}반 {student.number}번
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-merit-blue-light text-merit-blue">
                          {student.merits}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-demerit-orange-light text-demerit-orange">
                          {student.demerits}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-monthly-green-light text-monthly-green">
                          {student.monthly}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getTotalBadgeVariant(student.total)}>
                          {student.total}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedStudent(
                            selectedStudent === student.student_id ? null : student.student_id
                          )}
                        >
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>월별 점수 변동 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-sm" />
                <YAxis className="text-sm" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="순점수"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentLeaderboard;
