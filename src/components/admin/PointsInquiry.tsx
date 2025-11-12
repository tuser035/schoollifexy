import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon } from "lucide-react";

interface StudentPoint {
  student_id: string;
  name: string;
  merits: number;
  demerits: number;
  monthly: number;
  total: number;
}

const PointsInquiry = () => {
  const [grade, setGrade] = useState("1");
  const [classNum, setClassNum] = useState("1");
  const [students, setStudents] = useState<StudentPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentPoint | null>(null);
  const [detailType, setDetailType] = useState<"merits" | "demerits" | "monthly">("merits");
  const [details, setDetails] = useState<any[] | { merits: any[], demerits: any[] }>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

  useEffect(() => {
    const setAdminSession = async () => {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        await supabase.rpc("set_admin_session", {
          admin_id_input: user.id,
        });
      }
    };
    setAdminSession();
  }, []);

  const handleQuery = async () => {
    setIsLoading(true);
    
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        setIsLoading(false);
        return;
      }
      
      const parsedUser = JSON.parse(authUser);
      if (parsedUser.type !== "admin" || !parsedUser.id) {
        toast.error("관리자 권한이 필요합니다");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("admin_get_student_points_by_class", {
        admin_id_input: parsedUser.id,
        p_grade: parseInt(grade),
        p_class: parseInt(classNum)
      });

      if (error) throw error;

      setStudents((data || []).map((row: any) => ({
        student_id: row.student_id,
        name: row.name,
        merits: row.merits,
        demerits: row.demerits,
        monthly: row.monthly,
        total: row.total
      })));
    } catch (error: any) {
      toast.error(error.message || "조회에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowDetail = async (student: StudentPoint, type: "merits" | "demerits" | "monthly") => {
    setSelectedStudent(student);
    setDetailType(type);

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }
      
      const parsedUser = JSON.parse(authUser);
      if (parsedUser.type !== "admin" || !parsedUser.id) {
        toast.error("관리자 권한이 필요합니다");
        return;
      }

      if (type === "merits") {
        const [meritsResult, demeritsResult] = await Promise.all([
          supabase.rpc("admin_get_merit_details", {
            admin_id_input: parsedUser.id,
            student_id_input: student.student_id
          }),
          supabase.rpc("admin_get_demerit_details", {
            admin_id_input: parsedUser.id,
            student_id_input: student.student_id
          })
        ]);

        if (meritsResult.error) throw meritsResult.error;
        if (demeritsResult.error) throw demeritsResult.error;

        setDetails({
          merits: meritsResult.data || [],
          demerits: demeritsResult.data || [],
        });
      } else {
        const result = await supabase.rpc("admin_get_monthly_details", {
          admin_id_input: parsedUser.id,
          student_id_input: student.student_id
        });

        if (result.error) throw result.error;
        setDetails(result.data || []);
      }
    } catch (error: any) {
      toast.error(error.message || "상세 조회에 실패했습니다");
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>반별 상점/벌점 조회</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="학년" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1학년</SelectItem>
                <SelectItem value="2">2학년</SelectItem>
                <SelectItem value="3">3학년</SelectItem>
              </SelectContent>
            </Select>
            <Select value={classNum} onValueChange={setClassNum}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="반" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={n.toString()}>{n}반</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleQuery} disabled={isLoading}>
              {isLoading ? "조회 중..." : "조회"}
            </Button>
          </div>

          {students.length > 0 && (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>학생 ID</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead className="text-merit-blue">상점</TableHead>
                    <TableHead className="text-demerit-orange">벌점</TableHead>
                    <TableHead className="text-monthly-green">이달의학생</TableHead>
                    <TableHead>합계</TableHead>
                    <TableHead>상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.student_id}>
                      <TableCell>{student.student_id}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell className="text-merit-blue font-medium">{student.merits}</TableCell>
                      <TableCell className="text-demerit-orange font-medium">{student.demerits}</TableCell>
                      <TableCell className="text-monthly-green font-medium">{student.monthly}</TableCell>
                      <TableCell className="font-bold">{student.total}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => handleShowDetail(student, "merits")}
                          >
                            상점/벌점
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => handleShowDetail(student, "monthly")}
                          >
                            추천
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedStudent !== null} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent?.name} - {detailType === "merits" ? "상점/벌점" : "이달의학생"} 내역
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            {detailType === "merits" ? (
              <Tabs defaultValue="merits" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="merits">상점</TabsTrigger>
                  <TabsTrigger value="demerits">벌점</TabsTrigger>
                </TabsList>

                <TabsContent value="merits">
                  <div className="border rounded-lg overflow-auto max-h-[400px]">
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
                        {!Array.isArray(details) && details?.merits?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              상점 내역이 없습니다
                            </TableCell>
                          </TableRow>
                        ) : (
                          !Array.isArray(details) && details?.merits?.map((detail: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{new Date(detail.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>{detail.teacher_name}</TableCell>
                              <TableCell>{detail.category || "-"}</TableCell>
                              <TableCell>{detail.reason}</TableCell>
                              <TableCell className="text-merit-blue font-medium">{detail.score}</TableCell>
                              <TableCell>
                                {detail.image_url ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleImageClick(detail.image_url)}
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
                  <div className="border rounded-lg overflow-auto max-h-[400px]">
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
                        {!Array.isArray(details) && details?.demerits?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              벌점 내역이 없습니다
                            </TableCell>
                          </TableRow>
                        ) : (
                          !Array.isArray(details) && details?.demerits?.map((detail: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{new Date(detail.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>{detail.teacher_name}</TableCell>
                              <TableCell>{detail.category || "-"}</TableCell>
                              <TableCell>{detail.reason}</TableCell>
                              <TableCell className="text-demerit-orange font-medium">{detail.score}</TableCell>
                              <TableCell>
                                {detail.image_url ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleImageClick(detail.image_url)}
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
            ) : (
              <div className="border rounded-lg overflow-auto max-h-[400px]">
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
                    {Array.isArray(details) && details?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          이달의 학생 추천 내역이 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      Array.isArray(details) && details?.map((detail: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{new Date(detail.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{detail.teacher_name}</TableCell>
                          <TableCell>{detail.category}</TableCell>
                          <TableCell>{detail.reason}</TableCell>
                          <TableCell>
                            {detail.image_url ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleImageClick(detail.image_url)}
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
            )}
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
};

export default PointsInquiry;
