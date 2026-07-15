begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('41000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cms-editor@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('41000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cms-publisher@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('41000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cms-owner@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (id, display_name) values
  ('41000000-0000-0000-0000-000000000001', 'CMS Editor'),
  ('41000000-0000-0000-0000-000000000002', 'CMS Publisher'),
  ('41000000-0000-0000-0000-000000000003', 'CMS Owner');
insert into public.user_roles (user_id, role) values
  ('41000000-0000-0000-0000-000000000001', 'editor'),
  ('41000000-0000-0000-0000-000000000002', 'publisher'),
  ('41000000-0000-0000-0000-000000000003', 'owner');

insert into public.pages (id, slug, title, description, status) values
  ('42000000-0000-0000-0000-000000000001', 'cms-test', 'Old title', 'Old description', 'draft');
insert into public.page_drafts (page_id, title, description, updated_by) values
  ('42000000-0000-0000-0000-000000000001', 'New title', 'New description', '41000000-0000-0000-0000-000000000001');
insert into public.sections (page_slug, block_type, position, visible, content) values
  ('cms-test', 'introduction', 0, true, '{"blockType":"introduction","eyebrow":"Support","heading":"Heading","body":["Body"],"align":"left"}');

set local role anon;
select is((select count(*) from public.page_drafts), 0::bigint, 'anonymous users cannot read page drafts');
select is((select count(*) from public.sections), 0::bigint, 'anonymous users cannot read working sections');
select throws_ok(
  $$select public.publish_page('42000000-0000-0000-0000-000000000001', '{}'::jsonb, null)$$,
  '42501', 'CMS_FORBIDDEN', 'anonymous users cannot invoke publication'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.publish_page('42000000-0000-0000-0000-000000000001', '{}'::jsonb, null)$$,
  '42501', 'CMS_FORBIDDEN', 'editors cannot publish'
);
select throws_ok(
  $$select public.manage_user_role('41000000-0000-0000-0000-000000000001', 'owner', true)$$,
  '42501', 'CMS_FORBIDDEN', 'editors cannot manage roles'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"41000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}', true);
select lives_ok(
  $$select public.publish_page(
    '42000000-0000-0000-0000-000000000001',
    '{"slug":"cms-test","title":"New title","description":"New description","status":"published","seo":{},"sections":[{"blockType":"introduction","eyebrow":"Support","heading":"Heading","body":["Body"],"align":"left"}]}'::jsonb,
    'Initial approved revision'
  )$$,
  'publisher can atomically publish a validated snapshot'
);
select is((select status::text from public.pages where id = '42000000-0000-0000-0000-000000000001'), 'published', 'page becomes published');
select is((select count(*) from public.page_versions where page_id = '42000000-0000-0000-0000-000000000001'), 1::bigint, 'publication creates one immutable version');
select throws_ok(
  $$update public.page_versions set change_summary = 'mutated' where page_id = '42000000-0000-0000-0000-000000000001'$$,
  'P0001', 'Page versions are immutable', 'published versions cannot be changed'
);
select is((select count(*) from public.content_audit_log where action = 'page.published' and entity_id = '42000000-0000-0000-0000-000000000001'), 1::bigint, 'publication records an audit event');
select throws_ok(
  $$select public.manage_user_role('41000000-0000-0000-0000-000000000001', 'owner', true)$$,
  '42501', 'CMS_FORBIDDEN', 'publishers cannot manage roles'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"41000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}', true);
select lives_ok(
  $$select public.manage_user_role('41000000-0000-0000-0000-000000000001', 'auditor', true)$$,
  'owner can grant a role'
);
reset role;

select * from finish();
rollback;
