import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Search, AlertTriangle, Upload, Download, FileUp, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useRealtimeSync, TableSubscription } from '@/hooks/use-realtime-sync';

// 키워드 실시간 동기화 테이블 설정
const MINDTALK_KEYWORDS_TABLE: TableSubscription[] = [
  {
    table: 'mindtalk_keywords',
    channelName: 'realtime_mindtalk_keywords',
    labels: {
      insert: '🔄 새 키워드가 추가되었습니다',
      update: '🔄 키워드가 수정되었습니다',
      delete: '🔄 키워드가 삭제되었습니다',
    },
  },
];
interface Keyword {
  id: string;
  keyword: string;
  category: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: '자살징후', label: '자살 징후', color: 'bg-red-100 text-red-700', chartColor: '#ef4444' },
  { value: '우울', label: '우울', color: 'bg-purple-100 text-purple-700', chartColor: '#a855f7' },
  { value: '자해', label: '자해', color: 'bg-orange-100 text-orange-700', chartColor: '#f97316' },
  { value: '충동조절', label: '충동 조절', color: 'bg-yellow-100 text-yellow-700', chartColor: '#eab308' },
  { value: '비행', label: '비행', color: 'bg-gray-100 text-gray-700', chartColor: '#6b7280' },
  { value: '섭식', label: '섭식 장애', color: 'bg-pink-100 text-pink-700', chartColor: '#ec4899' },
  { value: '약물', label: '약물', color: 'bg-indigo-100 text-indigo-700', chartColor: '#6366f1' },
  { value: '정신증', label: '정신증', color: 'bg-blue-100 text-blue-700', chartColor: '#3b82f6' },
  { value: '기능저하', label: '기능 저하', color: 'bg-teal-100 text-teal-700', chartColor: '#14b8a6' },
  { value: '고립', label: '사회적 고립', color: 'bg-cyan-100 text-cyan-700', chartColor: '#06b6d4' },
  { value: '정서', label: '정서', color: 'bg-emerald-100 text-emerald-700', chartColor: '#10b981' },
  { value: '폭력', label: '폭력', color: 'bg-rose-100 text-rose-700', chartColor: '#f43f5e' },
  { value: '기타', label: '기타', color: 'bg-slate-100 text-slate-700', chartColor: '#64748b' },
];

interface MindTalkKeywordsProps {
  adminId: string;
}

