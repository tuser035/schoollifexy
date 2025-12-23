import {
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
  type LucideIcon,
} from 'lucide-react';

// ===== 사용 가능한 아이콘 목록 =====
// 새 시리즈 추가 시 아래 목록에서 아이콘 이름을 선택하세요
export const AVAILABLE_ICONS: Record<string, LucideIcon> = {
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

export type ThemeName = 'emerald' | 'amber' | 'blue' | 'purple' | 'rose' | 'teal' | 'pink';

export interface SeriesTheme {
  name: ThemeName;
  headerBg: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
  border: string;
  buttonActive: string;
  buttonInactive: string;
  reviewBg: string;
  reviewBorder: string;
  linkColor: string;
}

export interface BookSeries {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof AVAILABLE_ICONS;
  bookNumberRange: { min: number; max: number };
  theme: SeriesTheme;
}

// ===== 시리즈 설정 (새 시리즈 추가 시 여기에 추가) =====
export const BOOK_SERIES: BookSeries[] = [
  {
    id: 'philosophy',
    title: '철학',
    subtitle: '철학적 사고를 키우는 이야기',
    icon: 'BookOpen',
    bookNumberRange: { min: 1, max: 99 },
    theme: {
      name: 'teal',
      headerBg: 'bg-gradient-to-r from-teal-50 to-white',
      headerText: 'text-teal-800',
      badgeBg: 'bg-teal-100',
      badgeText: 'text-teal-700',
      border: 'border-teal-300/50',
      buttonActive: 'bg-teal-500 hover:bg-teal-600 text-white',
      buttonInactive: 'border-teal-400/50 text-teal-700 hover:bg-teal-50',
      reviewBg: 'bg-teal-50',
      reviewBorder: 'border-teal-200/50',
      linkColor: 'text-teal-600',
    }
  },
  {
    id: 'poetry',
    title: '시집',
    subtitle: '마음을 울리는 시의 세계',
    icon: 'Feather',
    bookNumberRange: { min: 1, max: 99 },
    theme: {
      name: 'purple',
      headerBg: 'bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50',
      headerText: 'text-purple-800',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-700',
      border: 'border-purple-300/50',
      buttonActive: 'bg-purple-500 hover:bg-purple-600 text-white',
      buttonInactive: 'border-purple-400/50 text-purple-700 hover:bg-purple-50',
      reviewBg: 'bg-purple-50',
      reviewBorder: 'border-purple-200/50',
      linkColor: 'text-purple-600',
    }
  },
  {
    id: 'recommended',
    title: '추천도서',
    subtitle: '입문자를 위한 고전문학 7권을 소개합니다',
    icon: 'BookMarked',
    bookNumberRange: { min: 1, max: 99 },
    theme: {
      name: 'teal',
      headerBg: 'bg-gradient-to-r from-teal-50 to-white',
      headerText: 'text-teal-800',
      badgeBg: 'bg-teal-100',
      badgeText: 'text-teal-700',
      border: 'border-teal-300/50',
      buttonActive: 'bg-teal-500 hover:bg-teal-600 text-white',
      buttonInactive: 'border-teal-400/50 text-teal-700 hover:bg-teal-50',
      reviewBg: 'bg-teal-50',
      reviewBorder: 'border-teal-200/50',
      linkColor: 'text-teal-600',
    }
  },
];

// ===== 테마별 책 목록 스타일 =====
export const THEME_STYLES: Record<ThemeName, {
  bg: string;
  hoverBg: string;
  border: string;
  title: string;
  badge: string;
  arrow: string;
  scrollbar: string;
  linkColor: string;
}> = {
  emerald: {
    bg: 'bg-storybook-emerald-light',
    hoverBg: 'hover:bg-storybook-emerald/10',
    border: 'border-storybook-emerald/20',
    title: 'text-storybook-emerald-dark',
    badge: 'border-storybook-emerald/50 text-storybook-emerald',
    arrow: 'text-storybook-emerald/60',
    scrollbar: '[&::-webkit-scrollbar-thumb]:bg-storybook-emerald/30',
    linkColor: 'text-storybook-emerald'
  },
  amber: {
    bg: 'bg-amber-50',
    hoverBg: 'hover:bg-amber-100/50',
    border: 'border-amber-200/50',
    title: 'text-amber-800',
    badge: 'border-amber-400/50 text-amber-600',
    arrow: 'text-amber-400',
    scrollbar: '[&::-webkit-scrollbar-thumb]:bg-amber-300/50',
    linkColor: 'text-amber-600'
  },
  blue: {
    bg: 'bg-blue-50',
    hoverBg: 'hover:bg-blue-100/50',
    border: 'border-blue-200/50',
    title: 'text-blue-800',
    badge: 'border-blue-400/50 text-blue-600',
    arrow: 'text-blue-400',
    scrollbar: '[&::-webkit-scrollbar-thumb]:bg-blue-300/50',
    linkColor: 'text-blue-600'
  },
  purple: {
    bg: 'bg-purple-50',
    hoverBg: 'hover:bg-purple-100/50',
    border: 'border-purple-200/50',
    title: 'text-purple-800',
    badge: 'border-purple-400/50 text-purple-600',
    arrow: 'text-purple-400',
    scrollbar: '[&::-webkit-scrollbar-thumb]:bg-purple-300/50',
    linkColor: 'text-purple-600'
  },
  rose: {
    bg: 'bg-rose-50',
    hoverBg: 'hover:bg-rose-100/50',
    border: 'border-rose-200/50',
    title: 'text-rose-800',
    badge: 'border-rose-400/50 text-rose-600',
    arrow: 'text-rose-400',
    scrollbar: '[&::-webkit-scrollbar-thumb]:bg-rose-300/50',
    linkColor: 'text-rose-600'
  },
  teal: {
    bg: 'bg-teal-50',
    hoverBg: 'hover:bg-teal-100/50',
    border: 'border-teal-200/50',
    title: 'text-teal-800',
    badge: 'border-teal-400/50 text-teal-600',
    arrow: 'text-teal-400',
    scrollbar: '[&::-webkit-scrollbar-thumb]:bg-teal-300/50',
    linkColor: 'text-teal-600'
  },
  pink: {
    bg: 'bg-pink-50',
    hoverBg: 'hover:bg-pink-100/50',
    border: 'border-pink-200/50',
    title: 'text-pink-800',
    badge: 'border-pink-400/50 text-pink-600',
    arrow: 'text-pink-400',
    scrollbar: '[&::-webkit-scrollbar-thumb]:bg-pink-300/50',
    linkColor: 'text-pink-600'
  },
};

// 아이콘 가져오기 헬퍼 함수
export const getSeriesIcon = (iconName: string): LucideIcon => {
  return AVAILABLE_ICONS[iconName] || BookOpen;
};
