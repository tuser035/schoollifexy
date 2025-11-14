import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Loader2, Upload, CheckCircle2, Trash2, Download, X, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
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
  경상북도교육청: { colorId: "3", bg: "bg-purple-50", text: "text-purple-900" },
  경북지사: { colorId: "6", bg: "bg-orange-50", text: "text-orange-900" },
  시청자미디어재단: { colorId: "5", bg: "bg-yellow-50", text: "text-yellow-900" },
  한양대학교: { colorId: "10", bg: "bg-green-50", text: "text-green-900" },
  로보그램코딩교육센터: { colorId: "9", bg: "bg-blue-50", text: "text-blue-900" },
  포항시: { colorId: "1", bg: "bg-indigo-50", text: "text-indigo-900" },
  한국산업인력공단: { colorId: "3", bg: "bg-purple-50", text: "text-purple-900" },
  기타: { colorId: "4", bg: "bg-pink-50", text: "text-pink-900" },
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
  
  // 필터 상태
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterKeyword, setFilterKeyword] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  
  // 정렬 상태
  const [sortColumn, setSortColumn] = useState<'department' | 'title' | 'receiptDate' | 'deadline' | 'docNumber' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const getDeptColor = (dept: string): { colorId: string; bg: string; text: string } => {
    // 부서명에 키워드가 포함되어 있으면 해당 색상 반환
    for (const [key, value] of Object.entries(DEPT_COLORS)) {
      if (dept.includes(key)) {
        return value;
      }
    }
    return DEPT_COLORS["기타"];
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setFilterDept("all");
    setFilterKeyword("");
    setFilterStartDate("");
    setFilterEndDate("");
    setCurrentPage(1);
  };

  // 정렬 핸들러
  const handleSort = (column: 'department' | 'title' | 'receiptDate' | 'deadline' | 'docNumber') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // 필터링된 이벤트 계산
  const filteredEvents = useMemo(() => {
    let filtered = parsedEvents.filter(event => {
      // 발신부서 필터
      if (filterDept !== "all" && !event.department.includes(filterDept)) {
        return false;
      }

      // 키워드 필터 (제목, 문서번호, 첨부파일명에서 검색)
      if (filterKeyword) {
        const keyword = filterKeyword.toLowerCase();
        const matchesTitle = event.title?.toLowerCase().includes(keyword);
        const matchesDocNumber = event.docNumber?.toLowerCase().includes(keyword);
        const matchesAttachments = event.attachments.some(att => 
          att.toLowerCase().includes(keyword)
        );
        if (!matchesTitle && !matchesDocNumber && !matchesAttachments) {
          return false;
        }
      }

      // 날짜 범위 필터 (접수일 기준)
      if (filterStartDate || filterEndDate) {
        const receiptDate = parseKoreanDate(event.receiptDate);
        if (receiptDate) {
          if (filterStartDate) {
            const startDate = new Date(filterStartDate);
            if (receiptDate < startDate) return false;
          }
          if (filterEndDate) {
            const endDate = new Date(filterEndDate);
            endDate.setHours(23, 59, 59, 999);
            if (receiptDate > endDate) return false;
          }
        }
      }

      return true;
    });

    // 정렬 적용
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal, bVal;
        
        switch (sortColumn) {
          case 'department':
            aVal = a.department || '';
            bVal = b.department || '';
            break;
          case 'title':
            aVal = a.title || '';
            bVal = b.title || '';
            break;
          case 'receiptDate':
            aVal = parseKoreanDate(a.receiptDate)?.getTime() || 0;
            bVal = parseKoreanDate(b.receiptDate)?.getTime() || 0;
            break;
          case 'deadline':
            aVal = parseKoreanDate(a.deadline)?.getTime() || 0;
            bVal = parseKoreanDate(b.deadline)?.getTime() || 0;
            break;
          case 'docNumber':
            aVal = a.docNumber || '';
            bVal = b.docNumber || '';
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [parsedEvents, filterDept, filterKeyword, filterStartDate, filterEndDate, sortColumn, sortDirection]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage]);

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
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const events: EdufineEvent[] = results.data.map((row: any, idx: number) => {
              // 키 정규화 함수
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
              
              const receiptDate = pick('rcv_date', 'rcvdate', '접수일', 'receiptdate');
              const deadline = pick('due', '마감일', 'deadline');
              const title = pick('subj', '제목', 'title');
              const docNumber = pick('doc_no', 'docnumber', '생산문서번호', '문서번호');
              
              // 첨부파일
              const attachments: string[] = [];
              
              // 붙임파일명 컬럼 먼저 처리
              const combined = pick('붙임파일명', '붙임파일', 'attachments', 'att1');
              if (combined) {
                const parts = combined.split(/[;,.\n\t\r\f\u00B7]+/).map(a => a.trim()).filter(a => a.length > 0);
                parts.forEach(a => {
                  if (a && !attachments.includes(a)) {
                    attachments.push(a);
                  }
                });
              }
              
              // 나머지 붙임파일명2, 3, 4, 5 처리
              ['붙임파일명2', '붙임파일명3', '붙임파일명4', '붙임파일명5', 'att2', 'att3', 'att4', 'att5'].forEach((k) => {
                const v = pick(k);
                if (v && v.trim() && !attachments.includes(v.trim())) {
                  attachments.push(v.trim());
                }
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
          console.error('CSV 파싱 오류:', error);
          reject(error);
        },
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
          
          // 날짜 파싱 (접수일 기준)
          const receiptDate = parseKoreanDate(event.receiptDate);
          const deadlineDate = parseKoreanDate(event.deadline);

          if (!receiptDate) {
            console.warn(`접수일 파싱 실패, 스킵: ${event.title} | 접수일: ${event.receiptDate}`);
            skipCount++;
            continue;
          }

          // 제목에 마감일 추가
          const deadlineText = deadlineDate ? ` (마감: ${format(deadlineDate, 'MM/dd')})` : '';
          const summary = event.department 
            ? `[${event.department}] ${event.title || '(제목 없음)'}${deadlineText}`
            : `${event.title || '(제목 없음)'}${deadlineText}`;

          const eventData = {
            summary,
            description: `생산문서번호: ${event.docNumber || '-'}\n접수일: ${event.receiptDate || '-'}\n마감일: ${event.deadline || '-'}\n\n붙임파일:\n${event.attachments.length > 0 ? event.attachments.map((a, i) => `${i + 1}. ${a}`).join('\n') : '없음'}`,
            start: {
              date: format(receiptDate, 'yyyy-MM-dd'),
              timeZone: 'Asia/Seoul',
            },
            end: {
              date: format(new Date(receiptDate.getTime() + 86400000), 'yyyy-MM-dd'), // 접수일 기준 다음날 (전일 이벤트)
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

  const handleExportCSV = () => {
    if (filteredEvents.length === 0) {
      toast.error("내보낼 데이터가 없습니다");
      return;
    }

    try {
      // CSV 데이터 생성 (필터링된 데이터 사용)
      const csvData = filteredEvents.map(event => ({
        '발신부서': event.department,
        '제목': event.title,
        '접수일': event.receiptDate,
        '마감일': event.deadline,
        '문서번호': event.docNumber,
        '첨부파일': event.attachments.join('; '),
      }));

      // Papa.unparse를 사용하여 CSV 문자열 생성
      const csv = Papa.unparse(csvData, {
        quotes: true,
        delimiter: ',',
        header: true,
      });

      // BOM 추가 (한글 깨짐 방지)
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
      
      // 다운로드 링크 생성
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `에듀파인_파싱데이터_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('CSV 파일이 다운로드되었습니다');
    } catch (error) {
      console.error('CSV 내보내기 오류:', error);
      toast.error('CSV 내보내기 중 오류가 발생했습니다');
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>파싱된 일정 ({parsedEvents.length}개)</Label>
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV 다운로드
                </Button>
              </div>

              {/* 필터 UI */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">필터</Label>
                  <Button
                    onClick={handleResetFilters}
                    variant="ghost"
                    size="sm"
                    className="h-8"
                  >
                    <X className="w-4 h-4 mr-1" />
                    초기화
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">발신부서</Label>
                    <Select value={filterDept} onValueChange={setFilterDept}>
                      <SelectTrigger>
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        {Object.keys(DEPT_COLORS).filter(d => d !== "기타").map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">키워드 검색</Label>
                    <Input
                      placeholder="제목, 문서번호, 첨부파일"
                      value={filterKeyword}
                      onChange={(e) => setFilterKeyword(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">접수일 시작</Label>
                    <Input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">접수일 종료</Label>
                    <Input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 필터링 결과 표시 */}
              <div className="text-sm text-muted-foreground">
                {filteredEvents.length !== parsedEvents.length && (
                  <span>필터링 결과: {filteredEvents.length}개 / 전체 {parsedEvents.length}개</span>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort('department')}
                        >
                          발신부서
                          {sortColumn === 'department' ? (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          ) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[200px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort('title')}
                        >
                          제목
                          {sortColumn === 'title' ? (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          ) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[100px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort('receiptDate')}
                        >
                          접수일
                          {sortColumn === 'receiptDate' ? (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          ) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[100px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort('deadline')}
                        >
                          마감일
                          {sortColumn === 'deadline' ? (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          ) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[150px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleSort('docNumber')}
                        >
                          문서번호
                          {sortColumn === 'docNumber' ? (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          ) : <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />}
                        </Button>
                      </TableHead>
                      <TableHead className="w-[200px]">첨부파일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEvents.map((event) => {
                      const deptColor = getDeptColor(event.department);
                      return (
                        <TableRow key={event.id}>
                          <TableCell className={`font-medium ${deptColor.bg} ${deptColor.text}`}>
                            {event.department}
                          </TableCell>
                          <TableCell>{event.title || '(제목 없음)'}</TableCell>
                          <TableCell className="text-sm">{event.receiptDate || '-'}</TableCell>
                          <TableCell className="text-sm">{event.deadline || '-'}</TableCell>
                          <TableCell className="text-sm">{event.docNumber || '-'}</TableCell>
                          <TableCell className="text-xs">
                            {event.attachments.length > 0 ? (
                              <div className="space-y-1">
                                {event.attachments.slice(0, 2).map((att, idx) => (
                                  <div key={idx} className="truncate">{att}</div>
                                ))}
                                {event.attachments.length > 2 && (
                                  <div className="text-muted-foreground">외 {event.attachments.length - 2}개</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">없음</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                  <div className="text-sm text-muted-foreground">
                    {currentPage} / {totalPages} 페이지 (전체 {filteredEvents.length}개)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      이전
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      다음
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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
