import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Loader2, Plus, Trash2, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Papa from 'papaparse';

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
  endDate?: string; // 연속 이벤트의 종료일
}

// 부서별 색상 매핑 (Google Calendar colorId + UI 배경색)
const DEPT_COLORS: Record<string, { colorId: string; label: string; bg: string; text: string }> = {
  교육과정: { colorId: "11", label: "빨강", bg: "bg-red-100", text: "text-red-900" },
  교육연구: { colorId: "6", label: "주황", bg: "bg-orange-100", text: "text-orange-900" },
  취업지원: { colorId: "5", label: "노랑", bg: "bg-yellow-100", text: "text-yellow-900" },
  환경체육: { colorId: "10", label: "초록", bg: "bg-green-100", text: "text-green-900" },
  교육정보: { colorId: "9", label: "파랑", bg: "bg-blue-100", text: "text-blue-900" },
  도제교육: { colorId: "1", label: "남색", bg: "bg-indigo-100", text: "text-indigo-900" },
  학생생활안전: { colorId: "3", label: "보라", bg: "bg-purple-100", text: "text-purple-900" },
  진로직업: { colorId: "4", label: "핑크", bg: "bg-pink-100", text: "text-pink-900" },
  교감: { colorId: "7", label: "청록", bg: "bg-cyan-100", text: "text-cyan-900" },
  교장: { colorId: "8", label: "회색", bg: "bg-gray-100", text: "text-gray-900" },
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
  
  // 삭제 관련 상태
  const [deleting, setDeleting] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState("");
  const [deleteEndDate, setDeleteEndDate] = useState("");
  const [deleteDept, setDeleteDept] = useState<string>("all");
  const [deletedCount, setDeletedCount] = useState(0);
  
  // CSV 파일 입력 ref
  const csvFileInputRef = useRef<HTMLInputElement>(null);

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
    if (!file) return;

    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith('.csv') && fileType !== 'text/csv' && fileType !== 'application/vnd.ms-excel') {
      toast.error("CSV 파일만 업로드 가능합니다");
      return;
    }

    setUploading(true);
    try {
      const events = await parseCSVSchedule(file);
      setParsedEvents(events);
      toast.success(`${events.length}개의 회의 일정을 찾았습니다`);
      // 파일 입력 필드 초기화
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error parsing CSV:", error);
      toast.error("CSV 파싱에 실패했습니다");
      // 에러 시에도 파일 입력 필드 초기화
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = "";
      }
    } finally {
      setUploading(false);
    }
  };

  const parseCSVSchedule = async (file: File): Promise<MeetingEvent[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const events: MeetingEvent[] = [];
            
            console.log("CSV parsing results:", results.data);
            
            for (const row of results.data as any[]) {
              // CSV 컬럼: 날짜, 부서, 내용
              const date = row['날짜'] || row['date'] || row['Date'];
              const dept = row['부서'] || row['department'] || row['Department'];
              const title = row['내용'] || row['title'] || row['Title'] || row['content'] || row['Content'];
              
              console.log("Processing row:", { date, dept, title });
              
              if (!date || !dept) {
                console.warn("Skipping row with missing data:", row);
                continue;
              }

              // 날짜 형식 변환 (다양한 패턴 지원)
              let dateStr = '';
              const dateTrimmed = String(date).trim();
              const digits = (s: string) => String(s).replace(/\D/g, '');
              const pad2 = (s: string) => s.padStart(2, '0');
              const defaultYear = String(new Date().getFullYear());
              
              if (dateTrimmed.includes('/')) {
                const raw = dateTrimmed.split('/').map(digits).filter(Boolean);
                if (raw.length === 2) {
                  const [m, d] = raw;
                  dateStr = `${defaultYear}-${pad2(m)}-${pad2(d)}`;
                } else if (raw.length >= 3) {
                  const [y, m, d] = raw;
                  const year = y.length === 4 ? y : defaultYear;
                  dateStr = `${year}-${pad2(m)}-${pad2(d)}`;
                }
              } else if (dateTrimmed.includes('.')) {
                const raw = dateTrimmed.split('.').map(digits).filter(Boolean);
                if (raw.length === 2) {
                  const [m, d] = raw;
                  dateStr = `${defaultYear}-${pad2(m)}-${pad2(d)}`;
                } else if (raw.length >= 3) {
                  // 처리 예: 2025.11.12 또는 11.12.(수) 형태
                  const [a, b, c] = raw;
                  const isYearFirst = a.length === 4;
                  const year = isYearFirst ? a : defaultYear;
                  const month = isYearFirst ? b : a;
                  const day = isYearFirst ? c : b;
                  dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
                }
              } else if (/[년월일]/.test(dateTrimmed)) {
                // 한국어 표기: 2025년 11월 12일, 11월 12일 등
                const y = digits(dateTrimmed.match(/(\d{4})\s*년/)?.[1] || '') || defaultYear;
                const m = digits(dateTrimmed.match(/(\d{1,2})\s*월/)?.[1] || '');
                const d = digits(dateTrimmed.match(/(\d{1,2})\s*일/)?.[1] || '');
                if (m && d) dateStr = `${y}-${pad2(m)}-${pad2(d)}`;
              } else if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateTrimmed)) {
                dateStr = dateTrimmed;
              } else {
                console.warn("Unknown date format:", dateTrimmed);
                continue;
              }

              if (!dateStr) {
                console.warn("Failed to parse date:", dateTrimmed);
                continue;
              }

              console.log("Parsed date:", dateStr);

              // 부서 매칭
              const deptCode = String(dept).trim();
              const colorInfo = DEPT_COLORS[deptCode];

              if (!colorInfo) {
                console.warn("Unknown department:", deptCode);
              }

              events.push({
                id: `csv${events.length + 1}`,
                date: dateStr,
                time: "09:00",
                title: String(title || `${deptCode} 회의`).trim(),
                deptCode: deptCode,
                colorId: colorInfo?.colorId || "9"
              });
            }

            console.log("Parsed events:", events);
            
            // 날짜순 정렬
            events.sort((a, b) => a.date.localeCompare(b.date));

            // 연속된 같은 부서 이벤트 병합
            const mergedEvents = mergeContinuousEvents(events);
            console.log("Merged continuous events:", mergedEvents);

            resolve(mergedEvents);
          } catch (error) {
            console.error("CSV parsing error:", error);
            reject(error);
          }
        },
        error: (error) => {
          console.error("Papa parse error:", error);
          reject(error);
        }
      });
    });
  };

  // 연속된 같은 부서 이벤트를 병합하는 함수
  const mergeContinuousEvents = (events: MeetingEvent[]): MeetingEvent[] => {
    if (events.length === 0) return events;

    const merged: MeetingEvent[] = [];
    let currentGroup: MeetingEvent | null = null;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      if (!currentGroup) {
        // 첫 번째 이벤트 또는 새 그룹 시작
        currentGroup = { ...event };
        continue;
      }

      // 현재 이벤트와 이전 이벤트 비교
      const prevDate = new Date(currentGroup.endDate || currentGroup.date);
      const currDate = new Date(event.date);
      
      // 날짜 차이 계산 (일 단위)
      const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // 같은 부서, 같은 제목, 연속된 날짜인지 확인
      const isSameDept = event.deptCode === currentGroup.deptCode;
      const isSameTitle = event.title === currentGroup.title;
      const isContinuous = dayDiff === 1;

      if (isSameDept && isSameTitle && isContinuous) {
        // 연속된 이벤트이므로 endDate 업데이트
        currentGroup.endDate = event.date;
      } else {
        // 그룹이 끊어졌으므로 현재 그룹을 저장하고 새 그룹 시작
        merged.push(currentGroup);
        currentGroup = { ...event };
      }
    }

    // 마지막 그룹 추가
    if (currentGroup) {
      merged.push(currentGroup);
    }

    return merged;
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
        
        let eventData;
        
        if (event.endDate) {
          // 기간 이벤트 (연속된 날짜) - all-day event로 생성
          const startDate = event.date; // YYYY-MM-DD
          const endDateObj = new Date(event.endDate);
          endDateObj.setDate(endDateObj.getDate() + 1); // Google Calendar는 종료일이 exclusive
          const endDate = endDateObj.toISOString().split('T')[0]; // YYYY-MM-DD
          
          eventData = {
            summary: `[${event.deptCode}] ${event.title}`,
            description: `주간 교직원 회의 - ${event.deptCode} (${event.date} ~ ${event.endDate})`,
            start: {
              date: startDate,
              timeZone: "Asia/Seoul",
            },
            end: {
              date: endDate,
              timeZone: "Asia/Seoul",
            },
            colorId: event.colorId,
          };
        } else {
          // 단일 이벤트 - 시간 지정 이벤트로 생성
          const [year, month, day] = event.date.split('-').map(Number);
          const [hours, minutes] = event.time.split(':').map(Number);
          
          const startDateTime = new Date(year, month - 1, day, hours, minutes, 0);
          
          // 날짜 유효성 검사
          if (isNaN(startDateTime.getTime())) {
            console.error("Invalid date:", event.date, event.time);
            throw new Error(`잘못된 날짜 형식: ${event.date}`);
          }
          
          const endDateTime = new Date(startDateTime);
          endDateTime.setHours(endDateTime.getHours() + 1);

          eventData = {
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
          };
        }

        const { error } = await supabase.functions.invoke("google-calendar", {
          body: {
            action: "create",
            calendarId: targetCalendarId,
            event: eventData,
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

  const handleBulkDelete = async () => {
    if (!calendarId) {
      toast.error("캘린더 ID를 입력해주세요");
      return;
    }

    if (!deleteStartDate || !deleteEndDate) {
      toast.error("삭제할 기간을 선택해주세요");
      return;
    }

    setDeleting(true);
    setDeletedCount(0);

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

      // 기간 내 일정 조회
      const startISO = new Date(`${deleteStartDate}T00:00:00`).toISOString();
      const endISO = new Date(`${deleteEndDate}T23:59:59`).toISOString();

      const { data: listResult, error: listError } = await supabase.functions.invoke("google-calendar", {
        body: {
          action: "list",
          calendarId: targetCalendarId,
          timeMin: startISO,
          timeMax: endISO,
        },
      });

      if (listError) throw listError;

      const eventsToDelete = listResult.items || [];
      console.log("Found events:", eventsToDelete.length);

      // 부서 필터링 (선택된 경우)
      const filteredEvents = deleteDept && deleteDept !== "all"
        ? eventsToDelete.filter((e: any) => 
            e.summary?.includes(`[${deleteDept}]`)
          )
        : eventsToDelete;

      console.log("Filtered events:", filteredEvents.length);

      if (filteredEvents.length === 0) {
        toast.info("삭제할 일정이 없습니다");
        return;
      }

      // 일정 삭제
      for (let i = 0; i < filteredEvents.length; i++) {
        const event = filteredEvents[i];
        
        const { error } = await supabase.functions.invoke("google-calendar", {
          body: {
            action: "delete",
            calendarId: targetCalendarId,
            eventId: event.id,
          },
        });

        if (error) {
          console.error("Delete error:", error);
          continue;
        }

        setDeletedCount(i + 1);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      toast.success(`${filteredEvents.length}개의 일정이 삭제되었습니다`);
      setDeleteStartDate("");
      setDeleteEndDate("");
      setDeleteDept("all");
    } catch (error) {
      console.error("Error deleting events:", error);
      toast.error(`일정 삭제 중 오류 발생 (${deletedCount} 완료)`);
    } finally {
      setDeleting(false);
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
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-destructive">
            <Trash2 className="w-4 h-4" />
            일정 일괄 삭제
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            특정 기간 및 부서의 회의 일정을 삭제합니다. 삭제 후 재등록하세요.
          </p>
          
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">시작일</Label>
                <Input
                  type="date"
                  value={deleteStartDate}
                  onChange={(e) => setDeleteStartDate(e.target.value)}
                  disabled={deleting}
                />
              </div>
              <div>
                <Label className="text-xs">종료일</Label>
                <Input
                  type="date"
                  value={deleteEndDate}
                  onChange={(e) => setDeleteEndDate(e.target.value)}
                  disabled={deleting}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">부서 (선택사항)</Label>
              <Select value={deleteDept} onValueChange={setDeleteDept} disabled={deleting}>
                <SelectTrigger>
                  <SelectValue placeholder="전체 부서" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 부서</SelectItem>
                  {Object.keys(DEPT_COLORS).map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept} ({DEPT_COLORS[dept].label})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {deleting && (
              <div className="text-sm text-muted-foreground">
                삭제 중: {deletedCount}개 완료
              </div>
            )}

            <Button
              onClick={handleBulkDelete}
              disabled={deleting || !calendarId || !deleteStartDate || !deleteEndDate}
              variant="destructive"
              className="w-full"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  삭제 중... ({deletedCount})
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  선택한 기간의 일정 삭제
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-3">PDF 파일로 일괄 등록</h3>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="csvFile">주간 회의자료 CSV 파일</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                disabled={uploading || loading}
                ref={csvFileInputRef}
                placeholder="연도-월-일.csv"
              />
              <p className="text-xs text-muted-foreground">
                CSV 형식: 날짜, 부서, 내용 (헤더 포함)
              </p>
              {uploading && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  CSV 파싱 중...
                </p>
              )}
            </div>

            {parsedEvents.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>{parsedEvents.length}개의 회의 일정이 준비되었습니다</span>
                </div>
                
                <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                  <TooltipProvider>
                    {parsedEvents.map((event, index) => {
                      const colorInfo = DEPT_COLORS[event.deptCode];
                      return (
                        <Tooltip key={index}>
                          <TooltipTrigger asChild>
                            <div 
                              className={`text-sm p-2 rounded-md cursor-help ${colorInfo?.bg || 'bg-muted'} ${colorInfo?.text || 'text-foreground'}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {event.endDate 
                                    ? `${event.date} ~ ${event.endDate}` 
                                    : event.date
                                  }
                                </span>
                                <span className="font-medium px-2 py-0.5 rounded text-xs bg-white/50">
                                  {event.deptCode}
                                </span>
                              </div>
                              <div className="mt-1 truncate">{event.title}</div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-sm">
                            <div className="space-y-1">
                              <div className="font-semibold">
                                {event.endDate 
                                  ? `${event.date} ~ ${event.endDate}` 
                                  : `${event.date} ${event.time}`
                                }
                              </div>
                              <div className="text-xs text-muted-foreground">{event.deptCode} ({colorInfo?.label})</div>
                              <div className="mt-2">{event.title}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </TooltipProvider>
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
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyMeetingUpload;
