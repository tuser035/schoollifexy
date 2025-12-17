import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Grid3X3, Download, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
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

// 카테고리 표시 이름과 색상 (실제 DB 카테고리명에 맞춤)
const CATEGORY_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  '자살징후': { label: '자살징후', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-300' },
  '우울': { label: '우울', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-300' },
  '자해': { label: '자해', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-300' },
  '폭력': { label: '폭력', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' },
  '충동조절': { label: '충동조절', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-300' },
  '비행': { label: '비행', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' },
  '정신증': { label: '정신증', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-300' },
  '기능저하': { label: '기능저하', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
  '고립': { label: '고립', color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-300' },
  '섭식': { label: '섭식', color: 'text-pink-700', bgColor: 'bg-pink-50', borderColor: 'border-pink-300' },
  '정서': { label: '정서', color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-300' },
  '약물': { label: '약물', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-300' },
  'default': { label: '기타', color: 'text-slate-700', bgColor: 'bg-slate-50', borderColor: 'border-slate-300' },
};

type SortOption = 'default' | 'total-desc' | 'total-asc';

const KeywordHeatmap = ({ allMessages, keywordsWithCategory, onStudentClick }: KeywordHeatmapProps) => {
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(new Set());
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  
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
    
    const students = Array.from(studentsMap.values());
    
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
    
    // 카테고리 순서 정렬 (위험도 높은 순)
    const categoryOrder = ['자살징후', '자해', '우울', '폭력', '충동조절', '비행', '정신증', '기능저하', '고립', '섭식', '정서', '약물', 'default'];
    const allCategories = categoryOrder.filter(cat => keywordsByCategory[cat]?.length > 0);
    
    return { 
      students: studentsWithKeywords, 
      keywords: usedKeywords, 
      keywordsByCategory,
      allCategories,
      data, 
      maxCount 
    };
  }, [allMessages, keywordsWithCategory]);

  // 필터링된 카테고리 (필터가 비어있으면 전체 표시)
  const filteredCategories = useMemo(() => {
    if (enabledCategories.size === 0) return heatmapData.allCategories;
    return heatmapData.allCategories.filter(cat => enabledCategories.has(cat));
  }, [heatmapData.allCategories, enabledCategories]);

  // 학생별 총합 계산 (필터링된 카테고리 기준)
  const getStudentTotal = (studentId: string) => {
    let total = 0;
    filteredCategories.forEach(cat => {
      heatmapData.keywordsByCategory[cat]?.forEach(({ keyword }) => {
        total += heatmapData.data[studentId]?.[keyword] || 0;
      });
    });
    return total;
  };

  // 정렬된 학생 목록
  const sortedStudents = useMemo(() => {
    const students = [...heatmapData.students];
    
    if (sortOption === 'total-desc') {
      return students.sort((a, b) => getStudentTotal(b.student_id) - getStudentTotal(a.student_id));
    } else if (sortOption === 'total-asc') {
      return students.sort((a, b) => getStudentTotal(a.student_id) - getStudentTotal(b.student_id));
    }
    
    // default: 학년-반-번호 순
    return students.sort((a, b) => {
      if (a.student_grade !== b.student_grade) return a.student_grade - b.student_grade;
      if (a.student_class !== b.student_class) return a.student_class - b.student_class;
      return a.student_number - b.student_number;
    });
  }, [heatmapData.students, sortOption, filteredCategories]);

  // 정렬 토글
  const toggleSort = () => {
    setSortOption(prev => {
      if (prev === 'default') return 'total-desc';
      if (prev === 'total-desc') return 'total-asc';
      return 'default';
    });
  };

  // 카테고리 필터 토글
  const toggleCategory = (cat: string) => {
    setEnabledCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cat)) {
        newSet.delete(cat);
      } else {
        newSet.add(cat);
      }
      return newSet;
    });
  };

  // 모든 필터 초기화
  const resetFilters = () => {
    setEnabledCategories(new Set());
    setSortOption('default');
  };

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
    filteredCategories.forEach(cat => {
      const catLabel = CATEGORY_CONFIG[cat]?.label || cat;
      heatmapData.keywordsByCategory[cat].forEach(({ keyword }) => {
        headers.push(`[${catLabel}] ${keyword}`);
      });
    });
    headers.push('합계');

    // 데이터 행 생성
    const rows = sortedStudents.map(student => {
      const row = [
        student.student_id,
        student.student_name,
        student.student_grade.toString(),
        student.student_class.toString(),
        student.student_number.toString(),
      ];
      
      let total = 0;
      filteredCategories.forEach(cat => {
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3X3 className="h-4 w-4 text-mindtalk-chat-cyan" />
            키워드 사용 히트맵
            <span className="text-xs font-normal text-muted-foreground ml-2">
              ({sortedStudents.length}명, {heatmapData.keywords.length}개 키워드)
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant={showCategoryFilter ? "default" : "outline"}
              size="sm" 
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              className={showCategoryFilter ? "bg-mindtalk-chat-cyan text-white" : "border-mindtalk-chat-cyan/50 text-mindtalk-chat-cyan hover:bg-mindtalk-chat-cyan hover:text-white"}
            >
              <Filter className="h-4 w-4 mr-1" />
              필터
              {enabledCategories.size > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1">{enabledCategories.size}</Badge>
              )}
            </Button>
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
        </div>
        
        {/* 카테고리 필터 토글 */}
        {showCategoryFilter && (
          <div className="mt-3 p-2 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">카테고리 필터</span>
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-6 text-xs">
                초기화
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {heatmapData.allCategories.map(cat => {
                const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.default;
                const isActive = enabledCategories.size === 0 || enabledCategories.has(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`text-[10px] px-2 py-1 rounded border transition-all ${
                      isActive 
                        ? `${config.bgColor} ${config.color} ${config.borderColor} border-2` 
                        : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50'
                    }`}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-2">
        <TooltipProvider>
          <ScrollArea className="w-full">
            <div className="min-w-max">
              {/* 카테고리 헤더 */}
              <div className="flex">
                <div className="w-28 shrink-0 sticky left-0 bg-white z-10" />
                {filteredCategories.map(cat => {
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
                {/* 합계 카테고리 헤더 - 클릭하여 정렬 */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="w-14 shrink-0 text-center text-[10px] font-bold py-1 border-b-2 bg-slate-200 text-slate-700 cursor-pointer hover:bg-slate-300 transition-colors flex items-center justify-center gap-1"
                      onClick={toggleSort}
                    >
                      총합
                      {sortOption === 'default' && <ArrowUpDown className="h-3 w-3" />}
                      {sortOption === 'total-desc' && <ArrowDown className="h-3 w-3" />}
                      {sortOption === 'total-asc' && <ArrowUp className="h-3 w-3" />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>클릭하여 정렬 (현재: {sortOption === 'default' ? '기본' : sortOption === 'total-desc' ? '내림차순' : '오름차순'})</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* 키워드 헤더 */}
              <div className="flex">
                <div className="w-28 shrink-0 p-2 text-xs font-medium text-muted-foreground sticky left-0 bg-white z-10">
                  학생
                </div>
                {filteredCategories.map(cat => 
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
                {/* 합계 헤더 - 클릭하여 정렬 */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="w-14 shrink-0 p-1 text-center bg-slate-100 border-l-2 border-slate-300 cursor-pointer hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                      onClick={toggleSort}
                    >
                      <span className="text-[10px] font-bold text-slate-700">합계</span>
                      {sortOption === 'default' && <ArrowUpDown className="h-2.5 w-2.5 text-slate-500" />}
                      {sortOption === 'total-desc' && <ArrowDown className="h-2.5 w-2.5 text-slate-700" />}
                      {sortOption === 'total-asc' && <ArrowUp className="h-2.5 w-2.5 text-slate-700" />}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>클릭하여 정렬</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* 데이터 행 (학생별) */}
              {sortedStudents.map(student => {
                // 학생별 총 합계 계산 (필터링된 카테고리 기준)
                const studentTotal = getStudentTotal(student.student_id);
                
                return (
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
                    {filteredCategories.map(cat => 
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
                    {/* 합계 셀 */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="w-14 h-8 shrink-0 flex items-center justify-center text-xs font-bold bg-slate-100 border-l-2 border-slate-300 text-slate-700 cursor-pointer hover:bg-slate-200 transition-colors"
                          onClick={() => onStudentClick?.(student.student_id, student.student_name, student.student_grade, student.student_class, student.student_number)}
                        >
                          {studentTotal}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{student.student_name}: 총 {studentTotal}회 - 클릭하여 대화보기</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </TooltipProvider>
        
        {/* 범례 */}
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="flex flex-wrap gap-1">
            {filteredCategories.map(cat => {
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
