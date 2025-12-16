import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Award, AlertCircle, Star, Pencil, Trash2, RefreshCw, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface MeritRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_grade: number;
  student_class: number;
  student_number: number;
  category: string;
  reason: string;
  score: number;
  created_at: string;
}

interface DemeritRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_grade: number;
  student_class: number;
  student_number: number;
  category: string;
  reason: string;
  score: number;
  created_at: string;
}

interface MonthlyRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_grade: number;
  student_class: number;
  student_number: number;
  category: string;
  reason: string;
  year: number;
  month: number;
  created_at: string;
}

interface TeacherRecordsListProps {
  teacherId: string;
}

const PAGE_SIZE = 5;

const TeacherRecordsList = ({ teacherId }: TeacherRecordsListProps) => {
  const [merits, setMerits] = useState<MeritRecord[]>([]);
  const [demerits, setDemerits] = useState<DemeritRecord[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Display count state for pagination
  const [meritsDisplayCount, setMeritsDisplayCount] = useState(PAGE_SIZE);
  const [demeritsDisplayCount, setDemeritsDisplayCount] = useState(PAGE_SIZE);
  const [monthlyDisplayCount, setMonthlyDisplayCount] = useState(PAGE_SIZE);
  
  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    type: "merit" | "demerit" | "monthly";
    record: any;
  }>({ open: false, type: "merit", record: null });
  const [editCategory, setEditCategory] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editScore, setEditScore] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [teacherId]);

  // 페이지 포커스 시 데이터 새로고침
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadRecords();
      }
    };

    const handleFocus = () => {
      loadRecords();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [teacherId]);

  // 실시간 구독으로 상벌점 변경 감지
  useEffect(() => {
    if (!teacherId) return;

    // 상점 테이블 실시간 구독
    const meritsChannel = supabase
      .channel('merits_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'merits',
          filter: `teacher_id=eq.${teacherId}`
        },
        (payload) => {
          console.log('Merits changed:', payload);
          loadRecords();
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

    // 벌점 테이블 실시간 구독
    const demeritsChannel = supabase
      .channel('demerits_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demerits',
          filter: `teacher_id=eq.${teacherId}`
        },
        (payload) => {
          console.log('Demerits changed:', payload);
          loadRecords();
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

    // 이달의 학생 테이블 실시간 구독
    const monthlyChannel = supabase
      .channel('monthly_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monthly',
          filter: `teacher_id=eq.${teacherId}`
        },
        (payload) => {
          console.log('Monthly changed:', payload);
          loadRecords();
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
  }, [teacherId]);

  const loadRecords = async () => {
    try {
      setLoading(true);

      // Load merits using RPC function
      const { data: meritsData, error: meritsError } = await supabase.rpc(
        "teacher_get_own_merits",
        { teacher_id_input: teacherId }
      );

      if (meritsError) throw meritsError;

      setMerits(
        (meritsData || []).map((m: any) => ({
          id: m.id,
          student_id: m.student_id,
          student_name: m.student_name,
          student_grade: m.student_grade,
          student_class: m.student_class,
          student_number: m.student_number,
          category: m.category,
          reason: m.reason || "",
          score: m.score,
          created_at: m.created_at,
        }))
      );

      // Load demerits using RPC function
      const { data: demeritsData, error: demeritsError } = await supabase.rpc(
        "teacher_get_own_demerits",
        { teacher_id_input: teacherId }
      );

      if (demeritsError) throw demeritsError;

      setDemerits(
        (demeritsData || []).map((d: any) => ({
          id: d.id,
          student_id: d.student_id,
          student_name: d.student_name,
          student_grade: d.student_grade,
          student_class: d.student_class,
          student_number: d.student_number,
          category: d.category,
          reason: d.reason || "",
          score: d.score,
          created_at: d.created_at,
        }))
      );

      // Load monthly using RPC function
      const { data: monthlyData, error: monthlyError } = await supabase.rpc(
        "teacher_get_own_monthly",
        { teacher_id_input: teacherId }
      );

      if (monthlyError) throw monthlyError;

      setMonthly(
        (monthlyData || []).map((mo: any) => ({
          id: mo.id,
          student_id: mo.student_id,
          student_name: mo.student_name,
          student_grade: mo.student_grade,
          student_class: mo.student_class,
          student_number: mo.student_number,
          category: mo.category || "",
          reason: mo.reason || "",
          year: mo.year,
          month: mo.month,
          created_at: mo.created_at,
        }))
      );
    } catch (error: any) {
      console.error("Error loading records:", error);
      toast.error("기록 조회 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (type: "merit" | "demerit" | "monthly", record: any) => {
    setEditDialog({ open: true, type, record });
    setEditCategory(record.category);
    setEditReason(record.reason);
    setEditScore(record.score || 1);
  };

  const handleSaveEdit = async () => {
    if (!editDialog.record) return;

    try {
      setIsSaving(true);
      const { type, record } = editDialog;

      if (type === "merit") {
        const { error } = await supabase.rpc("teacher_update_merit", {
          teacher_id_input: teacherId,
          merit_id_input: record.id,
          category_input: editCategory,
          reason_input: editReason,
          score_input: editScore,
        });
        if (error) throw error;
      } else if (type === "demerit") {
        const { error } = await supabase.rpc("teacher_update_demerit", {
          teacher_id_input: teacherId,
          demerit_id_input: record.id,
          category_input: editCategory,
          reason_input: editReason,
          score_input: editScore,
        });
        if (error) throw error;
      } else if (type === "monthly") {
        const { error } = await supabase.rpc("teacher_update_monthly", {
          teacher_id_input: teacherId,
          monthly_id_input: record.id,
          category_input: editCategory,
          reason_input: editReason,
        });
        if (error) throw error;
      }

      toast.success("수정되었습니다");
      setEditDialog({ open: false, type: "merit", record: null });
      loadRecords();
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
        const { error } = await supabase.rpc("teacher_delete_merit", {
          teacher_id_input: teacherId,
          merit_id_input: id,
        });
        if (error) throw error;
      } else if (type === "demerit") {
        const { error } = await supabase.rpc("teacher_delete_demerit", {
          teacher_id_input: teacherId,
          demerit_id_input: id,
        });
        if (error) throw error;
      } else if (type === "monthly") {
        const { error } = await supabase.rpc("teacher_delete_monthly", {
          teacher_id_input: teacherId,
          monthly_id_input: id,
        });
        if (error) throw error;
      }

      toast.success("삭제되었습니다");
      loadRecords();
    } catch (error: any) {
      console.error("Error deleting record:", error);
      toast.error("삭제 실패: " + error.message);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MM/dd HH:mm");
    } catch {
      return "-";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-8">
      {/* 상점 목록 */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
          <CardTitle className="text-merit-blue flex items-center justify-between text-sm sm:text-base">
            <div className="flex items-center gap-1 sm:gap-2">
              <Award className="w-3 h-3 sm:w-4 sm:h-4" />
              내가 부여한 상점
            </div>
            <Button variant="ghost" size="sm" onClick={loadRecords} disabled={loading} className="h-7 w-7 p-0">
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 sm:px-6">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-xs sm:text-sm">로딩 중...</div>
          ) : merits.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-xs sm:text-sm">부여한 상점이 없습니다</div>
          ) : (
            <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">학생</TableHead>
                    <TableHead className="text-xs">분류/사유</TableHead>
                    <TableHead className="text-xs text-center">점수</TableHead>
                    <TableHead className="text-xs text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merits.slice(0, meritsDisplayCount).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-xs py-2">
                        <div className="font-medium">{record.student_name}</div>
                        <div className="text-muted-foreground">{record.student_grade}-{record.student_class}-{record.student_number}</div>
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        <div>{record.category}</div>
                        {record.reason && <div className="text-muted-foreground truncate max-w-[100px]">{record.reason}</div>}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-center">{record.score}</TableCell>
                      <TableCell className="text-right py-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit("merit", record)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete("merit", record.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {merits.length > meritsDisplayCount && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs text-muted-foreground"
                  onClick={() => setMeritsDisplayCount((prev) => prev + PAGE_SIZE)}
                >
                  <ChevronDown className="w-3 h-3 mr-1" />
                  ... 더보기 ({merits.length - meritsDisplayCount}건)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 벌점 목록 */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
          <CardTitle className="text-demerit-orange flex items-center justify-between text-sm sm:text-base">
            <div className="flex items-center gap-1 sm:gap-2">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              내가 부여한 벌점
            </div>
            <Button variant="ghost" size="sm" onClick={loadRecords} disabled={loading} className="h-7 w-7 p-0">
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 sm:px-6">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-xs sm:text-sm">로딩 중...</div>
          ) : demerits.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-xs sm:text-sm">부여한 벌점이 없습니다</div>
          ) : (
            <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">학생</TableHead>
                    <TableHead className="text-xs">분류/사유</TableHead>
                    <TableHead className="text-xs text-center">점수</TableHead>
                    <TableHead className="text-xs text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demerits.slice(0, demeritsDisplayCount).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-xs py-2">
                        <div className="font-medium">{record.student_name}</div>
                        <div className="text-muted-foreground">{record.student_grade}-{record.student_class}-{record.student_number}</div>
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        <div>{record.category}</div>
                        {record.reason && <div className="text-muted-foreground truncate max-w-[100px]">{record.reason}</div>}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-center">{record.score}</TableCell>
                      <TableCell className="text-right py-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit("demerit", record)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete("demerit", record.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {demerits.length > demeritsDisplayCount && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs text-muted-foreground"
                  onClick={() => setDemeritsDisplayCount((prev) => prev + PAGE_SIZE)}
                >
                  <ChevronDown className="w-3 h-3 mr-1" />
                  ... 더보기 ({demerits.length - demeritsDisplayCount}건)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 이달의 학생 목록 */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
          <CardTitle className="text-monthly-green flex items-center justify-between text-sm sm:text-base">
            <div className="flex items-center gap-1 sm:gap-2">
              <Star className="w-3 h-3 sm:w-4 sm:h-4" />
              내가 추천한 이달의 학생
            </div>
            <Button variant="ghost" size="sm" onClick={loadRecords} disabled={loading} className="h-7 w-7 p-0">
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 sm:px-6">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-xs sm:text-sm">로딩 중...</div>
          ) : monthly.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-xs sm:text-sm">추천한 이달의 학생이 없습니다</div>
          ) : (
            <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">학생</TableHead>
                    <TableHead className="text-xs">분류/사유</TableHead>
                    <TableHead className="text-xs text-center">년/월</TableHead>
                    <TableHead className="text-xs text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly.slice(0, monthlyDisplayCount).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-xs py-2">
                        <div className="font-medium">{record.student_name}</div>
                        <div className="text-muted-foreground">{record.student_grade}-{record.student_class}-{record.student_number}</div>
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        <div>{record.category}</div>
                        {record.reason && <div className="text-muted-foreground truncate max-w-[100px]">{record.reason}</div>}
                      </TableCell>
                      <TableCell className="text-xs py-2 text-center">
                        {record.year}/{record.month}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleEdit("monthly", record)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete("monthly", record.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {monthly.length > monthlyDisplayCount && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs text-muted-foreground"
                  onClick={() => setMonthlyDisplayCount((prev) => prev + PAGE_SIZE)}
                >
                  <ChevronDown className="w-3 h-3 mr-1" />
                  ... 더보기 ({monthly.length - monthlyDisplayCount}건)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 편집 다이얼로그 */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ ...editDialog, open: false })}>
        <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editDialog.type === "merit" && "상점 수정"}
              {editDialog.type === "demerit" && "벌점 수정"}
              {editDialog.type === "monthly" && "이달의 학생 수정"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label className="text-xs sm:text-sm">분류</Label>
              <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs sm:text-sm">사유</Label>
              <Textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={3} className="text-sm" />
            </div>
            {editDialog.type !== "monthly" && (
              <div>
                <Label className="text-xs sm:text-sm">점수</Label>
                <Input
                  type="number"
                  min={1}
                  value={editScore}
                  onChange={(e) => setEditScore(parseInt(e.target.value) || 1)}
                  className="text-sm"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditDialog({ ...editDialog, open: false })} className="text-sm h-9">
              취소
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving} className="text-sm h-9">
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherRecordsList;
