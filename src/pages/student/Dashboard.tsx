import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, AlertCircle, Star, LogOut, ImageIcon } from "lucide-react";
import { logout, type AuthUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const fetchStudentData = async (studentId: string) => {
    setIsLoading(true);
    try {
      // Set student session for RLS
      await supabase.rpc("set_student_session", {
        student_id_input: studentId,
      });

      // Fetch merits
      const { data: meritsData, error: meritsError } = await supabase
        .from("merits")
        .select("*, teachers(name)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (meritsError) throw meritsError;

      // Fetch demerits
      const { data: demeritsData, error: demeritsError } = await supabase
        .from("demerits")
        .select("*, teachers(name)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (demeritsError) throw demeritsError;

      // Fetch monthly
      const { data: monthlyData, error: monthlyError } = await supabase
        .from("monthly")
        .select("*, teachers(name)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">학생 대시보드</h1>
            <p className="text-muted-foreground">{user.name}님 ({user.studentId})</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
                  <TabsTrigger value="merits">상점</TabsTrigger>
                  <TabsTrigger value="demerits">벌점</TabsTrigger>
                  <TabsTrigger value="monthly">이달의 학생</TabsTrigger>
                </TabsList>

                <TabsContent value="merits">
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
                              <TableCell>{merit.teachers?.name || "-"}</TableCell>
                              <TableCell>{merit.category}</TableCell>
                              <TableCell>{merit.reason || "-"}</TableCell>
                              <TableCell className="text-merit-blue font-medium">{merit.score}</TableCell>
                              <TableCell>
                                {merit.image_url ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleImageClick(merit.image_url)}
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
                        {demerits.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              벌점 내역이 없습니다
                            </TableCell>
                          </TableRow>
                        ) : (
                          demerits.map((demerit, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{new Date(demerit.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>{demerit.teachers?.name || "-"}</TableCell>
                              <TableCell>{demerit.category}</TableCell>
                              <TableCell>{demerit.reason || "-"}</TableCell>
                              <TableCell className="text-demerit-orange font-medium">{demerit.score}</TableCell>
                              <TableCell>
                                {demerit.image_url ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleImageClick(demerit.image_url)}
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
                              <TableCell>{item.teachers?.name || "-"}</TableCell>
                              <TableCell>{item.category || "-"}</TableCell>
                              <TableCell>{item.reason || "-"}</TableCell>
                              <TableCell>
                                {item.image_url ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleImageClick(item.image_url)}
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>증빙 사진</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="w-full">
              <img
                src={selectedImage}
                alt="증빙 사진"
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentDashboard;
