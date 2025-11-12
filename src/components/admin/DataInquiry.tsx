import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";

type TableType = "students" | "teachers" | "homeroom" | "merits" | "demerits" | "monthly" | "departments";

const DataInquiry = () => {
  const [selectedTable, setSelectedTable] = useState<TableType>("students");
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const exportToCSV = () => {
    if (data.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }

    // CSV 헤더
    const csvHeader = columns.join(",");
    
    // CSV 데이터 행
    const csvRows = data.map(row => 
      columns.map(col => {
        const value = row[col]?.toString() || "";
        // 쉼표나 줄바꿈이 포함된 경우 따옴표로 감싸기
        return value.includes(",") || value.includes("\n") ? `"${value}"` : value;
      }).join(",")
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
    const tableNames: Record<TableType, string> = {
      students: "학생",
      teachers: "교사",
      homeroom: "담임반",
      merits: "상점",
      demerits: "벌점",
      monthly: "이달의학생",
      departments: "학과"
    };
    link.download = `${tableNames[selectedTable]}_${timestamp}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("CSV 파일이 다운로드되었습니다");
  };

  const handleQuery = async () => {
    setIsLoading(true);
    
    try {
      // 관리자 ID 가져오기
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
      
      const adminId = parsedUser.id;
      const trimmedSearch = searchTerm.trim().slice(0, 100);
      let result;

      if (selectedTable === "students") {
        let searchGrade: number | null = null;
        let searchClass: number | null = null;
        let searchText: string | null = null;

        if (trimmedSearch) {
          // 숫자인 경우 학년이나 반으로 검색
          if (!isNaN(Number(trimmedSearch))) {
            const searchNum = trimmedSearch;
            
            // 두 자리 숫자인 경우: 첫 자리=학년, 둘째 자리=반
            if (searchNum.length === 2) {
              searchGrade = parseInt(searchNum[0]);
              searchClass = parseInt(searchNum[1]);
            } else {
              searchGrade = parseInt(trimmedSearch);
            }
          } else {
            // 문자인 경우 이름으로 검색
            searchText = trimmedSearch;
          }
        }

        const { data, error: queryError } = await supabase.rpc("admin_get_students", {
          admin_id_input: adminId,
          search_text: searchText,
          search_grade: searchGrade,
          search_class: searchClass
        });

        if (queryError) throw queryError;

        result = data?.map(row => ({
          "학번": row.student_id,
          "이름": row.name,
          "학년": row.grade,
          "반": row.class,
          "번호": row.number,
          "학과": row.dept_name,
          "전화번호": row.student_call,
          "이메일": row.gmail
        }));

      } else if (selectedTable === "teachers") {
        let searchGrade: number | null = null;
        let searchClass: number | null = null;
        let searchText: string | null = null;

        if (trimmedSearch) {
          // 숫자인 경우 학년이나 반으로 검색
          if (!isNaN(Number(trimmedSearch))) {
            const searchNum = trimmedSearch;
            
            // 두 자리 숫자인 경우: 첫 자리=학년, 둘째 자리=반
            if (searchNum.length === 2) {
              searchGrade = parseInt(searchNum[0]);
              searchClass = parseInt(searchNum[1]);
            } else {
              searchGrade = parseInt(trimmedSearch);
            }
          } else {
            // 문자인 경우 이름으로 검색
            searchText = trimmedSearch;
          }
        }

        const { data, error: queryError } = await supabase.rpc("admin_get_teachers", {
          admin_id_input: adminId,
          search_text: searchText,
          search_grade: searchGrade,
          search_class: searchClass
        });

        if (queryError) throw queryError;

        result = data?.map(row => ({
          "이름": row.name,
          "전화번호": row.call_t,
          "이메일": row.teacher_email,
          "학년": row.grade || "-",
          "반": row.class || "-",
          "담임여부": row.is_homeroom ? "담임" : "-",
          "학과": row.dept_name
        }));

      } else if (selectedTable === "homeroom") {
        let searchGrade: number | null = null;
        let searchClass: number | null = null;

        if (trimmedSearch) {
          // 숫자로만 검색 (학년, 반)
          if (!isNaN(Number(trimmedSearch))) {
            const searchNum = trimmedSearch;
            
            // 두 자리 숫자인 경우: 첫 자리=학년, 둘째 자리=반 (예: 38 → 3학년 8반)
            if (searchNum.length === 2) {
              searchGrade = parseInt(searchNum[0]);
              searchClass = parseInt(searchNum[1]);
            } else {
              searchGrade = parseInt(trimmedSearch);
            }
          } else {
            toast.info("담임반은 학년반 번호로 검색해주세요 (예: 38 → 3학년 8반)");
            result = [];
          }
        }

        if (result === undefined) {
          const { data, error: queryError } = await supabase.rpc("admin_get_homeroom", {
            admin_id_input: adminId,
            search_grade: searchGrade,
            search_class: searchClass
          });

          if (queryError) throw queryError;

          result = data?.map(row => ({
            "연도": row.year,
            "학년": row.grade,
            "반": row.class,
            "담임교사": row.teacher_name
          }));
        }

      } else if (selectedTable === "merits") {
        let searchText = null;
        let searchGrade = null;
        let searchClass = null;

        if (trimmedSearch) {
          if (!isNaN(Number(trimmedSearch))) {
            if (trimmedSearch.length === 2) {
              searchGrade = parseInt(trimmedSearch[0]);
              searchClass = parseInt(trimmedSearch[1]);
            } else {
              searchGrade = parseInt(trimmedSearch);
            }
          } else {
            searchText = trimmedSearch;
          }
        }

        const { data, error: queryError } = await supabase.rpc("admin_get_merits", {
          admin_id_input: adminId,
          search_text: searchText,
          search_grade: searchGrade,
          search_class: searchClass
        });

        if (queryError) throw queryError;

        result = data?.map((row: any) => ({
          "날짜": new Date(row.created_at).toLocaleDateString('ko-KR'),
          "학생": `${row.student_name} (${row.student_grade}-${row.student_class})`,
          "교사": row.teacher_name || "-",
          "카테고리": row.category,
          "사유": row.reason || "-",
          "점수": row.score
        }));

      } else if (selectedTable === "demerits") {
        let searchText = null;
        let searchGrade = null;
        let searchClass = null;

        if (trimmedSearch) {
          if (!isNaN(Number(trimmedSearch))) {
            if (trimmedSearch.length === 2) {
              searchGrade = parseInt(trimmedSearch[0]);
              searchClass = parseInt(trimmedSearch[1]);
            } else {
              searchGrade = parseInt(trimmedSearch);
            }
          } else {
            searchText = trimmedSearch;
          }
        }

        const { data, error: queryError } = await supabase.rpc("admin_get_demerits", {
          admin_id_input: adminId,
          search_text: searchText,
          search_grade: searchGrade,
          search_class: searchClass
        });

        if (queryError) throw queryError;

        result = data?.map((row: any) => ({
          "날짜": new Date(row.created_at).toLocaleDateString('ko-KR'),
          "학생": `${row.student_name} (${row.student_grade}-${row.student_class})`,
          "교사": row.teacher_name || "-",
          "카테고리": row.category,
          "사유": row.reason || "-",
          "점수": row.score
        }));

      } else if (selectedTable === "monthly") {
        let searchText = null;
        let searchGrade = null;
        let searchClass = null;

        if (trimmedSearch) {
          if (!isNaN(Number(trimmedSearch))) {
            if (trimmedSearch.length === 2) {
              searchGrade = parseInt(trimmedSearch[0]);
              searchClass = parseInt(trimmedSearch[1]);
            } else {
              searchGrade = parseInt(trimmedSearch);
            }
          } else {
            searchText = trimmedSearch;
          }
        }

        const { data, error: queryError } = await supabase.rpc("admin_get_monthly", {
          admin_id_input: adminId,
          search_text: searchText,
          search_grade: searchGrade,
          search_class: searchClass
        });

        if (queryError) throw queryError;

        // 학생별로 그룹화하여 추천 횟수 누적
        const groupedData = data?.reduce((acc: any, row: any) => {
          const studentKey = row.student_name;
          if (!acc[studentKey]) {
            acc[studentKey] = {
              student_name: row.student_name,
              student_grade: row.student_grade,
              student_class: row.student_class,
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

        result = Object.values(groupedData || {}).map((group: any) => ({
          "학생": `${group.student_name} (${group.student_grade}-${group.student_class})`,
          "추천횟수": group.count,
          "연도": Array.from(group.years).sort().join(", "),
          "월": Array.from(group.months).sort((a: number, b: number) => a - b).join(", ")
        }));

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
                selectedTable === "homeroom" ? "학년반으로 검색 (예: 38 → 3학년 8반)" :
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
            {data.length > 0 && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV 내보내기
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
