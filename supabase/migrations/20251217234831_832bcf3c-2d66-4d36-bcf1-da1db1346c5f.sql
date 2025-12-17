-- Fix ambiguous column reference in student_get_storybook_pages function
CREATE OR REPLACE FUNCTION public.student_get_storybook_pages(student_id_input text, book_id_input uuid)
RETURNS TABLE(id uuid, page_number integer, image_url text, text_content text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 발행된 책만 조회 가능 (use table alias to avoid ambiguity)
  IF NOT EXISTS (SELECT 1 FROM public.storybooks s WHERE s.id = book_id_input AND s.is_published = true) THEN
    RAISE EXCEPTION '해당 동화책을 찾을 수 없습니다';
  END IF;

  RETURN QUERY
  SELECT p.id, p.page_number, p.image_url, p.text_content
  FROM public.storybook_pages p
  WHERE p.book_id = book_id_input
  ORDER BY p.page_number;
END;
$$;