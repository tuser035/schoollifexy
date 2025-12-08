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
  category: string;
  reason: string;
  score: number;
  created_at: string;
}

interface DemeritRecord {
  id: string;
  student_id: string;
  student_name: string;
  category: string;
  reason: string;
  score: number;
  created_at: string;
}

interface MonthlyRecord {
  id: string;
  student_id: string;
  student_name: string;
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

  const loadRecords = async () => {
    try {
      setLoading(true);

      // Set teacher session for RLS
      await supabase.rpc("set_teacher_session", { teacher_id_input: teacherId });

      // Load merits
      const { data: meritsData, error: meritsError } = await supabase
        .from("merits")
        .select(`
          id,
          student_id,
          category,
          reason,
          score,
          created_at,
          students!merits_student_id_fkey(name)
        `)
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (meritsError) throw meritsError;

      setMerits(
        (meritsData || []).map((m: any) => ({
          id: m.id,
          student_id: m.student_id,
          student_name: m.students?.name || "-",
          category: m.category,
          reason: m.reason || "",
          score: m.score,
          created_at: m.created_at,
        }))
      );

      // Load demerits
      const { data: demeritsData, error: demeritsError } = await supabase
        .from("demerits")
        .select(`
          id,
          student_id,
          category,
          reason,
          score,
          created_at,
          students!demerits_student_id_fkey(name)
        `)
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (demeritsError) throw demeritsError;

      setDemerits(
        (demeritsData || []).map((d: any) => ({
          id: d.id,
          student_id: d.student_id,
          student_name: d.students?.name || "-",
          category: d.category,
          reason: d.reason || "",
          score: d.score,
          created_at: d.created_at,
        }))
      );

      // Load monthly
      const { data: monthlyData, error: monthlyError } = await supabase
        .from("monthly")
        .select(`
          id,
          student_id,
          category,
          reason,
          year,
          month,
          created_at,
          students!monthly_student_id_fkey(name)
        `)
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (monthlyError) throw monthlyError;

      setMonthly(
        (monthlyData || []).map((mo: any) => ({
          id: mo.id,
          student_id: mo.student_id,
          student_name: mo.students?.name || "-",
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
      {/* 상점 목록 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-merit-blue flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              내가 부여한 상점
            </div>
            <Button variant="ghost" size="sm" onClick={loadRecords} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">로딩 중...</div>
          ) : merits.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">부여한 상점이 없습니다</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">학생</TableHead>
                    <TableHead className="text-xs">분류</TableHead>
                    <TableHead className="text-xs text-center">점수</TableHead>
                    <TableHead className="text-xs text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merits.slice(0, meritsDisplayCount).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-xs py-2">{record.student_name}</TableCell>
                      <TableCell className="text-xs py-2">{record.category}</TableCell>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-demerit-orange flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              내가 부여한 벌점
            </div>
            <Button variant="ghost" size="sm" onClick={loadRecords} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">로딩 중...</div>
          ) : demerits.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">부여한 벌점이 없습니다</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">학생</TableHead>
                    <TableHead className="text-xs">분류</TableHead>
                    <TableHead className="text-xs text-center">점수</TableHead>
                    <TableHead className="text-xs text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demerits.slice(0, demeritsDisplayCount).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-xs py-2">{record.student_name}</TableCell>
                      <TableCell className="text-xs py-2">{record.category}</TableCell>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-monthly-green flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              내가 추천한 이달의 학생
            </div>
            <Button variant="ghost" size="sm" onClick={loadRecords} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">로딩 중...</div>
          ) : monthly.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">추천한 이달의 학생이 없습니다</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">학생</TableHead>
                    <TableHead className="text-xs">분류</TableHead>
                    <TableHead className="text-xs text-center">년/월</TableHead>
                    <TableHead className="text-xs text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly.slice(0, monthlyDisplayCount).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-xs py-2">{record.student_name}</TableCell>
                      <TableCell className="text-xs py-2">{record.category}</TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.type === "merit" && "상점 수정"}
              {editDialog.type === "demerit" && "벌점 수정"}
              {editDialog.type === "monthly" && "이달의 학생 수정"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>분류</Label>
              <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
            </div>
            <div>
              <Label>사유</Label>
              <Textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={3} />
            </div>
            {editDialog.type !== "monthly" && (
              <div>
                <Label>점수</Label>
                <Input
                  type="number"
                  min={1}
                  value={editScore}
                  onChange={(e) => setEditScore(parseInt(e.target.value) || 1)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ ...editDialog, open: false })}>
              취소
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherRecordsList;
