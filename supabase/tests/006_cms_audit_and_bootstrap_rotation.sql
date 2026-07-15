begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(38);

select matches(
  pg_get_constraintdef((
    select oid from pg_constraint
    where conrelid = 'public.sections'::regclass and conname = 'sections_block_type_check'
  )),
  'reusable_collection',
  'the forward migration adds the reusable collection constraint delta'
);
select ok(
  not has_function_privilege('authenticated', 'public.bootstrap_first_owner_invitation(text,timestamptz)', 'execute'),
  'authenticated users cannot create the first owner invitation'
);
select ok(
  not has_function_privilege('authenticated', 'public.rotate_first_owner_invitation(text,timestamptz)', 'execute'),
  'authenticated users cannot rotate the first owner invitation'
);
select ok(
  not has_function_privilege('service_role', 'public.rotate_first_owner_invitation(text,timestamptz)', 'execute'),
  'the service role cannot rotate the first owner invitation'
);
select matches(
  pg_get_functiondef('public.rotate_first_owner_invitation(text,timestamptz)'::regprocedure),
  'pg_advisory_xact_lock',
  'bootstrap rotation is serialised with a Postgres advisory lock'
);
select ok(
  not has_function_privilege('authenticated', 'public.record_content_audit(text,text,text,jsonb)', 'execute'),
  'application users cannot forge duplicate audit records'
);

