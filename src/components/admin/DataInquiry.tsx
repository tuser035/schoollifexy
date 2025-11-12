import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type TableType = "students" | "teachers" | "homeroom" | "merits" | "demerits" | "monthly" | "departments";

const DataInquiry = () => {
  const [selectedTable, setSelectedTable] = useState<TableType>("students");
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleQuery = async () => {
    setIsLoading(true);
    
    try {
      const trimmedSearch = searchTerm.trim().slice(0, 100);
      let result;

      if (selectedTable === "students") {
        let query = supabase
          .from("students")
          .select(`
            student_id,
            name,
            grade,
            class,
            number,
            departments(name),
            student_call,
            gmail
          `)
          .limit(50);

        if (trimmedSearch) {
          query = query.or(`name.ilike.%${trimmedSearch}%,grade.eq.${trimmedSearch},class.eq.${trimmedSearch}`);
        }

        const { data, error: queryError } = await query;
        if (queryError) throw queryError;

        result = data?.map(row => ({
          "학번": row.student_id,
          "이름": row.name,
          "학년": row.grade,
          "반": row.class,
          "번호": row.number,
          "학과": row.departments?.name || "-",
          "전화번호": row.student_call || "-",
          "이메일": row.gmail || "-"
        }));

      } else if (selectedTable === "teachers") {
        let query = supabase
          .from("teachers")
          .select(`
            name,
            call_t,
            teacher_email,
            grade,
            class,
            is_homeroom,
            departments(name)
          `)
          .limit(50);

        if (trimmedSearch) {
          query = query.or(`name.ilike.%${trimmedSearch}%,grade.eq.${trimmedSearch},class.eq.${trimmedSearch}`);
        }

        const { data, error: queryError } = await query;
        if (queryError) throw queryError;

        result = data?.map(row => ({
          "이름": row.name,
          "전화번호": row.call_t,
          "이메일": row.teacher_email,
          "학년": row.grade || "-",
          "반": row.class || "-",
          "담임여부": row.is_homeroom ? "담임" : "-",
          "학과": row.departments?.name || "-"
        }));

      } else if (selectedTable === "homeroom") {
        let query = supabase
          .from("homeroom")
          .select(`
            year,
            grade,
            class,
            teachers(name)
          `)
          .limit(50);

        if (trimmedSearch) {
          query = query.or(`grade.eq.${trimmedSearch},class.eq.${trimmedSearch}`);
        }

        const { data, error: queryError } = await query;
        if (queryError) throw queryError;

        result = data?.map(row => ({
          "연도": row.year,
          "학년": row.grade,
          "반": row.class,
          "담임교사": row.teachers?.name || "-"
        }));

      } else if (selectedTable === "merits") {
        let query = supabase
          .from("merits")
          .select(`
            created_at,
            students(student_id, name, grade, class),
            teachers(name),
            category,
            reason,
            score
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (trimmedSearch) {
          // 학생명 또는 교사명으로 검색
          const { data: students } = await supabase
            .from("students")
            .select("student_id")
            .ilike("name", `%${trimmedSearch}%`);

          const { data: teachers } = await supabase
            .from("teachers")
            .select("id")
            .ilike("name", `%${trimmedSearch}%`);

          const studentIds = students?.map(s => s.student_id) || [];
          const teacherIds = teachers?.map(t => t.id) || [];

          if (studentIds.length > 0 || teacherIds.length > 0) {
            query = query.or(`student_id.in.(${studentIds.join(",")}),teacher_id.in.(${teacherIds.join(",")})`);
          } else {
            // 검색 결과가 없으면 빈 결과 반환
            result = [];
          }
        }

        if (!result) {
          const { data, error: queryError } = await query;
          if (queryError) throw queryError;

          result = data?.map(row => ({
            "날짜": new Date(row.created_at).toLocaleDateString('ko-KR'),
            "학생": `${row.students?.name} (${row.students?.grade}-${row.students?.class})`,
            "교사": row.teachers?.name || "-",
            "카테고리": row.category,
            "사유": row.reason || "-",
            "점수": row.score
          }));
        }

      } else if (selectedTable === "demerits") {
        let query = supabase
          .from("demerits")
          .select(`
            created_at,
            students(student_id, name, grade, class),
            teachers(name),
            category,
            reason,
            score
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (trimmedSearch) {
          const { data: students } = await supabase
            .from("students")
            .select("student_id")
            .ilike("name", `%${trimmedSearch}%`);

          const { data: teachers } = await supabase
            .from("teachers")
            .select("id")
            .ilike("name", `%${trimmedSearch}%`);

          const studentIds = students?.map(s => s.student_id) || [];
          const teacherIds = teachers?.map(t => t.id) || [];

          if (studentIds.length > 0 || teacherIds.length > 0) {
            query = query.or(`student_id.in.(${studentIds.join(",")}),teacher_id.in.(${teacherIds.join(",")})`);
          } else {
            result = [];
          }
        }

        if (!result) {
          const { data, error: queryError } = await query;
          if (queryError) throw queryError;

          result = data?.map(row => ({
            "날짜": new Date(row.created_at).toLocaleDateString('ko-KR'),
            "학생": `${row.students?.name} (${row.students?.grade}-${row.students?.class})`,
            "교사": row.teachers?.name || "-",
            "카테고리": row.category,
            "사유": row.reason || "-",
            "점수": row.score
          }));
        }

      } else if (selectedTable === "monthly") {
        let query = supabase
          .from("monthly")
          .select(`
            year,
            month,
            students(student_id, name, grade, class),
            teachers(name),
            category,
            reason
          `)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(50);

        if (trimmedSearch) {
          const { data: students } = await supabase
            .from("students")
            .select("student_id")
            .ilike("name", `%${trimmedSearch}%`);

          const studentIds = students?.map(s => s.student_id) || [];

          if (studentIds.length > 0) {
            query = query.in("student_id", studentIds);
          } else {
            result = [];
          }
        }

        if (!result) {
          const { data, error: queryError } = await query;
          if (queryError) throw queryError;

          result = data?.map(row => ({
            "연도": row.year,
            "월": row.month,
            "학생": `${row.students?.name} (${row.students?.grade}-${row.students?.class})`,
            "추천교사": row.teachers?.name || "-",
            "카테고리": row.category || "-",
            "사유": row.reason || "-"
          }));
        }

      } else {
        // departments
        const { data, error: queryError } = await supabase
          .from(selectedTable)
          .select("*")
          .limit(50);

        if (queryError) throw queryError;
        result = data;
      }

      if (result && result.length > 0) {
        setColumns(Object.keys(result[0]));
        setData(result);
      } else {
        setColumns([]);
        setData([]);
        toast.info(trimmedSearch ? "검색 결과가 없습니다" : "데이터가 없습니다");
      }
    } catch (error: any) {
      toast.error(error.message || "조회에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>데이터 조회</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Select value={selectedTable} onValueChange={(value) => { setSelectedTable(value as TableType); setSearchTerm(""); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="students">학생</SelectItem>
                <SelectItem value="teachers">교사</SelectItem>
                <SelectItem value="homeroom">담임반</SelectItem>
                <SelectItem value="merits">상점</SelectItem>
                <SelectItem value="demerits">벌점</SelectItem>
                <SelectItem value="monthly">이달의 학생</SelectItem>
                <SelectItem value="departments">학과</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={
                selectedTable === "students" ? "학생명, 학년, 반으로 검색" :
                selectedTable === "teachers" ? "교사명, 학년, 반으로 검색" :
                selectedTable === "homeroom" ? "학년, 반으로 검색" :
                selectedTable === "merits" || selectedTable === "demerits" ? "학생명 또는 교사명으로 검색" :
                selectedTable === "monthly" ? "학생명으로 검색" :
                "검색"
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuery()}
              className="max-w-xs"
              maxLength={100}
            />
            <Button onClick={handleQuery} disabled={isLoading}>
              {isLoading ? "조회 중..." : "조회"}
            </Button>
            {searchTerm && (
              <Button variant="outline" onClick={() => { setSearchTerm(""); handleQuery(); }}>
                초기화
              </Button>
            )}
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
                          {row[col]?.toString() || "-"}
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
    </div>
  );
};

export default DataInquiry;
