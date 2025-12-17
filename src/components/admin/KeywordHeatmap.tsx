import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Grid3X3 } from 'lucide-react';

interface KeywordHeatmapProps {
  allMessages: Array<{
    student_id: string;
    student_name: string;
    student_grade: number;
    student_class: number;
    student_number: number;
    role: string;
    content: string;
  }>;
  dangerousKeywords: string[];
}

const KeywordHeatmap = ({ allMessages, dangerousKeywords }: KeywordHeatmapProps) => {
  // 학생별 키워드 사용횟수 계산
  const heatmapData = useMemo(() => {
    // 사용자 메시지만 필터링
    const userMessages = allMessages.filter(m => m.role === 'user');
    
    // 학생 목록 생성 (중복 제거)
    const studentsMap = new Map<string, {
      student_id: string;
      student_name: string;
      student_grade: number;
      student_class: number;
      student_number: number;
    }>();
    
    userMessages.forEach(msg => {
      if (!studentsMap.has(msg.student_id)) {
        studentsMap.set(msg.student_id, {
          student_id: msg.student_id,
          student_name: msg.student_name,
          student_grade: msg.student_grade,
          student_class: msg.student_class,
          student_number: msg.student_number,
        });
      }
    });
    
    const students = Array.from(studentsMap.values())
      .sort((a, b) => {
        if (a.student_grade !== b.student_grade) return a.student_grade - b.student_grade;
        if (a.student_class !== b.student_class) return a.student_class - b.student_class;
        return a.student_number - b.student_number;
      });
    
    // 각 학생별 키워드 사용횟수 계산
    const data: Record<string, Record<string, number>> = {};
    let maxCount = 0;
    
    students.forEach(student => {
      const studentMessages = userMessages.filter(m => m.student_id === student.student_id);
      data[student.student_id] = {};
      
      dangerousKeywords.forEach(keyword => {
        let count = 0;
        studentMessages.forEach(msg => {
          const regex = new RegExp(keyword, 'gi');
          const matches = msg.content.match(regex);
          if (matches) count += matches.length;
        });
        data[student.student_id][keyword] = count;
        if (count > maxCount) maxCount = count;
      });
    });
    
    // 실제 사용된 키워드만 필터링
    const usedKeywords = dangerousKeywords.filter(keyword => 
      students.some(student => data[student.student_id][keyword] > 0)
    );
    
    // 위험 키워드가 있는 학생만 필터링
    const studentsWithKeywords = students.filter(student =>
      usedKeywords.some(keyword => data[student.student_id][keyword] > 0)
    );
    
    return { students: studentsWithKeywords, keywords: usedKeywords, data, maxCount };
  }, [allMessages, dangerousKeywords]);

  // 히트맵 색상 계산 (0 → 투명, max → 진한 빨강)
  const getHeatColor = (count: number, maxCount: number): string => {
    if (count === 0) return 'bg-gray-100';
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    if (intensity < 0.25) return 'bg-red-100';
    if (intensity < 0.5) return 'bg-red-300';
    if (intensity < 0.75) return 'bg-red-500 text-white';
    return 'bg-red-700 text-white';
  };

  if (heatmapData.students.length === 0 || heatmapData.keywords.length === 0) {
    return (
      <Card className="border-mindtalk-chat-cyan/30">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3X3 className="h-4 w-4 text-mindtalk-chat-cyan" />
            키워드 사용 히트맵
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            위험 키워드가 감지된 대화가 없습니다
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-mindtalk-chat-cyan/30">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Grid3X3 className="h-4 w-4 text-mindtalk-chat-cyan" />
          키워드 사용 히트맵
          <span className="text-xs font-normal text-muted-foreground ml-2">
            ({heatmapData.students.length}명, {heatmapData.keywords.length}개 키워드)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <TooltipProvider>
          <ScrollArea className="w-full">
            <div className="min-w-max">
              {/* 헤더 (키워드) */}
              <div className="flex">
                <div className="w-28 shrink-0 p-2 text-xs font-medium text-muted-foreground sticky left-0 bg-white z-10">
                  학생
                </div>
                {heatmapData.keywords.map(keyword => (
                  <div
                    key={keyword}
                    className="w-12 shrink-0 p-1 text-center"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] font-medium text-mindtalk-alert-red truncate block cursor-help">
                          {keyword.length > 3 ? keyword.substring(0, 3) + '..' : keyword}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{keyword}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
              
              {/* 데이터 행 (학생별) */}
              {heatmapData.students.map(student => (
                <div key={student.student_id} className="flex border-t">
                  <div className="w-28 shrink-0 p-2 text-xs truncate sticky left-0 bg-white z-10">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">
                          {student.student_name} ({student.student_grade}-{student.student_class})
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{student.student_name} ({student.student_grade}학년 {student.student_class}반 {student.student_number}번)</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {heatmapData.keywords.map(keyword => {
                    const count = heatmapData.data[student.student_id][keyword] || 0;
                    return (
                      <Tooltip key={keyword}>
                        <TooltipTrigger asChild>
                          <div
                            className={`w-12 h-8 shrink-0 flex items-center justify-center text-xs font-medium cursor-help transition-colors ${getHeatColor(count, heatmapData.maxCount)}`}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{student.student_name}: "{keyword}" {count}회</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </TooltipProvider>
        
        {/* 범례 */}
        <div className="flex items-center justify-end gap-2 mt-3 text-xs text-muted-foreground">
          <span>적음</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-4 bg-red-100 border" />
            <div className="w-4 h-4 bg-red-300" />
            <div className="w-4 h-4 bg-red-500" />
            <div className="w-4 h-4 bg-red-700" />
          </div>
          <span>많음</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default KeywordHeatmap;
