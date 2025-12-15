import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, AlertCircle, Star, LogOut, ImageIcon, Download } from "lucide-react";
import { logout, type AuthUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Papa from "papaparse";

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
  }, [navigate]);

  // 페이지 포커스 시 데이터 새로고침
  useEffect(() => {
    if (!user?.studentId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStudentData(user.studentId);
      }
    };

    const handleFocus = () => {
      fetchStudentData(user.studentId);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.studentId]);

  // 실시간 구독으로 상벌점 변경 감지
  useEffect(() => {
    if (!user?.studentId) return;

    // 상점 테이블 실시간 구독
    const meritsChannel = supabase
      .channel('student_merits_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'merits',
          filter: `student_id=eq.${user.studentId}`
        },
        (payload) => {
          console.log('Student merits changed:', payload);
          fetchStudentData(user.studentId);
        }
      )
      .subscribe();

    // 벌점 테이블 실시간 구독
    const demeritsChannel = supabase
      .channel('student_demerits_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demerits',
          filter: `student_id=eq.${user.studentId}`
        },
        (payload) => {
          console.log('Student demerits changed:', payload);
          fetchStudentData(user.studentId);
        }
      )
      .subscribe();

    // 이달의 학생 테이블 실시간 구독
    const monthlyChannel = supabase
      .channel('student_monthly_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monthly',
          filter: `student_id=eq.${user.studentId}`
        },
        (payload) => {
          console.log('Student monthly changed:', payload);
          fetchStudentData(user.studentId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(meritsChannel);
      supabase.removeChannel(demeritsChannel);
      supabase.removeChannel(monthlyChannel);
    };
  }, [user?.studentId]);

  const fetchStudentData = async (studentId: string) => {
    setIsLoading(true);
    try {
      // Fetch merits using RPC
      const { data: meritsData, error: meritsError } = await supabase.rpc(
        "student_get_merits",
        { student_id_input: studentId }
      );

      if (meritsError) throw meritsError;

      // Fetch demerits using RPC
      const { data: demeritsData, error: demeritsError } = await supabase.rpc(
        "student_get_demerits",
        { student_id_input: studentId }
      );

      if (demeritsError) throw demeritsError;

      // Fetch monthly using RPC
      const { data: monthlyData, error: monthlyError } = await supabase.rpc(
        "student_get_monthly",
        { student_id_input: studentId }
      );

      if (monthlyError) throw monthlyError;

      setMerits(meritsData || []);
      setDemerits(demeritsData || []);
      setMonthly(monthlyData || []);

      // Calculate totals
      const meritsSum = (meritsData || []).reduce((sum, m) => sum + (m.score || 0), 0);
      const demeritsSum = (demeritsData || []).reduce((sum, d) => sum + (d.score || 0), 0);
      const monthlyCount = (monthlyData || []).length;

      setMeritsTotal(meritsSum);
      setDemeritsTotal(demeritsSum);
      setMonthlyTotal(monthlyCount);
    } catch (error: any) {
      toast.error(error.message || "데이터를 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageDialogOpen(true);
  };

  const downloadCSV = (data: any[], type: 'merits' | 'demerits' | 'monthly') => {
    let csvData: any[] = [];
    let filename = '';

    if (type === 'merits') {
      csvData = data.map(item => ({
        '날짜': new Date(item.created_at).toLocaleDateString(),
        '교사': item.teachers?.name || '-',
        '카테고리': item.category,
        '사유': item.reason || '-',
        '점수': item.score,
      }));
      filename = `${user?.name}(${user?.studentId})_상점.csv`;
    } else if (type === 'demerits') {
      csvData = data.map(item => ({
        '날짜': new Date(item.created_at).toLocaleDateString(),
        '교사': item.teachers?.name || '-',
        '카테고리': item.category,
        '사유': item.reason || '-',
        '점수': item.score,
      }));
      filename = `${user?.name}(${user?.studentId})_벌점.csv`;
    } else if (type === 'monthly') {
      csvData = data.map(item => ({
        '년도': item.year,
        '월': item.month,
        '교사': item.teachers?.name || '-',
        '카테고리': item.category || '-',
        '사유': item.reason || '-',
      }));
      filename = `${user?.name}(${user?.studentId})_이달의학생.csv`;
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
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">학생 대시보드</h1>
            <p className="text-muted-foreground break-words max-w-[200px] sm:max-w-none">{user.name}님 ({user.studentId})</p>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">로그아웃</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Total Score Card */}
        <Card className="mb-6 border-2">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">총 상벌점</p>
              <div
                className={`text-6xl font-bold ${
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
              <p className="text-muted-foreground mt-2">
                상점 {meritsTotal}점 - 벌점 {demeritsTotal}점
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-merit-blue">
            <CardHeader className="bg-merit-blue-light">
              <CardTitle className="flex items-center text-merit-blue">
                <Award className="w-5 h-5 mr-2" />
                상점
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-4xl font-bold text-merit-blue">
                {isLoading ? "..." : meritsTotal}
              </div>
              <p className="text-muted-foreground mt-2">총 상점</p>
            </CardContent>
          </Card>

          <Card className="border-demerit-orange">
            <CardHeader className="bg-demerit-orange-light">
              <CardTitle className="flex items-center text-demerit-orange">
                <AlertCircle className="w-5 h-5 mr-2" />
                벌점
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-4xl font-bold text-demerit-orange">
                {isLoading ? "..." : demeritsTotal}
              </div>
              <p className="text-muted-foreground mt-2">총 벌점</p>
            </CardContent>
          </Card>

          <Card className="border-monthly-green">
            <CardHeader className="bg-monthly-green-light">
              <CardTitle className="flex items-center text-monthly-green">
                <Star className="w-5 h-5 mr-2" />
                이달의 학생
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-4xl font-bold text-monthly-green">
                {isLoading ? "..." : monthlyTotal}
              </div>
              <p className="text-muted-foreground mt-2">추천 횟수</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>상세 내역</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">로딩 중...</p>
            ) : (
              <Tabs defaultValue="merits" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="merits">
                    <Award className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">상점</span>
                  </TabsTrigger>
                  <TabsTrigger value="demerits">
                    <AlertCircle className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">벌점</span>
                  </TabsTrigger>
                  <TabsTrigger value="monthly">
                    <Star className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">이달의 학생</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="merits">
                  <div className="flex justify-end mb-4">
                    <Button 
                      onClick={() => downloadCSV(merits, 'merits')}
                      variant="outline"
                      size="sm"
                      disabled={merits.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      CSV 다운로드
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>날짜</TableHead>
                          <TableHead>교사</TableHead>
                          <TableHead>카테고리</TableHead>
                          <TableHead>사유</TableHead>
                          <TableHead>점수</TableHead>
                          <TableHead>증빙 사진</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {merits.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              상점 내역이 없습니다
                            </TableCell>
                          </TableRow>
                        ) : (
                          merits.map((merit, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{new Date(merit.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>{merit.teacher_name || "-"}</TableCell>
                              <TableCell>{merit.category}</TableCell>
                              <TableCell>{merit.reason || "-"}</TableCell>
                              <TableCell className="text-merit-blue font-medium">{merit.score}</TableCell>
                              <TableCell>
                                {merit.image_url && merit.image_url.length > 0 ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleImageClick(merit.image_url[0])}
                                  >
                                    <ImageIcon className="h-4 w-4 mr-1" />
                                    보기
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">없음</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="demerits">
                  <div className="flex justify-end mb-4">
                    <Button 
                      onClick={() => downloadCSV(demerits, 'demerits')}
                      variant="outline"
                      size="sm"
                      disabled={demerits.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      CSV 다운로드
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>날짜</TableHead>
                          <TableHead>카테고리</TableHead>
                          <TableHead>사유</TableHead>
                          <TableHead>점수</TableHead>
                          <TableHead>증빙 사진</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {demerits.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              벌점 내역이 없습니다
                            </TableCell>
                          </TableRow>
                        ) : (
                          demerits.map((demerit, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{new Date(demerit.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>{demerit.category}</TableCell>
                              <TableCell>{demerit.reason || "-"}</TableCell>
                              <TableCell className="text-demerit-orange font-medium">{demerit.score}</TableCell>
                              <TableCell>
                                {demerit.image_url && demerit.image_url.length > 0 ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleImageClick(demerit.image_url[0])}
                                  >
                                    <ImageIcon className="h-4 w-4 mr-1" />
                                    보기
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">없음</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="monthly">
                  <div className="flex justify-end mb-4">
                    <Button 
                      onClick={() => downloadCSV(monthly, 'monthly')}
                      variant="outline"
                      size="sm"
                      disabled={monthly.length === 0}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      CSV 다운로드
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>날짜</TableHead>
                          <TableHead>교사</TableHead>
                          <TableHead>구분</TableHead>
                          <TableHead>사유</TableHead>
                          <TableHead>증빙 사진</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthly.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              이달의 학생 추천 내역이 없습니다
                            </TableCell>
                          </TableRow>
                        ) : (
                          monthly.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>{item.teacher_name || "-"}</TableCell>
                              <TableCell>{item.category || "-"}</TableCell>
                              <TableCell>{item.reason || "-"}</TableCell>
                              <TableCell>
                                {item.image_url && item.image_url.length > 0 ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleImageClick(item.image_url[0])}
                                  >
                                    <ImageIcon className="h-4 w-4 mr-1" />
                                    보기
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">없음</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Image Preview Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>증빙 사진</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="w-full flex items-center justify-center">
              <img
                src={selectedImage}
                alt="증빙 사진"
                className="max-w-full max-h-[70vh] h-auto object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentDashboard;
