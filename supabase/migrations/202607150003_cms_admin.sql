begin;

create table public.page_drafts (
  page_id uuid primary key references public.pages(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  description text not null check (char_length(description) between 1 and 320),
  seo jsonb not null default '{}'::jsonb check (jsonb_typeof(seo) = 'object'),
  visible boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.page_drafts enable row level security;
alter table public.page_drafts force row level security;

create trigger page_drafts_updated_at before update on public.page_drafts
for each row execute function public.set_updated_at();

create policy page_drafts_cms_read on public.page_drafts for select to authenticated
using (public.has_any_role(array['owner', 'publisher', 'editor', 'auditor']::public.app_role[]));
create policy page_drafts_editor_manage on public.page_drafts for all to authenticated
using (public.has_any_role(array['owner', 'publisher', 'editor']::public.app_role[]))
with check (
  updated_by = (select auth.uid())
  and public.has_any_role(array['owner', 'publisher', 'editor']::public.app_role[])
);

alter table public.navigation_items
  add column status public.content_status not null default 'draft';

alter table public.sections drop constraint if exists sections_block_type_check;
alter table public.sections add constraint sections_block_type_check check (
  block_type in (
    'hero', 'introduction', 'card_collection', 'editorial_split',
    'feature_list', 'process', 'comparison', 'pricing', 'faq',
    'notice', 'call_to_action'
  )
);

drop policy navigation_public_read on public.navigation_items;
create policy navigation_public_read on public.navigation_items for select to anon, authenticated
using (visible and status = 'published');

drop policy content_audit_append on public.content_audit_log;

create or replace function public.validate_cms_snapshot(snapshot jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(snapshot) = 'object'
    and jsonb_typeof(snapshot -> 'sections') = 'array'
    and coalesce(snapshot ->> 'slug', '') ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(coalesce(snapshot ->> 'title', '')) between 1 and 140
    and char_length(coalesce(snapshot ->> 'description', '')) between 1 and 320
    and snapshot ->> 'status' = 'published'
    and jsonb_typeof(coalesce(snapshot -> 'seo', '{}'::jsonb)) = 'object'
    and not exists (
      select 1
      from jsonb_array_elements(snapshot -> 'sections') as section
      where coalesce(section ->> 'blockType', '') not in (
        'hero', 'introduction', 'card_collection', 'editorial_split',
        'feature_list', 'process', 'comparison', 'pricing', 'faq',
        'notice', 'call_to_action'
      )
    );
$$;

revoke all on function public.validate_cms_snapshot(jsonb) from public;
grant execute on function public.validate_cms_snapshot(jsonb) to authenticated;

create or replace function public.publish_page(
  target_page_id uuid,
  expected_snapshot jsonb,
  change_summary text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target_page public.pages%rowtype;
  draft public.page_drafts%rowtype;
  next_version integer;
  new_version_id uuid;
  server_snapshot jsonb;
begin
  if actor is null or not public.has_any_role(array['owner', 'publisher']::public.app_role[]) then
    raise exception 'CMS_FORBIDDEN' using errcode = '42501';
  end if;

  if change_summary is not null and char_length(change_summary) > 500 then
    raise exception 'CMS_INVALID_SUMMARY' using errcode = '22023';
  end if;

  select * into target_page from public.pages where id = target_page_id for update;
  if not found then
    raise exception 'CMS_PAGE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into draft from public.page_drafts where page_id = target_page_id;
  if not found then
    raise exception 'CMS_DRAFT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'slug', target_page.slug,
    'title', draft.title,
    'description', draft.description,
    'status', 'published',
    'seo', draft.seo,
    'sections', coalesce(
      jsonb_agg(sections.content order by sections.position)
        filter (where sections.id is not null and sections.visible),
      '[]'::jsonb
    )
  )
  into server_snapshot
  from public.sections
  where sections.page_slug = target_page.slug;

  if expected_snapshot is distinct from server_snapshot
    or not public.validate_cms_snapshot(server_snapshot)
    or public.cms_json_has_forbidden_keys(server_snapshot)
    or jsonb_array_length(server_snapshot -> 'sections') = 0 then
    raise exception 'CMS_INVALID_OR_STALE_SNAPSHOT' using errcode = '22023';
  end if;

  select coalesce(max(version_number), 0) + 1 into next_version
  from public.page_versions where page_id = target_page_id;

  insert into public.page_versions (
    page_id, version_number, snapshot, change_summary, created_by
  ) values (
    target_page_id, next_version, server_snapshot, nullif(trim(change_summary), ''), actor
  ) returning id into new_version_id;

  update public.pages set
    title = draft.title,
    description = draft.description,
    seo = draft.seo,
    status = case when draft.visible then 'published'::public.content_status else 'archived'::public.content_status end,
    published_version_id = case when draft.visible then new_version_id else null end,
    published_at = case when draft.visible then now() else null end,
    updated_by = actor
  where id = target_page_id;

  insert into public.content_audit_log (
    actor_id, action, entity_type, entity_id, before_data, after_data
  ) values (
    actor, 'page.published', 'page', target_page_id::text,
    jsonb_build_object('published_version_id', target_page.published_version_id),
    jsonb_build_object('published_version_id', new_version_id, 'version_number', next_version)
  );

  return new_version_id;
end;
$$;

create or replace function public.restore_page_version(
  target_page_id uuid,
  target_version_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target_page public.pages%rowtype;
  target_version public.page_versions%rowtype;
begin
  if actor is null or not public.has_any_role(array['owner', 'publisher']::public.app_role[]) then
    raise exception 'CMS_FORBIDDEN' using errcode = '42501';
  end if;

  select * into target_page from public.pages where id = target_page_id for update;
  if not found then
    raise exception 'CMS_PAGE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into target_version from public.page_versions
  where id = target_version_id and page_id = target_page_id;
  if not found or not public.validate_cms_snapshot(target_version.snapshot) then
    raise exception 'CMS_VERSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.pages set
    title = target_version.snapshot ->> 'title',
    description = target_version.snapshot ->> 'description',
    seo = coalesce(target_version.snapshot -> 'seo', '{}'::jsonb),
    status = 'published',
    published_version_id = target_version_id,
    published_at = now(),
    updated_by = actor
  where id = target_page_id;

  insert into public.content_audit_log (
    actor_id, action, entity_type, entity_id, before_data, after_data
  ) values (
    actor, 'page.version_restored', 'page', target_page_id::text,
    jsonb_build_object('published_version_id', target_page.published_version_id),
    jsonb_build_object('published_version_id', target_version_id, 'version_number', target_version.version_number)
  );

  return target_version_id;
end;
$$;

create or replace function public.set_navigation_publication(
  target_item_id uuid,
  make_public boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  previous public.navigation_items%rowtype;
begin
  if actor is null or not public.has_any_role(array['owner', 'publisher']::public.app_role[]) then
    raise exception 'CMS_FORBIDDEN' using errcode = '42501';
  end if;
  select * into previous from public.navigation_items where id = target_item_id for update;
  if not found then raise exception 'CMS_NAVIGATION_NOT_FOUND' using errcode = 'P0002'; end if;
  update public.navigation_items set
    status = case when make_public then 'published'::public.content_status else 'draft'::public.content_status end,
    visible = make_public
  where id = target_item_id;
  insert into public.content_audit_log (actor_id, action, entity_type, entity_id, before_data, after_data)
  values (
    actor, case when make_public then 'navigation.published' else 'navigation.unpublished' end,
    'navigation_item', target_item_id::text,
    jsonb_build_object('status', previous.status, 'visible', previous.visible),
    jsonb_build_object('status', case when make_public then 'published' else 'draft' end, 'visible', make_public)
  );
end;
$$;

create or replace function public.manage_user_role(
  target_user_id uuid,
  target_role public.app_role,
  grant_role boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null or not public.has_any_role(array['owner']::public.app_role[]) then
    raise exception 'CMS_FORBIDDEN' using errcode = '42501';
  end if;
  if grant_role then
    insert into public.user_roles (user_id, role, granted_by)
    values (target_user_id, target_role, actor)
    on conflict (user_id, role) do nothing;
  else
    if target_role = 'owner' and (
      select count(*) from public.user_roles where role = 'owner'
    ) <= 1 then
      raise exception 'CMS_LAST_OWNER' using errcode = '22023';
    end if;
    delete from public.user_roles where user_id = target_user_id and role = target_role;
  end if;
  insert into public.content_audit_log (actor_id, action, entity_type, entity_id, after_data)
  values (
    actor, case when grant_role then 'role.granted' else 'role.revoked' end,
    'user_role', target_user_id::text,
    jsonb_build_object('role', target_role)
  );
end;
$$;

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
begin
  if jsonb_typeof(value) = 'object' then
    for object_key, object_value in select * from jsonb_each(value) loop
      if lower(object_key) in ('html', 'rawhtml', 'raw_html', 'script', 'iframe', 'style', 'css')
        or public.cms_json_has_forbidden_keys(object_value) then
        return true;
      end if;
    end loop;
  elsif jsonb_typeof(value) = 'array' then
    for item in select * from jsonb_array_elements(value) loop
      if public.cms_json_has_forbidden_keys(item) then return true; end if;
    end loop;
  end if;
  return false;
end;
$$;

create or replace function public.record_content_audit(
  event_action text,
  event_entity_type text,
  event_entity_id text,
  event_after_data jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null or not public.has_any_role(array['owner', 'publisher', 'editor']::public.app_role[]) then
    raise exception 'CMS_FORBIDDEN' using errcode = '42501';
  end if;
  if event_action not in (
    'page.draft_updated', 'section.draft_saved', 'section.draft_deleted',
    'reusable_entry.draft_saved', 'reusable_entry.status_changed',
    'asset.draft_uploaded', 'asset.status_changed', 'navigation.draft_saved',
    'cms.seed_imported'
  ) or event_entity_type not in ('page', 'section', 'reusable_entry', 'asset', 'navigation_item', 'cms')
    or char_length(event_entity_id) not between 1 and 160
    or char_length(coalesce(event_after_data::text, '')) > 10000 then
    raise exception 'CMS_INVALID_AUDIT_EVENT' using errcode = '22023';
  end if;
  insert into public.content_audit_log (actor_id, action, entity_type, entity_id, after_data)
  values (actor, event_action, event_entity_type, event_entity_id, event_after_data);
end;
$$;

revoke all on function public.publish_page(uuid, jsonb, text) from public;
revoke all on function public.restore_page_version(uuid, uuid) from public;
revoke all on function public.set_navigation_publication(uuid, boolean) from public;
revoke all on function public.manage_user_role(uuid, public.app_role, boolean) from public;
revoke all on function public.cms_json_has_forbidden_keys(jsonb) from public;
revoke all on function public.record_content_audit(text, text, text, jsonb) from public;
grant execute on function public.publish_page(uuid, jsonb, text) to authenticated;
grant execute on function public.restore_page_version(uuid, uuid) to authenticated;
grant execute on function public.set_navigation_publication(uuid, boolean) to authenticated;
grant execute on function public.manage_user_role(uuid, public.app_role, boolean) to authenticated;
grant execute on function public.cms_json_has_forbidden_keys(jsonb) to authenticated;
grant execute on function public.record_content_audit(text, text, text, jsonb) to authenticated;

commit;
