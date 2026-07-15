begin;

create extension if not exists pg_jsonschema with schema extensions;

do $$
begin
  if exists (
    select 1 from public.assets
    where mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
  ) then
    raise exception 'CMS_NON_IMAGE_ASSETS_PRESENT' using errcode = '23514';
  end if;
end;
$$;

alter table public.assets drop constraint if exists assets_mime_type_check;
alter table public.assets add constraint assets_mime_type_check check (
  mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')
);

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'site-assets';

create function public.is_safe_cms_image_source(value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is not null
    and char_length(value) between 1 and 500
    and (
      value ~ '^/media/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
      or (
        value ~ '^/images/[A-Za-z0-9][A-Za-z0-9/_.-]*\.(avif|jpe?g|png|webp)$'
        and value !~ '(^|/)\.\.?(/|$)'
      )
    );
$$;

create function public.cms_block_json_schema()
returns json
language sql
immutable
set search_path = ''
as $function$
  select $schema$
  {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$defs": {
      "link": {
        "type": "object",
        "additionalProperties": false,
        "required": ["label", "href"],
        "properties": {
          "label": {"type": "string", "minLength": 1, "maxLength": 80},
          "href": {"type": "string", "minLength": 1, "maxLength": 300}
        }
      },
      "image": {
        "type": "object",
        "additionalProperties": false,
        "required": ["src", "alt", "width", "height"],
        "properties": {
          "src": {"type": "string", "minLength": 1, "maxLength": 500},
          "alt": {"type": "string", "minLength": 1, "maxLength": 240},
          "width": {"type": "integer", "minimum": 1},
          "height": {"type": "integer", "minimum": 1},
          "caption": {"type": "string", "minLength": 1, "maxLength": 240},
          "position": {"enum": ["centre", "top", "bottom", "left", "right"]}
        }
      },
      "card": {
        "type": "object", "additionalProperties": false,
        "required": ["title", "body"],
        "properties": {
          "title": {"type": "string", "minLength": 1, "maxLength": 120},
          "body": {"type": "string", "minLength": 1, "maxLength": 600},
          "kicker": {"type": "string", "minLength": 1, "maxLength": 80},
          "link": {"$ref": "#/$defs/link"}
        }
      },
      "feature": {
        "type": "object", "additionalProperties": false,
        "required": ["title", "body"],
        "properties": {
          "title": {"type": "string", "minLength": 1, "maxLength": 120},
          "body": {"type": "string", "minLength": 1, "maxLength": 700}
        }
      },
      "step": {
        "type": "object", "additionalProperties": false,
        "required": ["title", "body"],
        "properties": {
          "title": {"type": "string", "minLength": 1, "maxLength": 120},
          "body": {"type": "string", "minLength": 1, "maxLength": 600}
        }
      },
      "comparisonColumn": {
        "type": "object", "additionalProperties": false,
        "required": ["title", "body", "points"],
        "properties": {
          "title": {"type": "string", "minLength": 1, "maxLength": 120},
          "body": {"type": "string", "minLength": 1, "maxLength": 700},
          "points": {"type": "array", "minItems": 1, "maxItems": 8, "items": {"type": "string", "minLength": 1, "maxLength": 240}},
          "link": {"$ref": "#/$defs/link"}
        }
      },
      "plan": {
        "type": "object", "additionalProperties": false,
        "required": ["name", "duration", "price", "body"],
        "properties": {
          "name": {"type": "string", "minLength": 1, "maxLength": 120},
          "duration": {"type": "string", "minLength": 1, "maxLength": 100},
          "price": {"type": "string", "minLength": 1, "maxLength": 80},
          "body": {"type": "string", "minLength": 1, "maxLength": 600}
        }
      },
      "faqItem": {
        "type": "object", "additionalProperties": false,
        "required": ["question", "answer"],
        "properties": {
          "question": {"type": "string", "minLength": 1, "maxLength": 180},
          "answer": {"type": "string", "minLength": 1, "maxLength": 1000}
        }
      }
    },
    "oneOf": [
      {
        "type": "object", "additionalProperties": false,
        "required": ["blockType", "eyebrow", "heading", "body", "primaryAction", "image"],
        "properties": {
          "blockType": {"const": "hero"},
          "eyebrow": {"type": "string", "minLength": 1, "maxLength": 120},
          "heading": {"type": "string", "minLength": 1, "maxLength": 180},
          "body": {"type": "string", "minLength": 1, "maxLength": 800},
          "primaryAction": {"$ref": "#/$defs/link"},
          "secondaryAction": {"$ref": "#/$defs/link"},
          "image": {"$ref": "#/$defs/image"},
          "aside": {"type": "string", "minLength": 1, "maxLength": 220},
          "tone": {"enum": ["cream", "mist", "teal"]}
        }
      },
      {
        "type": "object", "additionalProperties": false,
        "required": ["blockType", "eyebrow", "heading", "body"],
        "properties": {
          "blockType": {"const": "introduction"},
          "eyebrow": {"type": "string", "minLength": 1, "maxLength": 120},
          "heading": {"type": "string", "minLength": 1, "maxLength": 180},
          "body": {"type": "array", "minItems": 1, "maxItems": 6, "items": {"type": "string", "minLength": 1, "maxLength": 1200}},
          "align": {"enum": ["left", "centre"]}
        }
      },
      {
        "type": "object", "additionalProperties": false,
        "required": ["blockType", "eyebrow", "heading", "cards"],
        "properties": {
          "blockType": {"const": "card_collection"},
          "eyebrow": {"type": "string", "minLength": 1, "maxLength": 120},
          "heading": {"type": "string", "minLength": 1, "maxLength": 180},
          "cards": {"type": "array", "minItems": 1, "maxItems": 8, "items": {"$ref": "#/$defs/card"}},
          "tone": {"enum": ["cream", "mist", "white", "teal"]}
        }
      },
      {
        "type": "object", "additionalProperties": false,
        "required": ["blockType", "eyebrow", "heading", "body"],
        "properties": {
          "blockType": {"const": "editorial_split"},
          "eyebrow": {"type": "string", "minLength": 1, "maxLength": 120},
          "heading": {"type": "string", "minLength": 1, "maxLength": 180},
          "body": {"type": "array", "minItems": 1, "maxItems": 8, "items": {"type": "string", "minLength": 1, "maxLength": 1200}},
          "image": {"$ref": "#/$defs/image"},
          "imageSide": {"enum": ["left", "right"]},
          "action": {"$ref": "#/$defs/link"},
          "note": {"type": "string", "minLength": 1, "maxLength": 500},
          "tone": {"enum": ["cream", "mist", "white", "teal"]}
        }
      },
      {
        "type": "object", "additionalProperties": false,
        "required": ["blockType", "eyebrow", "heading", "items"],
        "properties": {
          "blockType": {"const": "feature_list"},
          "eyebrow": {"type": "string", "minLength": 1, "maxLength": 120},
          "heading": {"type": "string", "minLength": 1, "maxLength": 180},
          "introduction": {"type": "string", "minLength": 1, "maxLength": 800},
          "items": {"type": "array", "minItems": 2, "maxItems": 12, "items": {"$ref": "#/$defs/feature"}},
          "layout": {"enum": ["grid", "stack", "gems"]},
          "tone": {"enum": ["cream", "mist", "white", "teal"]}
        }
      },
      {
        "type": "object", "additionalProperties": false,
        "required": ["blockType", "eyebrow", "heading", "steps"],
        "properties": {
          "blockType": {"const": "process"},
          "eyebrow": {"type": "string", "minLength": 1, "maxLength": 120},
          "heading": {"type": "string", "minLength": 1, "maxLength": 180},
          "introduction": {"type": "string", "minLength": 1, "maxLength": 800},
          "steps": {"type": "array", "minItems": 2, "maxItems": 8, "items": {"$ref": "#/$defs/step"}}
        }
      },
      {
        "type": "object", "additionalProperties": false,
        "required": ["blockType", "eyebrow", "heading", "columns"],
        "properties": {
          "blockType": {"const": "comparison"},
          "eyebrow": {"type": "string", "minLength": 1, "maxLength": 120},
          "heading": {"type": "string", "minLength": 1, "maxLength": 180},
          "introduction": {"type": "string", "minLength": 1, "maxLength": 800},
          "columns": {"type": "array", "minItems": 2, "maxItems": 3, "items": {"$ref": "#/$defs/comparisonColumn"}}
        }
      },
      {
        "type": "object", "additionalProperties": false,
        "required": ["blockType", "eyebrow", "heading", "plans", "notes"],
        "properties": {
          "blockType": {"const": "pricing"},
          "eyebrow": {"type": "string", "minLength": 1, "maxLength": 120},
          "heading": {"type": "string", "minLength": 1, "maxLength": 180},
          "plans": {"type": "array", "minItems": 2, "maxItems": 4, "items": {"$ref": "#/$defs/plan"}},
          "notes": {"type": "array", "minItems": 1, "maxItems": 6, "items": {"type": "string", "minLength": 1, "maxLength": 800}}
        }
      },
      {
        "type": "object", "additionalProperties": false,
        "required": ["blockType", "eyebrow", "heading", "items"],
        "properties": {
          "blockType": {"const": "faq"},
          "eyebrow": {"type": "string", "minLength": 1, "maxLength": 120},
          "heading": {"type": "string", "minLength": 1, "maxLength": 180},
          "items": {"type": "array", "minItems": 1, "maxItems": 12, "items": {"$ref": "#/$defs/faqItem"}}
        }
      },
      {
        "type": "object", "additionalProperties": false,
        "required": ["blockType", "heading", "body"],
        "properties": {
          "blockType": {"const": "notice"},
          "heading": {"type": "string", "minLength": 1, "maxLength": 180},
          "body": {"type": "array", "minItems": 1, "maxItems": 5, "items": {"type": "string", "minLength": 1, "maxLength": 1000}},
          "tone": {"enum": ["scope", "verification", "status"]}
        }
      },
      {
        "type": "object", "additionalProperties": false,
        "required": ["blockType", "heading", "body", "action"],
        "properties": {
          "blockType": {"const": "call_to_action"},
          "heading": {"type": "string", "minLength": 1, "maxLength": 180},
          "body": {"type": "string", "minLength": 1, "maxLength": 600},
          "action": {"$ref": "#/$defs/link"}
        }
      },
      {
        "type": "object", "additionalProperties": false,
        "required": ["blockType", "heading", "entryType", "keys"],
        "properties": {
          "blockType": {"const": "reusable_collection"},
          "eyebrow": {"type": "string", "minLength": 1, "maxLength": 120},
          "heading": {"type": "string", "minLength": 1, "maxLength": 180},
          "introduction": {"type": "string", "minLength": 1, "maxLength": 800},
          "entryType": {"enum": ["faq", "resource", "credential", "testimonial", "pricing_note", "legal_notice", "service", "pricing"]},
          "keys": {"type": "array", "minItems": 1, "maxItems": 12, "items": {"type": "string", "minLength": 1, "maxLength": 100, "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$"}},
          "tone": {"enum": ["cream", "mist", "white"]}
        }
      }
    ]
  }
  $schema$::json;
