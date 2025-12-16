# 🧡 MindTalk - AI 마음 상담 챗봇 만들기

> 중학생도 따라할 수 있는 React + Supabase AI 챗봇 개발 가이드

---

## 📚 목차

1. [MindTalk이란?](#1-mindtalk이란)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [UI 디자인 살펴보기](#3-ui-디자인-살펴보기)
4. [코드 상세 설명](#4-코드-상세-설명)
5. [Edge Function (백엔드)](#5-edge-function-백엔드)
6. [데이터베이스 연동](#6-데이터베이스-연동)
7. [위험 단어 감지 시스템](#7-위험-단어-감지-시스템)
8. [실습 과제](#8-실습-과제)

---

## 1. MindTalk이란?

MindTalk은 학생들의 마음 건강을 돕기 위한 **AI 상담 챗봇**입니다.

### 주요 기능
- 🤖 AI와 자유롭게 대화하기
- 🏷️ 태그를 클릭해서 대화 시작하기
- 💾 대화 내용 자동 저장
- ⚠️ 위험 단어 감지 및 담임선생님 알림

### 사용 기술
| 기술 | 설명 |
|------|------|
| React | 화면(UI)을 만드는 라이브러리 |
| TypeScript | 타입이 있는 자바스크립트 |
| Tailwind CSS | 스타일을 쉽게 적용하는 도구 |
| Supabase | 데이터베이스와 서버 기능 제공 |
| Google Gemini | AI 대화 기능 제공 |

---

## 2. 프로젝트 구조

```
📁 프로젝트
├── 📁 src/components/student/
│   └── 📄 MindTalk.tsx          ← 화면 컴포넌트 (프론트엔드)
│
├── 📁 supabase/functions/
│   ├── 📄 mindtalk-chat/        ← AI 대화 처리 (백엔드)
│   └── 📄 mindtalk-alert/       ← 위험 알림 발송 (백엔드)
│
└── 📁 데이터베이스 (Supabase)
    ├── 📊 mindtalk_messages     ← 대화 기록 저장
    └── 📊 mindtalk_alerts       ← 위험 감지 기록
```

### 💡 프론트엔드 vs 백엔드

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│    프론트엔드     │  ───▶   │     백엔드       │  ───▶   │   데이터베이스    │
│   (MindTalk.tsx) │         │  (Edge Function) │         │   (Supabase)    │
│   사용자가 보는   │         │   서버에서 실행   │         │   데이터 저장    │
│   화면과 버튼    │         │   AI API 호출    │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

---

## 3. UI 디자인 살펴보기

### 3.1 플로팅 버튼 (항상 보이는 버튼)

```tsx
<button
  onClick={() => setIsOpen(true)}
  className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 
             bg-gradient-to-r from-purple-500 to-pink-500 
             text-white rounded-full shadow-lg hover:shadow-xl 
             transition-all duration-300 hover:scale-105"
>
  <MessageCircleHeart className="w-5 h-5" />
  <span className="font-medium">MindTalk</span>
</button>
```

#### CSS 클래스 설명

| 클래스 | 의미 |
|--------|------|
| `fixed` | 화면에 고정 (스크롤해도 움직이지 않음) |
| `top-4 right-4` | 위에서 16px, 오른쪽에서 16px |
| `z-50` | 다른 요소들 위에 표시 |
| `bg-gradient-to-r` | 왼쪽에서 오른쪽으로 그라데이션 |
| `from-purple-500 to-pink-500` | 보라색에서 핑크색으로 |
| `rounded-full` | 완전히 둥근 모서리 |
| `hover:scale-105` | 마우스 올리면 5% 커짐 |

### 3.2 채팅 모달 (대화창)

```tsx
{isOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <Card className="w-full max-w-md h-[80vh] max-h-[600px] flex flex-col">
      {/* 헤더 */}
      {/* 메시지 목록 */}
      {/* 입력창 */}
    </Card>
  </div>
)}
```

#### 조건부 렌더링 이해하기

```tsx
{isOpen && (...)}
```

이것은 **"isOpen이 true일 때만 보여줘"** 라는 의미입니다.

| isOpen 값 | 결과 |
|-----------|------|
| `true` | 채팅창이 보임 |
| `false` | 채팅창이 안 보임 |

### 3.3 메시지 버블 디자인

```tsx
<div
  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
    message.role === 'user'
      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'  // 내 메시지
      : 'bg-white shadow-md border border-purple-100'              // AI 메시지
  }`}
>
  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
</div>
```

#### 조건에 따른 스타일 변경

```
사용자 메시지 (role === 'user')
┌─────────────────────────────────┐
│  보라-핑크 그라데이션 배경        │  ← 오른쪽 정렬
│  흰색 글씨                       │
└─────────────────────────────────┘

AI 메시지 (role === 'assistant')
┌─────────────────────────────────┐
│  흰색 배경                       │  ← 왼쪽 정렬
│  그림자와 테두리                  │
└─────────────────────────────────┘
```

---

## 4. 코드 상세 설명

### 4.1 인터페이스 정의 (데이터 타입)

```tsx
// 메시지 하나의 구조
interface Message {
  id?: string;           // 고유 ID (선택사항)
  role: 'user' | 'assistant';  // 누가 보낸 메시지인지
  content: string;       // 메시지 내용
  created_at?: string;   // 생성 시간 (선택사항)
}

// 컴포넌트가 받을 정보
interface MindTalkProps {
  studentId: string;     // 학번
  studentName: string;   // 이름
  studentGrade: number;  // 학년
  studentClass: number;  // 반
  studentNumber: number; // 번호
}
```

#### 💡 TypeScript 타입이란?

TypeScript는 변수에 어떤 종류의 값이 들어갈 수 있는지 미리 정해두는 것입니다.

```tsx
// ❌ 잘못된 사용 (타입 오류 발생)
const message: Message = {
  role: 'teacher',  // 오류! 'user' 또는 'assistant'만 가능
  content: 123      // 오류! string만 가능
};

// ✅ 올바른 사용
const message: Message = {
  role: 'user',
  content: '안녕하세요!'
};
```

### 4.2 상태(State) 관리

React에서 **상태(State)**는 화면에 표시되는 데이터를 관리합니다.

```tsx
const [isOpen, setIsOpen] = useState(false);        // 채팅창 열림/닫힘
const [messages, setMessages] = useState<Message[]>([initialMessage]);  // 메시지 목록
const [inputValue, setInputValue] = useState('');   // 입력창 내용
const [isLoading, setIsLoading] = useState(false);  // 로딩 중인지
const [dangerCount, setDangerCount] = useState(0);  // 위험 단어 감지 횟수
```

#### useState 이해하기

```tsx
const [값, 값변경함수] = useState(초기값);
```

```
예시: const [isOpen, setIsOpen] = useState(false);

┌────────────────────────────────────────────────┐
│  isOpen      → 현재 값을 읽을 때 사용           │
│  setIsOpen   → 값을 변경할 때 사용              │
│  false       → 처음 시작할 때의 값              │
└────────────────────────────────────────────────┘

사용 예:
  setIsOpen(true)   → isOpen이 true로 바뀜 → 화면 다시 그림
  setIsOpen(false)  → isOpen이 false로 바뀜 → 화면 다시 그림
```

### 4.3 useEffect - 특정 시점에 실행하기

```tsx
// 채팅창이 열릴 때 대화 기록 불러오기
useEffect(() => {
  if (isOpen && studentId) {
    loadMessages();      // 저장된 대화 불러오기
    loadDangerCount();   // 위험 단어 횟수 불러오기
  }
}, [isOpen, studentId]);
```

#### useEffect 이해하기

```tsx
useEffect(() => {
  // 실행할 코드
}, [감시할 변수들]);
```

```
┌─────────────────────────────────────────────────────┐
│  useEffect는 "감시할 변수들"이 변할 때마다 실행됩니다   │
│                                                     │
│  [isOpen, studentId]가 변경되면                      │
│  → 조건 확인 (isOpen && studentId)                  │
│  → 조건이 맞으면 loadMessages() 실행                 │
└─────────────────────────────────────────────────────┘
```

### 4.4 태그 카테고리 데이터 구조

```tsx
const TAG_CATEGORIES = {
  '심리': {
    color: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    tags: [
      { label: '우울·무기력', prompt: '요즘 아무것도 하기 싫어...' },
      { label: '불안·스트레스', prompt: '사소한 일에도 자꾸 걱정이...' },
      { label: '분노·짜증', prompt: '요즘 별일 아닌데도 짜증이 나...' },
    ]
  },
  '관계': {
    color: 'bg-pink-100 text-pink-700 hover:bg-pink-200',
    tags: [
      { label: '친구 관계', prompt: '친구랑 말다툼을 했는데...' },
      // ...
    ]
  },
  // ...
};
```

#### 데이터 구조 시각화

```
TAG_CATEGORIES (객체)
├── '심리' (키)
│   ├── color: 'bg-purple-100...'
│   └── tags: [
│         { label: '우울·무기력', prompt: '...' },
│         { label: '불안·스트레스', prompt: '...' },
│         { label: '분노·짜증', prompt: '...' }
│       ]
├── '관계' (키)
│   ├── color: 'bg-pink-100...'
│   └── tags: [...]
├── '진로·학습' (키)
│   └── ...
└── '성장' (키)
    └── ...
```

### 4.5 메시지 전송 함수

```tsx
const sendMessage = useCallback(async () => {
  // 1. 빈 메시지이거나 로딩 중이면 종료
  if (!inputValue.trim() || isLoading) return;

  // 2. 사용자 메시지 생성
  const userMessage: Message = { role: 'user', content: inputValue.trim() };
  
  // 3. 화면에 메시지 추가
  setMessages(prev => [...prev, userMessage]);
  
  // 4. 입력창 비우기
  setInputValue('');
  
  // 5. 로딩 시작
  setIsLoading(true);

  // 6. 위험 단어 체크
  const dangerWordsInMessage = checkDangerousWords(userMessage.content);
  
  // 7. 위험 단어가 있으면 카운트 증가 및 알림 처리
  if (dangerWordsInMessage > 0) {
    // ... 위험 단어 처리 로직
  }

  // 8. 메시지 데이터베이스에 저장
  await saveMessage('user', userMessage.content);

  // 9. AI에게 메시지 보내고 응답 받기
  try {
    const response = await fetch(/* Edge Function 호출 */);
    // ... 스트리밍 응답 처리
  } catch (error) {
    // 오류 처리
  } finally {
    setIsLoading(false);
  }
}, [inputValue, isLoading, messages, studentId, studentName]);
```

#### 🔄 메시지 전송 흐름

```
사용자가 전송 버튼 클릭
        │
        ▼
┌───────────────────┐
│ 1. 입력값 검증     │ ← 빈 메시지면 종료
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 2. 메시지 화면 추가 │ ← setMessages([...prev, userMessage])
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 3. 위험 단어 체크   │ ← 자살, 폭력 등의 단어 검사
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 4. DB에 저장       │ ← student_save_mindtalk_message
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 5. AI API 호출     │ ← Edge Function 호출
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 6. 스트리밍 응답    │ ← 글자 하나씩 받아서 화면에 표시
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 7. AI 응답 저장    │ ← DB에 저장
└───────────────────┘
```

### 4.6 스트리밍 응답 처리

```tsx
// AI 응답을 실시간으로 받아서 표시하기
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let assistantContent = '';

// 빈 AI 메시지 먼저 추가
setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

while (reader) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value, { stream: true });
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          assistantContent += content;
          // 마지막 메시지(AI 메시지) 업데이트
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: assistantContent
            };
            return newMessages;
          });
        }
      } catch {
        // JSON 파싱 오류 무시
      }
    }
  }
}
```

#### 스트리밍이란?

```
일반 응답:
┌─────────────────────────────────────────────────┐
│  요청 ────────(기다림)────────▶ 전체 응답 한번에  │
└─────────────────────────────────────────────────┘

