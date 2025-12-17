import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Grid3X3, Download } from 'lucide-react';
import { toast } from 'sonner';

interface KeywordWithCategory {
  keyword: string;
  category: string;
}

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
  keywordsWithCategory: KeywordWithCategory[];
  onStudentClick?: (studentId: string, studentName: string, grade: number, classNum: number, number: number) => void;
}

// 카테고리 표시 이름과 색상
const CATEGORY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'suicide_depression': { label: '자살/우울', color: 'text-red-700', bgColor: 'bg-red-50' },
  'impulse_control': { label: '충동조절', color: 'text-orange-700', bgColor: 'bg-orange-50' },
  'reality_judgment': { label: '현실판단', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  'functional_impairment': { label: '기능저하', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  'default': { label: '기타', color: 'text-gray-700', bgColor: 'bg-gray-50' },
};

const KeywordHeatmap = ({ allMessages, keywordsWithCategory, onStudentClick }: KeywordHeatmapProps) => {
  // 학생별 키워드 사용횟수 계산
  const heatmapData = useMemo(() => {
    const userMessages = allMessages.filter(m => m.role === 'user');
    
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
    
    const data: Record<string, Record<string, number>> = {};
    let maxCount = 0;
    
    students.forEach(student => {
      const studentMessages = userMessages.filter(m => m.student_id === student.student_id);
      data[student.student_id] = {};
      
      keywordsWithCategory.forEach(({ keyword }) => {
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
    const usedKeywords = keywordsWithCategory.filter(({ keyword }) => 
      students.some(student => data[student.student_id][keyword] > 0)
    );
    
    // 위험 키워드가 있는 학생만 필터링
    const studentsWithKeywords = students.filter(student =>
      usedKeywords.some(({ keyword }) => data[student.student_id][keyword] > 0)
    );
    
    // 카테고리별로 키워드 그룹핑
    const keywordsByCategory: Record<string, KeywordWithCategory[]> = {};
    usedKeywords.forEach(kw => {
      const cat = kw.category || 'default';
      if (!keywordsByCategory[cat]) keywordsByCategory[cat] = [];
      keywordsByCategory[cat].push(kw);
    });
    
    // 카테고리 순서 정렬
    const categoryOrder = ['suicide_depression', 'impulse_control', 'reality_judgment', 'functional_impairment', 'default'];
    const sortedCategories = categoryOrder.filter(cat => keywordsByCategory[cat]?.length > 0);
    
    return { 
      students: studentsWithKeywords, 
      keywords: usedKeywords, 
      keywordsByCategory,
      sortedCategories,
      data, 
      maxCount 
    };
  }, [allMessages, keywordsWithCategory]);

  // 절대적 횟수 기준 색상 (1회=연한색, 점점 진해짐)
  const getHeatColor = (count: number): string => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-red-100';
    if (count === 2) return 'bg-red-200';
    if (count <= 4) return 'bg-red-300';
    if (count <= 6) return 'bg-red-400 text-white';
    if (count <= 9) return 'bg-red-500 text-white';
    return 'bg-red-700 text-white';
  };

  // CSV 내보내기
  const exportToCSV = () => {
    if (heatmapData.students.length === 0) {
      toast.error('내보낼 데이터가 없습니다');
      return;
    }

    // 헤더 생성: 학생정보 + 카테고리별 키워드 + 합계
    const headers = ['학번', '이름', '학년', '반', '번호'];
    heatmapData.sortedCategories.forEach(cat => {
      const catLabel = CATEGORY_CONFIG[cat]?.label || cat;
      heatmapData.keywordsByCategory[cat].forEach(({ keyword }) => {
        headers.push(`[${catLabel}] ${keyword}`);
      });
    });
    headers.push('합계');

    // 데이터 행 생성
    const rows = heatmapData.students.map(student => {
      const row = [
        student.student_id,
        student.student_name,
        student.student_grade.toString(),
        student.student_class.toString(),
        student.student_number.toString(),
      ];
      
      let total = 0;
      heatmapData.sortedCategories.forEach(cat => {
        heatmapData.keywordsByCategory[cat].forEach(({ keyword }) => {
          const count = heatmapData.data[student.student_id][keyword] || 0;
          row.push(count.toString());
          total += count;
        });
      });
      row.push(total.toString());
      
      return row;
    });

    // CSV 문자열 생성
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // BOM 추가 (한글 엑셀 호환)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `마음톡_키워드_히트맵_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('CSV 파일이 다운로드되었습니다');
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3X3 className="h-4 w-4 text-mindtalk-chat-cyan" />
            키워드 사용 히트맵
            <span className="text-xs font-normal text-muted-foreground ml-2">
              ({heatmapData.students.length}명, {heatmapData.keywords.length}개 키워드)
            </span>
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToCSV}
            className="border-mindtalk-chat-cyan/50 text-mindtalk-chat-cyan hover:bg-mindtalk-chat-cyan hover:text-white"
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <TooltipProvider>
          <ScrollArea className="w-full">
            <div className="min-w-max">
              {/* 카테고리 헤더 */}
              <div className="flex">
                <div className="w-28 shrink-0 sticky left-0 bg-white z-10" />
                {heatmapData.sortedCategories.map(cat => {
                  const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.default;
                  const keywordsInCat = heatmapData.keywordsByCategory[cat];
                  return (
                    <div 
                      key={cat} 
                      className={`shrink-0 text-center text-[10px] font-semibold py-1 border-b-2 ${config.bgColor} ${config.color}`}
                      style={{ width: `${keywordsInCat.length * 48}px` }}
                    >
                      {config.label} ({keywordsInCat.length})
                    </div>
                  );
                })}
              </div>
              
              {/* 키워드 헤더 */}
              <div className="flex">
                <div className="w-28 shrink-0 p-2 text-xs font-medium text-muted-foreground sticky left-0 bg-white z-10">
                  학생
                </div>
                {heatmapData.sortedCategories.map(cat => 
                  heatmapData.keywordsByCategory[cat].map(({ keyword }) => (
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
                  ))
                )}
              </div>
              
              {/* 데이터 행 (학생별) */}
              {heatmapData.students.map(student => (
                <div key={student.student_id} className="flex border-t">
                  <div 
                    className="w-28 shrink-0 p-2 text-xs truncate sticky left-0 bg-white z-10 cursor-pointer hover:bg-mindtalk-chat-cyan-light transition-colors"
                    onClick={() => onStudentClick?.(student.student_id, student.student_name, student.student_grade, student.student_class, student.student_number)}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-mindtalk-chat-cyan hover:underline">
                          {student.student_name} ({student.student_grade}-{student.student_class})
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{student.student_name} ({student.student_grade}학년 {student.student_class}반 {student.student_number}번) - 클릭하여 대화보기</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {heatmapData.sortedCategories.map(cat => 
                    heatmapData.keywordsByCategory[cat].map(({ keyword }) => {
                      const count = heatmapData.data[student.student_id][keyword] || 0;
                      return (
                        <Tooltip key={keyword}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-12 h-8 shrink-0 flex items-center justify-center text-xs font-medium transition-colors ${getHeatColor(count)} ${count > 0 ? 'cursor-pointer hover:ring-2 hover:ring-mindtalk-chat-cyan' : 'cursor-default'}`}
                              onClick={() => count > 0 && onStudentClick?.(student.student_id, student.student_name, student.student_grade, student.student_class, student.student_number)}
                            >
                              {count > 0 ? count : ''}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{student.student_name}: "{keyword}" {count}회 {count > 0 ? '- 클릭하여 대화보기' : ''}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </TooltipProvider>
        
        {/* 범례 */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-wrap gap-2">
            {heatmapData.sortedCategories.map(cat => {
              const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.default;
              return (
                <span key={cat} className={`text-[10px] px-2 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                  {config.label}
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <div className="w-4 h-4 bg-red-100 border" title="1회" />
            <span>1</span>
            <div className="w-4 h-4 bg-red-200" title="2회" />
            <span>2</span>
            <div className="w-4 h-4 bg-red-300" title="3-4회" />
            <span>3+</span>
            <div className="w-4 h-4 bg-red-500" title="5-9회" />
            <span>5+</span>
            <div className="w-4 h-4 bg-red-700" title="10회 이상" />
            <span>10+</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KeywordHeatmap;
