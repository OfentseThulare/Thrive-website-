begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(23);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('51000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','secure-publisher@example.test','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now());
insert into public.profiles(id,display_name) values('51000000-0000-0000-0000-000000000001','Secure Publisher');
insert into public.user_roles(user_id,role) values('51000000-0000-0000-0000-000000000001','publisher');
insert into public.pages(id,slug,title,description,status) values('52000000-0000-0000-0000-000000000001','secure-page','Secure page','Secure description','draft');
insert into public.page_drafts(page_id,title,description,seo,updated_by) values('52000000-0000-0000-0000-000000000001','Secure page','Secure description','{}','51000000-0000-0000-0000-000000000001');
insert into public.sections(page_slug,block_type,position,content) values('secure-page','introduction',0,'{"blockType":"introduction","eyebrow":"Secure","heading":"Heading","body":["Body"],"align":"left"}');

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
select ok(has_function_privilege('anon', 'public.invitation_email_is_eligible(text)', 'EXECUTE'), 'eligibility RPC has a narrow anonymous grant');
select matches(pg_get_functiondef('public.provision_invited_staff()'::regprocedure), 'INVITATION_REQUIRED', 'signup trigger rejects uninvited account creation');

select * from finish();
rollback;