스트리밍 응답:
┌─────────────────────────────────────────────────┐
│  요청 ──▶ "안" ──▶ "녕" ──▶ "하" ──▶ "세" ──▶ "요" │
│         (조금씩 계속 받음 - 타이핑 효과)           │
└─────────────────────────────────────────────────┘
```

---

## 5. Edge Function (백엔드)

### 5.1 mindtalk-chat 함수

파일 위치: `supabase/functions/mindtalk-chat/index.ts`

```tsx
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS 설정 (다른 도메인에서 접근 허용)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 위험 단어 목록
const DANGEROUS_WORDS = [
  '자살', '죽고 싶', '죽어버리', '죽을래', '죽겠', 
  '폭력', '때리고 싶', '때려죽', '패죽', '칼', '칼로',
  '목매', '뛰어내리', '약 먹고', '손목', '자해',
  '죽여버리', '살인', '복수', '없어지고 싶', '사라지고 싶'
];

// AI에게 전달할 시스템 프롬프트 (AI의 성격 설정)
const SYSTEM_PROMPT = `당신은 '마음톡'이라는 이름의 따뜻하고 공감적인 AI 상담사입니다.

역할:
- 학생들의 고민을 경청하고 공감해주는 친구 같은 상담사
- 심판하지 않고, 비난하지 않으며, 항상 학생 편에 서서 이야기를 들어줌
- 부드럽고 따뜻한 말투로 대화

대화 원칙:
1. 먼저 학생의 감정을 인정하고 공감 표현을 해주세요
2. "그랬구나", "많이 힘들었겠다", "충분히 그럴 수 있어" 같은 공감 표현을 자주 사용하세요
3. 조언은 학생이 준비됐을 때만, 질문 형태로 부드럽게 제안하세요
...`;

