import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Search, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Keyword {
  id: string;
  keyword: string;
  category: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: '자살징후', label: '자살 징후', color: 'bg-red-100 text-red-700' },
  { value: '우울', label: '우울', color: 'bg-purple-100 text-purple-700' },
  { value: '자해', label: '자해', color: 'bg-orange-100 text-orange-700' },
  { value: '충동조절', label: '충동 조절', color: 'bg-yellow-100 text-yellow-700' },
  { value: '비행', label: '비행', color: 'bg-gray-100 text-gray-700' },
  { value: '섭식', label: '섭식 장애', color: 'bg-pink-100 text-pink-700' },
  { value: '약물', label: '약물', color: 'bg-indigo-100 text-indigo-700' },
  { value: '정신증', label: '정신증', color: 'bg-blue-100 text-blue-700' },
  { value: '기능저하', label: '기능 저하', color: 'bg-teal-100 text-teal-700' },
  { value: '고립', label: '사회적 고립', color: 'bg-cyan-100 text-cyan-700' },
  { value: '정서', label: '정서', color: 'bg-emerald-100 text-emerald-700' },
  { value: '폭력', label: '폭력', color: 'bg-rose-100 text-rose-700' },
  { value: '기타', label: '기타', color: 'bg-slate-100 text-slate-700' },
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

  useEffect(() => {
    loadKeywords();
  }, []);

  const loadKeywords = async () => {
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
  };

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

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
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

      {/* 키워드 추가 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">키워드 추가</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* 검색 및 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">고위험 키워드 목록</CardTitle>
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
                    <TableCell colSpan={5} className="text-center py-8">로딩 중...</TableCell>
                  </TableRow>
                ) : filteredKeywords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      키워드가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredKeywords.map((keyword) => (
                    <TableRow key={keyword.id} className={!keyword.is_active ? 'opacity-50' : ''}>
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
