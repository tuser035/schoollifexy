-- Fix admin_get_email_templates to properly set session for RLS
create or replace function public.admin_get_email_templates(
  admin_id_input uuid,
  filter_type public.template_type default null
)
returns table (
  id uuid,
  title text,
  subject text,
  body text,
  template_type public.template_type,
  admin_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if user is admin or teacher and set appropriate session
  if exists (select 1 from public.admins where admins.id = admin_id_input) then
    perform set_config('app.current_admin_id', admin_id_input::text, true);
  elsif exists (select 1 from public.teachers where teachers.id = admin_id_input) then
    perform set_config('app.current_teacher_id', admin_id_input::text, true);
  else
    raise exception '권한이 없습니다';
  end if;

  return query
  select et.id, et.title, et.subject, et.body, et.template_type, et.admin_id, et.created_at, et.updated_at
  from public.email_templates et
  where (filter_type is null or et.template_type = filter_type)
  order by et.created_at desc;
end;
$$;