export default function MindTalkKeywords({ adminId }: MindTalkKeywordsProps) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // 새 키워드 추가 폼
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('기타');
  const [newDescription, setNewDescription] = useState('');
  
  // 일괄 추가 폼
  const [bulkKeywords, setBulkKeywords] = useState('');
  const [bulkCategory, setBulkCategory] = useState('기타');
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  
  // CSV 가져오기
  const [isImporting, setIsImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // 일괄 삭제
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const loadKeywords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mindtalk_keywords')
      .select('*')
      .order('category', { ascending: true })
      .order('keyword', { ascending: true });

    if (error) {
      toast({ title: '키워드 로드 실패', description: error.message, variant: 'destructive' });
    } else {
      setKeywords(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadKeywords();
  }, [loadKeywords]);

  // 실시간 동기화 훅 사용
  useRealtimeSync({
    tables: MINDTALK_KEYWORDS_TABLE,
    onRefresh: loadKeywords,
    enabled: true,
  });

  const addKeyword = async () => {
    if (!newKeyword.trim()) {
      toast({ title: '키워드를 입력하세요', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('mindtalk_keywords')
      .insert({
        keyword: newKeyword.trim(),
        category: newCategory,
        description: newDescription.trim() || null,
      });

    if (error) {
      if (error.code === '23505') {
        toast({ title: '이미 존재하는 키워드입니다', variant: 'destructive' });
      } else {
        toast({ title: '키워드 추가 실패', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: '키워드가 추가되었습니다' });
      setNewKeyword('');
      setNewDescription('');
      loadKeywords();
    }
  };

  const bulkAddKeywords = async () => {
    const lines = bulkKeywords.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
      toast({ title: '키워드를 입력하세요', variant: 'destructive' });
      return;
    }

    setIsBulkAdding(true);
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const keyword of lines) {
      const { error } = await supabase
        .from('mindtalk_keywords')
        .insert({
          keyword: keyword,
          category: bulkCategory,
          description: null,
        });

      if (error) {
        if (error.code === '23505') {
          duplicateCount++;
        } else {
          errorCount++;
        }
      } else {
        successCount++;
      }
    }

    setIsBulkAdding(false);
    
    let message = `${successCount}개 추가됨`;
    if (duplicateCount > 0) message += `, ${duplicateCount}개 중복`;
    if (errorCount > 0) message += `, ${errorCount}개 오류`;
    
    toast({ title: '일괄 추가 완료', description: message });
    setBulkKeywords('');
    loadKeywords();
  };

  // CSV 내보내기
  const exportToCsv = () => {
    const headers = ['키워드', '카테고리', '설명', '활성'];
    const rows = keywords.map(k => [
      k.keyword,
      k.category,
      k.description || '',
      k.is_active ? 'Y' : 'N'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `마음톡_키워드_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: 'CSV 파일이 다운로드되었습니다' });
  };

  // CSV 가져오기
  const importFromCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length < 2) {
        toast({ title: '유효한 CSV 파일이 아닙니다', variant: 'destructive' });
        return;
      }
      
      // 헤더 확인 (첫 줄 스킵)
      const dataLines = lines.slice(1);
      
      let successCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;
      
      for (const line of dataLines) {
        // CSV 파싱 (쌍따옴표 처리)
        const matches = line.match(/("([^"]|"")*"|[^,]*)(,("([^"]|"")*"|[^,]*))*$/);
        if (!matches) continue;
        
        const cells = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(cell => 
          cell.replace(/^"|"$/g, '').replace(/""/g, '"').trim()
        );
        
        if (cells.length < 2) continue;
        
        const keyword = cells[0];
        const category = cells[1] || '기타';
        const description = cells[2] || null;
        const isActive = cells[3]?.toUpperCase() !== 'N';
        
        if (!keyword) continue;
        
        const { error } = await supabase
          .from('mindtalk_keywords')
          .insert({
            keyword,
            category: CATEGORIES.find(c => c.value === category || c.label === category)?.value || '기타',
            description,
            is_active: isActive,
          });
        
        if (error) {
          if (error.code === '23505') {
            duplicateCount++;
          } else {
            errorCount++;
          }
        } else {
          successCount++;
        }
      }
      
      let message = `${successCount}개 가져옴`;
      if (duplicateCount > 0) message += `, ${duplicateCount}개 중복`;
      if (errorCount > 0) message += `, ${errorCount}개 오류`;
      
      toast({ title: 'CSV 가져오기 완료', description: message });
      loadKeywords();
    } catch (error: any) {
      toast({ title: 'CSV 가져오기 실패', description: error.message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
      if (csvInputRef.current) {
        csvInputRef.current.value = '';
      }
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('mindtalk_keywords')
      .update({ is_active: !currentActive })
      .eq('id', id);

    if (error) {
      toast({ title: '상태 변경 실패', description: error.message, variant: 'destructive' });
    } else {
      setKeywords(keywords.map(k => k.id === id ? { ...k, is_active: !currentActive } : k));
    }
  };

  const deleteKeyword = async (id: string, keyword: string) => {
    if (!confirm(`"${keyword}" 키워드를 삭제하시겠습니까?`)) return;

    const { error } = await supabase
      .from('mindtalk_keywords')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '키워드가 삭제되었습니다' });
      setKeywords(keywords.filter(k => k.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // 일괄 삭제
  const bulkDeleteKeywords = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`선택한 ${selectedIds.size}개의 키워드를 삭제하시겠습니까?`)) return;

    setIsBulkDeleting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      const { error } = await supabase
        .from('mindtalk_keywords')
        .delete()
        .eq('id', id);

      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    setIsBulkDeleting(false);
    
    if (successCount > 0) {
      setKeywords(keywords.filter(k => !selectedIds.has(k.id)));
      setSelectedIds(new Set());
      toast({ 
        title: '일괄 삭제 완료', 
        description: errorCount > 0 
          ? `${successCount}개 삭제, ${errorCount}개 오류` 
          : `${successCount}개 키워드가 삭제되었습니다`
      });
    } else {
      toast({ title: '삭제 실패', variant: 'destructive' });
    }
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredKeywords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredKeywords.map(k => k.id)));
    }
  };

  // 개별 선택/해제
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 일괄 카테고리 변경
  const [bulkChangeCategory, setBulkChangeCategory] = useState('');
  const [isBulkChanging, setIsBulkChanging] = useState(false);

  const bulkChangeCategoryFn = async () => {
    if (selectedIds.size === 0 || !bulkChangeCategory) return;
    
    if (!confirm(`선택한 ${selectedIds.size}개 키워드의 카테고리를 변경하시겠습니까?`)) return;

    setIsBulkChanging(true);
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      const { error } = await supabase
        .from('mindtalk_keywords')
        .update({ category: bulkChangeCategory })
        .eq('id', id);

      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    setIsBulkChanging(false);
    
    if (successCount > 0) {
      setKeywords(keywords.map(k => 
        selectedIds.has(k.id) ? { ...k, category: bulkChangeCategory } : k
      ));
      setSelectedIds(new Set());
      setBulkChangeCategory('');
      toast({ 
        title: '카테고리 변경 완료', 
        description: errorCount > 0 
          ? `${successCount}개 변경, ${errorCount}개 오류` 
          : `${successCount}개 키워드의 카테고리가 변경되었습니다`
      });
    } else {
      toast({ title: '변경 실패', variant: 'destructive' });
    }
  };

  // 일괄 활성화/비활성화
  const [isBulkToggling, setIsBulkToggling] = useState(false);

  const bulkToggleActive = async (activate: boolean) => {
    if (selectedIds.size === 0) return;
    
    const action = activate ? '활성화' : '비활성화';
    if (!confirm(`선택한 ${selectedIds.size}개 키워드를 ${action}하시겠습니까?`)) return;

    setIsBulkToggling(true);
    let successCount = 0;
    let errorCount = 0;

    for (const id of selectedIds) {
      const { error } = await supabase
        .from('mindtalk_keywords')
        .update({ is_active: activate })
        .eq('id', id);

      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    setIsBulkToggling(false);
    
    if (successCount > 0) {
      setKeywords(keywords.map(k => 
        selectedIds.has(k.id) ? { ...k, is_active: activate } : k
      ));
      setSelectedIds(new Set());
      toast({ 
        title: `일괄 ${action} 완료`, 
        description: errorCount > 0 
          ? `${successCount}개 ${action}, ${errorCount}개 오류` 
          : `${successCount}개 키워드가 ${action}되었습니다`
      });
    } else {
      toast({ title: `${action} 실패`, variant: 'destructive' });
    }
  };

  const getCategoryBadge = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
    return <Badge className={cat.color}>{cat.label}</Badge>;
  };

  const filteredKeywords = keywords.filter(k => {
    const matchesSearch = searchText === '' || 
      k.keyword.includes(searchText) || 
      (k.description && k.description.includes(searchText));
    const matchesCategory = filterCategory === 'all' || k.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const activeCount = keywords.filter(k => k.is_active).length;

  // 카테고리별 통계 데이터
  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    keywords.forEach(k => {
      counts[k.category] = (counts[k.category] || 0) + 1;
    });
    return CATEGORIES
      .filter(cat => counts[cat.value] > 0)
      .map(cat => ({
        name: cat.label,
        value: counts[cat.value] || 0,
        color: cat.chartColor,
      }));
  }, [keywords]);

  return (
    <div className="space-y-6">
      {/* 통계 카드 및 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">전체 키워드</p>
                  <p className="text-2xl font-bold">{keywords.length}개</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold">✓</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">활성 키워드</p>
                  <p className="text-2xl font-bold">{activeCount}개</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-600 font-bold">-</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">비활성 키워드</p>
                  <p className="text-2xl font-bold">{keywords.length - activeCount}개</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 카테고리별 파이 차트 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">카테고리별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value}개`, '']} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                키워드가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 키워드 추가 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">키워드 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="single">
                <Plus className="w-4 h-4 mr-1" />
                개별 추가
              </TabsTrigger>
              <TabsTrigger value="bulk">
                <Upload className="w-4 h-4 mr-1" />
                일괄 추가
              </TabsTrigger>
              <TabsTrigger value="csv">
                <FileUp className="w-4 h-4 mr-1" />
                CSV
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="single">
              <div className="flex flex-wrap gap-3">
                <Input
                  placeholder="키워드 입력"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="w-40"
                />
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="예: 자살 충동을 암시하는 표현"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="flex-1 min-w-40"
                />
                <Button onClick={addKeyword}>
                  <Plus className="w-4 h-4 mr-1" />
                  추가
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="bulk">
              <div className="space-y-3">
                <div className="flex gap-3 items-center">
                  <Select value={bulkCategory} onValueChange={setBulkCategory}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">카테고리를 선택하세요</span>
                </div>
                <Textarea
                  placeholder="키워드를 한 줄에 하나씩 입력하세요&#10;예:&#10;자살&#10;죽고싶어&#10;목숨"
                  value={bulkKeywords}
                  onChange={(e) => setBulkKeywords(e.target.value)}
                  rows={6}
                  className="font-mono"
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {bulkKeywords.split('\n').filter(line => line.trim()).length}개 키워드
                  </span>
                  <Button onClick={bulkAddKeywords} disabled={isBulkAdding}>
                    <Upload className="w-4 h-4 mr-1" />
                    {isBulkAdding ? '추가 중...' : '일괄 추가'}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="csv">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-2">CSV 내보내기</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    현재 {keywords.length}개의 키워드를 CSV 파일로 다운로드합니다.
                  </p>
                  <Button onClick={exportToCsv} variant="outline">
                    <Download className="w-4 h-4 mr-1" />
                    CSV 다운로드
                  </Button>
                </div>
                
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-2">CSV 가져오기</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    CSV 파일에서 키워드를 가져옵니다. 형식: 키워드,카테고리,설명,활성(Y/N)
                  </p>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    onChange={importFromCsv}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => csvInputRef.current?.click()} 
                    variant="outline"
                    disabled={isImporting}
                  >
                    <FileUp className="w-4 h-4 mr-1" />
                    {isImporting ? '가져오는 중...' : 'CSV 파일 선택'}
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded">
                  <p className="font-medium mb-1">CSV 형식 예시:</p>
                  <pre className="font-mono">키워드,카테고리,설명,활성{'\n'}자살,자살징후,자살 관련 표현,Y{'\n'}죽고싶어,우울,우울감 표현,Y</pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 검색 및 필터 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">고위험 키워드 목록</CardTitle>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={bulkChangeCategory} onValueChange={setBulkChangeCategory}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => bulkToggleActive(true)}
                disabled={isBulkToggling}
              >
                <ToggleRight className="w-4 h-4 mr-1" />
                활성화
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => bulkToggleActive(false)}
                disabled={isBulkToggling}
              >
                <ToggleLeft className="w-4 h-4 mr-1" />
                비활성화
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={bulkChangeCategoryFn}
                disabled={isBulkChanging || !bulkChangeCategory}
              >
                {isBulkChanging ? '변경 중...' : '카테고리 변경'}
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={bulkDeleteKeywords}
                disabled={isBulkDeleting}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {isBulkDeleting ? '삭제 중...' : `${selectedIds.size}개 삭제`}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="키워드 검색..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={filteredKeywords.length > 0 && selectedIds.size === filteredKeywords.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-32">카테고리</TableHead>
                  <TableHead>키워드</TableHead>
                  <TableHead className="hidden md:table-cell">설명</TableHead>
                  <TableHead className="w-20 text-center">활성</TableHead>
                  <TableHead className="w-20 text-center">삭제</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">로딩 중...</TableCell>
                  </TableRow>
                ) : filteredKeywords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      키워드가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredKeywords.map((keyword) => (
                    <TableRow 
                      key={keyword.id} 
                      className={`${!keyword.is_active ? 'opacity-50' : ''} ${selectedIds.has(keyword.id) ? 'bg-muted/50' : ''}`}
                    >
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedIds.has(keyword.id)}
                          onCheckedChange={() => toggleSelect(keyword.id)}
                        />
                      </TableCell>
                      <TableCell>{getCategoryBadge(keyword.category)}</TableCell>
                      <TableCell className="font-medium">{keyword.keyword}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {keyword.description || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={keyword.is_active}
                          onCheckedChange={() => toggleActive(keyword.id, keyword.is_active)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteKeyword(keyword.id, keyword.keyword)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <p className="text-sm text-muted-foreground mt-3">
            * 비활성화된 키워드는 감지 대상에서 제외됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
