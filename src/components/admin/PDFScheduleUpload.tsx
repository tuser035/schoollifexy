import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";

interface ParsedEvent {
  title: string;
  department: string;
}

const PDFScheduleUpload = () => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".csv")) {
      toast.error("CSV 파일만 업로드 가능합니다");
      return;
    }

    setUploading(true);
    try {
      const events = await parseCSVSchedule(file);
      setParsedEvents(events);
      toast.success(`${events.length}개의 일정을 찾았습니다`);
    } catch (error) {
      console.error("Error parsing CSV:", error);
      toast.error("CSV 파싱에 실패했습니다");
    } finally {
      setUploading(false);
    }
  };

  const parseCSVSchedule = async (file: File): Promise<ParsedEvent[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const events: ParsedEvent[] = [];
            const data = results.data as string[][];
            
            // Skip header row if exists
            const startIndex = data[0]?.[0]?.includes("제목") ? 1 : 0;
            
            for (let i = startIndex; i < data.length; i++) {
              const row = data[i];
              if (row.length >= 2 && row[0] && row[1]) {
                events.push({
                  title: row[0].trim(),
                  department: row[1].trim()
                });
              }
            }
            
            resolve(events);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
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
        
        const { error } = await supabase.functions.invoke("google-calendar", {
          body: {
            action: "create",
            calendarId: targetCalendarId,
            event: {
              summary: `[${event.department}] ${event.title}`,
              description: `제목: ${event.title}\n발신부서: ${event.department}`,
            },
          },
        });

        if (error) {
          console.error(`Error creating event ${event.title}:`, error);
        } else {
          setUploadedCount(i + 1);
        }
      }

      toast.success(`${parsedEvents.length}개의 일정이 캘린더에 등록되었습니다`);
      setParsedEvents([]);
      setUploadedCount(0);
    } catch (error) {
      console.error("Error uploading events:", error);
      toast.error("일정 등록 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>에듀파인 문서 업로드</CardTitle>
        <CardDescription>
          CSV 파일에서 제목과 발신부서를 추출하여 구글 캘린더에 일괄 등록합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="calendar-id">캘린더 ID</Label>
          <Input
            id="calendar-id"
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            placeholder="에듀파인 문서를 csv 파일을 업로드하세요"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="csv-upload">에듀파인 문서 CSV 파일</Label>
          <Input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={uploading || loading}
          />
        </div>

        {parsedEvents.length > 0 && (
          <div className="space-y-2">
            <Label>파싱된 일정 ({parsedEvents.length}개)</Label>
            <div className="max-h-60 overflow-y-auto space-y-2 p-3 border rounded-md bg-muted/50">
              {parsedEvents.map((event, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Calendar className="w-4 h-4 mt-0.5 text-primary" />
                  <div>
                    <span className="font-medium">{event.title}</span>
                    <div className="text-muted-foreground">
                      발신부서: {event.department}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {parsedEvents.length > 0 && (
          <Button 
            onClick={handleBatchUpload} 
            disabled={loading || uploading || !calendarId}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                일괄 등록 중 ({uploadedCount}/{parsedEvents.length})
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                일괄 등록
              </>
            )}
          </Button>
        )}

        {uploadedCount > 0 && uploadedCount === parsedEvents.length && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-primary/10 text-primary">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">
              {uploadedCount}개의 일정이 성공적으로 등록되었습니다
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PDFScheduleUpload;
