import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const StatisticsChart = () => {
  const [grade, setGrade] = useState<string>("1");
  const [classNum, setClassNum] = useState<string>("1");
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

      // 해당 학급의 학생 목록 가져오기 (RPC 함수 사용)
      const { data: students, error: studentsError } = await supabase.rpc(
        "admin_get_students",
        {
          admin_id_input: parsedUser.id,
          search_grade: parseInt(grade),
          search_class: parseInt(classNum)
        }
      );

      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        toast.info("해당 학급에 학생이 없습니다");
        setChartData([]);
        return;
      }

      const studentIds = students.map(s => s.student_id);

      // 월별 상점 통계
      const { data: merits, error: meritsError } = await supabase
        .from("merits")
        .select("created_at, score, student_id")
        .in("student_id", studentIds);

      if (meritsError) throw meritsError;

      // 월별 벌점 통계
      const { data: demerits, error: demeritsError } = await supabase
        .from("demerits")
        .select("created_at, score, student_id")
        .in("student_id", studentIds);

      if (demeritsError) throw demeritsError;

      // 월별 데이터 집계
      const monthlyData: Record<number, { merits: number; demerits: number }> = {};
      
      for (let i = 1; i <= 12; i++) {
        monthlyData[i] = { merits: 0, demerits: 0 };
      }

      merits?.forEach((merit) => {
        const date = new Date(merit.created_at);
        if (date.getFullYear() === parseInt(year)) {
          const month = date.getMonth() + 1;
          monthlyData[month].merits += merit.score;
        }
      });

      demerits?.forEach((demerit) => {
        const date = new Date(demerit.created_at);
        if (date.getFullYear() === parseInt(year)) {
          const month = date.getMonth() + 1;
          monthlyData[month].demerits += demerit.score;
        }
      });

      const formattedData = Object.entries(monthlyData).map(([month, data]) => ({
        month: `${month}월`,
        상점: data.merits,
        벌점: data.demerits,
        순점수: data.merits - data.demerits
      }));

      setChartData(formattedData);
      toast.success("통계 조회 완료");
    } catch (error: any) {
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

    const csvHeader = "월,상점,벌점,순점수";
    const csvRows = chartData.map(row => 
      `${row.month},${row.상점},${row.벌점},${row.순점수}`
    );
    
    const BOM = "\uFEFF";
    const csvContent = BOM + csvHeader + "\n" + csvRows.join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `${year}년_${grade}학년_${classNum}반_통계_${timestamp}.csv`;
    
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
          <CardTitle>학급별 월별 상점/벌점 통계</CardTitle>
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
              <label className="text-sm font-medium">학년</label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map((g) => (
                    <SelectItem key={g} value={g.toString()}>
                      {g}학년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">반</label>
              <Select value={classNum} onValueChange={setClassNum}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
                    <SelectItem key={c} value={c.toString()}>
                      {c}반
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
                    <XAxis dataKey="month" className="text-sm" />
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
                    <XAxis dataKey="month" className="text-sm" />
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

          {chartData.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">월별 상세 데이터</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">월</TableHead>
                      <TableHead className="text-center">상점</TableHead>
                      <TableHead className="text-center">벌점</TableHead>
                      <TableHead className="text-center">순점수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartData.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell className="text-center font-medium">{row.month}</TableCell>
                        <TableCell className="text-center text-merit-blue font-semibold">{row.상점}</TableCell>
                        <TableCell className="text-center text-demerit-orange font-semibold">{row.벌점}</TableCell>
                        <TableCell className="text-center text-monthly-green font-semibold">{row.순점수}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsChart;