serve(async (req) => {
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 요청에서 메시지 추출
    const { messages, studentId, studentName } = await req.json();
    
    // API 키 가져오기
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // AI API 호출
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    // 스트리밍 응답 반환
    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
      },
    });
  } catch (error) {
    // 오류 처리
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

#### Edge Function 이해하기

```
┌─────────────────────────────────────────────────────────────┐
│                    Edge Function이란?                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  • 서버에서 실행되는 코드                                    │
│  • 브라우저에서 직접 실행하면 안 되는 작업 처리               │
│    - API 키 보관 (비밀 정보)                                 │
│    - 외부 API 호출                                          │
│    - 데이터베이스 직접 접근                                  │
│                                                             │
│  프론트엔드           Edge Function           외부 API       │
│  (브라우저)    ───▶   (서버)         ───▶   (Google AI)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 데이터베이스 연동

### 6.1 RPC 함수란?

RPC (Remote Procedure Call)는 **데이터베이스에 저장된 함수를 원격으로 호출**하는 것입니다.

```tsx
// 메시지 저장하기
await supabase.rpc('student_save_mindtalk_message', {
  student_id_input: studentId,
  role_input: role,
  content_input: content
});

// 메시지 불러오기
const { data, error } = await supabase.rpc('student_get_mindtalk_messages', {
  student_id_input: studentId
});
```

### 6.2 사용되는 RPC 함수들

| 함수명 | 설명 | 파라미터 |
|--------|------|----------|
| `student_save_mindtalk_message` | 메시지 저장 | student_id, role, content |
| `student_get_mindtalk_messages` | 메시지 조회 | student_id |
| `get_mindtalk_danger_count` | 위험 횟수 조회 | student_id |
| `update_mindtalk_danger_count` | 위험 횟수 증가 | student_id, increment_by |
| `update_mindtalk_alert_sent` | 알림 전송 기록 | student_id |

### 6.3 데이터베이스 테이블 구조

```sql
-- mindtalk_messages 테이블
CREATE TABLE mindtalk_messages (
  id UUID PRIMARY KEY,          -- 고유 ID
  student_id TEXT NOT NULL,     -- 학번
  role TEXT NOT NULL,           -- 'user' 또는 'assistant'
  content TEXT NOT NULL,        -- 메시지 내용
  created_at TIMESTAMP          -- 생성 시간
);

-- mindtalk_alerts 테이블
CREATE TABLE mindtalk_alerts (
  id UUID PRIMARY KEY,
  student_id TEXT UNIQUE,       -- 학번 (중복 불가)
  dangerous_word_count INTEGER, -- 위험 단어 누적 횟수
  last_alert_sent_at TIMESTAMP, -- 마지막 알림 발송 시간
  last_alert_count INTEGER      -- 마지막 알림 때 횟수
);
```

---

## 7. 위험 단어 감지 시스템

### 7.1 감지 로직

```tsx
const DANGEROUS_WORDS = [
  '자살', '죽고 싶', '죽어버리', '죽을래', '죽겠',
  '폭력', '때리고 싶', '때려죽', '패죽', '칼', '칼로',
  '목매', '뛰어내리', '약 먹고', '손목', '자해',
  '죽여버리', '살인', '복수', '없어지고 싶', '사라지고 싶'
];

const checkDangerousWords = (text: string): number => {
  let count = 0;
  DANGEROUS_WORDS.forEach(word => {
    if (text.includes(word)) {
      count++;
    }
  });
  return count;
};
```

### 7.2 알림 발송 흐름

```
사용자 메시지 입력
        │
        ▼
┌───────────────────────┐
│ 위험 단어 검사         │
│ checkDangerousWords() │
└───────────────────────┘
        │
        ▼
    위험 단어 있음?
        │
    ┌───┴───┐
   Yes     No
    │       │
    ▼       └───▶ 정상 진행
┌───────────────────────┐
│ 위험 횟수 증가         │
│ update_mindtalk_      │
│ danger_count          │
└───────────────────────┘
        │
        ▼
    횟수 >= 3이고
    이전 알림 후 3회 이상?
        │
    ┌───┴───┐
   Yes     No
    │       │
    ▼       └───▶ 저장만
┌───────────────────────┐
│ 담임선생님에게 알림     │
│ sendAlertToTeacher()  │
└───────────────────────┘
```

---

## 8. 실습 과제

### 과제 1: 새로운 태그 카테고리 추가하기

TAG_CATEGORIES에 새로운 카테고리를 추가해보세요.

```tsx
// 예시: '취미' 카테고리 추가
'취미': {
  color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  tags: [
    { label: '게임', prompt: '요즘 재미있는 게임이 있는데 이야기해도 될까?' },
    { label: '음악', prompt: '좋아하는 노래가 있는데 추천해줄까?' },
    { label: '운동', prompt: '운동을 시작해보고 싶은데 뭐가 좋을까?' },
  ]
}
```

### 과제 2: 초기 메시지 수정하기

getInitialMessage 함수를 수정해서 다른 인사말을 만들어보세요.

```tsx
const getInitialMessage = (studentName: string): Message => ({
  role: 'assistant',
  content: `${studentName}! 오늘도 수고했어 👏\n\n혹시 이야기하고 싶은 거 있어?`
});
```

### 과제 3: 위험 단어 목록 확장하기

DANGEROUS_WORDS 배열에 새로운 위험 단어를 추가해보세요.

```tsx
const DANGEROUS_WORDS = [
  // 기존 단어들...
  '힘들어', '지쳤어', '포기하고 싶어'  // 새로 추가
];
```

### 과제 4: 버튼 색상 변경하기

플로팅 버튼의 그라데이션 색상을 변경해보세요.

```tsx
// 파란색-초록색 그라데이션으로 변경
className="... bg-gradient-to-r from-blue-500 to-green-500 ..."
```

---

## 📝 용어 정리

| 용어 | 설명 |
|------|------|
| **컴포넌트** | 화면의 한 부분을 담당하는 독립적인 코드 블록 |
| **State (상태)** | 컴포넌트가 기억하고 있는 데이터 |
| **Props** | 부모 컴포넌트가 자식에게 전달하는 데이터 |
| **Hook** | React의 특별한 함수 (useState, useEffect 등) |
| **스트리밍** | 데이터를 조금씩 나눠서 받는 방식 |
| **Edge Function** | 서버에서 실행되는 함수 |
| **RPC** | 원격 프로시저 호출 (서버의 함수를 호출) |
| **CORS** | 다른 도메인 간의 통신 허용 설정 |

---

## 🎉 마무리

축하합니다! MindTalk의 전체 구조와 코드를 이해했습니다.

### 배운 내용 정리

1. ✅ React 컴포넌트 구조
2. ✅ useState와 useEffect 사용법
3. ✅ Tailwind CSS로 스타일 적용
4. ✅ Supabase RPC 함수 호출
5. ✅ Edge Function으로 AI API 연동
6. ✅ 스트리밍 응답 처리
7. ✅ 조건부 렌더링

### 더 공부해보면 좋은 것들

- React 공식 문서: https://react.dev
- Tailwind CSS 문서: https://tailwindcss.com
- Supabase 문서: https://supabase.com/docs

---

*이 문서는 2024년 12월에 작성되었습니다.*
*질문이 있으면 언제든 물어보세요! 🙋‍♂️*
