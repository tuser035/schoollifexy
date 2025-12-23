-- Update student_submit_book_report to auto-award 10 points for 200+ characters
CREATE OR REPLACE FUNCTION student_submit_book_report(
  student_id_input text,
  book_title_input text,
  content_input text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  content_length int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM students WHERE student_id = student_id_input) THEN
    RAISE EXCEPTION 'Unauthorized: Invalid student';
  END IF;

  -- Check if already submitted for this book
  IF EXISTS (SELECT 1 FROM book_reports WHERE student_id = student_id_input AND book_title = book_title_input) THEN
    RAISE EXCEPTION 'Already submitted a report for this book';
  END IF;

  -- Calculate content length
  content_length := char_length(content_input);

  -- Insert with auto-award 10 points if 200+ characters
  IF content_length >= 200 THEN
    INSERT INTO book_reports (student_id, book_title, content, points_awarded, status)
    VALUES (student_id_input, book_title_input, content_input, 10, 'approved')
    RETURNING id INTO new_id;
  ELSE
    INSERT INTO book_reports (student_id, book_title, content)
    VALUES (student_id_input, book_title_input, content_input)
    RETURNING id INTO new_id;
  END IF;

  RETURN new_id;
END;
$$;