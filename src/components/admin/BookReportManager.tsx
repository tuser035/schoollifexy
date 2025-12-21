import React, { useEffect, useState, useMemo } from "react";
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
import { BookOpen, Award, Trophy, Search, FileText, Check, Clock, Library, Bot, AlertTriangle, BarChart3, Download } from "lucide-react";
import Papa from 'papaparse';
import html2pdf from 'html2pdf.js';
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { analyzeAIContent, getAILevelLabel, getAILevelBadgeVariant } from "@/lib/aiDetection";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";

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

interface RecommendedBook {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  year: number;
  quarter: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// 학기 정보 (1학기: 3-8월, 2학기: 9-2월)
const SEMESTERS = [
  { value: 1, label: "1학기 (3~8월)" },
  { value: 2, label: "2학기 (9~2월)" },
];

const getCurrentSemester = () => {
  const month = new Date().getMonth() + 1;
  return (month >= 3 && month <= 8) ? 1 : 2;
};

const getCurrentYear = () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  // 1-2월은 전년도 2학기
  if (month <= 2) {
    return now.getFullYear() - 1;
  }
  return now.getFullYear();
};

const BookReportManager: React.FC<BookReportManagerProps> = ({ adminId }) => {
  const [reports, setReports] = useState<BookReport[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [aiFilter, setAiFilter] = useState<string>("all");
  const [searchGrade, setSearchGrade] = useState<number | null>(null);
  const [searchClass, setSearchClass] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("reports");
  
  // 상세보기 다이얼로그
  const [selectedReport, setSelectedReport] = useState<BookReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [pointsToAward, setPointsToAward] = useState<string>("5");

  // 추천도서 관련 상태 (현재 학기 추천도서 표시용)
  const [books, setBooks] = useState<RecommendedBook[]>([]);

  useEffect(() => {
    loadReports();
    loadLeaderboard();
    loadBooks();
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

  const loadBooks = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_recommended_books', {
        admin_id_input: adminId,
        year_filter: getCurrentYear(),
        quarter_filter: getCurrentSemester()
      });

      if (error) throw error;
      setBooks(data || []);
    } catch (error) {
      console.error('Error loading books:', error);
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

  const getSemesterLabel = (semester: number) => {
    return SEMESTERS.find(s => s.value === semester)?.label || `${semester}학기`;
  };

  // 현재 학기 추천도서 (독후감 목록에 표시용)
  const currentSemesterBooks = books.filter(b => 
    b.year === getCurrentYear() && 
    b.quarter === getCurrentSemester() && 
    b.is_active
  );


  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            독후감 목록
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            포인트 순위
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
                    <SelectItem value="all">전체 상태</SelectItem>
                    <SelectItem value="pending">대기중</SelectItem>
                    <SelectItem value="approved">승인됨</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={aiFilter} onValueChange={setAiFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Bot className="w-4 h-4 mr-1" />
                    <SelectValue placeholder="AI 의심도" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 AI 의심도</SelectItem>
                    <SelectItem value="high">높음 (60%+)</SelectItem>
                    <SelectItem value="medium">보통 (30-59%)</SelectItem>
                    <SelectItem value="low">낮음 (0-29%)</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={loadReports} variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-1" />
                  새로고침
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 현재 학기 추천 도서 목록 안내 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Library className="w-4 h-4" />
                {getCurrentYear()}년 {getSemesterLabel(getCurrentSemester())} 추천 도서
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentSemesterBooks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  등록된 추천도서가 없습니다. "추천도서 관리" 탭에서 도서를 추가해주세요.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentSemesterBooks
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((book, idx) => (
                      <Badge key={book.id} variant="outline" className="text-xs">
                        {idx + 1}. {book.title}
                      </Badge>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI 의심도 통계 */}
          {reports.length > 0 && (() => {
            const reportsWithAI = reports.map(report => {
              const result = analyzeAIContent(report.content);
              return { ...report, aiResult: result };
            });

            const aiStats = reportsWithAI.reduce((acc, report) => {
              acc[report.aiResult.level] = (acc[report.aiResult.level] || 0) + 1;
              acc.totalScore += report.aiResult.score;
              return acc;
            }, { low: 0, medium: 0, high: 0, totalScore: 0 } as Record<string, number>);

            const pieData = [
              { name: '낮음 (0-29%)', value: aiStats.low, color: '#22c55e' },
              { name: '보통 (30-59%)', value: aiStats.medium, color: '#eab308' },
              { name: '높음 (60%+)', value: aiStats.high, color: '#ef4444' },
            ].filter(d => d.value > 0);

            const barData = [
              { name: '낮음', count: aiStats.low, fill: '#22c55e' },
              { name: '보통', count: aiStats.medium, fill: '#eab308' },
              { name: '높음', count: aiStats.high, fill: '#ef4444' },
            ];

            const avgScore = reports.length > 0 ? Math.round(aiStats.totalScore / reports.length) : 0;

            // CSV 내보내기
            const exportToCsv = () => {
              const csvData = reportsWithAI.map(report => ({
                '학생명': report.student_name,
                '학년': report.student_grade,
                '반': report.student_class,
                '번호': report.student_number,
                '학과': report.dept_name || '',
                '책제목': report.book_title,
                'AI의심도(%)': report.aiResult.score,
                'AI의심레벨': getAILevelLabel(report.aiResult.level),
                '어휘다양성(TTR)': report.aiResult.details.ttr,
                '평균문장길이': report.aiResult.details.avgSentenceLength,
                '문장길이편차': report.aiResult.details.sentenceLengthVariance,
                '접속사비율': report.aiResult.details.connectorRatio,
                '상태': report.status === 'approved' ? '승인됨' : '대기중',
                '포인트': report.points_awarded || 0,
                '제출일': new Date(report.created_at).toLocaleDateString(),
              }));

              const csv = Papa.unparse(csvData);
              const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `AI의심도_분석_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
              URL.revokeObjectURL(url);
              toast.success('CSV 파일이 다운로드되었습니다');
            };

            // PDF 내보내기
            const exportToPdf = () => {
              const content = document.createElement('div');
              content.style.padding = '20px';
              content.style.fontFamily = 'Arial, sans-serif';
              content.innerHTML = `
                <h1 style="text-align: center; color: #333; margin-bottom: 20px;">독후감 AI 의심도 분석 보고서</h1>
                <p style="text-align: center; color: #666; margin-bottom: 30px;">생성일: ${new Date().toLocaleString()}</p>
                
                <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">📊 요약 통계</h2>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                  <tr style="background: #f5f5f5;">
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center;"><strong>전체 독후감</strong></td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center;"><strong>평균 AI 의심도</strong></td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center; color: #22c55e;"><strong>낮음</strong></td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center; color: #eab308;"><strong>보통</strong></td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center; color: #ef4444;"><strong>높음</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-size: 18px;">${reports.length}건</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-size: 18px;">${avgScore}%</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-size: 18px;">${aiStats.low}건</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-size: 18px;">${aiStats.medium}건</td>
                    <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-size: 18px;">${aiStats.high}건</td>
                  </tr>
                </table>

                <h2 style="color: #333; border-bottom: 2px solid #333; padding-bottom: 10px;">📋 상세 목록</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                  <tr style="background: #333; color: white;">
                    <th style="padding: 8px; border: 1px solid #ddd;">학생</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">학년/반/번</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">책 제목</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">AI 의심도</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">레벨</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">제출일</th>
                  </tr>
                  ${reportsWithAI.sort((a, b) => b.aiResult.score - a.aiResult.score).map((report, idx) => `
                    <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f9f9f9'};">
                      <td style="padding: 6px; border: 1px solid #ddd;">${report.student_name}</td>
                      <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${report.student_grade}-${report.student_class}-${report.student_number}</td>
                      <td style="padding: 6px; border: 1px solid #ddd;">${report.book_title}</td>
                      <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${report.aiResult.level === 'high' ? '#ef4444' : report.aiResult.level === 'medium' ? '#eab308' : '#22c55e'};">${report.aiResult.score}%</td>
                      <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${getAILevelLabel(report.aiResult.level)}</td>
                      <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${new Date(report.created_at).toLocaleDateString()}</td>
                    </tr>
                  `).join('')}
                </table>

                <p style="margin-top: 30px; color: #999; font-size: 10px; text-align: center;">
                  ※ 이 분석은 통계적 패턴 기반이며 참고용입니다. 최종 판단은 교사의 검토가 필요합니다.
                </p>
              `;

              html2pdf().set({
                margin: 10,
                filename: `AI의심도_분석_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
              }).from(content).save();
              
              toast.success('PDF 파일이 다운로드되었습니다');
            };

            return (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      AI 의심도 통계
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={exportToCsv}>
                        <Download className="w-3 h-3 mr-1" />
                        CSV
                      </Button>
                      <Button size="sm" variant="outline" onClick={exportToPdf}>
                        <Download className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-2xl font-bold text-green-600">{aiStats.low}</p>
                      <p className="text-xs text-muted-foreground">낮음 (0-29%)</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-2xl font-bold text-yellow-600">{aiStats.medium}</p>
                      <p className="text-xs text-muted-foreground">보통 (30-59%)</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-2xl font-bold text-red-600">{aiStats.high}</p>
                      <p className="text-xs text-muted-foreground">높음 (60%+)</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 파이 차트 */}
                    <div className="h-[200px]">
                      <p className="text-xs text-muted-foreground text-center mb-2">분포 비율</p>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => <span className="text-xs">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 바 차트 */}
                    <div className="h-[200px]">
                      <p className="text-xs text-muted-foreground text-center mb-2">건수 비교</p>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} fontSize={12} />
                          <YAxis type="category" dataKey="name" width={40} fontSize={12} />
                          <RechartsTooltip 
                            formatter={(value: number) => [`${value}건`, '독후감 수']}
                          />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm">
                      전체 <strong>{reports.length}</strong>건 중 평균 AI 의심도: 
                      <Badge 
                        variant={avgScore >= 60 ? 'destructive' : avgScore >= 30 ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        {avgScore}%
                      </Badge>
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* 독후감 목록 테이블 */}
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">로딩 중...</p>
              ) : reports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">제출된 독후감이 없습니다</p>
              ) : (() => {
                // AI 필터링 적용
                const filteredReports = reports.filter((report) => {
                  if (aiFilter === "all") return true;
                  const aiResult = analyzeAIContent(report.content);
                  return aiResult.level === aiFilter;
                });

                return filteredReports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    선택한 AI 의심도에 해당하는 독후감이 없습니다
                  </p>
                ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">학생</TableHead>
                        <TableHead className="text-xs">학년/반</TableHead>
                        <TableHead className="text-xs">책 제목</TableHead>
                        <TableHead className="text-xs">AI 의심도</TableHead>
                        <TableHead className="text-xs">상태</TableHead>
                        <TableHead className="text-xs">포인트</TableHead>
                        <TableHead className="text-xs">제출일</TableHead>
                        <TableHead className="text-xs">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report) => {
                        const aiResult = analyzeAIContent(report.content);
                        return (
                          <TableRow key={report.id}>
                            <TableCell className="text-xs font-medium">
                              {report.student_name}
                            </TableCell>
                            <TableCell className="text-xs">
                              {report.student_grade}-{report.student_class}-{report.student_number}
                            </TableCell>
                            <TableCell className="text-xs">{report.book_title}</TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant={getAILevelBadgeVariant(aiResult.level)} className="text-xs gap-1">
                                      <Bot className="w-3 h-3" />
                                      {aiResult.score}%
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>AI 작성 의심도: {getAILevelLabel(aiResult.level)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
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
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
                );
              })()}
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
          
          {selectedReport && (() => {
            const aiResult = analyzeAIContent(selectedReport.content);
            return (
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

              {/* AI 분석 결과 */}
              <div className={`border rounded-lg p-4 ${
                aiResult.level === 'high' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' :
                aiResult.level === 'medium' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20' :
                'border-green-300 bg-green-50 dark:bg-green-950/20'
              }`}>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  AI 작성 분석 결과
                  {aiResult.level === 'high' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                </h4>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">AI 의심도</p>
                    <p className="text-2xl font-bold">
                      <Badge variant={getAILevelBadgeVariant(aiResult.level)} className="text-lg px-3 py-1">
                        {aiResult.score}% ({getAILevelLabel(aiResult.level)})
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">분석 지표</p>
                    <div className="text-xs space-y-1 mt-1">
                      <p>어휘 다양성(TTR): {aiResult.details.ttr}</p>
                      <p>평균 문장 길이: {aiResult.details.avgSentenceLength}자</p>
                      <p>문장 길이 편차: {aiResult.details.sentenceLengthVariance}</p>
                      <p>접속사 비율: {aiResult.details.connectorRatio}</p>
                    </div>
                  </div>
                </div>

                {aiResult.indicators.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">감지된 패턴:</p>
                    <div className="flex flex-wrap gap-1">
                      {aiResult.indicators.map((indicator, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {indicator}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3 italic">
                  ※ 이 분석은 통계적 패턴 기반이며 참고용입니다. 최종 판단은 교사의 검토가 필요합니다.
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
            );
          })()}

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
