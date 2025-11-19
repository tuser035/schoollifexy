-- 트리거 함수를 개선하여 email unique 제약도 처리
CREATE OR REPLACE FUNCTION public.sync_teacher_to_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_admin_id uuid;
BEGIN
  IF NEW.is_admin = true THEN
    -- 같은 email을 가진 다른 관리자가 있는지 확인
    SELECT id INTO existing_admin_id
    FROM public.admins
    WHERE email = NEW.teacher_email AND id != NEW.id;
    
    IF existing_admin_id IS NOT NULL THEN
      -- 같은 email을 사용하는 다른 관리자가 있으면 에러 발생
      RAISE EXCEPTION '이메일 %는 이미 다른 관리자가 사용 중입니다', NEW.teacher_email;
    END IF;
    
    -- admins 테이블에 교사 정보 추가 (이미 존재하면 업데이트)
    INSERT INTO public.admins (id, email, name, password_hash)
    VALUES (NEW.id, NEW.teacher_email, NEW.name, NEW.password_hash)
    ON CONFLICT (id) 
    DO UPDATE SET 
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash;
      
  ELSIF OLD.is_admin = true AND NEW.is_admin = false THEN
    -- is_admin이 false로 변경되면 admins 테이블에서 삭제
    DELETE FROM public.admins WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- email unique 제약 위반 시 더 명확한 에러 메시지
    RAISE EXCEPTION '이메일 %는 이미 다른 관리자가 사용 중입니다', NEW.teacher_email;
  WHEN OTHERS THEN
    -- 기타 에러 발생 시 롤백
    RAISE;
END;
$$;