import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Award, AlertCircle, Star, LogOut, ImageIcon, Download, BookOpen, PenLine, ChevronDown, ChevronUp, CalendarIcon } from "lucide-react";
import { logout, type AuthUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Papa from "papaparse";
import { useRealtimeSync, type TableSubscription } from "@/hooks/use-realtime-sync";
import MindTalk from "@/components/student/MindTalk";
import StorybookLibrary from "@/components/student/StorybookLibrary";

import { cn } from "@/lib/utils";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [meritsTotal, setMeritsTotal] = useState(0);
  const [demeritsTotal, setDemeritsTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [merits, setMerits] = useState<any[]>([]);
  const [demerits, setDemerits] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<string>("merits");
  const [isMeritsExpanded, setIsMeritsExpanded] = useState(false);
  const [isDemeritsExpanded, setIsDemeritsExpanded] = useState(false);
  const [isMonthlyExpanded, setIsMonthlyExpanded] = useState(false);
  const [studentNationalityCode, setStudentNationalityCode] = useState<string | null>(null);
  
  // CSV 다운로드 날짜 필터 상태
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<'merits' | 'demerits' | 'monthly'>('merits');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const INITIAL_DISPLAY_COUNT = 3;

  const fetchStudentData = useCallback(async (studentId: string) => {
    setIsLoading(true);
    try {
      // Set student session for RLS
      await supabase.rpc('set_student_session', { student_id_input: studentId });
      
      const { data: meritsData, error: meritsError } = await supabase.rpc(
        "student_get_merits",
        { student_id_input: studentId }
      );

      if (meritsError) throw meritsError;

      const { data: demeritsData, error: demeritsError } = await supabase.rpc(
        "student_get_demerits",
        { student_id_input: studentId }
      );

      if (demeritsError) throw demeritsError;

      const { data: monthlyData, error: monthlyError } = await supabase.rpc(
        "student_get_monthly",
        { student_id_input: studentId }
      );

      if (monthlyError) throw monthlyError;

      // Load nationality code for translation feature
      const { data: studentData } = await supabase
        .from('students')
        .select('nationality_code')
        .eq('student_id', studentId)
        .maybeSingle();
      
      if (studentData?.nationality_code) {
        setStudentNationalityCode(studentData.nationality_code);
        console.log('[Dashboard] Nationality code loaded:', studentData.nationality_code);
      }

      setMerits(meritsData || []);
      setDemerits(demeritsData || []);
      setMonthly(monthlyData || []);

      const meritsSum = (meritsData || []).reduce((sum: number, m: any) => sum + (m.score || 0), 0);
      const demeritsSum = (demeritsData || []).reduce((sum: number, d: any) => sum + (d.score || 0), 0);
      const monthlyCount = (monthlyData || []).length;

      setMeritsTotal(meritsSum);
      setDemeritsTotal(demeritsSum);
      setMonthlyTotal(monthlyCount);
    } catch (error: any) {
      toast.error(error.message || "데이터를 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const authUser = localStorage.getItem("auth_user");
    if (!authUser) {
      navigate("/");
      return;
    }
    
    const parsedUser = JSON.parse(authUser);
    if (parsedUser.type !== "student") {
      navigate("/");
      return;
    }
    
    setUser(parsedUser);
    fetchStudentData(parsedUser.studentId);
  }, [navigate, fetchStudentData]);

  // 학생별 실시간 구독 테이블 설정
  const studentTables: TableSubscription[] = user?.studentId ? [
    {
      table: 'merits',
      channelName: `student_merits_${user.studentId}`,
      filter: `student_id=eq.${user.studentId}`,
      labels: {
        insert: '🎉 새로운 상점이 부여되었습니다!',
        update: '🔄 상점 내역이 수정되었습니다',
        delete: '🔄 상점 내역이 삭제되었습니다',
      },
    },
    {
      table: 'demerits',
      channelName: `student_demerits_${user.studentId}`,
      filter: `student_id=eq.${user.studentId}`,
      labels: {
        insert: '⚠️ 새로운 벌점이 부여되었습니다',
        update: '🔄 벌점 내역이 수정되었습니다',
        delete: '🔄 벌점 내역이 삭제되었습니다',
      },
    },
    {
      table: 'monthly',
      channelName: `student_monthly_${user.studentId}`,
      filter: `student_id=eq.${user.studentId}`,
      labels: {
        insert: '🌟 이달의 학생으로 추천되었습니다!',
        update: '🔄 이달의 학생 내역이 수정되었습니다',
        delete: '🔄 이달의 학생 내역이 삭제되었습니다',
      },
    },
  ] : [];

  // useRealtimeSync 훅 사용
  useRealtimeSync({
    tables: studentTables,
    onRefresh: () => {
      if (user?.studentId) {
        fetchStudentData(user.studentId);
      }
    },
    enabled: !!user?.studentId,
    dependencies: [user?.studentId],
  });


  const handleLogout = () => {
    logout();
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageDialogOpen(true);
  };

  // 날짜 필터 다이얼로그 열기
  const openDateFilterDialog = (type: 'merits' | 'demerits' | 'monthly') => {
    setDateFilterType(type);
    setStartDate(undefined);
    setEndDate(undefined);
    setIsDateFilterOpen(true);
  };

  // 날짜 필터링된 데이터로 CSV 다운로드
  const downloadFilteredCSV = () => {
    let data: any[] = [];
    
    if (dateFilterType === 'merits') {
      data = merits;
    } else if (dateFilterType === 'demerits') {
      data = demerits;
    } else {
      data = monthly;
    }

    // 날짜 필터링 적용
    if (startDate || endDate) {
      data = data.filter(item => {
        const itemDate = new Date(item.created_at);
        if (startDate && itemDate < startDate) return false;
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (itemDate > endOfDay) return false;
        }
        return true;
      });
    }

    if (data.length === 0) {
      toast.error('선택한 기간에 해당하는 데이터가 없습니다');
      return;
    }

    downloadCSV(data, dateFilterType);
    setIsDateFilterOpen(false);
  };

  const downloadCSV = (data: any[], type: 'merits' | 'demerits' | 'monthly') => {
    let csvData: any[] = [];
    let filename = '';

    // 날짜 범위 텍스트 생성
    const dateRangeText = startDate || endDate 
      ? `_${startDate ? format(startDate, 'yyyyMMdd') : '시작'}~${endDate ? format(endDate, 'yyyyMMdd') : '현재'}`
      : '';

    if (type === 'merits') {
      csvData = data.map(item => ({
        '날짜': new Date(item.created_at).toLocaleDateString(),
        '교사': item.teacher_name || '-',
        '카테고리': item.category,
        '사유': item.reason || '-',
        '점수': item.score,
      }));
      filename = `${user?.name}(${user?.studentId})_상점${dateRangeText}.csv`;
    } else if (type === 'demerits') {
      csvData = data.map(item => ({
        '날짜': new Date(item.created_at).toLocaleDateString(),
        '교사': item.teacher_name || '-',
        '카테고리': item.category,
        '사유': item.reason || '-',
        '점수': item.score,
      }));
      filename = `${user?.name}(${user?.studentId})_벌점${dateRangeText}.csv`;
    } else if (type === 'monthly') {
      csvData = data.map(item => ({
        '년도': item.year,
        '월': item.month,
        '교사': item.teacher_name || '-',
        '카테고리': item.category || '-',
        '사유': item.reason || '-',
      }));
      filename = `${user?.name}(${user?.studentId})_이달의학생${dateRangeText}.csv`;
    }

    const csv = Papa.unparse(csvData, {
      quotes: true,
      delimiter: ',',
    });

    // UTF-8 BOM 추가 (엑셀에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('CSV 파일이 다운로드되었습니다');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* MindTalk AI 상담 */}
      <MindTalk
        studentId={user.studentId}
        studentName={user.name}
        studentGrade={user.grade || 1}
        studentClass={user.class || 1}
        studentNumber={1}
      />
      <header className="border-b bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">학생 대시보드</h1>
              <p className="text-xs sm:text-sm text-muted-foreground break-words max-w-[180px] sm:max-w-none">{user.name}님 ({user.studentId})</p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">로그아웃</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Total Score Card */}
        <Card className="mb-4 sm:mb-6 border-2">
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">총 상벌점</p>
              <div
                className={`text-4xl sm:text-6xl font-bold ${
                  meritsTotal - demeritsTotal > 0
                    ? "text-merit-blue"
                    : meritsTotal - demeritsTotal < 0
                    ? "text-demerit-orange"
                    : "text-foreground"
                }`}
              >
                {isLoading ? "..." : meritsTotal - demeritsTotal > 0 ? "+" : ""}
                {isLoading ? "" : meritsTotal - demeritsTotal}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                상점 {meritsTotal}점 - 벌점 {demeritsTotal}점
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:gap-6 grid-cols-3">
          <Card className="border-merit-blue">
            <CardHeader className="bg-merit-blue-light p-3 sm:p-6">
              <CardTitle className="flex items-center text-merit-blue text-sm sm:text-base">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">상점</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 sm:pt-6 p-3 sm:p-6">
              <div className="text-2xl sm:text-4xl font-bold text-merit-blue">
                {isLoading ? "..." : meritsTotal}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">총 상점</p>
            </CardContent>
          </Card>

          <Card className="border-demerit-orange">
            <CardHeader className="bg-demerit-orange-light p-3 sm:p-6">
              <CardTitle className="flex items-center text-demerit-orange text-sm sm:text-base">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">벌점</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 sm:pt-6 p-3 sm:p-6">
              <div className="text-2xl sm:text-4xl font-bold text-demerit-orange">
                {isLoading ? "..." : demeritsTotal}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">총 벌점</p>
            </CardContent>
          </Card>

          <Card className="border-monthly-green">
            <CardHeader className="bg-monthly-green-light p-3 sm:p-6">
              <CardTitle className="flex items-center text-monthly-green text-sm sm:text-base">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">이달의 학생</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 sm:pt-6 p-3 sm:p-6">
              <div className="text-2xl sm:text-4xl font-bold text-monthly-green">
                {isLoading ? "..." : monthlyTotal}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">추천 횟수</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4 sm:mt-6">
          <CardHeader className="pb-2 sm:pb-6 p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">상세 내역</CardTitle>
              {!isLoading && (
                <Button 
                  onClick={() => {
                    if (activeDetailTab === 'merits') openDateFilterDialog('merits');
                    else if (activeDetailTab === 'demerits') openDateFilterDialog('demerits');
                    else openDateFilterDialog('monthly');
                  }}
                  variant="outline"
                  size="sm"
                  className={`h-8 text-xs sm:text-sm transition-colors duration-200 ${
                    activeDetailTab === 'merits' 
                      ? 'border-merit-blue/50 text-merit-blue hover:bg-merit-blue/10' 
                      : activeDetailTab === 'demerits' 
                        ? 'border-demerit-orange/50 text-demerit-orange hover:bg-demerit-orange/10'
                        : 'border-monthly-green/50 text-monthly-green hover:bg-monthly-green/10'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">CSV 다운로드</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">로딩 중...</p>
            ) : (
              <Tabs defaultValue="merits" value={activeDetailTab} onValueChange={setActiveDetailTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-9 sm:h-10 bg-muted/50">
                  <TabsTrigger value="merits" className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-merit-blue data-[state=active]:text-white">
                    <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">상점</span>
                  </TabsTrigger>
                  <TabsTrigger value="demerits" className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-demerit-orange data-[state=active]:text-white">
                    <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">벌점</span>
                  </TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-monthly-green data-[state=active]:text-white">
                    <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">이달의 학생</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="merits">
                  <Collapsible open={isMeritsExpanded} onOpenChange={setIsMeritsExpanded}>
                    <div className="border rounded-lg overflow-hidden border-merit-blue/30">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">날짜</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden sm:table-cell">교사</TableHead>
                            <TableHead className="text-xs sm:text-sm">카테고리</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden md:table-cell">사유</TableHead>
                            <TableHead className="text-xs sm:text-sm">점수</TableHead>
                            <TableHead className="text-xs sm:text-sm">사진</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {merits.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground text-xs sm:text-sm py-4">
                                상점 내역이 없습니다
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {merits.slice(0, INITIAL_DISPLAY_COUNT).map((merit, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-xs sm:text-sm py-2 sm:py-4 whitespace-nowrap">{new Date(merit.created_at).toLocaleDateString()}</TableCell>
                                  <TableCell className="text-xs sm:text-sm py-2 sm:py-4 hidden sm:table-cell">{merit.teacher_name || "-"}</TableCell>
                                  <TableCell className="text-xs sm:text-sm py-2 sm:py-4">{merit.category}</TableCell>
                                  <TableCell className="text-xs sm:text-sm py-2 sm:py-4 hidden md:table-cell max-w-[150px] truncate">{merit.reason || "-"}</TableCell>
                                  <TableCell className="text-merit-blue font-medium text-xs sm:text-sm py-2 sm:py-4">{merit.score}</TableCell>
                                  <TableCell className="py-2 sm:py-4">
                                    {merit.image_url && merit.image_url.length > 0 ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleImageClick(merit.image_url[0])}
                                        className="h-7 sm:h-8 px-2 text-xs"
                                      >
                                        <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                                        <span className="hidden sm:inline">보기</span>
                                      </Button>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">없음</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <CollapsibleContent asChild>
                                <>
                                  {merits.slice(INITIAL_DISPLAY_COUNT).map((merit, idx) => (
                                    <TableRow key={idx + INITIAL_DISPLAY_COUNT} className="animate-fade-in">
                                      <TableCell className="text-xs sm:text-sm py-2 sm:py-4 whitespace-nowrap">{new Date(merit.created_at).toLocaleDateString()}</TableCell>
                                      <TableCell className="text-xs sm:text-sm py-2 sm:py-4 hidden sm:table-cell">{merit.teacher_name || "-"}</TableCell>
                                      <TableCell className="text-xs sm:text-sm py-2 sm:py-4">{merit.category}</TableCell>
                                      <TableCell className="text-xs sm:text-sm py-2 sm:py-4 hidden md:table-cell max-w-[150px] truncate">{merit.reason || "-"}</TableCell>
                                      <TableCell className="text-merit-blue font-medium text-xs sm:text-sm py-2 sm:py-4">{merit.score}</TableCell>
                                      <TableCell className="py-2 sm:py-4">
                                        {merit.image_url && merit.image_url.length > 0 ? (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleImageClick(merit.image_url[0])}
                                            className="h-7 sm:h-8 px-2 text-xs"
                                          >
                                            <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                                            <span className="hidden sm:inline">보기</span>
                                          </Button>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">없음</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </>
                              </CollapsibleContent>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {merits.length > INITIAL_DISPLAY_COUNT && (
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full mt-2 text-merit-blue hover:text-merit-blue hover:bg-merit-blue/10 text-xs sm:text-sm"
                        >
                          {isMeritsExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              접기
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              {merits.length - INITIAL_DISPLAY_COUNT}개 더 보기
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </Collapsible>
                </TabsContent>

                <TabsContent value="demerits">
                  <Collapsible open={isDemeritsExpanded} onOpenChange={setIsDemeritsExpanded}>
                    <div className="border rounded-lg overflow-hidden border-demerit-orange/30">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">날짜</TableHead>
                            <TableHead className="text-xs sm:text-sm">카테고리</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden md:table-cell">사유</TableHead>
                            <TableHead className="text-xs sm:text-sm">점수</TableHead>
                            <TableHead className="text-xs sm:text-sm">사진</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {demerits.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground text-xs sm:text-sm py-4">
                                벌점 내역이 없습니다
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {demerits.slice(0, INITIAL_DISPLAY_COUNT).map((demerit, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-xs sm:text-sm py-2 sm:py-4 whitespace-nowrap">{new Date(demerit.created_at).toLocaleDateString()}</TableCell>
                                  <TableCell className="text-xs sm:text-sm py-2 sm:py-4">{demerit.category}</TableCell>
                                  <TableCell className="text-xs sm:text-sm py-2 sm:py-4 hidden md:table-cell max-w-[150px] truncate">{demerit.reason || "-"}</TableCell>
                                  <TableCell className="text-demerit-orange font-medium text-xs sm:text-sm py-2 sm:py-4">{demerit.score}</TableCell>
                                  <TableCell className="py-2 sm:py-4">
                                    {demerit.image_url && demerit.image_url.length > 0 ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleImageClick(demerit.image_url[0])}
                                        className="h-7 sm:h-8 px-2 text-xs"
                                      >
                                        <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                                        <span className="hidden sm:inline">보기</span>
                                      </Button>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">없음</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <CollapsibleContent asChild>
                                <>
                                  {demerits.slice(INITIAL_DISPLAY_COUNT).map((demerit, idx) => (
                                    <TableRow key={idx + INITIAL_DISPLAY_COUNT} className="animate-fade-in">
                                      <TableCell className="text-xs sm:text-sm py-2 sm:py-4 whitespace-nowrap">{new Date(demerit.created_at).toLocaleDateString()}</TableCell>
                                      <TableCell className="text-xs sm:text-sm py-2 sm:py-4">{demerit.category}</TableCell>
                                      <TableCell className="text-xs sm:text-sm py-2 sm:py-4 hidden md:table-cell max-w-[150px] truncate">{demerit.reason || "-"}</TableCell>
                                      <TableCell className="text-demerit-orange font-medium text-xs sm:text-sm py-2 sm:py-4">{demerit.score}</TableCell>
                                      <TableCell className="py-2 sm:py-4">
                                        {demerit.image_url && demerit.image_url.length > 0 ? (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleImageClick(demerit.image_url[0])}
                                            className="h-7 sm:h-8 px-2 text-xs"
                                          >
                                            <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                                            <span className="hidden sm:inline">보기</span>
                                          </Button>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">없음</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </>
                              </CollapsibleContent>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {demerits.length > INITIAL_DISPLAY_COUNT && (
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full mt-2 text-demerit-orange hover:text-demerit-orange hover:bg-demerit-orange/10 text-xs sm:text-sm"
                        >
                          {isDemeritsExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              접기
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              {demerits.length - INITIAL_DISPLAY_COUNT}개 더 보기
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </Collapsible>
                </TabsContent>

                <TabsContent value="monthly">
                  <Collapsible open={isMonthlyExpanded} onOpenChange={setIsMonthlyExpanded}>
                    <div className="border rounded-lg overflow-hidden border-monthly-green/30">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">날짜</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden sm:table-cell">교사</TableHead>
                            <TableHead className="text-xs sm:text-sm">구분</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden md:table-cell">사유</TableHead>
                            <TableHead className="text-xs sm:text-sm">사진</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthly.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground text-xs sm:text-sm py-4">
                                이달의 학생 추천 내역이 없습니다
                              </TableCell>
                            </TableRow>
                          ) : (
                            <>
                              {monthly.slice(0, INITIAL_DISPLAY_COUNT).map((item, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="text-xs sm:text-sm py-2 sm:py-4 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</TableCell>
                                  <TableCell className="text-xs sm:text-sm py-2 sm:py-4 hidden sm:table-cell">{item.teacher_name || "-"}</TableCell>
                                  <TableCell className="text-xs sm:text-sm py-2 sm:py-4">{item.category || "-"}</TableCell>
                                  <TableCell className="text-xs sm:text-sm py-2 sm:py-4 hidden md:table-cell max-w-[150px] truncate">{item.reason || "-"}</TableCell>
                                  <TableCell className="py-2 sm:py-4">
                                    {item.image_url && item.image_url.length > 0 ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleImageClick(item.image_url[0])}
                                        className="h-7 sm:h-8 px-2 text-xs"
                                      >
                                        <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                                        <span className="hidden sm:inline">보기</span>
                                      </Button>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">없음</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <CollapsibleContent asChild>
                                <>
                                  {monthly.slice(INITIAL_DISPLAY_COUNT).map((item, idx) => (
                                    <TableRow key={idx + INITIAL_DISPLAY_COUNT} className="animate-fade-in">
                                      <TableCell className="text-xs sm:text-sm py-2 sm:py-4 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</TableCell>
                                      <TableCell className="text-xs sm:text-sm py-2 sm:py-4 hidden sm:table-cell">{item.teacher_name || "-"}</TableCell>
                                      <TableCell className="text-xs sm:text-sm py-2 sm:py-4">{item.category || "-"}</TableCell>
                                      <TableCell className="text-xs sm:text-sm py-2 sm:py-4 hidden md:table-cell max-w-[150px] truncate">{item.reason || "-"}</TableCell>
                                      <TableCell className="py-2 sm:py-4">
                                        {item.image_url && item.image_url.length > 0 ? (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleImageClick(item.image_url[0])}
                                            className="h-7 sm:h-8 px-2 text-xs"
                                          >
                                            <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                                            <span className="hidden sm:inline">보기</span>
                                          </Button>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">없음</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </>
                              </CollapsibleContent>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {monthly.length > INITIAL_DISPLAY_COUNT && (
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full mt-2 text-monthly-green hover:text-monthly-green hover:bg-monthly-green/10 text-xs sm:text-sm"
                        >
                          {isMonthlyExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              접기
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              {monthly.length - INITIAL_DISPLAY_COUNT}개 더 보기
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </Collapsible>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* 문득書점 */}
        <Card className="mt-4 sm:mt-6 border-storybook-emerald">
          <CardHeader className="pb-2 sm:pb-6 p-3 sm:p-6 bg-storybook-emerald-light">
            <div>
              <CardTitle className="flex items-center gap-2 text-storybook-emerald text-base sm:text-lg">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                문득書점
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <StorybookLibrary studentId={user.studentId} studentName={user.name} nationalityCode={studentNationalityCode} />
          </CardContent>
        </Card>

      </main>

      {/* Image Preview Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] p-4 sm:p-6 flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-base sm:text-lg">증빙 사진</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="flex-1 overflow-auto flex items-center justify-center [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              <img
                src={selectedImage}
                alt="증빙 사진"
                className="max-w-full max-h-[70vh] h-auto object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CSV 날짜 필터 다이얼로그 */}
      <Dialog open={isDateFilterOpen} onOpenChange={setIsDateFilterOpen}>
        <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {dateFilterType === 'merits' ? '상점' : dateFilterType === 'demerits' ? '벌점' : '이달의 학생'} CSV 다운로드
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              다운로드할 날짜 범위를 선택하세요. 선택하지 않으면 전체 기간이 다운로드됩니다.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">시작일</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "yyyy.MM.dd", { locale: ko }) : "선택"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">종료일</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "yyyy.MM.dd", { locale: ko }) : "선택"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {(startDate || endDate) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
                className="text-xs text-muted-foreground"
              >
                날짜 초기화
              </Button>
            )}
          </div>
          
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDateFilterOpen(false)}>
              취소
            </Button>
            <Button onClick={downloadFilteredCSV}>
              <Download className="w-4 h-4 mr-2" />
              다운로드
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentDashboard;
