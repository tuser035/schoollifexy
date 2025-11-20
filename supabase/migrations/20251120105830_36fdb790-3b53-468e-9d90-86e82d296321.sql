-- Add search_path security setting to all functions
-- This prevents potential security vulnerabilities where malicious users could
-- create conflicting objects in other schemas

-- Update all functions to set search_path = public
-- Even if some already have it, re-applying doesn't cause issues

ALTER FUNCTION public.admin_delete_student(uuid, text) SET search_path = public;
ALTER FUNCTION public.admin_delete_teacher(uuid, text) SET search_path = public;
ALTER FUNCTION public.admin_update_student(uuid, text, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.admin_get_students(uuid, text, integer, integer) SET search_path = public;
ALTER FUNCTION public.student_get_merits(text) SET search_path = public;
ALTER FUNCTION public.student_get_demerits(text) SET search_path = public;
ALTER FUNCTION public.admin_get_leaderboard(uuid, integer, integer, integer) SET search_path = public;
ALTER FUNCTION public.student_get_monthly(text) SET search_path = public;
ALTER FUNCTION public.admin_insert_student(uuid, text, text, integer, integer, integer, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.admin_update_teacher(uuid, text, text, text, text, integer, integer, text, text, boolean) SET search_path = public;
ALTER FUNCTION public.admin_update_teacher(uuid, text, text, text, text, integer, integer, text, text, boolean, boolean) SET search_path = public;
ALTER FUNCTION public.get_class_monthly_statistics(uuid, integer, integer, integer) SET search_path = public;
ALTER FUNCTION public.admin_get_email_history(uuid, text, integer, integer) SET search_path = public;
ALTER FUNCTION public.admin_insert_student_group(uuid, text, text[]) SET search_path = public;
ALTER FUNCTION public.admin_get_storage_files(uuid, text) SET search_path = public;
ALTER FUNCTION public.admin_get_email_templates(uuid, template_type) SET search_path = public;
ALTER FUNCTION public.admin_get_student_groups(uuid) SET search_path = public;
ALTER FUNCTION public.is_admin_user(uuid) SET search_path = public;
ALTER FUNCTION public.teacher_login(text, text) SET search_path = public;
ALTER FUNCTION public.admin_insert_email_template(text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.admin_update_email_template(text, text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.admin_delete_email_template(text, text) SET search_path = public;
ALTER FUNCTION public.insert_monthly_recommendation(text, uuid, text, text, text[], integer, integer) SET search_path = public;
ALTER FUNCTION public.insert_counseling_record(text, text, date, text, uuid, text) SET search_path = public;
ALTER FUNCTION public.admin_get_teachers(uuid, text, integer, integer) SET search_path = public;
ALTER FUNCTION public.admin_get_teachers(uuid, text, integer, integer, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.admin_get_demerits(uuid, text, integer, integer) SET search_path = public;
ALTER FUNCTION public.admin_get_merits(uuid, text, integer, integer) SET search_path = public;
ALTER FUNCTION public.log_audit_event(text, text, text, text, text, jsonb, jsonb, text, text) SET search_path = public;
ALTER FUNCTION public.student_login(text, text) SET search_path = public;
ALTER FUNCTION public.log_data_change() SET search_path = public;
ALTER FUNCTION public.admin_insert_teacher(uuid, text, text, text, integer, integer, boolean, text, text, text) SET search_path = public;
ALTER FUNCTION public.admin_get_merit_details(uuid, text) SET search_path = public;
ALTER FUNCTION public.admin_get_demerit_details(uuid, text) SET search_path = public;
ALTER FUNCTION public.admin_get_monthly_details(uuid, text) SET search_path = public;
ALTER FUNCTION public.admin_get_monthly(uuid, text, integer, integer) SET search_path = public;
ALTER FUNCTION public.insert_merit(text, uuid, text, text, integer, text[]) SET search_path = public;
ALTER FUNCTION public.insert_demerit(text, uuid, text, text, integer, text[]) SET search_path = public;
ALTER FUNCTION public.get_counseling_records(uuid, text) SET search_path = public;
ALTER FUNCTION public.update_counseling_record(uuid, uuid, text, date, text, text) SET search_path = public;
ALTER FUNCTION public.delete_counseling_record(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.set_admin_session(uuid) SET search_path = public;
ALTER FUNCTION public.set_teacher_session(uuid) SET search_path = public;
ALTER FUNCTION public.set_student_session(text) SET search_path = public;
ALTER FUNCTION public.verify_admin_password(text, text) SET search_path = public;
ALTER FUNCTION public.update_student_password(text, text) SET search_path = public;
ALTER FUNCTION public.update_teacher_password(uuid, text) SET search_path = public;
ALTER FUNCTION public.delete_old_audit_logs(uuid, integer) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.verify_student_password(text, text) SET search_path = public;
ALTER FUNCTION public.verify_teacher_password(text, text) SET search_path = public;
ALTER FUNCTION public.update_admin_password(uuid, text) SET search_path = public;
ALTER FUNCTION public.sync_teacher_to_admin() SET search_path = public;
ALTER FUNCTION public.admin_login(text, text) SET search_path = public;
ALTER FUNCTION public.get_audit_logs(uuid, integer) SET search_path = public;
ALTER FUNCTION public.admin_get_student_points_by_class(uuid, integer, integer) SET search_path = public;
ALTER FUNCTION public.admin_get_homeroom(uuid, integer, integer) SET search_path = public;
ALTER FUNCTION public.admin_get_counseling_records(uuid, text) SET search_path = public;

-- Add comment for documentation
COMMENT ON SCHEMA public IS 'All database functions now have search_path = public for security';
