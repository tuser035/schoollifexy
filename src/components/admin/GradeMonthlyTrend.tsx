import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Download, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const GradeMonthlyTrend = () => {
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line">("line");
  const [dataType, setDataType] = useState<"merits" | "demerits" | "total">("total");
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

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

      // Get merits for the date range
      const startDateStr = useCustomRange && startDate 
        ? format(startDate, "yyyy-MM-dd") 
        : `${year}-01-01`;
      const endDateStr = useCustomRange && endDate 
        ? format(endDate, "yyyy-MM-dd") 
        : `${year}-12-31`;

      const { data: merits, error: meritsError } = await supabase
        .from("merits")
        .select("student_id, score, created_at")
        .gte("created_at", startDateStr)
        .lte("created_at", endDateStr);

      if (meritsError) throw meritsError;

      // Get demerits for the date range
      const { data: demerits, error: demeritsError } = await supabase
        .from("demerits")
        .select("student_id, score, created_at")
        .gte("created_at", startDateStr)
        .lte("created_at", endDateStr);

      if (demeritsError) throw demeritsError;

      // Create student to grade mapping
      const studentGradeMap: { [key: string]: number } = {};
      students?.forEach(student => {
        studentGradeMap[student.student_id] = student.grade;
      });

      // Calculate statistics by grade and month
      const monthlyStats: { 
        [key: number]: { 
          [grade: number]: { merits: number; demerits: number } 
        } 
      } = {};
      
      // Initialize all months (1-12) and grades (1-3)
      for (let month = 1; month <= 12; month++) {
        monthlyStats[month] = {};
        for (let grade = 1; grade <= 3; grade++) {
          monthlyStats[month][grade] = { merits: 0, demerits: 0 };
        }
      }

      // Sum merits by grade and month
      merits?.forEach(merit => {
        const grade = studentGradeMap[merit.student_id];
        const month = new Date(merit.created_at).getMonth() + 1;
        if (grade && monthlyStats[month]?.[grade]) {
          monthlyStats[month][grade].merits += merit.score;
        }
      });

      // Sum demerits by grade and month
      demerits?.forEach(demerit => {
        const grade = studentGradeMap[demerit.student_id];
        const month = new Date(demerit.created_at).getMonth() + 1;
        if (grade && monthlyStats[month]?.[grade]) {
          monthlyStats[month][grade].demerits += demerit.score;
        }
      });

      // Format data for chart
      const formattedData = Object.keys(monthlyStats).map(monthStr => {
        const month = parseInt(monthStr);
        const dataPoint: any = {
          월: `${month}월`,
        };

        if (dataType === "merits") {
          dataPoint["1학년"] = monthlyStats[month][1].merits;
          dataPoint["2학년"] = monthlyStats[month][2].merits;
          dataPoint["3학년"] = monthlyStats[month][3].merits;
        } else if (dataType === "demerits") {
          dataPoint["1학년"] = monthlyStats[month][1].demerits;
          dataPoint["2학년"] = monthlyStats[month][2].demerits;
          dataPoint["3학년"] = monthlyStats[month][3].demerits;
        } else {
          // total (순점수)
          dataPoint["1학년"] = monthlyStats[month][1].merits - monthlyStats[month][1].demerits;
          dataPoint["2학년"] = monthlyStats[month][2].merits - monthlyStats[month][2].demerits;
          dataPoint["3학년"] = monthlyStats[month][3].merits - monthlyStats[month][3].demerits;
        }

        return dataPoint;
      });

      setChartData(formattedData);
      
      const hasData = formattedData.some(d => d["1학년"] !== 0 || d["2학년"] !== 0 || d["3학년"] !== 0);
      if (!hasData) {
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

    const typeLabel = dataType === "merits" ? "상점" : dataType === "demerits" ? "벌점" : "순점수";
    const csvHeader = "월,1학년,2학년,3학년";
    const csvRows = chartData.map(row => 
      `${row.월},${row["1학년"]},${row["2학년"]},${row["3학년"]}`
    );
    
    const BOM = "\uFEFF";
    const csvContent = BOM + csvHeader + "\n" + csvRows.join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `${year}년_학년별_월별_${typeLabel}_추이_${timestamp}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("CSV 파일이 다운로드되었습니다");
  };

  useEffect(() => {
    handleQuery();
  }, [dataType]);

  const getDataLabel = () => {
    switch (dataType) {
      case "merits": return "상점";
      case "demerits": return "벌점";
      case "total": return "순점수";
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-email-history-teal/30">
        <CardHeader>
          <CardTitle className="text-email-history-teal">학년별 월별 추이</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">기간 선택 방식</label>
              <Select 
                value={useCustomRange ? "custom" : "year"} 
                onValueChange={(value) => setUseCustomRange(value === "custom")}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">연도별</SelectItem>
                  <SelectItem value="custom">기간 설정</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!useCustomRange ? (
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
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">시작일</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "yyyy-MM-dd") : "선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">종료일</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "yyyy-MM-dd") : "선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">데이터 유형</label>
              <Select value={dataType} onValueChange={(value: "merits" | "demerits" | "total") => setDataType(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">순점수</SelectItem>
                  <SelectItem value="merits">상점</SelectItem>
                  <SelectItem value="demerits">벌점</SelectItem>
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
                  <SelectItem value="line">선 그래프</SelectItem>
                  <SelectItem value="bar">막대 그래프</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleQuery} disabled={isLoading} className="bg-email-history-teal hover:bg-email-history-teal-hover">
              {isLoading ? "조회 중..." : "조회"}
            </Button>

            {chartData.length > 0 && (
              <Button variant="outline" onClick={exportToCSV} className="border-email-history-teal/50 text-email-history-teal hover:bg-email-history-teal/10">
                <Download className="h-4 w-4 mr-2" />
                CSV 내보내기
              </Button>
            )}
          </div>

          {chartData.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-sm text-muted-foreground">
                {getDataLabel()} 추이
              </div>
              <ResponsiveContainer width="100%" height={400}>
                {chartType === "bar" ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="월" className="text-sm" />
                    <YAxis className="text-sm" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                      }}
                    />
                    <Legend />
                    <Bar dataKey="1학년" fill="hsl(var(--merit-blue))" />
                    <Bar dataKey="2학년" fill="hsl(var(--demerit-orange))" />
                    <Bar dataKey="3학년" fill="hsl(var(--monthly-green))" />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="월" className="text-sm" />
                    <YAxis className="text-sm" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="1학년" stroke="hsl(var(--merit-blue))" strokeWidth={2} />
                    <Line type="monotone" dataKey="2학년" stroke="hsl(var(--demerit-orange))" strokeWidth={2} />
                    <Line type="monotone" dataKey="3학년" stroke="hsl(var(--monthly-green))" strokeWidth={2} />
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

export default GradeMonthlyTrend;
