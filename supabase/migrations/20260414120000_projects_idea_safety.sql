-- Launch-safe enforcement for public.projects (PostgREST / Supabase).
-- Mirrors heuristic rules in src/lib/mvp/ideaContentSafety.ts — keep both in sync when rules change.
-- Production write path: client supabase.from('projects').upsert(...) → PostgREST → this trigger.

-- ---------------------------------------------------------------------------
-- 1) Columns: idea (required), auth ownership, anonymous draft separation
-- ---------------------------------------------------------------------------
alter table public.projects add column if not exists idea text;
alter table public.projects add column if not exists user_id uuid references auth.users (id) on delete set null;
alter table public.projects add column if not exists is_anonymous_draft boolean not null default true;

comment on column public.projects.user_id is 'Set from auth.uid() on write; never trust client-supplied user_id.';
comment on column public.projects.is_anonymous_draft is 'True when auth.uid() was null at write time (anonymous / pre-account). False for authenticated-owned rows.';

-- ---------------------------------------------------------------------------
-- 2) Sanitize idea text (same ordering and safe strings as ideaContentSafety.ts)
-- ---------------------------------------------------------------------------
create or replace function public.projects_sanitize_idea (p_idea text)
returns text
language plpgsql
immutable
set search_path = public
as $sanitize$
declare
  t text;
  safe_ex text := 'An ethical digital product that respects people''s rights and complies with the law — for example a marketplace for legitimate services or a tool that helps communities stay safe.';
  safe_il text := 'A lawful product or service with a clear business model — describe what problem you solve for customers in everyday language.';
  safe_hm text := 'A product focused on wellbeing or productivity — describe how you help users in a positive, constructive way.';
begin
  t := btrim(p_idea);
  if t = '' then
    return null;
  end if;

  -- exploitation
  if
    t ~* '(human[[:space:]]*traffick|sex[[:space:]]*traffick|child[[:space:]]*traffick)'
    or t ~* 'traffick(ing|ers)?[[:space:]]+(of|in)[[:space:]]+(children|minors|humans)'
    or t ~* '(modern[[:space:]]*slavery|forced[[:space:]]*prostitution|child[[:space:]]*prostitution)'
    or t ~* '[[:<:]](sell(ing)?|sold|buying|buy)[[:>:]][[:space:]]+(children|kids|minors|humans?|people|women|men)'
    or t ~* '[[:<:]](sell(ing)?|trade)[[:>:]][[:space:]]+(of[[:space:]]+)?(humans?|people)'
    or t ~* '(sex[[:space:]]*slave|sexual[[:space:]]*exploitation[[:space:]]+of[[:space:]]+(children|minors))'
    or t ~* '[[:<:]](people|humans?|children|minors|kids)[[:>:]][[:space:]]+for[[:space:]]+sale'
    or t ~* '(old[[:space:]]+people|elderly)[[:space:]]+for[[:space:]]+sale'
  then
    return safe_ex;
  end if;

  -- illegal
  if
    t ~* '(hit[[:space:]]*man|contract[[:space:]]*killing|assassin[[:space:]]+for[[:space:]]+hire)'
    or t ~* 'how[[:space:]]+to[[:space:]]+make[[:space:]]+(a[[:space:]]+)?(bomb|explosive|meth|fentanyl)'
    or t ~* 'money[[:space:]]*launder(ing)?[[:space:]]+for[[:space:]]+(cartel|criminal|illegal)'
    or t ~* '(child[[:space:]]*porn|csam|sexual[[:space:]]*abuse[[:space:]]+of[[:space:]]+minors)'
  then
    return safe_il;
  end if;

  -- harm
  if
    t ~* '(how[[:space:]]+to[[:space:]]+(commit[[:space:]]+)?suicide|suicide[[:space:]]+methods|kill[[:space:]]+myself|end[[:space:]]+my[[:space:]]+life)'
    or t ~* '(self[[:space:]-]*harm[[:space:]]+(instructions|methods)|cutting[[:space:]]+myself[[:space:]]+how)'
  then
    return safe_hm;
  end if;

  return t;
end;
$sanitize$;

comment on function public.projects_sanitize_idea (text) is 'Must stay aligned with src/lib/mvp/ideaContentSafety.ts RULES / SAFE_ALTERNATIVES.';

-- ---------------------------------------------------------------------------
-- 3) One-time backfill: non-null idea, sanitize existing rows (no raw blocked text)
-- ---------------------------------------------------------------------------
update public.projects
set
  idea = coalesce(
    nullif(btrim(idea), ''),
    nullif(btrim(name), ''),
    'Untitled draft'
  )
where idea is null
   or btrim(idea) = '';

update public.projects
set idea = public.projects_sanitize_idea (idea)
where idea is not null;

alter table public.projects
  alter column idea set not null;

-- ---------------------------------------------------------------------------
-- 4) Trigger: auth ownership, empty rejection, sanitize idea, name derived from idea only
-- ---------------------------------------------------------------------------
create or replace function public.projects_before_write_enforce_safety ()
returns trigger
language plpgsql
security definer
set search_path = public
as $tr$
declare
  v_raw text;
  v_san text;
  v_uid uuid;
begin
  v_uid := auth.uid ();

  if v_uid is not null then
    new.user_id := v_uid;
    new.is_anonymous_draft := false;
  else
    new.user_id := null;
    new.is_anonymous_draft := true;
  end if;

  if TG_OP = 'INSERT' then
    v_raw := btrim(coalesce(new.idea, ''));
    if v_raw = '' then
      v_raw := btrim(coalesce(new.name, ''));
    end if;
    if v_raw = '' then
      raise exception 'projects: idea cannot be null or empty';
    end if;

    v_san := public.projects_sanitize_idea (v_raw);
    if v_san is null or btrim(v_san) = '' then
      raise exception 'projects: idea cannot be null or empty after sanitization';
    end if;

    new.idea := v_san;
    new.name := left (new.idea, 80);
    return new;
  end if;

  if TG_OP = 'UPDATE' then
    if new.idea is distinct from old.idea then
      v_raw := btrim(coalesce(new.idea, ''));
      if v_raw = '' then
        raise exception 'projects: idea cannot be null or empty';
      end if;
      v_san := public.projects_sanitize_idea (v_raw);
      if v_san is null or btrim(v_san) = '' then
        raise exception 'projects: idea cannot be null or empty after sanitization';
      end if;
      new.idea := v_san;
    end if;

    new.name := left (new.idea, 80);
    return new;
  end if;

  return new;
end;
$tr$;

drop trigger if exists projects_before_write_enforce_safety on public.projects;

create trigger projects_before_write_enforce_safety
before insert or update on public.projects
for each row
execute procedure public.projects_before_write_enforce_safety ();
