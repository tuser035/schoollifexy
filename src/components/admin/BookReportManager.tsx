import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookOpen, Award, Trophy, Search, FileText, Check, Clock } from "lucide-react";

interface BookReportManagerProps {
  adminId: string;
}

interface BookReport {
  id: string;
  student_id: string;
  student_name: string;
  student_grade: number;
  student_class: number;
  student_number: number;
  dept_name: string;
  book_title: string;
  content: string;
  points_awarded: number;
  status: string;
  created_at: string;
}

interface LeaderboardEntry {
  student_id: string;
  name: string;
  grade: number;
  class: number;
  number: number;
  dept_name: string;
  total_reports: number;
  total_points: number;
}

// 7권의 책 목록
const BOOK_TITLES = [
  "호밀밭의 파수꾼",
  "변신",
  "프랑켄슈타인",
  "데미안",
  "동물농장",
  "젊은 베르테르의 슬픔",
  "지킬박사와 하이드"
];

const BookReportManager: React.FC<BookReportManagerProps> = ({ adminId }) => {
  const [reports, setReports] = useState<BookReport[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchGrade, setSearchGrade] = useState<number | null>(null);
  const [searchClass, setSearchClass] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("reports");
  
  // 상세보기 다이얼로그
  const [selectedReport, setSelectedReport] = useState<BookReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [pointsToAward, setPointsToAward] = useState<string>("5");

  useEffect(() => {
    loadReports();
    loadLeaderboard();
  }, [adminId, statusFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_get_book_reports', {
        admin_id_input: adminId,
        status_filter: statusFilter === "all" ? null : statusFilter
      });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('독후감 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_book_report_leaderboard', {
        admin_id_input: adminId,
        search_grade: searchGrade,
        search_class: searchClass
      });

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const handleAwardPoints = async () => {
    if (!selectedReport) return;

    try {
      const points = parseInt(pointsToAward);
      if (isNaN(points) || points < 0) {
        toast.error('올바른 포인트를 입력하세요');
        return;
      }

      const { error } = await supabase.rpc('admin_award_book_report_points', {
        admin_id_input: adminId,
        report_id_input: selectedReport.id,
        points_input: points
      });

      if (error) throw error;

      toast.success(`${selectedReport.student_name}에게 ${points}점이 지급되었습니다`);
      setIsDetailOpen(false);
      loadReports();
      loadLeaderboard();
    } catch (error: any) {
      console.error('Error awarding points:', error);
      toast.error(error.message || '포인트 지급에 실패했습니다');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 text-white"><Check className="w-3 h-3 mr-1" />승인됨</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />대기중</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <BookOpen className="w-6 h-6" />
          독후감 관리
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          시간을 건너온 일곱 개의 문 - 입문자를 위한 고전문학
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            독후감 목록
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            독후감 포인트 순위
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {/* 필터 */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="상태 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="pending">대기중</SelectItem>
                    <SelectItem value="approved">승인됨</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={loadReports} variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-1" />
                  새로고침
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 책 목록 안내 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">추천 도서 목록</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {BOOK_TITLES.map((title, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {idx + 1}. {title}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 독후감 목록 테이블 */}
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">로딩 중...</p>
              ) : reports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">제출된 독후감이 없습니다</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">학생</TableHead>
                        <TableHead className="text-xs">학년/반</TableHead>
                        <TableHead className="text-xs">책 제목</TableHead>
                        <TableHead className="text-xs">상태</TableHead>
                        <TableHead className="text-xs">포인트</TableHead>
                        <TableHead className="text-xs">제출일</TableHead>
                        <TableHead className="text-xs">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="text-xs font-medium">
                            {report.student_name}
                          </TableCell>
                          <TableCell className="text-xs">
                            {report.student_grade}-{report.student_class}-{report.student_number}
                          </TableCell>
                          <TableCell className="text-xs">{report.book_title}</TableCell>
                          <TableCell>{getStatusBadge(report.status)}</TableCell>
                          <TableCell className="text-xs font-medium text-primary">
                            {report.points_awarded > 0 ? `${report.points_awarded}점` : '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(report.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReport(report);
                                setPointsToAward(report.points_awarded > 0 ? String(report.points_awarded) : "5");
                                setIsDetailOpen(true);
                              }}
                            >
                              상세
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          {/* 필터 */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                <Select 
                  value={searchGrade?.toString() || "all"} 
                  onValueChange={(v) => setSearchGrade(v === "all" ? null : parseInt(v))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="학년" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 학년</SelectItem>
                    <SelectItem value="1">1학년</SelectItem>
                    <SelectItem value="2">2학년</SelectItem>
                    <SelectItem value="3">3학년</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={searchClass?.toString() || "all"} 
                  onValueChange={(v) => setSearchClass(v === "all" ? null : parseInt(v))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="반" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 반</SelectItem>
                    {[1,2,3,4,5,6,7,8,9,10].map(c => (
                      <SelectItem key={c} value={c.toString()}>{c}반</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={loadLeaderboard} variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-1" />
                  조회
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 순위 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                독후감 포인트 순위
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">순위 데이터가 없습니다</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-12">순위</TableHead>
                        <TableHead className="text-xs">학생</TableHead>
                        <TableHead className="text-xs">학년/반/번</TableHead>
                        <TableHead className="text-xs">학과</TableHead>
                        <TableHead className="text-xs">독후감 수</TableHead>
                        <TableHead className="text-xs">총 포인트</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((entry, idx) => (
                        <TableRow key={entry.student_id}>
                          <TableCell className="text-sm font-bold">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{entry.name}</TableCell>
                          <TableCell className="text-xs">
                            {entry.grade}-{entry.class}-{entry.number}
                          </TableCell>
                          <TableCell className="text-xs">{entry.dept_name || '-'}</TableCell>
                          <TableCell className="text-sm">{entry.total_reports}권</TableCell>
                          <TableCell className="text-sm font-bold text-primary">
                            {entry.total_points}점
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 상세 보기 다이얼로그 */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              독후감 상세 - {selectedReport?.book_title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              {/* 학생 정보 */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm">
                  <strong>학생:</strong> {selectedReport.student_name}
                </p>
                <p className="text-sm">
                  <strong>학년/반/번:</strong> {selectedReport.student_grade}-{selectedReport.student_class}-{selectedReport.student_number}
                </p>
                <p className="text-sm">
                  <strong>학과:</strong> {selectedReport.dept_name || '-'}
                </p>
                <p className="text-sm">
                  <strong>제출일:</strong> {new Date(selectedReport.created_at).toLocaleString()}
                </p>
                <p className="text-sm">
                  <strong>글자 수:</strong> {selectedReport.content.length}자
                </p>
              </div>

              {/* 독후감 내용 */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">독후감 내용</h4>
                <ScrollArea className="h-[200px]">
                  <p className="text-sm whitespace-pre-wrap">{selectedReport.content}</p>
                </ScrollArea>
              </div>

              {/* 포인트 지급 */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">포인트 지급:</label>
                <Input
                  type="number"
                  value={pointsToAward}
                  onChange={(e) => setPointsToAward(e.target.value)}
                  className="w-24"
                  min="0"
                />
                <span className="text-sm text-muted-foreground">점</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAwardPoints} className="gap-1">
              <Award className="w-4 h-4" />
              {selectedReport?.status === 'approved' ? '포인트 수정' : '승인 및 포인트 지급'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookReportManager;
