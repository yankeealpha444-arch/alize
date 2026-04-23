-- Ensure `public.events.project_id` accepts opaque local keys ("default", slugs, etc.).
-- If the column was ever created as uuid, inserts with non-UUID strings return HTTP 400
-- ("invalid input syntax for type uuid") from PostgREST.
do $$
begin
  if exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'events'
      and c.column_name = 'project_id'
      and c.data_type = 'uuid'
  ) then
    alter table public.events
      alter column project_id type text
      using project_id::text;
  end if;
end $$;
