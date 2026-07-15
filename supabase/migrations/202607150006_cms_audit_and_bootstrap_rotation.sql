begin;

-- Migration 003 is immutable. Extend its block constraint only through this
-- forward migration so an existing database and a clean database converge.
alter table public.sections drop constraint sections_block_type_check;
alter table public.sections add constraint sections_block_type_check check (
  block_type in (
    'hero', 'introduction', 'card_collection', 'editorial_split',
    'feature_list', 'process', 'comparison', 'pricing', 'faq',
    'notice', 'call_to_action', 'reusable_collection'
  )
);

-- Every directly editable CMS record carries database-owned attribution.
alter table public.page_drafts add column created_by uuid references auth.users(id) on delete set null;
alter table public.navigation_items
  add column created_by uuid references auth.users(id) on delete set null,
  add column updated_by uuid references auth.users(id) on delete set null;
alter table public.assets add column updated_by uuid references auth.users(id) on delete set null;

update public.page_drafts set created_by = updated_by where created_by is null;
update public.assets set updated_by = created_by where updated_by is null;

create function public.protect_cms_draft_attribution()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  -- Trusted fixture and migration work may run as Postgres without a JWT.
  if actor is null and session_user = 'postgres' then return new; end if;
  if actor is null then
    raise exception 'CMS_ATTRIBUTION_REQUIRED' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.created_by is not null and new.created_by is distinct from actor then
      raise exception 'CMS_FORGED_CREATOR' using errcode = '42501';
    end if;
    if new.updated_by is not null and new.updated_by is distinct from actor then
      raise exception 'CMS_FORGED_UPDATER' using errcode = '42501';
    end if;
    new.created_by := actor;
    new.updated_by := actor;
  else
    if new.created_by is distinct from old.created_by then
      raise exception 'CMS_CREATOR_IMMUTABLE' using errcode = '42501';
    end if;
    if new.updated_by is distinct from old.updated_by and new.updated_by is distinct from actor then
      raise exception 'CMS_FORGED_UPDATER' using errcode = '42501';
    end if;
    new.created_by := old.created_by;
    new.updated_by := actor;
  end if;
  return new;
end;
$$;

