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

      // 코드펜스(```...) 및 빈 줄 제거 후 헤더 라인 결정
      const lines = cleanedText.split(/\r?\n/);
      const filteredLines = lines.filter((l) => {
        const t = l.trim();
        return t && !t.startsWith('```');
      });

      // 구분자 자동 추론 (콤마, 세미콜론, 탭, 파이프)
      const headerLine = filteredLines[0] || '';
      const counts = {
        ',': (headerLine.match(/,/g) || []).length,
        ';': (headerLine.match(/;/g) || []).length,
        '\t': (headerLine.match(/\t/g) || []).length,
        '|': (headerLine.match(/\|/g) || []).length,
      } as Record<string, number>;
      const delimiter = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ',';
      console.log('추론된 구분자:', JSON.stringify(counts), '=>', JSON.stringify(delimiter));

      const finalText = filteredLines.join('\n');
      
      Papa.parse(finalText, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        delimiter,
        transformHeader: (h: string) => h.replace(/^\uFEFF/, '').replace(/^"+|"+$/g, '').trim(),
        complete: (results) => {
          try {
            console.log('CSV 파싱 결과:', results);
            console.log('첫 번째 row:', results.data[0]);
            
            const events: EdufineEvent[] = results.data.map((row: any, idx: number) => {
              // 키 정규화 맵 구성 (공백/언더스코어 제거, 소문자)
              const normalizeKey = (k: string) => k?.toString().trim().toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
              const nk = new Map<string, any>(Object.entries(row).map(([k, v]) => [normalizeKey(k), v]));
              const pick = (...keys: string[]) => {
                for (const k of keys) {
                  const raw = row[k];
                  if (raw !== undefined && raw !== null && String(raw).trim() !== '') return String(raw);
                  const alt = nk.get(normalizeKey(k));
                  if (alt !== undefined && alt !== null && String(alt).trim() !== '') return String(alt);
                }
                return '';
              };

              const department = pick('dept', '발신부서', 'department');
              const deptColor = getDeptColor(department);
              
              // 날짜/제목/문서번호
              const receiptDate = pick('rcv_date', 'rcvdate', '접수일', 'receiptdate');
              const deadline = pick('due', '마감일', 'deadline');
              const title = pick('subj', '제목', 'title');
              const docNumber = pick('doc_no', 'docnumber', '생산문서번호', '문서번호');

              // 첨부파일: att1~att5 + 붙임파일/붙임파일명
              const attachments: string[] = [];
              const combined = pick('붙임파일', '붙임파일명', 'attachments');
              if (combined) {
                combined
                  .split(/[;,.|\n\t\r\f\u00B7/]+/)
                  .map((a) => a.trim())
                  .filter((a) => a.length > 0)
                  .slice(0, 5)
                  .forEach((a) => attachments.push(a));
              }
              ['att1', 'att2', 'att3', 'att4', 'att5', '붙임파일1', '붙임파일2', '붙임파일3', '붙임파일4', '붙임파일5'].forEach((k) => {
                const v = pick(k);
                if (v) attachments.push(v.trim());
              });

              console.log(`파싱된 행 ${idx}:`, { receiptDate, deadline, department, title, docNumber, attachments });

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
    if (!dateStr) return null;
    let s = String(dateStr).trim();
    if (!s || s === 'N/A') return null;

    try {
      // 불필요한 설명/괄호/접미어 제거 후 공백 정규화
      s = s
        .replace(/\([^)]*\)/g, ' ') // 괄호 제거
        .replace(/까지|부터|제출|마감|~|to/gi, ' ') // 접미어 제거
        .replace(/년|월|일|\.|\//g, ' ') // 구분자 통일
        .replace(/\s+/g, ' ') // 다중 공백 축약
        .trim();

      // 1) YYYY M D (임의 구분자) 패턴
      let m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        const dt = new Date(y, mo - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
      }

      // 2) YYYYMMDD 압축 패턴
      m = s.match(/(\d{4})(\d{2})(\d{2})/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        const dt = new Date(y, mo - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
      }

      // 3) YY M D (임의 구분자) → 2000년대 가정
      m = s.match(/(^|\D)(\d{2})\D+(\d{1,2})\D+(\d{1,2})(\D|$)/);
      if (m) {
        const y = 2000 + Number(m[2]);
        const mo = Number(m[3]);
        const d = Number(m[4]);
        const dt = new Date(y, mo - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
      }

      // 4) 년도 없이 MM D → 올해로 가정
      m = s.match(/(^|\D)(\d{1,2})\D+(\d{1,2})(\D|$)/);
      if (m) {
        const year = new Date().getFullYear();
        const mo = Number(m[2]);
        const d = Number(m[3]);
        const dt = new Date(year, mo - 1, d);
        return isNaN(dt.getTime()) ? null : dt;
      }

      return null;
    } catch (e) {
      console.error('parseKoreanDate error:', e, dateStr);
      return null;
    }
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

      // Google Calendar ID 정규화 (URL 붙여넣을 경우 src 파라미터 추출)
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

      for (const event of parsedEvents) {
        try {
          console.log('처리 중인 이벤트:', {
            title: event.title,
            department: event.department,
            colorId: event.colorId,
            receiptDate: event.receiptDate,
            deadline: event.deadline
          });
          
          // 날짜 파싱 (접수일 우선, 없으면 마감일 사용)
          const receiptDate = parseKoreanDate(event.receiptDate) || parseKoreanDate(event.deadline);
          const deadlineDate = parseKoreanDate(event.deadline);

          if (!receiptDate) {
            console.warn(`날짜 파싱 실패, 스킵: ${event.title} | 접수일: ${event.receiptDate} | 마감일: ${event.deadline}`);
            skipCount++;
            continue;
          }

          // 마감일이 있으면 마감일을 종료일로, 없으면 접수일과 같은 날로
          const endDate = deadlineDate || receiptDate;

          const eventData = {
            summary: event.department ? `[${event.department}] ${event.title || '(제목 없음)'}` : (event.title || '(제목 없음)'),
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

          console.log('전송할 이벤트 데이터:', {
            summary: eventData.summary,
            colorId: eventData.colorId,
            department: event.department
          });

          const { data, error } = await supabase.functions.invoke('google-calendar', {
            body: {
              action: 'create',
              calendarId: targetCalendarId,
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
                      <div className="font-medium">
                        [{event.department}] {event.title}
                        <span className="text-xs ml-2 opacity-70">(색상ID: {event.colorId})</span>
                      </div>
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
