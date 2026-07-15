begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(43);
select set_config('app.cms_fixture_bypass', 'on', true);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('51000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','secure-publisher@example.test','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
  ('51000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','secure-editor@example.test','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
  ('51000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','secure-owner@example.test','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
  ('51000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','secure-multi@example.test','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now());
insert into public.profiles(id,display_name) values
  ('51000000-0000-0000-0000-000000000001','Secure Publisher'),
  ('51000000-0000-0000-0000-000000000002','Secure Editor'),
  ('51000000-0000-0000-0000-000000000003','Secure Owner'),
  ('51000000-0000-0000-0000-000000000004','Secure Multi-role User');
insert into public.user_roles(user_id,role) values
  ('51000000-0000-0000-0000-000000000001','publisher'),
  ('51000000-0000-0000-0000-000000000002','editor'),
  ('51000000-0000-0000-0000-000000000003','owner'),
  ('51000000-0000-0000-0000-000000000004','publisher'),
  ('51000000-0000-0000-0000-000000000004','editor');
insert into public.pages(id,slug,title,description,status) values('52000000-0000-0000-0000-000000000001','secure-page','Secure page','Secure description','draft');
insert into public.page_drafts(page_id,title,description,seo,updated_by) values('52000000-0000-0000-0000-000000000001','Secure page','Secure description','{}','51000000-0000-0000-0000-000000000001');
insert into public.sections(page_slug,block_type,position,content) values('secure-page','introduction',0,'{"blockType":"introduction","eyebrow":"Secure","heading":"Heading","body":["Body"],"align":"left"}');
select set_config('app.cms_fixture_bypass', 'off', true);

create function public.test_uninvited_signup_is_atomic()
returns boolean
language plpgsql
set search_path = ''
as $$
declare candidate uuid := '53000000-0000-0000-0000-000000000001';
begin
  insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(candidate,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','not-invited@example.test','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now());
  return false;
exception when insufficient_privilege then
  return not exists(select 1 from auth.users where id = candidate)
    and not exists(select 1 from public.profiles where id = candidate)
    and not exists(select 1 from public.user_roles where user_id = candidate)
    and not exists(select 1 from public.staff_invitations where consumed_by = candidate);
end;
$$;

create function public.test_direct_page_version_insert_is_denied()
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  insert into public.page_versions(page_id,version_number,snapshot,created_by)
  values(
    '52000000-0000-0000-0000-000000000001',
    99,
    '{"slug":"secure-page","title":"Bypass","description":"Bypass","status":"published","sections":[]}'::jsonb,
    (select auth.uid())
  );
  return false;
exception when insufficient_privilege then
  return true;
end;
$$;

select ok(public.is_safe_cms_href('/'), 'root path is safe');
select ok(public.is_safe_cms_href('/about?from=nav#team'), 'internal path is safe');
select ok(public.is_safe_cms_href('https://example.org/resource'), 'HTTPS URL is safe');
select ok(public.is_safe_cms_href('http://localhost:3000/preview'), 'HTTP URL is structurally safe');
select ok(public.is_safe_cms_href('mailto:hello@example.org'), 'mailto URL is safe');
select ok(public.is_safe_cms_href('tel:+27 11 123 4567'), 'telephone URL is safe');

select ok(not public.is_safe_cms_href('javascript:alert(1)'), 'javascript URL is rejected');
select ok(not public.is_safe_cms_href('data:text/html,<script>'), 'data URL is rejected');
select ok(not public.is_safe_cms_href('//evil.example/path'), 'protocol-relative URL is rejected');
select ok(not public.is_safe_cms_href('/safe\evil'), 'backslash URL is rejected');
select ok(not public.is_safe_cms_href('https://user:pass@example.org/path'), 'credential-bearing URL is rejected');
select ok(not public.is_safe_cms_href('/safe' || chr(10) || 'evil'), 'control characters are rejected');

select ok(public.validate_reusable_content('faq', '{"question":"Question?","answer":"Approved answer."}'::jsonb), 'valid FAQ is accepted');
select ok(not public.validate_reusable_content('faq', '{"question":"Question?","answer":"Approved","nested":{"script":"bad"}}'::jsonb), 'nested unsupported keys are rejected');
select ok(not public.validate_reusable_content('resource', '{"title":"Resource","body":"<iframe src=x></iframe>"}'::jsonb), 'forbidden nested markup values are rejected');
select ok(not public.validate_reusable_content('unknown', '{"title":"Unsupported","body":"No"}'::jsonb), 'unsupported reusable shapes are rejected');
select ok(not public.validate_reusable_content('credential', '{"title":"Credential","body":"Body","issuer":{"name":"Issuer"}}'::jsonb), 'object issuer is rejected');
select ok(not public.validate_reusable_content('credential', '{"title":"Credential","body":"Body","verificationStatus":true}'::jsonb), 'boolean verification status is rejected');
select ok(not public.validate_reusable_content('faq', '{"question":"   ","answer":"Answer"}'::jsonb), 'empty strings are rejected');
select ok(not public.validate_reusable_content('faq', jsonb_build_object('question',repeat('x',181),'answer','Answer')), 'overlength strings are rejected');
select ok(not public.validate_reusable_content('legal_notice', '{"title":"Notice","body":["Valid",7]}'::jsonb), 'invalid legal body members are rejected');
select ok(not public.validate_reusable_content('legal_notice', '{"title":"Notice","body":["Valid"],"effectiveDate":"2026-02-30"}'::jsonb), 'invalid ISO date is rejected');
select ok(not public.validate_reusable_content('resource', '{"title":"Resource","body":"Body","href":null}'::jsonb), 'null optional href is rejected');
select ok(not public.validate_reusable_content('testimonial', '{"quote":"Helpful","attribution":"Client","consentConfirmed":false}'::jsonb), 'testimonial consent must be literal true');
select ok(public.validate_reusable_content('credential', '{"title":"Credential","body":"Body","issuer":"Issuer","verificationStatus":"verified"}'::jsonb), 'valid credential optional fields are accepted');
select ok(public.validate_reusable_content('legal_notice', '{"title":"Notice","body":["First paragraph","Second paragraph"],"effectiveDate":"2026-07-15"}'::jsonb), 'valid legal notice is accepted');
select ok(public.validate_reusable_content('service', '{"title":"Service","body":"Body","href":"/services"}'::jsonb), 'valid service is accepted');

select set_config('request.jwt.claims', '{"sub":"51000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select ok(public.can_mutate_cms_draft(), 'editor at AAL1 can mutate drafts');
reset role;
select set_config('request.jwt.claims', '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select ok(not public.can_mutate_cms_draft(), 'publisher at AAL1 cannot mutate drafts');
reset role;
select set_config('request.jwt.claims', '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select ok(public.can_mutate_cms_draft(), 'publisher at AAL2 can mutate drafts');
select ok(public.test_direct_page_version_insert_is_denied(), 'direct page version insertion is denied');
reset role;
select set_config('request.jwt.claims', '{"sub":"51000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select ok(not public.can_mutate_cms_draft(), 'owner at AAL1 cannot mutate drafts');
reset role;
select set_config('request.jwt.claims', '{"sub":"51000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select ok(public.can_mutate_cms_draft(), 'owner at AAL2 can mutate drafts');
reset role;
select set_config('request.jwt.claims', '{"sub":"51000000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select ok(not public.can_mutate_cms_draft(), 'multi-role publisher and editor at AAL1 cannot mutate drafts');
reset role;
select set_config('request.jwt.claims', '{"sub":"51000000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select ok(public.can_mutate_cms_draft(), 'multi-role publisher and editor at AAL2 can mutate drafts');
reset role;

select set_config('request.jwt.claims', '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select ok(not public.current_session_is_aal2(), 'AAL1 is not privileged');
set local role authenticated;
select throws_ok(
  $$select public.publish_page('52000000-0000-0000-0000-000000000001','{"slug":"secure-page","title":"Secure page","description":"Secure description","status":"published","seo":{},"sections":[{"blockType":"introduction","eyebrow":"Secure","heading":"Heading","body":["Body"],"align":"left"}]}'::jsonb,'AAL test')$$,
  '42501', 'CMS_FORBIDDEN', 'AAL1 cannot call the publication RPC directly'
);
reset role;
select set_config('request.jwt.claims', '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
select ok(public.current_session_is_aal2(), 'AAL2 is privileged');
set local role authenticated;
select lives_ok(
  $$select public.publish_page('52000000-0000-0000-0000-000000000001','{"slug":"secure-page","title":"Secure page","description":"Secure description","status":"published","seo":{},"sections":[{"blockType":"introduction","eyebrow":"Secure","heading":"Heading","body":["Body"],"align":"left"}]}'::jsonb,'AAL test')$$,
  'AAL2 can call the publication RPC directly'
);
reset role;

select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.staff_invitations'::regclass), 'staff invitations use forced RLS');
select ok(not exists(
  select 1 from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
  where pg_namespace.nspname = 'public' and pg_proc.proname = 'invitation_email_is_eligible'
), 'eligibility oracle does not exist');
select matches(pg_get_functiondef('public.provision_invited_staff()'::regprocedure), 'INVITATION_REQUIRED', 'signup trigger rejects uninvited account creation');
select ok(public.test_uninvited_signup_is_atomic(), 'uninvited account creation is atomic');

select * from finish();
rollback;