create function public.cms_draft_audit_context(target_table text, row_data jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
begin
  if row_data is null then return null; end if;
  return case target_table
    when 'page_drafts' then row_data - 'updated_at'
    when 'sections' then row_data - 'created_at' - 'updated_at'
    when 'navigation_items' then row_data - 'created_at' - 'updated_at'
    when 'reusable_entries' then row_data - 'created_at' - 'updated_at'
    when 'assets' then row_data - 'created_at' - 'updated_at'
    else '{}'::jsonb
  end;
end;
$$;

create function public.audit_cms_draft_dml()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  entity_type text;
  entity_id text;
  old_data jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_data jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
begin
  if actor is null and session_user = 'postgres' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if actor is null then
    raise exception 'CMS_AUDIT_ACTOR_REQUIRED' using errcode = '42501';
  end if;

  entity_type := case tg_table_name
    when 'page_drafts' then 'page'
    when 'sections' then 'section'
    when 'navigation_items' then 'navigation_item'
    when 'reusable_entries' then 'reusable_entry'
    when 'assets' then 'asset'
  end;
  entity_id := coalesce(new_data->>'id', old_data->>'id', new_data->>'page_id', old_data->>'page_id');

  insert into public.content_audit_log(actor_id,action,entity_type,entity_id,before_data,after_data)
  values(
    actor,
    entity_type || '.draft_' || lower(tg_op),
    entity_type,
    entity_id,
    public.cms_draft_audit_context(tg_table_name,old_data),
    public.cms_draft_audit_context(tg_table_name,new_data)
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger page_drafts_protect_attribution before insert or update on public.page_drafts
for each row execute function public.protect_cms_draft_attribution();
create trigger sections_protect_attribution before insert or update on public.sections
for each row execute function public.protect_cms_draft_attribution();
create trigger navigation_items_protect_attribution before insert or update on public.navigation_items
for each row execute function public.protect_cms_draft_attribution();
create trigger reusable_entries_protect_attribution before insert or update on public.reusable_entries
for each row execute function public.protect_cms_draft_attribution();
create trigger assets_protect_attribution before insert or update on public.assets
for each row execute function public.protect_cms_draft_attribution();

create trigger page_drafts_audit_dml after insert or update or delete on public.page_drafts
for each row execute function public.audit_cms_draft_dml();
create trigger sections_audit_dml after insert or update or delete on public.sections
for each row execute function public.audit_cms_draft_dml();
create trigger navigation_items_audit_dml after insert or update or delete on public.navigation_items
for each row execute function public.audit_cms_draft_dml();
create trigger reusable_entries_audit_dml after insert or update or delete on public.reusable_entries
for each row execute function public.audit_cms_draft_dml();
create trigger assets_audit_dml after insert or update or delete on public.assets
for each row execute function public.audit_cms_draft_dml();

revoke all on function public.protect_cms_draft_attribution() from public;
revoke all on function public.cms_draft_audit_context(text,jsonb) from public;
revoke all on function public.audit_cms_draft_dml() from public;
revoke execute on function public.record_content_audit(text,text,text,jsonb) from authenticated;

-- Migration 004 deliberately excluded owner invitations. Widen that schema in
-- place here, while keeping owner rows exclusive to the Postgres bootstrap path.
alter table public.staff_invitations drop constraint staff_invitations_role_check;
alter table public.staff_invitations alter column invited_by drop not null;
alter table public.staff_invitations add constraint staff_invitations_owner_origin_check check (
  (role = 'owner' and invited_by is null)
  or (role <> 'owner' and invited_by is not null)
);

create table public.cms_owner_bootstrap (
  singleton boolean primary key default true check (singleton),
  invitation_id uuid not null unique references public.staff_invitations(id) on delete restrict,
  requested_email text not null check (
    requested_email = lower(trim(requested_email))
    and requested_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by uuid unique references auth.users(id) on delete restrict,
  check ((completed_at is null and completed_by is null) or (completed_at is not null and completed_by is not null))
);
alter table public.cms_owner_bootstrap enable row level security;
alter table public.cms_owner_bootstrap force row level security;

create function public.bootstrap_first_owner_invitation(
  candidate_email text,
  candidate_expires_at timestamptz default now() + interval '7 days'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_id uuid;
  normalised_email text := lower(trim(candidate_email));
begin
  if session_user <> 'postgres' then
    raise exception 'CMS_BOOTSTRAP_OPERATOR_REQUIRED' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('thrive.cms.owner.bootstrap', 0));
  if exists(select 1 from public.cms_owner_bootstrap)
    or exists(select 1 from public.user_roles where role = 'owner')
    or exists(select 1 from public.staff_invitations where role = 'owner') then
    raise exception 'CMS_BOOTSTRAP_ALREADY_USED' using errcode = '55000';
  end if;
  if char_length(normalised_email) not between 3 and 320
    or normalised_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or candidate_expires_at <= now()
    or candidate_expires_at > now() + interval '30 days' then
    raise exception 'CMS_INVALID_BOOTSTRAP' using errcode = '22023';
  end if;

  insert into public.staff_invitations(email,role,invited_by,expires_at)
  values(normalised_email,'owner',null,candidate_expires_at)
  returning id into invitation_id;
  insert into public.cms_owner_bootstrap(invitation_id,requested_email)
  values(invitation_id,normalised_email);
  return invitation_id;
end;
$$;

create function public.rotate_first_owner_invitation(
  candidate_email text,
  candidate_expires_at timestamptz default now() + interval '7 days'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  bootstrap public.cms_owner_bootstrap%rowtype;
  current_invitation public.staff_invitations%rowtype;
  replacement_id uuid;
  normalised_email text := lower(trim(candidate_email));
begin
  if session_user <> 'postgres' then
    raise exception 'CMS_BOOTSTRAP_OPERATOR_REQUIRED' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('thrive.cms.owner.bootstrap', 0));
  select * into bootstrap from public.cms_owner_bootstrap where singleton for update;
  if not found then raise exception 'CMS_BOOTSTRAP_NOT_STARTED' using errcode = '55000'; end if;
  if bootstrap.completed_at is not null or bootstrap.completed_by is not null
    or exists(select 1 from public.user_roles where role = 'owner') then
    raise exception 'CMS_BOOTSTRAP_COMPLETED' using errcode = '55000';
  end if;
  select * into current_invitation from public.staff_invitations
  where id = bootstrap.invitation_id for update;
  if not found or current_invitation.role <> 'owner'
    or current_invitation.consumed_at is not null then
    raise exception 'CMS_BOOTSTRAP_NOT_ROTATABLE' using errcode = '55000';
  end if;
  if char_length(normalised_email) not between 3 and 320
    or normalised_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or candidate_expires_at <= now()
    or candidate_expires_at > now() + interval '30 days' then
    raise exception 'CMS_INVALID_BOOTSTRAP' using errcode = '22023';
  end if;

  update public.staff_invitations
  set revoked_at = coalesce(revoked_at,now())
  where id = current_invitation.id;
  insert into public.staff_invitations(email,role,invited_by,expires_at)
  values(normalised_email,'owner',null,candidate_expires_at)
  returning id into replacement_id;
  update public.cms_owner_bootstrap
  set invitation_id = replacement_id, requested_email = normalised_email, requested_at = now()
  where singleton;
  return replacement_id;
end;
$$;

revoke all on function public.bootstrap_first_owner_invitation(text,timestamptz) from public;
revoke all on function public.bootstrap_first_owner_invitation(text,timestamptz) from anon, authenticated, service_role;
revoke all on function public.rotate_first_owner_invitation(text,timestamptz) from public;
revoke all on function public.rotate_first_owner_invitation(text,timestamptz) from anon, authenticated, service_role;

create or replace function public.create_staff_invitation(
  candidate_email text,
  candidate_role public.app_role,
  candidate_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  invitation_id uuid;
  normalised_email text := lower(trim(candidate_email));
begin
  if actor is null or not public.has_any_role(array['owner']::public.app_role[]) or not public.current_session_is_aal2() then
    raise exception 'CMS_MFA_OR_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if candidate_role = 'owner' or char_length(normalised_email) > 320
    or normalised_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or candidate_expires_at <= now() or candidate_expires_at > now() + interval '30 days' then
    raise exception 'CMS_INVALID_INVITATION' using errcode = '22023';
  end if;
  if exists(select 1 from auth.users where lower(email) = normalised_email) then
    raise exception 'CMS_INVITATION_USER_EXISTS' using errcode = 'P0001';
  end if;
  update public.staff_invitations set revoked_at = now(), revoked_by = actor
    where email = normalised_email and consumed_at is null and revoked_at is null and expires_at <= now();
  insert into public.staff_invitations(email,role,invited_by,expires_at)
    values(normalised_email,candidate_role,actor,candidate_expires_at) returning id into invitation_id;
  insert into public.content_audit_log(actor_id,action,entity_type,entity_id,after_data)
    values(actor,'staff_invitation.created','staff_invitation',invitation_id::text,jsonb_build_object('role',candidate_role));
  return invitation_id;
end;
$$;

revoke all on function public.create_staff_invitation(text,public.app_role,timestamptz) from public;
grant execute on function public.create_staff_invitation(text,public.app_role,timestamptz) to authenticated;

create or replace function public.provision_invited_staff()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare invitation public.staff_invitations%rowtype;
begin
  if session_user = 'postgres' and current_setting('app.cms_fixture_bypass', true) = 'on' then return new; end if;
  select * into invitation from public.staff_invitations
  where email = lower(trim(new.email)) and consumed_at is null and revoked_at is null and expires_at > now()
  order by created_at desc limit 1 for update;
  if not found then raise exception 'INVITATION_REQUIRED' using errcode = '42501'; end if;
  if invitation.role = 'owner' and not exists(
    select 1 from public.cms_owner_bootstrap
    where invitation_id = invitation.id and completed_at is null and completed_by is null
  ) then raise exception 'CMS_INVALID_OWNER_INVITATION' using errcode = '42501'; end if;
  insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(split_part(new.email,'@',1),''),'Invited user'));
  insert into public.user_roles(user_id,role,granted_by) values(new.id,invitation.role,invitation.invited_by);
  update public.staff_invitations set consumed_at = now(), consumed_by = new.id where id = invitation.id;
  if invitation.role = 'owner' then
    update public.cms_owner_bootstrap set completed_at = now(), completed_by = new.id
    where invitation_id = invitation.id and completed_at is null and completed_by is null;
    if not found then raise exception 'CMS_BOOTSTRAP_COMPLETION_FAILED' using errcode = '55000'; end if;
  end if;
  insert into public.content_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(invitation.invited_by,'staff_invitation.consumed','staff_invitation',invitation.id::text,jsonb_build_object('user_id',new.id,'role',invitation.role));
  return new;
end;
$$;

revoke all on function public.provision_invited_staff() from public;

-- Match the public metadata policy exactly, including no repeated or trailing slashes.
create or replace function public.validate_cms_snapshot(snapshot jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare seo jsonb;
begin
  if jsonb_typeof(snapshot) <> 'object' then return false; end if;
  if exists(select 1 from jsonb_object_keys(snapshot) key where key not in ('slug','title','description','status','seo','sections')) then return false; end if;
  if jsonb_typeof(snapshot->'slug') <> 'string'
    or jsonb_typeof(snapshot->'title') <> 'string'
    or jsonb_typeof(snapshot->'description') <> 'string'
    or jsonb_typeof(snapshot->'status') <> 'string'
    or coalesce(snapshot->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(btrim(coalesce(snapshot->>'title',''))) not between 1 and 140
    or char_length(btrim(coalesce(snapshot->>'description',''))) not between 1 and 320
    or snapshot->>'status' <> 'published'
    or jsonb_typeof(snapshot->'sections') <> 'array'
    or jsonb_array_length(snapshot->'sections') < 1 then return false; end if;
  if exists(select 1 from jsonb_array_elements(snapshot->'sections') block where not public.validate_cms_block(block)) then return false; end if;
  if snapshot ? 'seo' then
    seo := snapshot->'seo';
    if jsonb_typeof(seo) <> 'object' then return false; end if;
    if exists(select 1 from jsonb_object_keys(seo) key where key not in ('title','description','canonicalPath','noIndex')) then return false; end if;
    if seo ? 'title' and seo->'title' <> 'null'::jsonb and (jsonb_typeof(seo->'title') <> 'string' or char_length(btrim(seo->>'title')) > 70) then return false; end if;
    if seo ? 'description' and seo->'description' <> 'null'::jsonb and (jsonb_typeof(seo->'description') <> 'string' or char_length(btrim(seo->>'description')) > 160) then return false; end if;
    if seo ? 'canonicalPath' and seo->'canonicalPath' <> 'null'::jsonb and (
      jsonb_typeof(seo->'canonicalPath') <> 'string'
      or char_length(seo->>'canonicalPath') not between 1 and 180
      or seo->>'canonicalPath' !~ '^/([a-z0-9]+(-[a-z0-9]+)*)?(/[a-z0-9]+(-[a-z0-9]+)*)*$'
    ) then return false; end if;
    if seo ? 'noIndex' and jsonb_typeof(seo->'noIndex') <> 'boolean' then return false; end if;
  end if;
  return true;
end;
$$;

revoke all on function public.validate_cms_snapshot(jsonb) from public;
grant execute on function public.validate_cms_snapshot(jsonb) to authenticated;

commit;
