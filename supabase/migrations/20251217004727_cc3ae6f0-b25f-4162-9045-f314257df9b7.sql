-- 고위험 키워드 테이블 생성
CREATE TABLE public.mindtalk_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '기타',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 유니크 제약조건 (같은 키워드 중복 방지)
ALTER TABLE public.mindtalk_keywords ADD CONSTRAINT mindtalk_keywords_keyword_unique UNIQUE (keyword);

-- RLS 활성화
ALTER TABLE public.mindtalk_keywords ENABLE ROW LEVEL SECURITY;

-- 관리자 정책
CREATE POLICY "Admins can manage keywords" ON public.mindtalk_keywords
  FOR ALL USING (
    (current_setting('app.current_admin_id'::text, true) IS NOT NULL) 
    AND (current_setting('app.current_admin_id'::text, true) <> ''::text)
  );

-- 교사도 조회 가능
CREATE POLICY "Teachers can view keywords" ON public.mindtalk_keywords
  FOR SELECT USING (
    (current_setting('app.current_teacher_id'::text, true) IS NOT NULL) 
    AND (current_setting('app.current_teacher_id'::text, true) <> ''::text)
  );

-- 학생도 조회 가능 (키워드 체크용)
CREATE POLICY "Students can view keywords" ON public.mindtalk_keywords
  FOR SELECT USING (
    (current_setting('app.current_student_id'::text, true) IS NOT NULL) 
    AND (current_setting('app.current_student_id'::text, true) <> ''::text)
  );

-- 공개 조회 허용 (Edge Function에서 사용)
CREATE POLICY "Public can view active keywords" ON public.mindtalk_keywords
  FOR SELECT USING (is_active = true);

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_mindtalk_keywords_updated_at
  BEFORE UPDATE ON public.mindtalk_keywords
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 기존 키워드 데이터 삽입
INSERT INTO public.mindtalk_keywords (keyword, category, description) VALUES
-- I. 자살 징후 및 심각한 우울 상태
('자살 계획', '자살징후', '구체적인 자살 계획'),
('자살하겠다', '자살징후', '자살 의지 표현'),
('자살할 생각', '자살징후', '자살 사고'),
('기회만 있으면 자살', '자살징후', '자살 기회 탐색'),
('견딜 수 없', '우울', '극심한 고통'),
('도저히 견딜 수 없', '우울', '극심한 고통'),
('불행해서', '우울', '불행감'),
('절망적', '우울', '절망감'),
('나아질 가망', '우울', '희망 상실'),
('가망이 없', '우울', '희망 상실'),
('실패자', '우울', '자기비하'),
('완전한 실패자', '우울', '자기비하'),
('죄책감', '우울', '죄책감'),
('항상 죄책감', '우울', '만성 죄책감'),
('나 자신 증오', '우울', '자기혐오'),
('내가 싫', '우울', '자기혐오'),
('나를 증오', '우울', '자기혐오'),
('모든 나쁜 일', '우울', '자기비난'),
('내 탓', '우울', '자기비난'),
('귀찮', '우울', '무기력'),
('만사가 귀찮', '우울', '무기력'),
('재미가 없', '우울', '무쾌감'),
('울 기력', '우울', '울 수 없음'),
('울 수도 없', '우울', '울 수 없음'),
-- II. 충동 조절 및 자기 파괴적 행동
('화 참기', '충동조절', '분노 조절 어려움'),
('화가 나면 참기', '충동조절', '분노 조절 어려움'),
('무단결석', '비행', '규칙 위반'),
('가출', '비행', '가출'),
('유흥업소', '비행', '유흥업소 출입'),
('폭력', '충동조절', '폭력성'),
('괴롭히', '충동조절', '가해 행동'),
('때리', '충동조절', '폭력성'),
('체중 감량', '섭식', '무리한 다이어트'),
('단식', '섭식', '단식'),
('살 빼려고', '섭식', '체중 집착'),
('폭식', '섭식', '폭식'),
('토할 정도', '섭식', '폭식'),
('기다리지 못', '충동조절', '충동성'),
('생각보다 행동', '충동조절', '충동성'),
('담배', '약물', '흡연'),
('술', '약물', '음주'),
('본드', '약물', '약물 사용'),
('약물', '약물', '약물 사용'),
-- III. 현실 판단/사고 과정 어려움
('환청', '정신증', '환청'),
('말소리가 들', '정신증', '환청'),
('목소리가 들', '정신증', '환청'),
('감시', '정신증', '피해사고'),
('해칠 것 같', '정신증', '피해사고'),
('피해 의식', '정신증', '피해사고'),
('내 생각을 알', '정신증', '사고전파'),
('생각을 다 알', '정신증', '사고전파'),
-- IV. 일상 기능 저하 및 사회적 고립
('결정할 수 없', '기능저하', '결정 불능'),
('결정도 내릴 수 없', '기능저하', '결정 불능'),
('아무 일도 할 수 없', '기능저하', '활동 불능'),
('할 수가 없', '기능저하', '활동 불능'),
('피곤해서', '기능저하', '피로'),
('너무 피곤', '기능저하', '극심한 피로'),
('친한 친구가 없', '고립', '사회적 고립'),
('친구 사귀기 어려', '고립', '사회적 고립'),
('불만스럽', '정서', '불만'),
('싫증', '정서', '싫증'),
-- 기존 직접적 자해/자살 키워드
('자살', '자살징후', '자살 언급'),
('죽고 싶', '자살징후', '자살 사고'),
('죽어버리', '자살징후', '자살 사고'),
('죽을래', '자살징후', '자살 사고'),
('죽겠', '자살징후', '자살 사고'),
('목매', '자해', '자해 방법'),
('뛰어내리', '자해', '자해 방법'),
('손목', '자해', '자해 방법'),
('자해', '자해', '자해'),
('죽여버리', '폭력', '타해 사고'),
('살인', '폭력', '타해 사고'),
('복수', '폭력', '복수심'),
('없어지고 싶', '자살징후', '소멸 욕구'),
('사라지고 싶', '자살징후', '소멸 욕구');