import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Loader2, Upload, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Papa from 'papaparse';
import { format, parse } from 'date-fns';

interface EdufineEvent {
  id: string;
  receiptDate: string; // 접수일
  deadline: string; // 마감일
  department: string; // 발신부서
  title: string; // 제목
  docNumber: string; // 생산문서번호
  attachments: string[]; // 붙임파일명들
  colorId: string;
}

// 발신부서별 색상 매핑
const DEPT_COLORS: Record<string, { colorId: string; bg: string; text: string }> = {
  경상북도교육청: { colorId: "11", bg: "bg-red-200", text: "text-red-900" },
  경북지사: { colorId: "6", bg: "bg-orange-200", text: "text-orange-900" },
  시청자미디어재단: { colorId: "5", bg: "bg-yellow-200", text: "text-yellow-900" },
  한양대학교: { colorId: "10", bg: "bg-green-200", text: "text-green-900" },
  로보그램코딩교육센터: { colorId: "9", bg: "bg-blue-200", text: "text-blue-900" },
  포항시: { colorId: "1", bg: "bg-indigo-200", text: "text-indigo-900" },
  한국산업인력공단: { colorId: "3", bg: "bg-purple-200", text: "text-purple-900" },
  기타: { colorId: "4", bg: "bg-pink-200", text: "text-pink-900" },
};

