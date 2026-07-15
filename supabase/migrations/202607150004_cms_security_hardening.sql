begin;

create or replace function public.current_session_is_aal2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false);
$$;

revoke all on function public.current_session_is_aal2() from public;
grant execute on function public.current_session_is_aal2() to authenticated;

create function public.can_mutate_cms_draft()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and public.has_any_role(array['owner','publisher','editor']::public.app_role[])
    and (
      (
        not public.has_any_role(array['owner','publisher']::public.app_role[])
        and public.has_any_role(array['editor']::public.app_role[])
      )
      or (
        public.has_any_role(array['owner','publisher']::public.app_role[])
        and public.current_session_is_aal2()
      )
    );
$$;

revoke all on function public.can_mutate_cms_draft() from public;
grant execute on function public.can_mutate_cms_draft() to authenticated;

drop policy page_drafts_editor_manage on public.page_drafts;
create policy page_drafts_cms_manage on public.page_drafts for all to authenticated
using (public.can_mutate_cms_draft())
with check (updated_by = (select auth.uid()) and public.can_mutate_cms_draft());

drop policy pages_editor_insert_draft on public.pages;
drop policy pages_editor_update_draft on public.pages;
drop policy pages_editor_delete_draft on public.pages;
drop policy pages_publishers_manage on public.pages;
create policy pages_cms_insert_draft on public.pages for insert to authenticated
with check (
  status = 'draft' and published_version_id is null and published_at is null
  and public.can_mutate_cms_draft()
);
create policy pages_cms_update_draft on public.pages for update to authenticated
using (status = 'draft' and published_version_id is null and public.can_mutate_cms_draft())
with check (
  status = 'draft' and published_version_id is null and published_at is null
  and public.can_mutate_cms_draft()
);
create policy pages_cms_delete_draft on public.pages for delete to authenticated
using (status = 'draft' and published_version_id is null and public.can_mutate_cms_draft());

drop policy page_versions_publish on public.page_versions;

drop policy sections_draft_manage on public.sections;
create policy sections_cms_manage_draft on public.sections for all to authenticated
using (public.can_mutate_cms_draft())
with check (public.can_mutate_cms_draft());

drop policy site_settings_admin_manage on public.site_settings;
create policy site_settings_privileged_manage on public.site_settings for all to authenticated
using (public.has_any_role(array['owner','publisher']::public.app_role[]) and public.current_session_is_aal2())
with check (public.has_any_role(array['owner','publisher']::public.app_role[]) and public.current_session_is_aal2());

drop policy redirects_cms_manage on public.redirects;
create policy redirects_privileged_manage on public.redirects for all to authenticated
using (public.has_any_role(array['owner','publisher']::public.app_role[]) and public.current_session_is_aal2())
with check (public.has_any_role(array['owner','publisher']::public.app_role[]) and public.current_session_is_aal2());

drop policy consent_versions_admin_manage on public.consent_versions;
create policy consent_versions_privileged_manage on public.consent_versions for all to authenticated
using (public.has_any_role(array['owner','publisher']::public.app_role[]) and public.current_session_is_aal2())
with check (public.has_any_role(array['owner','publisher']::public.app_role[]) and public.current_session_is_aal2());

drop policy user_roles_owner_manage on public.user_roles;

drop policy site_assets_editor_insert on storage.objects;
drop policy site_assets_editor_update on storage.objects;
drop policy site_assets_editor_delete on storage.objects;
create policy site_assets_cms_insert on storage.objects for insert to authenticated
with check (bucket_id = 'site-assets' and public.can_mutate_cms_draft());
create policy site_assets_cms_update on storage.objects for update to authenticated
using (
  bucket_id = 'site-assets' and public.can_mutate_cms_draft()
  and exists (
    select 1 from public.assets
    where assets.storage_path = storage.objects.name and assets.status = 'draft'
  )
)
with check (
  bucket_id = 'site-assets' and public.can_mutate_cms_draft()
  and exists (
    select 1 from public.assets
    where assets.storage_path = storage.objects.name and assets.status = 'draft'
  )
);
create policy site_assets_cms_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'site-assets' and public.can_mutate_cms_draft()
  and exists (
    select 1 from public.assets
    where assets.storage_path = storage.objects.name and assets.status = 'draft'
  )
);

