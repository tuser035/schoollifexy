import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [details, setDetails] = useState<any[]>([]);

  const handleQuery = async () => {
    setIsLoading(true);
    
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("student_id, name")
        .eq("grade", parseInt(grade))
        .eq("class", parseInt(classNum))
        .order("number");

      if (studentsError) throw studentsError;

      const studentPoints: StudentPoint[] = await Promise.all(
        (studentsData || []).map(async (student) => {
          const [meritsData, demeritsData, monthlyData] = await Promise.all([
            supabase
              .from("merits")
              .select("score")
              .eq("student_id", student.student_id),
            supabase
              .from("demerits")
              .select("score")
              .eq("student_id", student.student_id),
            supabase
              .from("monthly")
              .select("id")
              .eq("student_id", student.student_id),
          ]);

          const merits = meritsData.data?.reduce((sum, m) => sum + (m.score || 0), 0) || 0;
          const demerits = demeritsData.data?.reduce((sum, d) => sum + (d.score || 0), 0) || 0;
          const monthly = monthlyData.data?.length || 0;

          return {
            student_id: student.student_id,
            name: student.name,
            merits,
            demerits,
            monthly,
            total: merits - demerits,
          };
        })
      );

      setStudents(studentPoints);
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
      let result;
      if (type === "merits") {
        result = await supabase
          .from("merits")
          .select("*, teachers(name)")
          .eq("student_id", student.student_id)
          .order("created_at", { ascending: false });
      } else if (type === "demerits") {
        result = await supabase
          .from("demerits")
          .select("*, teachers(name)")
          .eq("student_id", student.student_id)
          .order("created_at", { ascending: false });
      } else {
        result = await supabase
          .from("monthly")
          .select("*, teachers(name)")
          .eq("student_id", student.student_id)
          .order("created_at", { ascending: false });
      }

      if (result.error) throw result.error;
      setDetails(result.data || []);
    } catch (error: any) {
      toast.error(error.message || "상세 조회에 실패했습니다");
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
                            상점
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => handleShowDetail(student, "demerits")}
                          >
                            벌점
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent?.name} - {detailType === "merits" ? "상점" : detailType === "demerits" ? "벌점" : "이달의학생"} 내역
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>교사</TableHead>
                  {detailType !== "monthly" && <TableHead>카테고리</TableHead>}
                  <TableHead>사유</TableHead>
                  {detailType !== "monthly" && <TableHead>점수</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((detail, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{new Date(detail.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{detail.teachers?.name || "-"}</TableCell>
                    {detailType !== "monthly" && <TableCell>{detail.category}</TableCell>}
                    <TableCell>{detail.reason || "-"}</TableCell>
                    {detailType !== "monthly" && <TableCell>{detail.score}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PointsInquiry;
