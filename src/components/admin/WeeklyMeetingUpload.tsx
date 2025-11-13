import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Department {
  code: string;
  name: string;
}

interface MeetingEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  deptCode: string;
  colorId: string;
}

// 부서별 색상 매핑 (Google Calendar colorId)
const DEPT_COLORS: Record<string, { colorId: string; label: string }> = {
  "default": { colorId: "9", label: "파랑" },
  "dept1": { colorId: "11", label: "빨강" },
  "dept2": { colorId: "6", label: "주황" },
  "dept3": { colorId: "5", label: "노랑" },
  "dept4": { colorId: "10", label: "초록" },
  "dept5": { colorId: "1", label: "연한 파랑" },
  "dept6": { colorId: "9", label: "파랑" },
  "dept7": { colorId: "3", label: "보라" },
  "dept8": { colorId: "4", label: "핑크" },
};

const WeeklyMeetingUpload = () => {
  const [loading, setLoading] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [events, setEvents] = useState<MeetingEvent[]>([
    { id: "1", date: "", time: "09:00", title: "", deptCode: "", colorId: "9" }
  ]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    const { data, error } = await supabase
      .from("departments")
      .select("code, name")
      .order("name");

    if (error) {
      console.error("Error loading departments:", error);
      toast.error("부서 목록 로딩 실패");
      return;
    }

    setDepartments(data || []);
  };

  const addEvent = () => {
    setEvents([
      ...events,
      { id: Date.now().toString(), date: "", time: "09:00", title: "", deptCode: "", colorId: "9" }
    ]);
  };

  const removeEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const updateEvent = (id: string, field: keyof MeetingEvent, value: string) => {
    setEvents(events.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value };
        // 부서 변경 시 색상도 업데이트
        if (field === "deptCode") {
          const colorInfo = DEPT_COLORS[value] || DEPT_COLORS["default"];
          updated.colorId = colorInfo.colorId;
        }
        return updated;
      }
      return e;
    }));
  };

  const handleBatchUpload = async () => {
    if (!calendarId) {
      toast.error("캘린더 ID를 입력해주세요");
      return;
    }

    const validEvents = events.filter(e => e.date && e.title && e.deptCode);
    if (validEvents.length === 0) {
      toast.error("최소 1개 이상의 완전한 일정을 입력해주세요");
      return;
    }

    setLoading(true);
    let successCount = 0;

    try {
      for (const event of validEvents) {
        const dept = departments.find(d => d.code === event.deptCode);
        const deptName = dept?.name || "";
        
        const [hours, minutes] = event.time.split(":");
        const startDateTime = new Date(event.date);
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(endDateTime.getHours() + 1);

        const { error } = await supabase.functions.invoke("google-calendar", {
          body: {
            action: "create",
            calendarId,
            event: {
              summary: `[${deptName}] ${event.title}`,
              description: `부서: ${deptName}\n교직원 주간 회의`,
              start: {
                dateTime: startDateTime.toISOString(),
                timeZone: "Asia/Seoul",
              },
              end: {
                dateTime: endDateTime.toISOString(),
                timeZone: "Asia/Seoul",
              },
              colorId: event.colorId,
            },
          },
        });

        if (error) throw error;
        successCount++;
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success(`${successCount}개의 회의 일정이 등록되었습니다`);
      setEvents([{ id: "1", date: "", time: "09:00", title: "", deptCode: "", colorId: "9" }]);
    } catch (error) {
      console.error("Error uploading events:", error);
      toast.error(`일정 등록 중 오류 발생 (${successCount}/${validEvents.length} 완료)`);
    } finally {
      setLoading(false);
    }
  };

  const getDeptColor = (deptCode: string) => {
    return DEPT_COLORS[deptCode]?.label || DEPT_COLORS["default"].label;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          주별 교직원 회의 일정 등록
        </CardTitle>
        <CardDescription>
          부서별로 색상이 구분된 주간 회의 일정을 Google Calendar에 등록합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="calendarId">캘린더 ID *</Label>
          <Input
            id="calendarId"
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            placeholder="example@group.calendar.google.com"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>회의 일정</Label>
            <Button onClick={addEvent} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              일정 추가
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.map((event) => (
              <div key={event.id} className="p-4 border rounded-lg space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">날짜</Label>
                    <Input
                      type="date"
                      value={event.date}
                      onChange={(e) => updateEvent(event.id, "date", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">시간</Label>
                    <Input
                      type="time"
                      value={event.time}
                      onChange={(e) => updateEvent(event.id, "time", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">회의 제목</Label>
                  <Input
                    value={event.title}
                    onChange={(e) => updateEvent(event.id, "title", e.target.value)}
                    placeholder="예: 주간 업무 회의"
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">부서</Label>
                    <Select
                      value={event.deptCode}
                      onValueChange={(value) => updateEvent(event.id, "deptCode", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="부서 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.code} value={dept.code}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {event.deptCode && (
                    <div className="flex items-end">
                      <div className="text-xs px-3 py-2 bg-muted rounded">
                        색상: {getDeptColor(event.deptCode)}
                      </div>
                    </div>
                  )}
                  {events.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEvent(event.id)}
                      className="mt-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleBatchUpload}
          disabled={loading || !calendarId}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              등록 중...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4 mr-2" />
              {events.filter(e => e.date && e.title && e.deptCode).length}개 일정 등록
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 부서별로 자동으로 색상이 구분됩니다</p>
          <p>💡 회의 시간은 기본 1시간으로 설정됩니다</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyMeetingUpload;