create function public.enforce_privileged_cms_mfa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'user_roles' and pg_trigger_depth() > 1 then return new; end if;
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_table_name = 'pages'
    and (new.status is distinct from old.status
      or new.published_version_id is distinct from old.published_version_id)
    and not public.current_session_is_aal2() then
    raise exception 'CMS_MFA_REQUIRED' using errcode = '42501';
  elsif tg_table_name in ('reusable_entries', 'assets')
    and new.status is distinct from old.status
    and not public.current_session_is_aal2() then
    raise exception 'CMS_MFA_REQUIRED' using errcode = '42501';
  elsif tg_table_name = 'navigation_items'
    and (new.status is distinct from old.status or new.visible is distinct from old.visible)
    and not public.current_session_is_aal2() then
    raise exception 'CMS_MFA_REQUIRED' using errcode = '42501';
  elsif tg_table_name = 'user_roles' and not public.current_session_is_aal2() then
    raise exception 'CMS_MFA_REQUIRED' using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create trigger pages_privileged_mfa before update on public.pages
for each row execute function public.enforce_privileged_cms_mfa();
create trigger reusable_entries_privileged_mfa before update on public.reusable_entries
for each row execute function public.enforce_privileged_cms_mfa();
create trigger assets_privileged_mfa before update on public.assets
for each row execute function public.enforce_privileged_cms_mfa();
create trigger navigation_privileged_mfa before update on public.navigation_items
for each row execute function public.enforce_privileged_cms_mfa();
create trigger user_roles_privileged_mfa before insert or update or delete on public.user_roles
for each row execute function public.enforce_privileged_cms_mfa();

revoke all on function public.enforce_privileged_cms_mfa() from public;

