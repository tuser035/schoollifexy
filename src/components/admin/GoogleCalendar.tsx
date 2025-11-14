import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const GoogleCalendar = () => {
  const [loading, setLoading] = useState(false);
  const [calendarId, setCalendarId] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");

  const handleCreateEvent = async () => {
    if (!calendarId || !eventTitle || !startDateTime || !endDateTime) {
      toast.error("모든 필수 항목을 입력해주세요");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-calendar", {
        body: {
          action: "create",
          calendarId,
          event: {
            summary: eventTitle,
            description: eventDescription,
            start: {
              dateTime: new Date(startDateTime).toISOString(),
              timeZone: "Asia/Seoul",
            },
            end: {
              dateTime: new Date(endDateTime).toISOString(),
              timeZone: "Asia/Seoul",
            },
          },
        },
      });

      if (error) throw error;

      toast.success("일정이 생성되었습니다");
      
      // Reset form
      setEventTitle("");
      setEventDescription("");
      setStartDateTime("");
      setEndDateTime("");
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("일정 생성에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          에듀파인 문서 생성
        </CardTitle>
        <CardDescription>
          학교 일정을 Google Calendar에 추가합니다
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

        <div className="space-y-2">
          <Label htmlFor="eventTitle">일정 제목 *</Label>
          <Input
            id="eventTitle"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="중간고사"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="eventDescription">일정 설명</Label>
          <Textarea
            id="eventDescription"
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
            placeholder="1학년 중간고사"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDateTime">시작 시간 *</Label>
            <Input
              id="startDateTime"
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDateTime">종료 시간 *</Label>
            <Input
              id="endDateTime"
              type="datetime-local"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={handleCreateEvent}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4 mr-2" />
              일정 생성
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GoogleCalendar;
