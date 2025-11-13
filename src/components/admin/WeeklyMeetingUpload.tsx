import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Loader2, Plus, Trash2, Upload, CheckCircle2 } from "lucide-react";
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
  교육과정: { colorId: "11", label: "빨강" },
  교육연구: { colorId: "6", label: "주황" },
  취업지원: { colorId: "5", label: "노랑" },
  환경체육: { colorId: "10", label: "초록" },
  교육정보: { colorId: "9", label: "파랑" },
  도제교육: { colorId: "1", label: "남색" },
  학생생활안전: { colorId: "3", label: "보라" },
  진로직업: { colorId: "4", label: "핑크" },
  교감: { colorId: "7", label: "청록" },
  교장: { colorId: "8", label: "회색" },
};

const WeeklyMeetingUpload = () => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [events, setEvents] = useState<MeetingEvent[]>([
    { id: "1", date: "", time: "09:00", title: "", deptCode: "", colorId: "9" }
  ]);
  const [parsedEvents, setParsedEvents] = useState<MeetingEvent[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);

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
          const colorInfo = DEPT_COLORS[value];
          if (colorInfo) {
            updated.colorId = colorInfo.colorId;
          }
        }
        return updated;
      }
      return e;
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      toast.error("PDF 파일만 업로드 가능합니다");
      return;
    }

    setUploading(true);
    try {
      const events = await parsePDFSchedule(file);
      setParsedEvents(events);
      toast.success(`${events.length}개의 회의 일정을 찾았습니다`);
    } catch (error) {
      console.error("Error parsing PDF:", error);
      toast.error("PDF 파싱에 실패했습니다");
    } finally {
      setUploading(false);
    }
  };

  const parsePDFSchedule = async (file: File): Promise<MeetingEvent[]> => {
    // 예시 데이터 - 실제 PDF 파싱 로직으로 교체 필요
    const exampleEvents: MeetingEvent[] = [
      { id: "p1", date: "2025-01-13", time: "14:00", title: "학사일정 논의", deptCode: "교육과정", colorId: DEPT_COLORS["교육과정"].colorId },
      { id: "p2", date: "2025-01-13", time: "14:30", title: "교육과정 개편", deptCode: "교육연구", colorId: DEPT_COLORS["교육연구"].colorId },
      { id: "p3", date: "2025-01-13", time: "15:00", title: "취업률 현황 보고", deptCode: "취업지원", colorId: DEPT_COLORS["취업지원"].colorId },
      { id: "p4", date: "2025-01-13", time: "15:30", title: "체육대회 준비", deptCode: "환경체육", colorId: DEPT_COLORS["환경체육"].colorId },
      { id: "p5", date: "2025-01-13", time: "16:00", title: "정보시스템 점검", deptCode: "교육정보", colorId: DEPT_COLORS["교육정보"].colorId },
    ];
    
    return exampleEvents;
  };

  const handleParsedBatchUpload = async () => {
    if (!calendarId) {
      toast.error("캘린더 ID를 입력해주세요");
      return;
    }

    if (parsedEvents.length === 0) {
      toast.error("업로드할 일정이 없습니다");
      return;
    }

    setLoading(true);
    setUploadedCount(0);

    try {
      const targetCalendarId = (() => {
        try {
          if (calendarId.includes("calendar.google.com")) {
            const u = new URL(calendarId);
            const src = u.searchParams.get("src");
            return src ? decodeURIComponent(src) : calendarId.trim();
          }
        } catch {}
        return calendarId.trim();
      })();

      for (let i = 0; i < parsedEvents.length; i++) {
        const event = parsedEvents[i];
        
        const startDateTime = new Date(`${event.date}T${event.time}:00`);
        const endDateTime = new Date(startDateTime);
        endDateTime.setHours(endDateTime.getHours() + 1);

        const { error } = await supabase.functions.invoke("google-calendar", {
          body: {
            action: "create",
            calendarId: targetCalendarId,
            event: {
              summary: `[${event.deptCode}] ${event.title}`,
              description: `주간 교직원 회의 - ${event.deptCode}`,
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
        
        setUploadedCount(i + 1);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success(`${parsedEvents.length}개의 회의 일정이 등록되었습니다`);
      setParsedEvents([]);
    } catch (error) {
      console.error("Error uploading events:", error);
      toast.error(`일정 등록 중 오류 발생 (${uploadedCount}/${parsedEvents.length} 완료)`);
    } finally {
      setLoading(false);
    }
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
    return DEPT_COLORS[deptCode]?.label || "";
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
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="calendarId">캘린더 ID *</Label>
          <Input
            id="calendarId"
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            placeholder="example@group.calendar.google.com"
          />
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-3">PDF 파일로 일괄 등록</h3>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="pdfFile">주간 회의자료 PDF 파일</Label>
              <Input
                id="pdfFile"
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                disabled={uploading || loading}
              />
              {uploading && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  PDF 파싱 중...
                </p>
              )}
            </div>

            {parsedEvents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>{parsedEvents.length}개의 회의 일정이 준비되었습니다</span>
                </div>
                
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-1">
                  {parsedEvents.map((event, index) => (
                    <div key={index} className="text-sm flex items-center gap-2">
                      <span className="font-medium">{event.date} {event.time}</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-muted">
                        {event.deptCode} ({getDeptColor(event.deptCode)})
                      </span>
                      : {event.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="text-sm text-muted-foreground">
                등록 중: {uploadedCount} / {parsedEvents.length}
              </div>
            )}

            <Button
              onClick={handleParsedBatchUpload}
              disabled={loading || parsedEvents.length === 0 || !calendarId}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  일괄 등록 중... ({uploadedCount}/{parsedEvents.length})
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {parsedEvents.length}개 회의 일정 일괄 등록
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-3">수동으로 개별 등록</h3>

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

    </Card>
  );
};

export default WeeklyMeetingUpload;
