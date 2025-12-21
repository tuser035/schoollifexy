import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  FolderOpen,
  BookOpen,
  BookMarked,
  ScrollText,
  Sparkles,
  Library,
  Feather,
  GraduationCap,
  Lightbulb,
  Flower2,
  TreePine,
  Info
} from 'lucide-react';
import { BOOK_SERIES, AVAILABLE_ICONS, THEME_STYLES, type BookSeries, type ThemeName } from '@/config/bookSeriesConfig';

interface StorybookCategoriesProps {
  adminId: string;
}

const AVAILABLE_THEMES: { name: ThemeName; label: string; color: string }[] = [
  { name: 'pink', label: '핑크', color: 'bg-pink-500' },
  { name: 'rose', label: '로즈', color: 'bg-rose-500' },
  { name: 'amber', label: '앰버', color: 'bg-amber-500' },
  { name: 'emerald', label: '에메랄드', color: 'bg-emerald-500' },
  { name: 'blue', label: '블루', color: 'bg-blue-500' },
  { name: 'purple', label: '퍼플', color: 'bg-purple-500' },
  { name: 'teal', label: '틸', color: 'bg-teal-500' },
];

const ICON_OPTIONS = Object.keys(AVAILABLE_ICONS);

const getIconComponent = (iconName: string) => {
  const icons: Record<string, React.ElementType> = {
    BookOpen,
    BookMarked,
    ScrollText,
    Sparkles,
    Library,
    Feather,
    GraduationCap,
    Lightbulb,
    Flower2,
    TreePine,
  };
  return icons[iconName] || BookOpen;
};

