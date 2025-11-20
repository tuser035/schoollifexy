import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Download } from "lucide-react";

const GradeStatistics = () => {
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  const handleQuery = async () => {
    setIsLoading(true);
    
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

      // Get all students using RPC function
      const { data: students, error: studentsError } = await supabase.rpc('admin_get_students', {
        admin_id_input: parsedUser.id,
        search_text: null,
        search_grade: null,
        search_class: null
      });

      if (studentsError) throw studentsError;

      // Set session for RLS
      if (parsedUser.type === "admin") {
        await supabase.rpc("set_admin_session", { admin_id_input: parsedUser.id });
      } else {
        await supabase.rpc("set_teacher_session", { teacher_id_input: parsedUser.id });
      }

      // Get merits for the year
      const { data: merits, error: meritsError } = await supabase
        .from("merits")
        .select("student_id, score, created_at")
        .gte("created_at", `${year}-01-01`)
        .lte("created_at", `${year}-12-31`);

      if (meritsError) throw meritsError;

      // Get demerits for the year
      const { data: demerits, error: demeritsError } = await supabase
        .from("demerits")
        .select("student_id, score, created_at")
        .gte("created_at", `${year}-01-01`)
        .lte("created_at", `${year}-12-31`);

      if (demeritsError) throw demeritsError;

      // Calculate statistics by grade
      const gradeStats: { [key: number]: { merits: number; demerits: number } } = {};
      
      // Initialize grades 1, 2, 3
      [1, 2, 3].forEach(grade => {
        gradeStats[grade] = { merits: 0, demerits: 0 };
      });

      // Create student to grade mapping
      const studentGradeMap: { [key: string]: number } = {};
      students?.forEach(student => {
        studentGradeMap[student.student_id] = student.grade;
      });

      // Sum merits by grade
      merits?.forEach(merit => {
        const grade = studentGradeMap[merit.student_id];
        if (grade && gradeStats[grade]) {
          gradeStats[grade].merits += merit.score;
        }
      });

      // Sum demerits by grade
      demerits?.forEach(demerit => {
        const grade = studentGradeMap[demerit.student_id];
        if (grade && gradeStats[grade]) {
          gradeStats[grade].demerits += demerit.score;
        }
      });

      // Format data for chart
      const formattedData = [1, 2, 3].map(grade => ({
        학년: `${grade}학년`,
        상점: gradeStats[grade].merits,
        벌점: gradeStats[grade].demerits,
        순점수: gradeStats[grade].merits - gradeStats[grade].demerits
      }));

      setChartData(formattedData);
      
      if (formattedData.every(d => d.상점 === 0 && d.벌점 === 0)) {
        toast.info("통계 데이터가 없습니다");
      } else {
        toast.success("통계 조회 완료");
      }
    } catch (error: any) {
      console.error("Statistics error:", error);
      toast.error(error.message || "조회에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (chartData.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }

    const csvHeader = "학년,상점,벌점,순점수";
    const csvRows = chartData.map(row => 
      `${row.학년},${row.상점},${row.벌점},${row.순점수}`
    );
    
    const BOM = "\uFEFF";
    const csvContent = BOM + csvHeader + "\n" + csvRows.join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `${year}년_학년별_통계_${timestamp}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("CSV 파일이 다운로드되었습니다");
  };

  useEffect(() => {
    handleQuery();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>학년별 상점/벌점 통계</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">연도</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">차트 유형</label>
              <Select value={chartType} onValueChange={(value: "bar" | "line") => setChartType(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">막대 그래프</SelectItem>
                  <SelectItem value="line">선 그래프</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleQuery} disabled={isLoading}>
              {isLoading ? "조회 중..." : "조회"}
            </Button>

            {chartData.length > 0 && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV 내보내기
              </Button>
            )}
          </div>

          {chartData.length > 0 && (
            <div className="mt-6">
              <ResponsiveContainer width="100%" height={400}>
                {chartType === "bar" ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="학년" className="text-sm" />
                    <YAxis className="text-sm" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                      }}
                    />
                    <Legend />
                    <Bar dataKey="상점" fill="hsl(var(--merit-blue))" />
                    <Bar dataKey="벌점" fill="hsl(var(--demerit-orange))" />
                    <Bar dataKey="순점수" fill="hsl(var(--monthly-green))" />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="학년" className="text-sm" />
                    <YAxis className="text-sm" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="상점" stroke="hsl(var(--merit-blue))" strokeWidth={2} />
                    <Line type="monotone" dataKey="벌점" stroke="hsl(var(--demerit-orange))" strokeWidth={2} />
                    <Line type="monotone" dataKey="순점수" stroke="hsl(var(--monthly-green))" strokeWidth={2} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeStatistics;
