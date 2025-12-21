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

const StatisticsChart = () => {
  const [grade, setGrade] = useState<string>("1");
  const [classNum, setClassNum] = useState<string>("1");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line">("line");
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

      // For custom date range, we need to fetch data differently
      if (useCustomRange && startDate && endDate) {
        // Set session for RLS
        if (parsedUser.type === "admin") {
          await supabase.rpc("set_admin_session", { admin_id_input: parsedUser.id });
        } else {
          await supabase.rpc("set_teacher_session", { teacher_id_input: parsedUser.id });
        }

        // Get students for the class
        const { data: students, error: studentsError } = await supabase.rpc('admin_get_students', {
          admin_id_input: parsedUser.id,
          search_text: null,
          search_grade: parseInt(grade),
          search_class: parseInt(classNum)
        });

        if (studentsError) throw studentsError;

        const studentIds = students?.map(s => s.student_id) || [];
        const startDateStr = format(startDate, "yyyy-MM-dd");
        const endDateStr = format(endDate, "yyyy-MM-dd");

        // Get merits
        const { data: merits, error: meritsError } = await supabase
          .from("merits")
          .select("student_id, score, created_at")
          .in("student_id", studentIds)
          .gte("created_at", startDateStr)
          .lte("created_at", endDateStr);

        if (meritsError) throw meritsError;

        // Get demerits
        const { data: demerits, error: demeritsError } = await supabase
          .from("demerits")
          .select("student_id, score, created_at")
          .in("student_id", studentIds)
          .gte("created_at", startDateStr)
          .lte("created_at", endDateStr);

        if (demeritsError) throw demeritsError;

        // Group by month
        const monthlyStats: { [key: number]: { merits: number; demerits: number } } = {};
        
        merits?.forEach(merit => {
          const month = new Date(merit.created_at).getMonth() + 1;
          if (!monthlyStats[month]) {
            monthlyStats[month] = { merits: 0, demerits: 0 };
          }
          monthlyStats[month].merits += merit.score;
        });

        demerits?.forEach(demerit => {
          const month = new Date(demerit.created_at).getMonth() + 1;
          if (!monthlyStats[month]) {
            monthlyStats[month] = { merits: 0, demerits: 0 };
          }
          monthlyStats[month].demerits += demerit.score;
        });

        const formattedData = Object.keys(monthlyStats).map(monthStr => {
          const month = parseInt(monthStr);
          return {
            month: `${month}월`,
            상점: monthlyStats[month].merits,
            벌점: monthlyStats[month].demerits,
            순점수: monthlyStats[month].merits - monthlyStats[month].demerits
          };
        }).sort((a, b) => parseInt(a.month) - parseInt(b.month));

        setChartData(formattedData);
        
        if (formattedData.length === 0) {
          toast.info("통계 데이터가 없습니다");
        } else {
          toast.success("통계 조회 완료");
        }
        return;
      }

      // Use RPC function for year-based statistics
      const { data: statistics, error: statsError } = await supabase.rpc(
        "get_class_monthly_statistics",
        {
          user_id_input: parsedUser.id,
          grade_input: parseInt(grade),
          class_input: parseInt(classNum),
          year_input: parseInt(year)
        }
      );

      if (statsError) throw statsError;

      if (!statistics || statistics.length === 0) {
        toast.info("통계 데이터가 없습니다");
        setChartData([]);
        return;
      }

      const formattedData = statistics.map((stat: any) => ({
        month: `${stat.month}월`,
        상점: stat.merits_total,
        벌점: stat.demerits_total,
        순점수: stat.merits_total - stat.demerits_total
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
      <Card className="border-bulk-email-pink/30">
        <CardContent className="space-y-4 pt-6">
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
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((c) => (
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

            <Button onClick={handleQuery} disabled={isLoading} className="bg-bulk-email-pink hover:bg-bulk-email-pink-hover">
              {isLoading ? "조회 중..." : "조회"}
            </Button>

            {chartData.length > 0 && (
              <Button variant="outline" onClick={exportToCSV} className="border-bulk-email-pink/50 text-bulk-email-pink hover:bg-bulk-email-pink/10">
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
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsChart;
