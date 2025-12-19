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

export type ThemeName = 'emerald' | 'amber' | 'blue' | 'purple' | 'rose' | 'teal';

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
    id: 'wisdom-river',
    title: '이지영의 지혜의 강',
    subtitle: '철학적 사고를 키우는 이야기',
    icon: 'BookOpen',
    bookNumberRange: { min: 1, max: 5 },
    theme: {
      name: 'emerald',
      headerBg: 'bg-gradient-to-r from-storybook-emerald-light to-white',
      headerText: 'text-storybook-emerald-dark',
      badgeBg: 'bg-storybook-emerald-light',
      badgeText: 'text-storybook-emerald',
      border: 'border-storybook-emerald/30',
      buttonActive: 'bg-storybook-emerald hover:bg-storybook-emerald-hover',
      buttonInactive: 'border-storybook-emerald/50 text-storybook-emerald hover:bg-storybook-emerald-light',
      reviewBg: 'bg-storybook-emerald-light',
      reviewBorder: 'border-storybook-emerald/30',
      linkColor: 'text-storybook-emerald',
    }
  },
  {
    id: 'myungsim',
    title: '명심보감',
    subtitle: '마음을 밝히는 옛 지혜',
    icon: 'BookMarked',
    bookNumberRange: { min: 6, max: 10 },
    theme: {
      name: 'amber',
      headerBg: 'bg-gradient-to-r from-amber-50 to-white',
      headerText: 'text-amber-800',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-700',
      border: 'border-amber-300/50',
      buttonActive: 'bg-amber-500 hover:bg-amber-600 text-white',
      buttonInactive: 'border-amber-400/50 text-amber-700 hover:bg-amber-50',
      reviewBg: 'bg-amber-50',
      reviewBorder: 'border-amber-200/50',
      linkColor: 'text-amber-600',
    }
  },
  {
    id: 'analects',
    title: '논어',
    subtitle: '공자의 가르침',
    icon: 'ScrollText',
    bookNumberRange: { min: 11, max: 15 },
    theme: {
      name: 'blue',
      headerBg: 'bg-gradient-to-r from-blue-50 to-white',
      headerText: 'text-blue-800',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700',
      border: 'border-blue-300/50',
      buttonActive: 'bg-blue-500 hover:bg-blue-600 text-white',
      buttonInactive: 'border-blue-400/50 text-blue-700 hover:bg-blue-50',
      reviewBg: 'bg-blue-50',
      reviewBorder: 'border-blue-200/50',
      linkColor: 'text-blue-600',
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
};

// 아이콘 가져오기 헬퍼 함수
export const getSeriesIcon = (iconName: string): LucideIcon => {
  return AVAILABLE_ICONS[iconName] || BookOpen;
};
