import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";

type TableType = "merits" | "demerits" | "monthly";

const DataView = () => {
  const [selectedTable, setSelectedTable] = useState<TableType>("merits");
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("");

  const handleQuery = async () => {
    if (!searchTerm && !gradeFilter && !classFilter) {
      toast.error("검색어 또는 학년/반을 입력해주세요");
      return;
    }

    setIsLoading(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("교사 인증이 필요합니다");
        return;
      }

      const parsedUser = JSON.parse(authUser);
      if (parsedUser.type !== "teacher" || !parsedUser.id) {
        toast.error("교사 권한이 필요합니다");
        return;
      }

      // Set teacher session
      await supabase.rpc("set_teacher_session", {
        teacher_id_input: parsedUser.id
      });

      let result: any[] = [];

      const grade = gradeFilter ? parseInt(gradeFilter) : undefined;
      const classNum = classFilter ? parseInt(classFilter) : undefined;

      if (selectedTable === "merits") {
        const { data: meritsData, error } = await supabase.rpc("admin_get_merits", {
          admin_id_input: parsedUser.id,
          search_text: searchTerm || null,
          search_grade: grade || null,
          search_class: classNum || null,
        });

        if (error) throw error;

        result = meritsData?.map((row: any) => ({
          "일시": new Date(row.created_at).toLocaleString("ko-KR"),
          "학생": row.student_name,
          "학년": row.student_grade,
          "반": row.student_class,
          "교사": row.teacher_name,
          "카테고리": row.category,
          "사유": row.reason || "-",
          "점수": row.score,
        })) || [];
      } else if (selectedTable === "demerits") {
        const { data: demeritsData, error } = await supabase.rpc("admin_get_demerits", {
          admin_id_input: parsedUser.id,
          search_text: searchTerm || null,
          search_grade: grade || null,
          search_class: classNum || null,
        });

        if (error) throw error;

        result = demeritsData?.map((row: any) => ({
          "일시": new Date(row.created_at).toLocaleString("ko-KR"),
          "학생": row.student_name,
          "학년": row.student_grade,
          "반": row.student_class,
          "교사": row.teacher_name,
          "카테고리": row.category,
          "사유": row.reason || "-",
          "점수": row.score,
        })) || [];
      } else if (selectedTable === "monthly") {
        const { data: monthlyData, error } = await supabase.rpc("admin_get_monthly", {
          admin_id_input: parsedUser.id,
          search_text: searchTerm || null,
          search_grade: grade || null,
          search_class: classNum || null,
        });

        if (error) throw error;

        // Group by student
        const groupedData = monthlyData?.reduce((acc: any, row: any) => {
          const studentKey = row.student_id;
          if (!acc[studentKey]) {
            acc[studentKey] = {
              student_id: row.student_id,
              student_name: row.student_name,
              count: 0,
              years: new Set(),
              months: new Set()
            };
          }
          acc[studentKey].count += 1;
          acc[studentKey].years.add(row.year);
          acc[studentKey].months.add(row.month);
          return acc;
        }, {});

        result = Object.values(groupedData || {})
          .sort((a: any, b: any) => b.count - a.count)
          .map((group: any) => ({
            "학생": `${group.student_name}(${group.student_id})`,
            "추천횟수": group.count,
            "연도": Array.from(group.years).sort().join(", "),
            "월": Array.from(group.months).sort((a: number, b: number) => a - b).join(", "),
          }));
      }

      if (result && result.length > 0) {
        setColumns(Object.keys(result[0]));
        setData(result);
        toast.success(`${result.length}건의 데이터를 조회했습니다`);
      } else {
        setColumns([]);
        setData([]);
        toast.info("검색 결과가 없습니다");
      }
    } catch (error: any) {
      console.error("Query error:", error);
      toast.error(error.message || "조회에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }

    const headers = columns.join(",");
    const rows = data.map(row => columns.map(col => {
      const val = row[col];
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
    }).join(","));

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTable}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("CSV 파일로 내보냈습니다");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>데이터 조회</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedTable} onValueChange={(val) => setSelectedTable(val as TableType)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="테이블 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="merits">상점</SelectItem>
              <SelectItem value="demerits">벌점</SelectItem>
              <SelectItem value="monthly">이달의 학생</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="학생/교사 이름 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />

          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-full sm:w-[100px]">
              <SelectValue placeholder="학년" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              <SelectItem value="1">1학년</SelectItem>
              <SelectItem value="2">2학년</SelectItem>
              <SelectItem value="3">3학년</SelectItem>
            </SelectContent>
          </Select>

          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-full sm:w-[100px]">
              <SelectValue placeholder="반" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(c => (
                <SelectItem key={c} value={c.toString()}>{c}반</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleQuery} disabled={isLoading} className="flex-1 sm:flex-none">
            {isLoading ? "조회 중..." : "조회"}
          </Button>
          <Button onClick={exportToCSV} variant="outline" disabled={data.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            CSV 내보내기
          </Button>
        </div>

        {data.length > 0 && (
          <div className="border rounded-lg overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col} className="whitespace-nowrap">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((col) => (
                      <TableCell key={col} className="whitespace-nowrap">
                        {row[col]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataView;
