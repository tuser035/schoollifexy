/**
 * AI 작성 감지를 위한 통계적 분석 유틸리티
 * 
 * 분석 항목:
 * 1. TTR (Type-Token Ratio): 어휘 다양성 - AI는 보통 높은 어휘 다양성을 보임
 * 2. 평균 문장 길이: AI는 일정한 문장 길이를 유지하는 경향
 * 3. 문장 길이 분산: AI는 문장 길이 편차가 적음
 * 4. 접속사 패턴: AI는 접속사를 규칙적으로 사용
 * 5. 반복 패턴: AI는 특정 표현을 반복하는 경향
 */

export interface AIDetectionResult {
  score: number; // 0-100, 높을수록 AI 의심
  level: 'low' | 'medium' | 'high';
  details: {
    ttr: number;
    avgSentenceLength: number;
    sentenceLengthVariance: number;
    connectorRatio: number;
    repetitionScore: number;
  };
  indicators: string[];
}

// 한국어 접속사 및 연결어
const KOREAN_CONNECTORS = [
  '그러나', '하지만', '그렇지만', '그런데', '그래서', '따라서', '그러므로',
  '또한', '그리고', '뿐만 아니라', '게다가', '더욱이', '한편', '반면',
  '왜냐하면', '때문에', '결국', '마침내', '결론적으로', '요약하면',
  '첫째', '둘째', '셋째', '마지막으로', '먼저', '다음으로',
  '즉', '다시 말해', '예를 들어', '특히', '물론', '사실'
];

// AI가 자주 사용하는 패턴
const AI_PATTERNS = [
  '~할 수 있습니다',
  '~하는 것이 중요합니다',
  '~라고 생각합니다',
  '~에 대해 깊이',
  '많은 것을 배울 수 있',
  '다양한 관점에서',
  '의미 있는',
  '깊은 인상을',
  '매우 감동적',
  '진정한 의미',
  '중요한 교훈'
];

/**
 * 텍스트를 문장 단위로 분리
 */
function splitSentences(text: string): string[] {
  return text
    .split(/[.!?。]\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * 텍스트를 단어 단위로 분리 (한국어 기준)
 */
function splitWords(text: string): string[] {
  return text
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Type-Token Ratio (어휘 다양성) 계산
 * 높을수록 다양한 어휘 사용
 */
function calculateTTR(words: string[]): number {
  if (words.length === 0) return 0;
  const uniqueWords = new Set(words);
  return uniqueWords.size / words.length;
}

/**
 * 평균 문장 길이 계산
 */
function calculateAvgSentenceLength(sentences: string[]): number {
  if (sentences.length === 0) return 0;
  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
  return totalChars / sentences.length;
}

/**
 * 문장 길이 분산 계산
 */
function calculateSentenceLengthVariance(sentences: string[]): number {
  if (sentences.length < 2) return 0;
  
  const lengths = sentences.map(s => s.length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;
  
  return Math.sqrt(variance); // 표준편차 반환
}

/**
 * 접속사 사용 비율 계산
 */
function calculateConnectorRatio(text: string, sentences: string[]): number {
  if (sentences.length === 0) return 0;
  
  let connectorCount = 0;
  for (const connector of KOREAN_CONNECTORS) {
    const regex = new RegExp(connector, 'g');
    const matches = text.match(regex);
    if (matches) connectorCount += matches.length;
  }
  
  return connectorCount / sentences.length;
}

/**
 * AI 패턴 반복 점수 계산
 */
function calculateRepetitionScore(text: string): number {
  let patternCount = 0;
  
  for (const pattern of AI_PATTERNS) {
    if (text.includes(pattern)) {
      patternCount++;
    }
  }
  
  // n-gram 반복 체크 (3글자 이상 구문)
  const words = text.split(/\s+/);
  const phrases: Record<string, number> = {};
  
  for (let i = 0; i < words.length - 2; i++) {
    const phrase = words.slice(i, i + 3).join(' ');
    if (phrase.length >= 6) {
      phrases[phrase] = (phrases[phrase] || 0) + 1;
    }
  }
  
  const repeatedPhrases = Object.values(phrases).filter(count => count > 1).length;
  
  return patternCount * 5 + repeatedPhrases * 3;
}

/**
 * AI 작성 여부 종합 분석
 */
export function analyzeAIContent(text: string): AIDetectionResult {
  const sentences = splitSentences(text);
  const words = splitWords(text);
  
  // 각 지표 계산
  const ttr = calculateTTR(words);
  const avgSentenceLength = calculateAvgSentenceLength(sentences);
  const sentenceLengthVariance = calculateSentenceLengthVariance(sentences);
  const connectorRatio = calculateConnectorRatio(text, sentences);
  const repetitionScore = calculateRepetitionScore(text);
  
  const indicators: string[] = [];
  let score = 0;
  
  // TTR 분석 (AI는 보통 0.5-0.7 사이)
  if (ttr >= 0.5 && ttr <= 0.75) {
    score += 15;
    indicators.push('어휘 다양성이 AI 작성 범위 내');
  }
  
  // 평균 문장 길이 분석 (AI는 40-80자 정도로 일정)
  if (avgSentenceLength >= 35 && avgSentenceLength <= 85) {
    score += 10;
    indicators.push('문장 길이가 AI 패턴과 유사');
  }
  
  // 문장 길이 분산 분석 (AI는 분산이 낮음, 20 미만)
  if (sentenceLengthVariance < 20 && sentences.length >= 3) {
    score += 20;
    indicators.push('문장 길이 변화가 적음 (일정한 패턴)');
  }
  
  // 접속사 사용 비율 (AI는 접속사를 자주 사용, 0.3 이상)
  if (connectorRatio >= 0.3) {
    score += 15;
    indicators.push('접속사 사용 빈도가 높음');
  }
  
  // AI 패턴 반복
  if (repetitionScore >= 10) {
    score += Math.min(repetitionScore, 30);
    indicators.push('AI 특유의 표현 패턴 감지');
  }
  
  // 텍스트 길이에 따른 보정 (짧은 텍스트는 분석 신뢰도 낮음)
  if (text.length < 300) {
    score = Math.floor(score * 0.7);
    indicators.push('(텍스트가 짧아 분석 신뢰도 낮음)');
  }
  
  // 점수 범위 제한
  score = Math.min(100, Math.max(0, score));
  
  // 레벨 결정
  let level: 'low' | 'medium' | 'high';
  if (score < 30) {
    level = 'low';
  } else if (score < 60) {
    level = 'medium';
  } else {
    level = 'high';
  }
  
  return {
    score,
    level,
    details: {
      ttr: Math.round(ttr * 100) / 100,
      avgSentenceLength: Math.round(avgSentenceLength),
      sentenceLengthVariance: Math.round(sentenceLengthVariance * 10) / 10,
      connectorRatio: Math.round(connectorRatio * 100) / 100,
      repetitionScore
    },
    indicators
  };
}

/**
 * AI 의심도 레벨에 따른 색상 반환
 */
export function getAILevelColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'low':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-600';
    case 'high':
      return 'text-red-600';
  }
}

/**
 * AI 의심도 레벨에 따른 배지 색상 반환
 */
export function getAILevelBadgeVariant(level: 'low' | 'medium' | 'high'): 'default' | 'secondary' | 'destructive' {
  switch (level) {
    case 'low':
      return 'secondary';
    case 'medium':
      return 'default';
    case 'high':
      return 'destructive';
  }
}

/**
 * AI 의심도 레벨 한글 라벨
 */
export function getAILevelLabel(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'low':
      return '낮음';
    case 'medium':
      return '보통';
    case 'high':
      return '높음';
  }
}