$function$;

create function public.cms_json_has_blank_strings(value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare child jsonb;
begin
  if jsonb_typeof(value) = 'string' then return char_length(btrim(value #>> '{}')) = 0; end if;
  if jsonb_typeof(value) = 'array' then
    for child in select * from jsonb_array_elements(value) loop
      if public.cms_json_has_blank_strings(child) then return true; end if;
    end loop;
  elsif jsonb_typeof(value) = 'object' then
    for child in select object_value from jsonb_each(value) as entry(object_key,object_value) loop
      if public.cms_json_has_blank_strings(child) then return true; end if;
    end loop;
  end if;
  return false;
end;
$$;

create function public.cms_block_references_are_safe(value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare object_key text; object_value jsonb; child jsonb;
begin
  if jsonb_typeof(value) = 'array' then
    for child in select * from jsonb_array_elements(value) loop
      if not public.cms_block_references_are_safe(child) then return false; end if;
    end loop;
  elsif jsonb_typeof(value) = 'object' then
    for object_key, object_value in select * from jsonb_each(value) loop
      if object_key = 'href' and (
        jsonb_typeof(object_value) <> 'string' or not public.is_safe_cms_href(object_value #>> '{}')
      ) then return false; end if;
      if object_key = 'src' and (
        jsonb_typeof(object_value) <> 'string' or not public.is_safe_cms_image_source(object_value #>> '{}')
      ) then return false; end if;
      if not public.cms_block_references_are_safe(object_value) then return false; end if;
    end loop;
  end if;
  return true;
end;
$$;

create function public.validate_cms_block(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(value) = 'object'
    and extensions.jsonb_matches_schema(public.cms_block_json_schema(), value)
    and not public.cms_json_has_blank_strings(value)
    and public.cms_block_references_are_safe(value);
$$;

revoke all on function public.is_safe_cms_image_source(text) from public;
revoke all on function public.cms_block_json_schema() from public;
revoke all on function public.cms_json_has_blank_strings(jsonb) from public;
revoke all on function public.cms_block_references_are_safe(jsonb) from public;
revoke all on function public.validate_cms_block(jsonb) from public;
grant execute on function public.is_safe_cms_image_source(text) to authenticated;
grant execute on function public.cms_block_json_schema() to authenticated;
grant execute on function public.cms_json_has_blank_strings(jsonb) to authenticated;
grant execute on function public.cms_block_references_are_safe(jsonb) to authenticated;
grant execute on function public.validate_cms_block(jsonb) to authenticated;

alter table public.sections add constraint sections_content_shape_check check (
  block_type = content->>'blockType' and public.validate_cms_block(content)
);

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
      or seo->>'canonicalPath' !~ '^/[a-z0-9/-]*$'
      or seo->>'canonicalPath' ~ '//'
    ) then return false; end if;
    if seo ? 'noIndex' and jsonb_typeof(seo->'noIndex') <> 'boolean' then return false; end if;
  end if;
  return true;
end;
$$;

revoke all on function public.validate_cms_snapshot(jsonb) from public;
grant execute on function public.validate_cms_snapshot(jsonb) to authenticated;

create function public.import_initial_cms_seed(seed_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  seed_page jsonb;
  section jsonb;
  target_page public.pages%rowtype;
  target_page_id uuid;
  section_position integer;
  imported_count integer := 0;
  repaired_count integer := 0;
  skipped_count integer := 0;
begin
  if actor is null
    or not public.has_any_role(array['owner']::public.app_role[])
    or not public.current_session_is_aal2() then
    raise exception 'CMS_FORBIDDEN' using errcode = '42501';
  end if;
  if jsonb_typeof(seed_payload) <> 'array'
    or jsonb_array_length(seed_payload) not between 1 and 50
    or octet_length(seed_payload::text) > 2000000 then
    raise exception 'CMS_INVALID_SEED_PAYLOAD' using errcode = '22023';
  end if;
  if exists(
    select 1 from jsonb_array_elements(seed_payload) item
    group by item->>'slug' having count(*) > 1
  ) then raise exception 'CMS_DUPLICATE_SEED_SLUG' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended('thrive.cms.initial.seed', 0));

  for seed_page in select * from jsonb_array_elements(seed_payload) loop
    if not public.validate_cms_snapshot(seed_page) then
      raise exception 'CMS_INVALID_SEED_PAGE' using errcode = '22023';
    end if;

    select * into target_page from public.pages where slug = seed_page->>'slug' for update;
    if found and (target_page.status = 'published' or target_page.published_version_id is not null) then
      skipped_count := skipped_count + 1;
      continue;
    end if;

    if found then
      target_page_id := target_page.id;
      update public.pages set
        title = seed_page->>'title',
        description = seed_page->>'description',
        seo = coalesce(seed_page->'seo','{}'::jsonb),
        updated_by = actor
      where id = target_page_id;
      repaired_count := repaired_count + 1;
    else
      insert into public.pages(slug,title,description,status,seo,created_by,updated_by)
      values(
        seed_page->>'slug', seed_page->>'title', seed_page->>'description', 'draft',
        coalesce(seed_page->'seo','{}'::jsonb), actor, actor
      ) returning id into target_page_id;
      imported_count := imported_count + 1;
    end if;

    insert into public.page_drafts(page_id,title,description,seo,visible,updated_by)
    values(
      target_page_id, seed_page->>'title', seed_page->>'description',
      coalesce(seed_page->'seo','{}'::jsonb), true, actor
    )
    on conflict(page_id) do update set
      title = excluded.title,
      description = excluded.description,
      seo = excluded.seo,
      visible = true,
      updated_by = actor;

    delete from public.sections where page_slug = seed_page->>'slug';
    section_position := 0;
    for section in select * from jsonb_array_elements(seed_page->'sections') loop
      insert into public.sections(
        page_slug,block_type,schema_version,position,visible,variant,content,created_by,updated_by
      ) values(
        seed_page->>'slug', section->>'blockType', 1, section_position, true, 'default', section, actor, actor
      );
      section_position := section_position + 1;
    end loop;
  end loop;

  insert into public.content_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(
    actor,'cms.seed_imported','cms','initial-content',
    jsonb_build_object('imported',imported_count,'repaired',repaired_count,'skippedPublished',skipped_count)
  );

  return jsonb_build_object('imported',imported_count,'repaired',repaired_count,'skippedPublished',skipped_count);
end;
$$;

revoke all on function public.import_initial_cms_seed(jsonb) from public;
grant execute on function public.import_initial_cms_seed(jsonb) to authenticated;

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
  affected integer;
begin
  if actor is null
    or not public.has_any_role(array['owner']::public.app_role[])
    or not public.current_session_is_aal2() then
    raise exception 'CMS_FORBIDDEN' using errcode = '42501';
  end if;

  if target_role = 'owner' then
    perform pg_advisory_xact_lock(hashtextextended('thrive.cms.owner.roles', 0));
  end if;

  if grant_role then
    insert into public.user_roles(user_id,role,granted_by)
    values(target_user_id,target_role,actor)
    on conflict(user_id,role) do nothing;
  else
    if target_role = 'owner' and (
      select count(*) from public.user_roles where role = 'owner'
    ) <= 1 then raise exception 'CMS_LAST_OWNER' using errcode = '22023'; end if;
    delete from public.user_roles where user_id = target_user_id and role = target_role;
    get diagnostics affected = row_count;
    if affected <> 1 then raise exception 'CMS_ROLE_NOT_FOUND' using errcode = 'P0002'; end if;
    if target_role = 'owner' and not exists(select 1 from public.user_roles where role = 'owner') then
      raise exception 'CMS_LAST_OWNER' using errcode = '22023';
    end if;
  end if;

  insert into public.content_audit_log(actor_id,action,entity_type,entity_id,after_data)
  values(
    actor,case when grant_role then 'role.granted' else 'role.revoked' end,
    'user_role',target_user_id::text,jsonb_build_object('role',target_role)
  );
end;
$$;

revoke all on function public.manage_user_role(uuid,public.app_role,boolean) from public;
grant execute on function public.manage_user_role(uuid,public.app_role,boolean) to authenticated;

commit;
