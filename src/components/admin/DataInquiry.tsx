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
        // 상점 데이터 조회
        let meritQuery = supabase
          .from("merits")
          .select("*")
          .order('created_at', { ascending: false })
          .limit(50);

        // 검색어가 있으면 필터링
        if (trimmedSearch) {
          // 숫자면 학년이나 반으로 검색
          if (!isNaN(Number(trimmedSearch))) {
            // 해당 학년/반의 학생들 찾기
            const { data: matchedStudents, error: studentError } = await supabase
              .from("students")
              .select("student_id")
              .or(`grade.eq.${trimmedSearch},class.eq.${trimmedSearch}`);

            if (studentError) throw studentError;

            const studentIds = matchedStudents?.map(s => s.student_id) || [];
            if (studentIds.length > 0) {
              meritQuery = meritQuery.in("student_id", studentIds);
            } else {
              result = [];
            }
          } else {
            // 문자면 학생명이나 교사명으로 검색
            const [{ data: matchedStudents }, { data: matchedTeachers }] = await Promise.all([
              supabase.from("students").select("student_id").ilike("name", `%${trimmedSearch}%`),
              supabase.from("teachers").select("id").ilike("name", `%${trimmedSearch}%`)
            ]);

            const studentIds = matchedStudents?.map(s => s.student_id) || [];
            const teacherIds = matchedTeachers?.map(t => t.id) || [];

            if (studentIds.length === 0 && teacherIds.length === 0) {
              result = [];
            } else if (studentIds.length > 0 && teacherIds.length === 0) {
              meritQuery = meritQuery.in("student_id", studentIds);
            } else if (studentIds.length === 0 && teacherIds.length > 0) {
              meritQuery = meritQuery.in("teacher_id", teacherIds);
            } else {
              meritQuery = meritQuery.or(`student_id.in.(${studentIds.join(",")}),teacher_id.in.(${teacherIds.join(",")})`);
            }
          }
        }

        if (result === undefined) {
          const { data: meritsData, error: meritError } = await meritQuery;
          if (meritError) throw meritError;

          if (meritsData && meritsData.length > 0) {
            // 학생과 교사 정보 별도 조회
            const studentIds = [...new Set(meritsData.map(m => m.student_id))];
            const teacherIds = [...new Set(meritsData.map(m => m.teacher_id).filter(Boolean))];

            const [{ data: studentsData }, { data: teachersData }] = await Promise.all([
              supabase.from("students").select("student_id, name, grade, class").in("student_id", studentIds),
              teacherIds.length > 0 
                ? supabase.from("teachers").select("id, name").in("id", teacherIds)
                : Promise.resolve({ data: [] })
            ]);

            // 매핑 객체 생성
            const studentMap = new Map<string, any>();
            studentsData?.forEach(s => studentMap.set(s.student_id, s));
            
            const teacherMap = new Map<string, any>();
            teachersData?.forEach(t => teacherMap.set(t.id, t));

            result = meritsData.map(row => {
              const student = studentMap.get(row.student_id);
              const teacher = teacherMap.get(row.teacher_id);
              
              return {
                "날짜": new Date(row.created_at).toLocaleDateString('ko-KR'),
                "학생": student ? `${student.name} (${student.grade}-${student.class})` : "-",
                "교사": teacher?.name || "-",
                "카테고리": row.category,
                "사유": row.reason || "-",
                "점수": row.score
              };
            });
          } else {
            result = [];
          }
        }

      } else if (selectedTable === "demerits") {
        // 벌점 데이터 조회
        let demeritQuery = supabase
          .from("demerits")
          .select("*")
          .order('created_at', { ascending: false })
          .limit(50);

        // 검색어가 있으면 필터링
        if (trimmedSearch) {
          // 숫자면 학년이나 반으로 검색
          if (!isNaN(Number(trimmedSearch))) {
            // 해당 학년/반의 학생들 찾기
            const { data: matchedStudents, error: studentError } = await supabase
              .from("students")
              .select("student_id")
              .or(`grade.eq.${trimmedSearch},class.eq.${trimmedSearch}`);

            if (studentError) throw studentError;

            const studentIds = matchedStudents?.map(s => s.student_id) || [];
            if (studentIds.length > 0) {
              demeritQuery = demeritQuery.in("student_id", studentIds);
            } else {
              result = [];
            }
          } else {
            // 문자면 학생명이나 교사명으로 검색
            const [{ data: matchedStudents }, { data: matchedTeachers }] = await Promise.all([
              supabase.from("students").select("student_id").ilike("name", `%${trimmedSearch}%`),
              supabase.from("teachers").select("id").ilike("name", `%${trimmedSearch}%`)
            ]);

            const studentIds = matchedStudents?.map(s => s.student_id) || [];
            const teacherIds = matchedTeachers?.map(t => t.id) || [];

            if (studentIds.length === 0 && teacherIds.length === 0) {
              result = [];
            } else if (studentIds.length > 0 && teacherIds.length === 0) {
              demeritQuery = demeritQuery.in("student_id", studentIds);
            } else if (studentIds.length === 0 && teacherIds.length > 0) {
              demeritQuery = demeritQuery.in("teacher_id", teacherIds);
            } else {
              demeritQuery = demeritQuery.or(`student_id.in.(${studentIds.join(",")}),teacher_id.in.(${teacherIds.join(",")})`);
            }
          }
        }

        if (result === undefined) {
          const { data: demeritsData, error: demeritError } = await demeritQuery;
          if (demeritError) throw demeritError;

          if (demeritsData && demeritsData.length > 0) {
            // 학생과 교사 정보 별도 조회
            const studentIds = [...new Set(demeritsData.map(d => d.student_id))];
            const teacherIds = [...new Set(demeritsData.map(d => d.teacher_id).filter(Boolean))];

            const [{ data: studentsData }, { data: teachersData }] = await Promise.all([
              supabase.from("students").select("student_id, name, grade, class").in("student_id", studentIds),
              teacherIds.length > 0 
                ? supabase.from("teachers").select("id, name").in("id", teacherIds)
                : Promise.resolve({ data: [] })
            ]);

            // 매핑 객체 생성
            const studentMap = new Map<string, any>();
            studentsData?.forEach(s => studentMap.set(s.student_id, s));
            
            const teacherMap = new Map<string, any>();
            teachersData?.forEach(t => teacherMap.set(t.id, t));

            result = demeritsData.map(row => {
              const student = studentMap.get(row.student_id);
              const teacher = teacherMap.get(row.teacher_id);
              
              return {
                "날짜": new Date(row.created_at).toLocaleDateString('ko-KR'),
                "학생": student ? `${student.name} (${student.grade}-${student.class})` : "-",
                "교사": teacher?.name || "-",
                "카테고리": row.category,
                "사유": row.reason || "-",
                "점수": row.score
              };
            });
          } else {
            result = [];
          }
        }

      } else if (selectedTable === "monthly") {
        // 이달의 학생 데이터 조회
        let monthlyQuery = supabase
          .from("monthly")
          .select("*")
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(50);

        // 검색어가 있으면 학생명으로 필터링
        if (trimmedSearch) {
          const { data: matchedStudents, error: studentError } = await supabase
            .from("students")
            .select("student_id")
            .ilike("name", `%${trimmedSearch}%`);

          if (studentError) throw studentError;

          const studentIds = matchedStudents?.map(s => s.student_id) || [];
          if (studentIds.length > 0) {
            monthlyQuery = monthlyQuery.in("student_id", studentIds);
          } else {
            result = [];
          }
        }

        if (result === undefined) {
          const { data: monthlyData, error: monthlyError } = await monthlyQuery;
          if (monthlyError) throw monthlyError;

          if (monthlyData && monthlyData.length > 0) {
            // 학생과 교사 정보 별도 조회
            const studentIds = [...new Set(monthlyData.map(m => m.student_id))];
            const teacherIds = [...new Set(monthlyData.map(m => m.teacher_id).filter(Boolean))];

            const [{ data: studentsData }, { data: teachersData }] = await Promise.all([
              supabase.from("students").select("student_id, name, grade, class").in("student_id", studentIds),
              teacherIds.length > 0 
                ? supabase.from("teachers").select("id, name").in("id", teacherIds)
                : Promise.resolve({ data: [] })
            ]);

            // 매핑 객체 생성
            const studentMap = new Map<string, any>();
            studentsData?.forEach(s => studentMap.set(s.student_id, s));
            
            const teacherMap = new Map<string, any>();
            teachersData?.forEach(t => teacherMap.set(t.id, t));

            result = monthlyData.map(row => {
              const student = studentMap.get(row.student_id);
              const teacher = teacherMap.get(row.teacher_id);
              
              return {
                "연도": row.year,
                "월": row.month,
                "학생": student ? `${student.name} (${student.grade}-${student.class})` : "-",
                "추천교사": teacher?.name || "-",
                "카테고리": row.category || "-",
                "사유": row.reason || "-"
              };
            });
          } else {
            result = [];
          }
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
                selectedTable === "merits" || selectedTable === "demerits" ? "학생명, 교사명, 학년, 반으로 검색" :
                selectedTable === "monthly" ? "학생명으로 검색" :
                "검색"
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleQuery()}
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
