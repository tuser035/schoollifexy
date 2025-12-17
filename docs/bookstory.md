# 동화책 제작 및 관리 가이드

## 목차
1. [개요](#개요)
2. [관리자 동화책 제작](#관리자-동화책-제작)
3. [이미지 생성 (AI 활용)](#이미지-생성-ai-활용)
4. [CSV 일괄 업로드](#csv-일괄-업로드)
5. [학생 동화책 읽기](#학생-동화책-읽기)
6. [데이터베이스 구조](#데이터베이스-구조)

---

## 개요

School Life 시스템의 동화책 기능은 학생들이 매일 3~6페이지의 인문학 동화책을 읽을 수 있도록 설계되었습니다.

### 주요 특징
- **관리자**: 동화책 생성, 편집, 출판 관리
- **학생**: 동화책 읽기, 리뷰 작성, 북마크, TTS 음성 듣기
- **통계**: 인기 도서 차트, 학생별 독서 통계

---

## 관리자 동화책 제작

### 1단계: 새 동화책 만들기

1. **관리자 대시보드** 접속
2. 좌측 메뉴에서 **"동화책"** 클릭
3. **"새 동화책 만들기"** 버튼 클릭
4. 동화책 정보 입력:
   - **제목**: 동화책 제목 (예: "용기 있는 작은 씨앗")
   - **설명**: 동화책 소개 (선택사항)

```
예시:
제목: 용기 있는 작은 씨앗
설명: 작은 씨앗이 큰 나무가 되기까지의 여정을 담은 이야기
```

### 2단계: 표지 이미지 업로드

1. 동화책 목록에서 **"편집"** 버튼 클릭
2. **"표지"** 탭 선택
3. **"이미지 업로드"** 클릭하여 표지 이미지 선택
4. 지원 형식: JPG, PNG, WebP (최대 5MB)

### 3단계: 페이지 내용 작성

1. **"페이지"** 탭 선택
2. 각 페이지마다:
   - **왼쪽**: 이미지 업로드 (삽화)
   - **오른쪽**: 텍스트 입력 (본문)

#### 텍스트 작성 규칙

```
첫 번째 줄: 소제목 (📖 이모지와 함께 강조 표시됨)
나머지 줄: 본문 내용

예시:
씨앗의 꿈
어느 날, 작은 씨앗 하나가 땅속에서 잠을 자고 있었어요.
씨앗은 꿈을 꾸었어요. 하늘 높이 자라는 큰 나무가 되는 꿈이었죠.
```

### 4단계: 페이지 저장 및 이동

1. 텍스트 입력 후 **"저장"** 버튼 클릭
2. **"다음"** 버튼으로 다음 페이지 이동
3. 새 페이지는 자동으로 생성됨
4. **주의**: 저장하지 않고 페이지 이동 시 확인 대화상자 표시

### 5단계: 미리보기 및 출판

1. 동화책 목록에서 **"미리보기"** 버튼으로 확인
2. 미리보기 기능:
   - 전체화면 모드
   - TTS 음성 읽기
   - 읽기 속도 조절 (0.5x ~ 2x)
3. 확인 후 **"출판"** 버튼 클릭
4. 출판된 동화책만 학생에게 표시됨

---

## 이미지 생성 (AI 활용)

### Google Gemini Ultra 활용

동화책 삽화를 AI로 생성할 수 있습니다.

#### 시스템 프롬프트 예시

```
당신은 어린이 동화책 삽화를 그리는 전문 일러스트레이터입니다.
따뜻하고 친근한 느낌의 수채화 스타일로 그려주세요.
```

#### 이미지 생성 프롬프트

```
위의 4개 장면(홀수 쪽)에 들어갈 이미지를 지금 바로 다 그려줘
```

#### 권장 이미지 사양
- **크기**: 1024 x 1024px 또는 1920 x 1080px
- **형식**: PNG 또는 JPG
- **스타일**: 수채화, 파스텔톤 권장

### 이미지 다운로드 및 업로드

1. AI가 생성한 이미지 다운로드
2. 관리자 대시보드에서 해당 페이지의 이미지 업로드
3. 이미지는 Supabase Storage `storybook-images` 버킷에 저장

---

## CSV 일괄 업로드

여러 동화책을 한 번에 등록할 수 있습니다.

### CSV 템플릿 다운로드

1. **"CSV 템플릿 다운로드"** 버튼 클릭
2. 템플릿 파일 구조:

```csv
title,description,page1_text,page2_text,page3_text,page4_text,page5_text,page6_text
용기 있는 씨앗,씨앗의 성장 이야기,첫 번째 페이지 내용,두 번째 페이지 내용,...
친절한 구름,구름의 여행 이야기,첫 번째 페이지 내용,...
```

### CSV 파일 작성 규칙

| 컬럼명 | 설명 | 필수 |
|--------|------|------|
| title | 동화책 제목 | ✅ |
| description | 동화책 설명 | ❌ |
| page1_text ~ page6_text | 각 페이지 텍스트 | 최소 1개 |

### CSV 업로드

1. **"CSV 업로드"** 버튼 클릭
2. 작성한 CSV 파일 선택
3. 업로드 진행률 확인
4. 완료 후 동화책 목록에서 확인

**주의**: CSV로 업로드된 동화책은 텍스트만 포함됩니다. 이미지는 별도로 편집에서 추가해야 합니다.

---

## 학생 동화책 읽기

### 접속 방법

1. 학생 로그인
2. 학생 대시보드에서 **"동화책"** 메뉴 클릭

### 읽기 화면 기능

#### 데스크톱 (2페이지 펼침)
- **왼쪽**: 삽화 이미지
- **오른쪽**: 텍스트 내용

#### 모바일 (1페이지씩)
- 스와이프로 페이지 이동
- 가로 모드 지원

### 주요 기능

| 기능 | 설명 | 단축키/제스처 |
|------|------|---------------|
| 페이지 이동 | 이전/다음 페이지 | 좌우 스와이프 |
| TTS 듣기 | 음성으로 텍스트 읽기 | 🔊 버튼 |
| 읽기 속도 | 0.5x ~ 2x 조절 | 슬라이더 |
| 전체화면 | 몰입 읽기 모드 | 🔲 버튼 |
| 북마크 | 페이지 즐겨찾기 | 🔖 버튼 |

### 독서 진행 저장

- 마지막으로 읽은 페이지 자동 저장
- 다음 접속 시 이어서 읽기 가능
- 완독 시 축하 애니메이션 표시

### 리뷰 작성

1. 동화책 완독 후 **"리뷰 작성"** 버튼 클릭
2. 별점 (1~5점) 선택
3. 리뷰 내용 작성
4. **"공개"** 설정 시 다른 학생에게도 표시

---

## 데이터베이스 구조

### 테이블 구조

#### storybooks (동화책)
```sql
CREATE TABLE storybooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_number INTEGER NOT NULL,        -- 동화책 번호
  title TEXT NOT NULL,                 -- 제목
  description TEXT,                    -- 설명
  cover_image_url TEXT,                -- 표지 이미지 URL
  page_count INTEGER DEFAULT 0,        -- 페이지 수
  is_published BOOLEAN DEFAULT false,  -- 출판 여부
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### storybook_pages (동화책 페이지)
```sql
CREATE TABLE storybook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES storybooks(id),
  page_number INTEGER NOT NULL,        -- 페이지 번호
  image_url TEXT,                      -- 삽화 이미지 URL
  text_content TEXT,                   -- 텍스트 내용
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### storybook_reading_history (읽기 기록)
```sql
CREATE TABLE storybook_reading_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,            -- 학생 ID
  book_id UUID REFERENCES storybooks(id),
  last_page INTEGER DEFAULT 1,         -- 마지막 읽은 페이지
  is_completed BOOLEAN DEFAULT false,  -- 완독 여부
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### storybook_reviews (리뷰)
```sql
CREATE TABLE storybook_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  book_id UUID REFERENCES storybooks(id),
  rating INTEGER,                      -- 별점 (1-5)
  content TEXT NOT NULL,               -- 리뷰 내용
  is_public BOOLEAN DEFAULT false,     -- 공개 여부
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### storybook_page_bookmarks (페이지 북마크)
```sql
CREATE TABLE storybook_page_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  book_id UUID REFERENCES storybooks(id),
  page_number INTEGER NOT NULL,        -- 북마크된 페이지
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 주요 RPC 함수

| 함수명 | 설명 | 사용자 |
|--------|------|--------|
| admin_get_storybooks | 모든 동화책 조회 | 관리자 |
| admin_insert_storybook | 동화책 생성 | 관리자 |
| admin_upsert_storybook_page | 페이지 저장/수정 | 관리자 |
| admin_publish_storybook | 동화책 출판 | 관리자 |
| admin_delete_storybook | 동화책 삭제 | 관리자 |
| student_get_storybooks | 출판된 동화책 조회 | 학생 |
| student_get_storybook_pages | 페이지 내용 조회 | 학생 |
| student_update_reading_progress | 읽기 진행 저장 | 학생 |
| student_save_review | 리뷰 저장 | 학생 |
| student_toggle_page_bookmark | 북마크 토글 | 학생 |

---

## 워크플로우 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    관리자 워크플로우                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 새 동화책 만들기                                         │
│     ↓                                                       │
│  2. 표지 이미지 업로드                                       │
│     ↓                                                       │
│  3. AI로 삽화 생성 (Gemini Ultra)                           │
│     ↓                                                       │
│  4. 각 페이지 이미지 + 텍스트 입력                           │
│     ↓                                                       │
│  5. 미리보기로 확인 (TTS, 전체화면)                          │
│     ↓                                                       │
│  6. 출판하기                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    학생 워크플로우                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 동화책 서재에서 책 선택                                   │
│     ↓                                                       │
│  2. 읽기 (TTS, 전체화면, 북마크)                             │
│     ↓                                                       │
│  3. 읽기 진행 자동 저장                                      │
│     ↓                                                       │
│  4. 완독 시 축하 애니메이션                                   │
│     ↓                                                       │
│  5. 리뷰 작성 (별점 + 감상문)                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 문의

시스템 관련 문의: gyeongjuhs@naver.com
