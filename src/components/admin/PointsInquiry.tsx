import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon, Download, Pencil, Trash2 } from "lucide-react";

interface StudentPoint {
  student_id: string;
  name: string;
  merits: number;
  demerits: number;
  monthly: number;
  total: number;
}

interface DetailRecord {
  id?: string;
  created_at: string;
  teacher_name: string;
  category: string;
  reason: string;
  score?: number;
  image_url?: string[];
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
  
  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    type: "merit" | "demerit" | "monthly";
    record: DetailRecord | null;
  }>({ open: false, type: "merit", record: null });
  const [editCategory, setEditCategory] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editScore, setEditScore] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const setUserSession = async () => {
      const authUser = localStorage.getItem("auth_user");
      if (authUser) {
        const user = JSON.parse(authUser);
        if (user.type === "admin") {
          await supabase.rpc("set_admin_session", {
            admin_id_input: user.id,
          });
        } else if (user.type === "teacher") {
          await supabase.rpc("set_teacher_session", {
            teacher_id_input: user.id,
          });
        }
      }
    };
    setUserSession();
  }, []);

  // 페이지 포커스 시 데이터 새로고침
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && students.length > 0) {
        handleQuery();
      }
    };

    const handleFocus = () => {
      if (students.length > 0) {
        handleQuery();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [students.length, grade, classNum]);

  // 실시간 동기화 - merits, demerits, monthly 테이블
  useEffect(() => {
    const meritsChannel = supabase
      .channel('admin_merits_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'merits' },
        (payload) => {
          console.log('Admin - Merits changed:', payload);
          if (students.length > 0) {
            handleQuery();
          }
          if (payload.eventType === 'INSERT') {
            toast.info('🔄 상점이 추가되었습니다');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('🔄 상점이 수정되었습니다');
          } else if (payload.eventType === 'DELETE') {
            toast.info('🔄 상점이 삭제되었습니다');
          }
        }
      )
      .subscribe();

    const demeritsChannel = supabase
      .channel('admin_demerits_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demerits' },
        (payload) => {
          console.log('Admin - Demerits changed:', payload);
          if (students.length > 0) {
            handleQuery();
          }
          if (payload.eventType === 'INSERT') {
            toast.info('🔄 벌점이 추가되었습니다');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('🔄 벌점이 수정되었습니다');
          } else if (payload.eventType === 'DELETE') {
            toast.info('🔄 벌점이 삭제되었습니다');
          }
        }
      )
      .subscribe();

    const monthlyChannel = supabase
      .channel('admin_monthly_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly' },
        (payload) => {
          console.log('Admin - Monthly changed:', payload);
          if (students.length > 0) {
            handleQuery();
          }
          if (payload.eventType === 'INSERT') {
            toast.info('🔄 이달의 학생이 추가되었습니다');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('🔄 이달의 학생이 수정되었습니다');
          } else if (payload.eventType === 'DELETE') {
            toast.info('🔄 이달의 학생이 삭제되었습니다');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(meritsChannel);
      supabase.removeChannel(demeritsChannel);
      supabase.removeChannel(monthlyChannel);
    };
  }, [students.length, grade, classNum]);

  const exportToCSV = () => {
    if (students.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }

    // CSV 헤더
    const csvHeader = "학생ID,이름,상점,벌점,이달의학생,합계";
    
    // CSV 데이터 행
    const csvRows = students.map(student => 
      `${student.student_id},${student.name},${student.merits},${student.demerits},${student.monthly},${student.total}`
    );
    
    // BOM 추가 (한글 깨짐 방지)
    const BOM = "\uFEFF";
    const csvContent = BOM + csvHeader + "\n" + csvRows.join("\n");
    
    // Blob 생성 및 다운로드
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `${grade}학년_${classNum}반_상점벌점_${timestamp}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("CSV 파일이 다운로드되었습니다");
  };

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
      if ((parsedUser.type !== "admin" && parsedUser.type !== "teacher") || !parsedUser.id) {
        toast.error("권한이 필요합니다");
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
      if ((parsedUser.type !== "admin" && parsedUser.type !== "teacher") || !parsedUser.id) {
        toast.error("권한이 필요합니다");
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

  const handleEdit = (type: "merit" | "demerit" | "monthly", record: any) => {
    setEditDialog({ open: true, type, record });
    setEditCategory(record.category || "");
    setEditReason(record.reason || "");
    setEditScore(record.score || 1);
  };

  const handleSaveEdit = async () => {
    if (!editDialog.record || !editDialog.record.id) return;

    try {
      setIsSaving(true);
      const { type, record } = editDialog;

      if (type === "merit") {
        const { error } = await supabase
          .from("merits")
          .update({ category: editCategory, reason: editReason, score: editScore })
          .eq("id", record.id);
        if (error) throw error;
      } else if (type === "demerit") {
        const { error } = await supabase
          .from("demerits")
          .update({ category: editCategory, reason: editReason, score: editScore })
          .eq("id", record.id);
        if (error) throw error;
      } else if (type === "monthly") {
        const { error } = await supabase
          .from("monthly")
          .update({ category: editCategory, reason: editReason })
          .eq("id", record.id);
        if (error) throw error;
      }

      toast.success("수정되었습니다");
      setEditDialog({ open: false, type: "merit", record: null });
      
      // Refresh details
      if (selectedStudent) {
        handleShowDetail(selectedStudent, detailType);
      }
    } catch (error: any) {
      console.error("Error updating record:", error);
      toast.error("수정 실패: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (type: "merit" | "demerit" | "monthly", id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      if (type === "merit") {
        const { error } = await supabase.from("merits").delete().eq("id", id);
        if (error) throw error;
      } else if (type === "demerit") {
        const { error } = await supabase.from("demerits").delete().eq("id", id);
        if (error) throw error;
      } else if (type === "monthly") {
        const { error } = await supabase.from("monthly").delete().eq("id", id);
        if (error) throw error;
      }

      toast.success("삭제되었습니다");
      
      // Refresh details
      if (selectedStudent) {
        handleShowDetail(selectedStudent, detailType);
      }
      // Also refresh main list
      handleQuery();
    } catch (error: any) {
      console.error("Error deleting record:", error);
      toast.error("삭제 실패: " + error.message);
    }
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
            {students.length > 0 && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV 내보내기
              </Button>
            )}
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
                          <TableHead>증빙</TableHead>
                          <TableHead className="text-right">관리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!Array.isArray(details) && details?.merits?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                                    <ImageIcon className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleEdit("merit", detail)}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete("merit", detail.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
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
                          <TableHead>증빙</TableHead>
                          <TableHead className="text-right">관리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!Array.isArray(details) && details?.demerits?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                                    <ImageIcon className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleEdit("demerit", detail)}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete("demerit", detail.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
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
                      <TableHead>증빙</TableHead>
                      <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(details) && details?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEdit("monthly", detail)}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDelete("monthly", detail.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
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

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, type: "merit", record: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.type === "merit" ? "상점" : editDialog.type === "demerit" ? "벌점" : "이달의학생"} 수정
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>카테고리</Label>
              <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
            </div>
            <div>
              <Label>사유</Label>
              <Textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} />
            </div>
            {editDialog.type !== "monthly" && (
              <div>
                <Label>점수</Label>
                <Input type="number" value={editScore} onChange={(e) => setEditScore(parseInt(e.target.value) || 1)} min={1} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, type: "merit", record: null })}>
              취소
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PointsInquiry;