select set_config('app.cms_fixture_bypass', 'on', true);
insert into auth.users (
  id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
  (
    '71000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000',
    'authenticated','authenticated','audit-editor@example.test','',now(),
    '{"provider":"email","providers":["email"]}','{}',now(),now()
  ),
  (
    '71000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000',
    'authenticated','authenticated','existing@example.test','',now(),
    '{"provider":"email","providers":["email"]}','{}',now(),now()
  );
insert into public.profiles(id,display_name)
values('71000000-0000-0000-0000-000000000001','Audit Editor');
insert into public.user_roles(user_id,role)
values('71000000-0000-0000-0000-000000000001','editor');
insert into public.pages(id,slug,title,description,status)
values('72000000-0000-0000-0000-000000000001','audit-page','Audit page','Audit description','draft');
select set_config('app.cms_fixture_bypass', 'off', true);

create temporary table bootstrap_rotation_state(old_id uuid, replacement_id uuid);
insert into bootstrap_rotation_state(old_id)
values(public.bootstrap_first_owner_invitation('mistyped-owner@example.test', now() + interval '1 hour'));
select ok((select old_id is not null from bootstrap_rotation_state), 'the first owner bootstrap creates its initial invitation');
select is((select count(*)::integer from public.cms_owner_bootstrap), 1, 'the bootstrap ledger remains a singleton');
update bootstrap_rotation_state
set replacement_id = public.rotate_first_owner_invitation('correct-owner@example.test', now() + interval '2 hours');
select ok(
  (select replacement_id is not null and replacement_id <> old_id from bootstrap_rotation_state),
  'an unconsumed first owner invitation can be rotated'
);
select ok(
  exists(
    select 1 from public.staff_invitations, bootstrap_rotation_state
    where id = old_id and revoked_at is not null and consumed_at is null
  ),
  'rotation preserves the previous invitation as revoked history'
);
select is(
  (select count(*)::integer from public.staff_invitations where role = 'owner'),
  2,
  'rotation retains both owner invitation history records'
);
select ok(
  exists(
    select 1 from public.cms_owner_bootstrap, bootstrap_rotation_state
    where invitation_id = replacement_id and requested_email = 'correct-owner@example.test'
  ),
  'the singleton ledger points to the replacement invitation'
);
select ok(
  exists(
    select 1 from public.staff_invitations, bootstrap_rotation_state
    where id = replacement_id and revoked_at is null and consumed_at is null and expires_at > now()
  ),
  'the replacement is the only active bootstrap invitation'
);

insert into auth.users (
  id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values (
  '71000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','correct-owner@example.test','',now(),
  '{"provider":"email","providers":["email"]}','{}',now(),now()
);
select ok(
  exists(select 1 from public.user_roles where user_id = '71000000-0000-0000-0000-000000000003' and role = 'owner'),
  'the replacement invitation provisions the first owner'
);
select ok(
  exists(select 1 from public.cms_owner_bootstrap where completed_at is not null and completed_by = '71000000-0000-0000-0000-000000000003'),
  'consumption permanently completes the bootstrap ledger'
);

create function public.test_completed_bootstrap_rotation_is_rejected()
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  perform public.rotate_first_owner_invitation('later-owner@example.test', now() + interval '1 day');
  return false;
exception when object_not_in_prerequisite_state then
  return true;
end;
$$;
select ok(public.test_completed_bootstrap_rotation_is_rejected(), 'rotation is permanently refused after completion');

select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

create function public.test_insert_attributed_drafts()
returns boolean
language plpgsql
set search_path = ''
as $mutation$
begin
  insert into public.page_drafts(page_id,title,description,seo,visible)
  values('72000000-0000-0000-0000-000000000001','Audit draft','Audit description','{}',true);
  insert into public.sections(id,page_slug,block_type,position,content)
  values(
    '73000000-0000-0000-0000-000000000001','audit-page','introduction',0,
    '{"blockType":"introduction","eyebrow":"Audit","heading":"Audit heading","body":["Audit body"],"align":"left"}'
  );
  insert into public.navigation_items(id,location,label,href,position,status,visible)
  values('74000000-0000-0000-0000-000000000001','primary','Audit link','/audit-page',99,'draft',false);
  insert into public.reusable_entries(id,entry_type,key,status,content)
  values(
    '75000000-0000-0000-0000-000000000001','faq','audit-faq','draft',
    '{"question":"Audit question?","answer":"Audit answer."}'
  );
  insert into public.assets(id,storage_path,filename,mime_type,byte_size,alt_text,status)
  values(
    '76000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001/audit.webp','audit.webp','image/webp',1024,'Audit image','draft'
  );
  return true;
exception when others then
  return false;
end;
$mutation$;
select ok(public.test_insert_attributed_drafts(), 'an editor can create five attributed draft records');

select throws_ok(
  $mutation$
    insert into public.sections(id,page_slug,block_type,position,content,created_by)
    values(
      '73000000-0000-0000-0000-000000000002','audit-page','introduction',1,
      '{"blockType":"introduction","eyebrow":"Forged","heading":"Forged heading","body":["Body"],"align":"left"}',
      '71000000-0000-0000-0000-000000000003'
    )
  $mutation$,
  '42501',
  'CMS_FORGED_CREATOR',
  'forged creator attribution is rejected'
);
select throws_ok(
  $mutation$
    update public.sections
    set created_by = '71000000-0000-0000-0000-000000000003'
    where id = '73000000-0000-0000-0000-000000000001'
  $mutation$,
  '42501',
  'CMS_CREATOR_IMMUTABLE',
  'creator attribution remains immutable'
);

create function public.test_update_attributed_drafts()
returns boolean
language plpgsql
set search_path = ''
as $mutation$
begin
  update public.page_drafts set title = 'Updated audit draft'
  where page_id = '72000000-0000-0000-0000-000000000001';
  update public.sections set visible = false
  where id = '73000000-0000-0000-0000-000000000001';
  update public.navigation_items set label = 'Updated audit link'
  where id = '74000000-0000-0000-0000-000000000001';
  update public.reusable_entries
  set content = '{"question":"Updated audit question?","answer":"Updated audit answer."}'
  where id = '75000000-0000-0000-0000-000000000001';
  update public.assets set alt_text = 'Updated audit image'
  where id = '76000000-0000-0000-0000-000000000001';
  return true;
exception when others then
  return false;
end;
$mutation$;
select ok(public.test_update_attributed_drafts(), 'an editor can update five attributed draft records');

create function public.test_delete_attributed_drafts()
returns boolean
language plpgsql
set search_path = ''
as $mutation$
begin
  delete from public.page_drafts where page_id = '72000000-0000-0000-0000-000000000001';
  delete from public.sections where id = '73000000-0000-0000-0000-000000000001';
  delete from public.navigation_items where id = '74000000-0000-0000-0000-000000000001';
  delete from public.reusable_entries where id = '75000000-0000-0000-0000-000000000001';
  delete from public.assets where id = '76000000-0000-0000-0000-000000000001';
  return true;
exception when others then
  return false;
end;
$mutation$;
select ok(public.test_delete_attributed_drafts(), 'an editor can delete five attributed draft records');

reset role;
select is(
  (
    select count(*)::integer from public.content_audit_log
    where actor_id = '71000000-0000-0000-0000-000000000001'
      and action ~ '^.+\.draft_(insert|update|delete)$'
  ),
  15,
  'direct editor DML creates complete audit history'
);
select ok(
  not exists(
    select 1 from public.content_audit_log
    where actor_id = '71000000-0000-0000-0000-000000000001'
      and action ~ '\.draft_insert$' and (before_data is not null or after_data is null)
  )
  and not exists(
    select 1 from public.content_audit_log
    where actor_id = '71000000-0000-0000-0000-000000000001'
      and action ~ '\.draft_update$' and (before_data is null or after_data is null)
  )
  and not exists(
    select 1 from public.content_audit_log
    where actor_id = '71000000-0000-0000-0000-000000000001'
      and action ~ '\.draft_delete$' and (before_data is null or after_data is not null)
  ),
  'audit records carry safe before and after context for each operation'
);
select ok(
  not exists(
    select 1 from public.content_audit_log
    where actor_id = '71000000-0000-0000-0000-000000000001'
      and action ~ '^.+\.draft_(insert|update|delete)$'
      and entity_type not in ('page','section','navigation_item','reusable_entry','asset')
  ),
  'all direct audit records retain the authenticated editor identity and entity type'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;
insert into public.pages(id,slug,title,description,status,created_by,updated_by)
values(
  '72000000-0000-0000-0000-000000000002','feature-layout-page','Feature layout page',
  'Approved feature layout description','draft',
  '71000000-0000-0000-0000-000000000003','71000000-0000-0000-0000-000000000003'
);
insert into public.page_drafts(page_id,title,description,seo,visible)
values(
  '72000000-0000-0000-0000-000000000002','Feature layout page',
  'Approved feature layout description','{}',true
);
insert into public.sections(id,page_slug,block_type,position,visible,content)
values(
  '73000000-0000-0000-0000-000000000003','feature-layout-page','feature_list',0,true,
  '{"blockType":"feature_list","eyebrow":"Support","heading":"Feature support","items":[{"title":"One","body":"First"},{"title":"Two","body":"Second"}],"layout":"grid","tone":"cream"}'
);
select ok(
  public.publish_page(
    '72000000-0000-0000-0000-000000000002',
    '{"slug":"feature-layout-page","title":"Feature layout page","description":"Approved feature layout description","status":"published","seo":{},"sections":[{"blockType":"feature_list","eyebrow":"Support","heading":"Feature support","items":[{"title":"One","body":"First"},{"title":"Two","body":"Second"}],"layout":"grid","tone":"cream"}]}'::jsonb,
    'Approved layout regression'
  ) is not null,
  'approved feature list layout publishes successfully'
);
insert into public.pages(id,slug,title,description,status,created_by,updated_by)
values(
  '72000000-0000-0000-0000-000000000003','forbidden-feature-page','Forbidden feature page',
  'Forbidden feature description','draft',
  '71000000-0000-0000-0000-000000000003','71000000-0000-0000-0000-000000000003'
);
insert into public.page_drafts(page_id,title,description,seo,visible)
values(
  '72000000-0000-0000-0000-000000000003','Forbidden feature page',
  'Forbidden feature description','{}',true
);
insert into public.sections(id,page_slug,block_type,position,visible,content)
values(
  '73000000-0000-0000-0000-000000000004','forbidden-feature-page','feature_list',0,true,
  '{"blockType":"feature_list","eyebrow":"Support","heading":"Feature support","items":[{"title":"One","body":"<script>alert(1)</script>"},{"title":"Two","body":"Second"}],"layout":"grid","tone":"cream"}'
);
select throws_ok(
  $$select public.publish_page(
    '72000000-0000-0000-0000-000000000003',
    '{"slug":"forbidden-feature-page","title":"Forbidden feature page","description":"Forbidden feature description","status":"published","seo":{},"sections":[{"blockType":"feature_list","eyebrow":"Support","heading":"Feature support","items":[{"title":"One","body":"<script>alert(1)</script>"},{"title":"Two","body":"Second"}],"layout":"grid","tone":"cream"}]}'::jsonb,
    'Forbidden content regression'
  )$$,
  '22023',
  'CMS_INVALID_OR_STALE_SNAPSHOT',
  'forbidden executable feature content cannot publish'
);
create function public.test_unsupported_feature_layout_is_rejected()
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  insert into public.sections(id,page_slug,block_type,position,visible,content)
  values(
      '73000000-0000-0000-0000-000000000005','forbidden-feature-page','feature_list',1,true,
      '{"blockType":"feature_list","eyebrow":"Support","heading":"Feature support","items":[{"title":"One","body":"First"},{"title":"Two","body":"Second"}],"layout":"columns","tone":"cream"}'
  );
  return false;
exception when check_violation then
  return true;
end;
$$;
select ok(
  public.test_unsupported_feature_layout_is_rejected(),
  'unsupported feature list layouts cannot enter the draft table'
);
select throws_ok(
  $$select public.create_staff_invitation('EXISTING@example.test','editor',now() + interval '1 day')$$,
  'P0001',
  'CMS_INVITATION_USER_EXISTS',
  'an existing Auth user invitation returns the specific safe code'
);
reset role;
select is(
  (
    select count(*)::integer from public.staff_invitations
    where lower(email) = 'existing@example.test' and consumed_at is null and revoked_at is null
  ),
  0,
  'existing Auth user rejection creates no pending invitation'
);

select ok(
  public.validate_cms_snapshot(
    '{"slug":"canonical-test","title":"Canonical test","description":"Canonical description","status":"published","seo":{"canonicalPath":"/"},"sections":[{"blockType":"introduction","eyebrow":"SEO","heading":"Heading","body":["Body"],"align":"left"}]}'
  ),
  'the root canonical path is accepted'
);
select ok(
  public.validate_cms_snapshot(
    '{"slug":"canonical-test","title":"Canonical test","description":"Canonical description","status":"published","seo":{"canonicalPath":"/services/cancer-health-coaching"},"sections":[{"blockType":"introduction","eyebrow":"SEO","heading":"Heading","body":["Body"],"align":"left"}]}'
  ),
  'a route-shaped canonical path is accepted'
);
select ok(
  not public.validate_cms_snapshot(
    '{"slug":"canonical-test","title":"Canonical test","description":"Canonical description","status":"published","seo":{"canonicalPath":"/services//coaching"},"sections":[{"blockType":"introduction","eyebrow":"SEO","heading":"Heading","body":["Body"],"align":"left"}]}'
  ),
  'repeated slash canonical paths are rejected'
);
select ok(
  not public.validate_cms_snapshot(
    '{"slug":"canonical-test","title":"Canonical test","description":"Canonical description","status":"published","seo":{"canonicalPath":"/services/"},"sections":[{"blockType":"introduction","eyebrow":"SEO","heading":"Heading","body":["Body"],"align":"left"}]}'
  ),
  'trailing slash canonical paths are rejected'
);
select ok(
  not public.validate_cms_snapshot(
    '{"slug":"canonical-test","title":"Canonical test","description":"Canonical description","status":"published","seo":{"canonicalPath":"/cancer--support"},"sections":[{"blockType":"introduction","eyebrow":"SEO","heading":"Heading","body":["Body"],"align":"left"}]}'
  ),
  'non-canonical hyphen sequences are rejected'
);

select ok(
  not public.cms_json_has_forbidden_keys(
    '{"blockType":"feature_list","eyebrow":"Support","heading":"Feature support","items":[{"title":"One","body":"First"},{"title":"Two","body":"Second"}],"layout":"grid","tone":"cream"}'
  ),
  'the recursive guard permits an approved feature list layout enum'
);
select ok(
  public.cms_json_has_forbidden_keys('{"layout":{"columns":2}}')
  and public.cms_json_has_forbidden_keys('{"blockType":"feature_list","layout":"grid","custom":true}'),
  'arbitrary layout JSON remains forbidden'
);
select ok(
  not public.validate_cms_block(
    '{"blockType":"feature_list","eyebrow":"Support","heading":"Feature support","items":[{"title":"One","body":"First"},{"title":"Two","body":"Second"}],"layout":"columns","tone":"cream"}'
  ),
  'unsupported feature list layout values fail the exact block validator'
);
select ok(
  public.cms_json_has_forbidden_keys(
    '{"blockType":"feature_list","eyebrow":"Support","heading":"Feature support","items":[{"title":"One","body":"<script>alert(1)</script>"},{"title":"Two","body":"Second"}],"layout":"grid","tone":"cream"}'
  ),
  'forbidden executable content still fails the recursive publication guard'
);

select * from finish();
rollback;