const EdufineUpload = () => {
  const [loading, setLoading] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [parsedEvents, setParsedEvents] = useState<EdufineEvent[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState("");
  const [deleteEndDate, setDeleteEndDate] = useState("");
  const [deleteDept, setDeleteDept] = useState<string>("all");
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const getDeptColor = (dept: string): { colorId: string; bg: string; text: string } => {
    // 부서명에 키워드가 포함되어 있으면 해당 색상 반환
    for (const [key, value] of Object.entries(DEPT_COLORS)) {
      if (dept.includes(key)) {
        return value;
      }
    }
    return DEPT_COLORS["기타"];
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("CSV 파일만 업로드 가능합니다");
      return;
    }

    setSelectedFileName(file.name);
    setLoading(true);

    try {
      // ArrayBuffer로 읽어서 인코딩 처리
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      const decodeWith = (enc: string) => {
        try {
          return new TextDecoder(enc).decode(uint8);
        } catch {
          return '';
        }
      };

      let text = decodeWith('utf-8');
      const looksValid = /접수일|발신부서|제목|생산문서번호|rcv_date|dept|subj|doc_no/.test(text);
      if (!looksValid) {
        const alt = decodeWith('euc-kr');
        if (alt) text = alt;
      }

      console.log("파일 내용 (첫 200자):", text.substring(0, 200));
      const parsed = await parseCSVSchedule(text);
      console.log("파싱 완료, 이벤트 개수:", parsed.length);
      setParsedEvents(parsed);
      toast.success(`${parsed.length}개의 일정을 불러왔습니다`);
    } catch (error) {
      console.error("File read error:", error);
      toast.error("파일 읽기 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const parseCSVSchedule = async (csvText: string): Promise<EdufineEvent[]> => {
    return new Promise((resolve, reject) => {
      // UTF-8 BOM 제거
      const cleanedText = csvText.replace(/^\uFEFF/, '');
      
      Papa.parse(cleanedText, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          try {
            console.log('CSV 파싱 결과:', results);
            console.log('첫 번째 row:', results.data[0]);
            
            const events: EdufineEvent[] = results.data.map((row: any, idx: number) => {
              // 한글/영문 컬럼명 모두 지원
              const department = row['발신부서'] || row['dept'] || '';
              const deptColor = getDeptColor(department);
              
              // 붙임파일명을 세미콜론이나 마침표로 분리
              const attachmentStr = row['붙임파일명'] || row['att1'] || '';
              const attachments = attachmentStr
                .split(/[;.]/)
                .map((a: string) => a.trim())
                .filter((a: string) => a.length > 0)
                .slice(0, 5); // 최대 5개까지
              
              // 추가 붙임파일들도 처리
              [row['att2'], row['att3'], row['att4'], row['att5']].forEach(att => {
                if (att && att.trim()) {
                  attachments.push(att.trim());
                }
              });

              const receiptDate = row['접수일'] || row['rcv_date'] || '';
              const deadline = row['마감일'] || row['due'] || '';
              const title = row['제목'] || row['subj'] || '';
              const docNumber = row['생산문서번호'] || row['문서번호'] || row['doc_no'] || '';

              console.log(`파싱된 행 ${idx}:`, {
                receiptDate,
                deadline,
                department,
                title,
                docNumber,
                attachments
              });

              return {
                id: `edufine-${idx}`,
                receiptDate,
                deadline,
                department,
                title,
                docNumber,
                attachments,
                colorId: deptColor.colorId,
              };
            });

            console.log('파싱된 이벤트:', events);
            resolve(events);
          } catch (error) {
            console.error('CSV 파싱 오류:', error);
            reject(error);
          }
        },
        error: (error) => {
          console.error('Papa.parse 오류:', error);
          reject(error);
        }
      });
    });
  };

  const parseKoreanDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr === 'N/A' || dateStr.trim() === '') return null;
    
    try {
      // "2025. 5. 2.(금)까지" 같은 형식에서 괄호와 텍스트 제거
      let cleaned = dateStr.replace(/\([^)]*\)/g, '').replace(/까지/g, '').trim();
      
      // 공백 제거하고 점을 하이픈으로 변경
      cleaned = cleaned.replace(/\s+/g, '').replace(/\./g, '-');
      
      // "2025-4-22-" 형식에서 마지막 하이픈 제거
      cleaned = cleaned.replace(/-+$/, '');
      
      console.log("날짜 파싱:", dateStr, "->", cleaned);
      
      const match = cleaned.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match) {
        const [, year, month, day] = match;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        console.log("파싱된 날짜:", date);
        
        // 유효한 날짜인지 확인
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      console.warn("날짜 매칭 실패:", cleaned);
    } catch (error) {
      console.error("Date parsing error:", error, dateStr);
    }
    return null;
  };

  const handleBatchUpload = async () => {
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
      let successCount = 0;
      let skipCount = 0;

      for (const event of parsedEvents) {
        try {
          console.log('처리 중인 이벤트:', event);
          
          // 필수 필드 검증
          if (!event.title || event.title.trim() === '') {
            console.warn(`제목이 비어있음, 스킵:`, event);
            skipCount++;
            continue;
          }

          const receiptDate = parseKoreanDate(event.receiptDate);
          const deadlineDate = parseKoreanDate(event.deadline);

          if (!receiptDate) {
            console.warn(`접수일 파싱 실패, 스킵: ${event.title}, 접수일: ${event.receiptDate}`);
            skipCount++;
            continue;
          }

          // 마감일이 있으면 마감일을 종료일로, 없으면 접수일과 같은 날로
          const endDate = deadlineDate || receiptDate;

          const eventData = {
            summary: event.department ? `[${event.department}] ${event.title}` : event.title,
            description: `생산문서번호: ${event.docNumber || '-'}\n접수일: ${event.receiptDate || '-'}\n마감일: ${event.deadline || '-'}\n\n붙임파일:\n${event.attachments.length > 0 ? event.attachments.map((a, i) => `${i + 1}. ${a}`).join('\n') : '없음'}`,
            start: {
              date: format(receiptDate, 'yyyy-MM-dd'),
              timeZone: 'Asia/Seoul',
            },
            end: {
              date: format(new Date(endDate.getTime() + 86400000), 'yyyy-MM-dd'), // 다음날
              timeZone: 'Asia/Seoul',
            },
            colorId: event.colorId,
          };

          console.log('전송할 이벤트 데이터:', eventData);

          const { data, error } = await supabase.functions.invoke('google-calendar', {
            body: {
              action: 'create',
              calendarId: calendarId,
              event: eventData,
            },
          });

          if (error) {
            console.error(`업로드 실패 (${event.title}):`, error);
            skipCount++;
          } else {
            console.log(`업로드 성공: ${event.title}`);
            successCount++;
            setUploadedCount(successCount);
          }

          // API rate limit 방지를 위한 짧은 대기
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`이벤트 생성 오류 (${event.title}):`, error);
          skipCount++;
        }
      }

      const message = skipCount > 0 
        ? `${successCount}개 등록 완료, ${skipCount}개 스킵됨` 
        : `${successCount}개의 일정이 구글 캘린더에 등록되었습니다`;
      
      toast.success(message);
      setParsedEvents([]);
      setSelectedFileName("");
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Batch upload error:", error);
      toast.error("일괄 업로드 중 오류가 발생했습니다");
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
      toast.error("시작일과 종료일을 모두 입력해주세요");
      return;
    }

    setDeleting(true);

    try {
      const startDate = new Date(deleteStartDate);
      const endDate = new Date(deleteEndDate);
      endDate.setHours(23, 59, 59, 999);

      const { data: eventsData, error: listError } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'list',
          calendarId: calendarId,
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
        },
      });

      if (listError) {
        console.error("일정 조회 오류:", listError);
        toast.error("일정 조회 중 오류가 발생했습니다");
        return;
      }

      const events = eventsData?.items || [];
      let filteredEvents = events;

      if (deleteDept !== "all") {
        filteredEvents = events.filter((event: any) => 
          event.summary?.includes(`[${deleteDept}]`)
        );
      }

      let deletedCount = 0;
      for (const event of filteredEvents) {
        try {
          const { error: deleteError } = await supabase.functions.invoke('google-calendar', {
            body: {
              action: 'delete',
              calendarId: calendarId,
              eventId: event.id,
            },
          });

          if (!deleteError) {
            deletedCount++;
          }

          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          console.error("이벤트 삭제 오류:", error);
        }
      }

      toast.success(`${deletedCount}개의 일정이 삭제되었습니다`);
      setDeleteStartDate("");
      setDeleteEndDate("");
      setDeleteDept("all");
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("일괄 삭제 중 오류가 발생했습니다");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>일괄 삭제</CardTitle>
          <CardDescription>특정 기간의 일정을 일괄 삭제합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label>삭제 시작일</Label>
              <Input
                type="date"
                value={deleteStartDate}
                onChange={(e) => setDeleteStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>삭제 종료일</Label>
              <Input
                type="date"
                value={deleteEndDate}
                onChange={(e) => setDeleteEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label>발신부서 필터</Label>
              <select
                className="w-full p-2 border rounded"
                value={deleteDept}
                onChange={(e) => setDeleteDept(e.target.value)}
              >
                <option value="all">전체</option>
                {Object.keys(DEPT_COLORS).map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
          <Button
            onClick={handleBulkDelete}
            disabled={deleting}
            variant="destructive"
            className="w-full"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                삭제 중...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                일괄 삭제
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>에듀파인 문서 일괄 등록</CardTitle>
          <CardDescription>CSV 파일을 업로드하여 구글 캘린더에 일괄 등록합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="calendarId">
              구글 캘린더 ID
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-1 text-xs text-muted-foreground cursor-help">(?)</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>구글 캘린더 설정에서 확인 가능합니다</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="calendarId"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              placeholder="example@group.calendar.google.com"
            />
          </div>

          <div>
            <Label>CSV 파일 업로드</Label>
            <div className="flex gap-2">
              <Input
                ref={csvFileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="flex-1"
              />
            </div>
            {selectedFileName && (
              <p className="text-sm text-muted-foreground mt-1">
                선택된 파일: {selectedFileName}
              </p>
            )}
          </div>

          {parsedEvents.length > 0 && (
            <div className="space-y-2">
              <Label>파싱된 일정 ({parsedEvents.length}개)</Label>
              <div className="max-h-96 overflow-y-auto space-y-2 border rounded p-4">
                {parsedEvents.map((event) => {
                  const deptColor = getDeptColor(event.department);
                  return (
                    <div
                      key={event.id}
                      className={`p-3 rounded ${deptColor.bg} ${deptColor.text}`}
                    >
                      <div className="font-medium">[{event.department}] {event.title}</div>
                      <div className="text-sm mt-1">
                        접수일: {event.receiptDate} | 마감일: {event.deadline}
                      </div>
                      <div className="text-sm">문서번호: {event.docNumber}</div>
                      {event.attachments.length > 0 && (
                        <div className="text-xs mt-1">
                          첨부: {event.attachments.slice(0, 2).join(', ')}
                          {event.attachments.length > 2 && ` 외 ${event.attachments.length - 2}개`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            onClick={handleBatchUpload}
            disabled={loading || parsedEvents.length === 0}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                업로드 중... ({uploadedCount}/{parsedEvents.length})
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                구글 캘린더에 일괄 등록
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EdufineUpload;