create or replace function public.cms_json_has_forbidden_keys(value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
  object_key text;
  object_value jsonb;
  scalar_text text;
begin
  if jsonb_typeof(value) = 'object' then
    for object_key, object_value in select * from jsonb_each(value) loop
      if lower(object_key) in ('html', 'rawhtml', 'raw_html', 'script', 'iframe', 'style', 'css', 'layout')
        or public.cms_json_has_forbidden_keys(object_value) then return true; end if;
    end loop;
  elsif jsonb_typeof(value) = 'array' then
    for item in select * from jsonb_array_elements(value) loop
      if public.cms_json_has_forbidden_keys(item) then return true; end if;
    end loop;
  elsif jsonb_typeof(value) = 'string' then
    scalar_text := value #>> '{}';
    if scalar_text ~* '<\s*/?\s*(script|iframe|style|link|object|embed|html)\y|javascript\s*:|data\s*:\s*text/html' then
      return true;
    end if;
  end if;
  return false;
end;
$$;

create function public.is_safe_cms_href(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null
    and char_length(value) between 1 and 300
    and value !~ '[[:cntrl:]\\]'
    and (
      ((value = '/' or value ~ '^/[A-Za-z0-9]') and value !~ '^//' and value !~ '[[:space:]]')
      or (
        value ~ '^https?://[A-Za-z0-9.-]+(?::[0-9]{1,5})?(?:[/?#][^[:space:]]*)?$'
        and value !~ '^https?://[^/]*@'
      )
      or value ~ '^mailto:[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or value ~ '^tel:\+?[0-9 ()-]{7,25}$'
    );
$$;

revoke all on function public.is_safe_cms_href(text) from public;
grant execute on function public.is_safe_cms_href(text) to anon, authenticated;

alter table public.navigation_items
  add constraint navigation_items_safe_href_check check (public.is_safe_cms_href(href));

drop policy navigation_editor_insert_hidden on public.navigation_items;
drop policy navigation_editor_update_hidden on public.navigation_items;
drop policy navigation_editor_delete_hidden on public.navigation_items;
drop policy navigation_publishers_manage on public.navigation_items;
create policy navigation_cms_insert_draft on public.navigation_items for insert to authenticated
with check (status = 'draft' and not visible and public.can_mutate_cms_draft());
create policy navigation_cms_update_draft on public.navigation_items for update to authenticated
using (status = 'draft' and not visible and public.can_mutate_cms_draft())
with check (status = 'draft' and not visible and public.can_mutate_cms_draft());
create policy navigation_cms_delete_draft on public.navigation_items for delete to authenticated
using (status = 'draft' and not visible and public.can_mutate_cms_draft());

create function public.cms_plain_text_is_valid(value text, maximum_length integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null
    and maximum_length > 0
    and char_length(btrim(value)) between 1 and maximum_length
    and value !~* '<\s*/?\s*(script|iframe|style|link|object|embed|html)\y|javascript\s*:|data\s*:\s*text/html';
$$;

create function public.cms_iso_date_is_valid(value text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if value is null or value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false; end if;
  return to_char(value::date, 'YYYY-MM-DD') = value;
exception when others then
  return false;
end;
$$;

create or replace function public.validate_reusable_content(entry_kind text, value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  allowed_keys text[];
begin
  if jsonb_typeof(value) <> 'object' or public.cms_json_has_forbidden_keys(value) then return false; end if;
  allowed_keys := case entry_kind
    when 'faq' then array['question', 'answer']
    when 'resource' then array['title', 'body', 'href']
    when 'credential' then array['title', 'body', 'issuer', 'verificationStatus']
    when 'testimonial' then array['quote', 'attribution', 'consentConfirmed']
    when 'pricing_note' then array['title', 'body']
    when 'legal_notice' then array['title', 'body', 'effectiveDate']
    when 'service' then array['title', 'body', 'href']
    when 'pricing' then array['title', 'duration', 'price', 'body']
    else null
  end;
  if allowed_keys is null or exists (
    select 1 from jsonb_object_keys(value) key where not (key = any(allowed_keys))
  ) then return false; end if;

  if entry_kind = 'faq' then
    return coalesce(
      jsonb_typeof(value->'question') = 'string'
      and public.cms_plain_text_is_valid(value->>'question', 180)
      and jsonb_typeof(value->'answer') = 'string'
      and public.cms_plain_text_is_valid(value->>'answer', 3000),
      false
    );
  elsif entry_kind in ('resource', 'service') then
    return coalesce(
      jsonb_typeof(value->'title') = 'string'
      and public.cms_plain_text_is_valid(value->>'title', 180)
      and jsonb_typeof(value->'body') = 'string'
      and public.cms_plain_text_is_valid(value->>'body', 3000)
      and (
        not (value ? 'href')
        or (jsonb_typeof(value->'href') = 'string' and public.is_safe_cms_href(value->>'href'))
      ),
      false
    );
  elsif entry_kind = 'credential' then
    return coalesce(
      jsonb_typeof(value->'title') = 'string'
      and public.cms_plain_text_is_valid(value->>'title', 180)
      and jsonb_typeof(value->'body') = 'string'
      and public.cms_plain_text_is_valid(value->>'body', 3000)
      and (
        not (value ? 'issuer')
        or (jsonb_typeof(value->'issuer') = 'string' and public.cms_plain_text_is_valid(value->>'issuer', 180))
      )
      and (
        not (value ? 'verificationStatus')
        or (
          jsonb_typeof(value->'verificationStatus') = 'string'
          and value->>'verificationStatus' in ('pending', 'verified')
        )
      ),
      false
    );
  elsif entry_kind = 'testimonial' then
    return coalesce(
      jsonb_typeof(value->'quote') = 'string'
      and public.cms_plain_text_is_valid(value->>'quote', 3000)
      and jsonb_typeof(value->'attribution') = 'string'
      and public.cms_plain_text_is_valid(value->>'attribution', 180)
      and jsonb_typeof(value->'consentConfirmed') = 'boolean'
      and value->'consentConfirmed' = 'true'::jsonb,
      false
    );
  elsif entry_kind = 'pricing_note' then
    return coalesce(
      jsonb_typeof(value->'title') = 'string'
      and public.cms_plain_text_is_valid(value->>'title', 180)
      and jsonb_typeof(value->'body') = 'string'
      and public.cms_plain_text_is_valid(value->>'body', 3000),
      false
    );
  elsif entry_kind = 'legal_notice' then
    if not coalesce(
      jsonb_typeof(value->'title') = 'string'
      and public.cms_plain_text_is_valid(value->>'title', 180)
      and jsonb_typeof(value->'body') = 'array',
      false
    ) then return false; end if;
    if jsonb_array_length(value->'body') not between 1 and 20 then return false; end if;
    if exists (
      select 1 from jsonb_array_elements(value->'body') item
      where jsonb_typeof(item) <> 'string' or not public.cms_plain_text_is_valid(item #>> '{}', 1200)
    ) then return false; end if;
    if value ? 'effectiveDate' and (
      jsonb_typeof(value->'effectiveDate') <> 'string'
      or not public.cms_iso_date_is_valid(value->>'effectiveDate')
    ) then return false; end if;
    return true;
  elsif entry_kind = 'pricing' then
    return coalesce(
      jsonb_typeof(value->'title') = 'string'
      and public.cms_plain_text_is_valid(value->>'title', 180)
      and jsonb_typeof(value->'duration') = 'string'
      and public.cms_plain_text_is_valid(value->>'duration', 100)
      and jsonb_typeof(value->'price') = 'string'
      and public.cms_plain_text_is_valid(value->>'price', 80)
      and jsonb_typeof(value->'body') = 'string'
      and public.cms_plain_text_is_valid(value->>'body', 3000),
      false
    );
  end if;
  return false;
end;
$$;

revoke all on function public.cms_plain_text_is_valid(text,integer) from public;
revoke all on function public.cms_iso_date_is_valid(text) from public;
revoke all on function public.validate_reusable_content(text,jsonb) from public;
grant execute on function public.cms_plain_text_is_valid(text,integer) to authenticated;
grant execute on function public.cms_iso_date_is_valid(text) to authenticated;
grant execute on function public.validate_reusable_content(text,jsonb) to authenticated;

alter table public.reusable_entries drop constraint if exists reusable_entries_entry_type_check;
alter table public.reusable_entries add constraint reusable_entries_entry_type_check check (
  entry_type in ('credential', 'faq', 'resource', 'testimonial', 'pricing_note', 'legal_notice', 'service', 'pricing')
);
alter table public.reusable_entries add constraint reusable_entries_content_check
  check (public.validate_reusable_content(entry_type, content));

drop policy reusable_editor_insert_draft on public.reusable_entries;
drop policy reusable_editor_update_draft on public.reusable_entries;
drop policy reusable_editor_delete_draft on public.reusable_entries;
drop policy reusable_publishers_manage on public.reusable_entries;
create policy reusable_cms_insert_draft on public.reusable_entries for insert to authenticated
with check (status = 'draft' and public.can_mutate_cms_draft());
create policy reusable_cms_update_draft on public.reusable_entries for update to authenticated
using (status = 'draft' and public.can_mutate_cms_draft())
with check (status = 'draft' and public.can_mutate_cms_draft());
create policy reusable_cms_delete_draft on public.reusable_entries for delete to authenticated
using (status = 'draft' and public.can_mutate_cms_draft());

drop policy assets_editor_insert_draft on public.assets;
drop policy assets_editor_update_draft on public.assets;
drop policy assets_editor_delete_draft on public.assets;
drop policy assets_publishers_manage on public.assets;
create policy assets_cms_insert_draft on public.assets for insert to authenticated
with check (status = 'draft' and public.can_mutate_cms_draft());
create policy assets_cms_update_draft on public.assets for update to authenticated
using (status = 'draft' and public.can_mutate_cms_draft())
with check (status = 'draft' and public.can_mutate_cms_draft());
create policy assets_cms_delete_draft on public.assets for delete to authenticated
using (status = 'draft' and public.can_mutate_cms_draft());

create function public.set_reusable_publication(target_id uuid, make_public boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid()); target public.reusable_entries%rowtype;
begin
  if actor is null or not public.has_any_role(array['owner','publisher']::public.app_role[]) or not public.current_session_is_aal2() then
    raise exception 'CMS_MFA_OR_ROLE_REQUIRED' using errcode = '42501';
  end if;
  select * into target from public.reusable_entries where id = target_id for update;
  if not found or not public.validate_reusable_content(target.entry_type, target.content) then
    raise exception 'CMS_INVALID_REUSABLE_ENTRY' using errcode = '22023';
  end if;
  update public.reusable_entries set status = case when make_public then 'published'::public.content_status else 'draft'::public.content_status end, updated_by = actor where id = target_id;
  insert into public.content_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(actor,'reusable_entry.status_changed','reusable_entry',target_id::text,jsonb_build_object('status',case when make_public then 'published' else 'draft' end));
end; $$;

create function public.set_asset_publication(target_id uuid, make_public boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid());
begin
  if actor is null or not public.has_any_role(array['owner','publisher']::public.app_role[]) or not public.current_session_is_aal2() then
    raise exception 'CMS_MFA_OR_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if not exists(select 1 from public.assets where id = target_id) then raise exception 'CMS_ASSET_NOT_FOUND' using errcode = 'P0002'; end if;
  update public.assets set status = case when make_public then 'published'::public.content_status else 'draft'::public.content_status end where id = target_id;
  insert into public.content_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(actor,'asset.status_changed','asset',target_id::text,jsonb_build_object('status',case when make_public then 'published' else 'draft' end));
end; $$;

revoke all on function public.set_reusable_publication(uuid,boolean) from public;
revoke all on function public.set_asset_publication(uuid,boolean) from public;
grant execute on function public.set_reusable_publication(uuid,boolean) to authenticated;
grant execute on function public.set_asset_publication(uuid,boolean) to authenticated;

create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  role public.app_role not null check (role <> 'owner'),
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (not (consumed_at is not null and revoked_at is not null))
);
create unique index staff_invitations_pending_email_idx on public.staff_invitations(lower(email))
where consumed_at is null and revoked_at is null;
alter table public.staff_invitations enable row level security;
alter table public.staff_invitations force row level security;
create policy staff_invitations_owner_read on public.staff_invitations for select to authenticated
using (public.has_any_role(array['owner']::public.app_role[]));

create function public.protect_staff_invitation_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  if (select auth.uid()) is not null and (
    new.email is distinct from old.email or new.role is distinct from old.role
    or new.invited_by is distinct from old.invited_by or new.expires_at is distinct from old.expires_at
    or new.created_at is distinct from old.created_at or new.consumed_at is distinct from old.consumed_at
    or new.consumed_by is distinct from old.consumed_by
  ) then raise exception 'CMS_INVITATION_IMMUTABLE' using errcode = '42501'; end if;
  return new;
end; $$;

create trigger staff_invitations_protect_update before update on public.staff_invitations
for each row execute function public.protect_staff_invitation_update();

create function public.create_staff_invitation(candidate_email text,candidate_role public.app_role,candidate_expires_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid()); invitation_id uuid; normalised_email text := lower(trim(candidate_email));
begin
  if actor is null or not public.has_any_role(array['owner']::public.app_role[]) or not public.current_session_is_aal2() then
    raise exception 'CMS_MFA_OR_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if candidate_role = 'owner' or char_length(normalised_email) > 320
    or normalised_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or candidate_expires_at <= now() or candidate_expires_at > now() + interval '30 days' then
    raise exception 'CMS_INVALID_INVITATION' using errcode = '22023';
  end if;
  update public.staff_invitations set revoked_at = now(), revoked_by = actor
    where email = normalised_email and consumed_at is null and revoked_at is null and expires_at <= now();
  insert into public.staff_invitations(email,role,invited_by,expires_at)
    values(normalised_email,candidate_role,actor,candidate_expires_at) returning id into invitation_id;
  insert into public.content_audit_log(actor_id,action,entity_type,entity_id,after_data)
    values(actor,'staff_invitation.created','staff_invitation',invitation_id::text,jsonb_build_object('role',candidate_role));
  return invitation_id;
end; $$;

create function public.revoke_staff_invitation(target_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid()); affected integer;
begin
  if actor is null or not public.has_any_role(array['owner']::public.app_role[]) or not public.current_session_is_aal2() then
    raise exception 'CMS_MFA_OR_ROLE_REQUIRED' using errcode = '42501';
  end if;
  update public.staff_invitations set revoked_at = now(), revoked_by = actor
    where id = target_id and consumed_at is null and revoked_at is null;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'CMS_INVITATION_NOT_PENDING' using errcode = 'P0002'; end if;
  insert into public.content_audit_log(actor_id,action,entity_type,entity_id)
    values(actor,'staff_invitation.revoked','staff_invitation',target_id::text);
end; $$;

revoke all on function public.create_staff_invitation(text,public.app_role,timestamptz) from public;
revoke all on function public.revoke_staff_invitation(uuid) from public;
grant execute on function public.create_staff_invitation(text,public.app_role,timestamptz) to authenticated;
grant execute on function public.revoke_staff_invitation(uuid) to authenticated;

create function public.provision_invited_staff()
returns trigger language plpgsql security definer set search_path = '' as $$
declare invitation public.staff_invitations%rowtype;
begin
  if session_user = 'postgres' and current_setting('app.cms_fixture_bypass', true) = 'on' then return new; end if;
  select * into invitation from public.staff_invitations
  where email = lower(trim(new.email)) and consumed_at is null and revoked_at is null and expires_at > now()
  order by created_at desc limit 1 for update;
  if not found then raise exception 'INVITATION_REQUIRED' using errcode = '42501'; end if;
  insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(split_part(new.email,'@',1),''),'Invited user'));
  insert into public.user_roles(user_id,role,granted_by) values(new.id,invitation.role,invitation.invited_by);
  update public.staff_invitations set consumed_at = now(), consumed_by = new.id where id = invitation.id;
  insert into public.content_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(invitation.invited_by,'staff_invitation.consumed','staff_invitation',invitation.id::text,jsonb_build_object('user_id',new.id,'role',invitation.role));
  return new;
end; $$;

create trigger provision_invited_staff_after_signup after insert on auth.users
for each row execute function public.provision_invited_staff();

revoke all on function public.provision_invited_staff() from public;
revoke all on function public.protect_staff_invitation_update() from public;

create or replace function public.record_content_audit(event_action text,event_entity_type text,event_entity_id text,event_after_data jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare actor uuid := (select auth.uid());
begin
  if actor is null or not public.can_mutate_cms_draft() then raise exception 'CMS_FORBIDDEN' using errcode = '42501'; end if;
  if event_action not in (
    'page.draft_updated','section.draft_saved','section.draft_deleted','reusable_entry.draft_saved',
    'asset.draft_uploaded','navigation.draft_saved','cms.seed_imported','staff_invitation.created','staff_invitation.revoked'
  ) or event_entity_type not in ('page','section','reusable_entry','asset','navigation_item','cms','staff_invitation')
    or char_length(event_entity_id) not between 1 and 160 or char_length(coalesce(event_after_data::text,'')) > 10000 then
    raise exception 'CMS_INVALID_AUDIT_EVENT' using errcode = '22023';
  end if;
  insert into public.content_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(actor,event_action,event_entity_type,event_entity_id,event_after_data);
end; $$;

commit;