export default function StorybookCategories({ adminId }: StorybookCategoriesProps) {
  const [categories, setCategories] = useState<BookSeries[]>(BOOK_SERIES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BookSeries | null>(null);
  
  // Form states
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formIcon, setFormIcon] = useState('BookOpen');
  const [formTheme, setFormTheme] = useState<ThemeName>('pink');
  const [formMinBook, setFormMinBook] = useState(1);
  const [formMaxBook, setFormMaxBook] = useState(5);

  const resetForm = () => {
    setFormId('');
    setFormTitle('');
    setFormSubtitle('');
    setFormIcon('BookOpen');
    setFormTheme('pink');
    setFormMinBook(1);
    setFormMaxBook(5);
    setEditingCategory(null);
  };

  const openAddDialog = () => {
    resetForm();
    // Calculate next available book range
    const maxBookNumber = Math.max(...categories.map(c => c.bookNumberRange.max), 0);
    setFormMinBook(maxBookNumber + 1);
    setFormMaxBook(maxBookNumber + 5);
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: BookSeries) => {
    setEditingCategory(category);
    setFormId(category.id);
    setFormTitle(category.title);
    setFormSubtitle(category.subtitle);
    setFormIcon(category.icon);
    setFormTheme(category.theme.name);
    setFormMinBook(category.bookNumberRange.min);
    setFormMaxBook(category.bookNumberRange.max);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) {
      toast.error('카테고리 이름을 입력해주세요');
      return;
    }

    const themeStyles = THEME_STYLES[formTheme];
    const newCategory: BookSeries = {
      id: formId || formTitle.toLowerCase().replace(/\s+/g, '-'),
      title: formTitle,
      subtitle: formSubtitle,
      icon: formIcon as keyof typeof AVAILABLE_ICONS,
      bookNumberRange: { min: formMinBook, max: formMaxBook },
      theme: {
        name: formTheme,
        headerBg: `bg-gradient-to-r from-${formTheme}-50 to-white`,
        headerText: `text-${formTheme}-800`,
        badgeBg: `bg-${formTheme}-100`,
        badgeText: `text-${formTheme}-700`,
        border: `border-${formTheme}-300/50`,
        buttonActive: `bg-${formTheme}-500 hover:bg-${formTheme}-600 text-white`,
        buttonInactive: `border-${formTheme}-400/50 text-${formTheme}-700 hover:bg-${formTheme}-50`,
        reviewBg: `bg-${formTheme}-50`,
        reviewBorder: `border-${formTheme}-200/50`,
        linkColor: `text-${formTheme}-600`,
      },
    };

    if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? newCategory : c));
      toast.success('카테고리가 수정되었습니다');
    } else {
      setCategories(prev => [...prev, newCategory]);
      toast.success('카테고리가 추가되었습니다');
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (categoryId: string) => {
    if (confirm('이 카테고리를 삭제하시겠습니까?')) {
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      toast.success('카테고리가 삭제되었습니다');
    }
  };

  const IconComponent = getIconComponent(formIcon);

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-pink-200/50 bg-pink-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-pink-600 mt-0.5" />
            <div className="text-sm text-pink-800">
              <p className="font-medium mb-1">카테고리 관리 안내</p>
              <p className="text-pink-600">
                인문학 서점에 표시되는 카테고리를 관리합니다. 각 카테고리는 책 번호 범위로 구분되며, 
                해당 범위의 책들이 카테고리 아래에 표시됩니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <Card className="border-pink-200/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-pink-800">
              <FolderOpen className="w-5 h-5" />
              카테고리 목록
            </CardTitle>
            <Button 
              onClick={openAddDialog}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              카테고리 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden border-pink-200/50">
            <Table>
              <TableHeader>
                <TableRow className="bg-pink-50">
                  <TableHead className="text-pink-800">아이콘</TableHead>
                  <TableHead className="text-pink-800">이름</TableHead>
                  <TableHead className="text-pink-800">부제목</TableHead>
                  <TableHead className="text-pink-800">책 범위</TableHead>
                  <TableHead className="text-pink-800">테마</TableHead>
                  <TableHead className="text-pink-800 text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      등록된 카테고리가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => {
                    const Icon = getIconComponent(category.icon);
                    const theme = AVAILABLE_THEMES.find(t => t.name === category.theme.name);
                    return (
                      <TableRow key={category.id} className="hover:bg-pink-50/50">
                        <TableCell>
                          <div className={`w-8 h-8 rounded-full ${theme?.color || 'bg-pink-500'} flex items-center justify-center`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{category.title}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{category.subtitle}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-pink-300 text-pink-700">
                            {category.bookNumberRange.min} - {category.bookNumberRange.max}번
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${theme?.color || 'bg-pink-500'}`} />
                            <span className="text-sm">{theme?.label || category.theme.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(category)}
                              className="h-8 px-2 text-pink-600 hover:text-pink-800 hover:bg-pink-100"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(category.id)}
                              className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-pink-800">
              <FolderOpen className="w-5 h-5" />
              {editingCategory ? '카테고리 수정' : '카테고리 추가'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>카테고리 이름 *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="예: 철학, 시집"
                className="border-pink-200 focus-visible:ring-pink-500"
              />
            </div>

            <div className="space-y-2">
              <Label>부제목</Label>
              <Input
                value={formSubtitle}
                onChange={(e) => setFormSubtitle(e.target.value)}
                placeholder="예: 철학적 사고를 키우는 이야기"
                className="border-pink-200 focus-visible:ring-pink-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>아이콘</Label>
                <Select value={formIcon} onValueChange={setFormIcon}>
                  <SelectTrigger className="border-pink-200">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <span>{formIcon}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((iconName) => {
                      const Icon = getIconComponent(iconName);
                      return (
                        <SelectItem key={iconName} value={iconName}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span>{iconName}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>테마 색상</Label>
                <Select value={formTheme} onValueChange={(v) => setFormTheme(v as ThemeName)}>
                  <SelectTrigger className="border-pink-200">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${AVAILABLE_THEMES.find(t => t.name === formTheme)?.color}`} />
                        <span>{AVAILABLE_THEMES.find(t => t.name === formTheme)?.label}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_THEMES.map((theme) => (
                      <SelectItem key={theme.name} value={theme.name}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${theme.color}`} />
                          <span>{theme.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작 책 번호</Label>
                <Input
                  type="number"
                  value={formMinBook}
                  onChange={(e) => setFormMinBook(parseInt(e.target.value) || 1)}
                  min={1}
                  className="border-pink-200 focus-visible:ring-pink-500"
                />
              </div>
              <div className="space-y-2">
                <Label>끝 책 번호</Label>
                <Input
                  type="number"
                  value={formMaxBook}
                  onChange={(e) => setFormMaxBook(parseInt(e.target.value) || 1)}
                  min={formMinBook}
                  className="border-pink-200 focus-visible:ring-pink-500"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-pink-50 border border-pink-200">
              <p className="text-xs text-pink-600 mb-2">미리보기</p>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full ${AVAILABLE_THEMES.find(t => t.name === formTheme)?.color} flex items-center justify-center`}>
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">{formTitle || '카테고리 이름'}</p>
                  <p className="text-xs text-muted-foreground">{formSubtitle || '부제목'}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              {editingCategory ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
