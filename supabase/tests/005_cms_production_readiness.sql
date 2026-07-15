begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(30);

select ok(
  public.validate_cms_block('{"blockType":"introduction","eyebrow":"Support","heading":"A careful next step","body":["Validated content."],"align":"left"}'::jsonb),
  'an exact introduction block is accepted'
);
select ok(
  public.validate_cms_block('{"blockType":"reusable_collection","heading":"Selected resources","entryType":"resource","keys":["guide"],"tone":"mist"}'::jsonb),
  'an exact reusable collection block is accepted'
);
select ok(
  not public.validate_cms_block('{"blockType":"introduction","heading":"Missing eyebrow","body":["Body"]}'::jsonb),
  'missing required block fields are rejected'
);
select ok(
  not public.validate_cms_block('{"blockType":"introduction","eyebrow":"Support","heading":"Heading","body":["Body"],"unexpected":true}'::jsonb),
  'additional block fields are rejected'
);
select ok(
  not public.validate_cms_block('{"blockType":"call_to_action","heading":"Act","body":"Body","action":{"label":"Unsafe","href":"javascript:alert(1)"}}'::jsonb),
  'unsafe nested links are rejected'
);
select ok(
  not public.validate_cms_block('{"blockType":"hero","eyebrow":"Support","heading":"Heading","body":"Body","primaryAction":{"label":"Book","href":"/booking"},"image":{"src":"https://example.test/photo.jpg","alt":"Photo","width":800,"height":600}}'::jsonb),
  'remote image sources are rejected'
);
select ok(
  not public.validate_cms_block('{"blockType":"faq","eyebrow":"Questions","heading":"Answers","items":[{"question":"Question?","answer":7}]}'::jsonb),
  'incorrect nested field types are rejected'
);

select ok(
  public.validate_cms_snapshot('{"slug":"validation-page","title":"Validation page","description":"Validated description","status":"published","seo":{},"sections":[{"blockType":"introduction","eyebrow":"Support","heading":"Heading","body":["Body"],"align":"left"}]}'::jsonb),
  'an exact published snapshot is accepted'
);
select ok(
  not public.validate_cms_snapshot('{"slug":"validation-page","title":7,"description":"Validated description","status":"published","seo":{},"sections":[{"blockType":"introduction","eyebrow":"Support","heading":"Heading","body":["Body"]}]}'::jsonb),
  'snapshot scalar types must be exact'
);
select ok(
  not public.validate_cms_snapshot('{"slug":"validation-page","title":"Validation page","description":"Validated description","status":"published","seo":{"robots":"all"},"sections":[{"blockType":"introduction","eyebrow":"Support","heading":"Heading","body":["Body"]}]}'::jsonb),
  'unknown SEO fields are rejected'
);

create function public.test_invalid_section_is_rejected()
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  insert into public.sections(page_slug,block_type,position,content)
  values('validation-page','introduction',0,'{"blockType":"introduction","eyebrow":"Support","heading":"Heading","body":["Body"],"unexpected":true}'::jsonb);
  return false;
exception when check_violation then
  return true;
end;
$$;

select ok(public.test_invalid_section_is_rejected(), 'the sections table cannot bypass the exact block contract');

select ok(
  public.bootstrap_first_owner_invitation('bootstrap-owner@example.test', now() + interval '1 day') is not null,
  'a database operator can create the first owner invitation once'
);
select is((select count(*)::integer from public.cms_owner_bootstrap), 1, 'the bootstrap ledger records one permanent attempt');
select ok(
  not has_function_privilege('authenticated', 'public.bootstrap_first_owner_invitation(text,timestamptz)', 'execute'),
  'application users cannot execute the bootstrap function'
);
select matches(
  pg_get_functiondef('public.bootstrap_first_owner_invitation(text,timestamptz)'::regprocedure),
  'pg_advisory_xact_lock',
  'the bootstrap path serialises concurrent attempts'
);

create function public.test_second_bootstrap_is_rejected()
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  perform public.bootstrap_first_owner_invitation('another-owner@example.test', now() + interval '1 day');
  return false;
exception when object_not_in_prerequisite_state then
  return true;
end;
$$;

select ok(public.test_second_bootstrap_is_rejected(), 'a second bootstrap attempt is rejected');

insert into auth.users (
  id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
)
values (
  '61000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','bootstrap-owner@example.test','',now(),
  '{"provider":"email","providers":["email"]}','{}',now(),now()
);

select ok(
  exists(select 1 from public.user_roles where user_id = '61000000-0000-0000-0000-000000000001' and role = 'owner'),
  'consuming the bootstrap invitation provisions the first owner'
);
select ok(
  exists(select 1 from public.cms_owner_bootstrap where completed_by = '61000000-0000-0000-0000-000000000001' and completed_at is not null),
  'bootstrap completion is recorded against the first owner'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;

select is(
  (public.import_initial_cms_seed('[{"slug":"seed-page","title":"Seed page","description":"Approved seed description","status":"published","seo":{},"sections":[{"blockType":"introduction","eyebrow":"Support","heading":"Seed heading","body":["Seed body"],"align":"left"},{"blockType":"reusable_collection","heading":"Selected resources","entryType":"resource","keys":["guide"],"tone":"mist"}]}]'::jsonb)->>'imported')::integer,
  1,
  'the atomic seed import creates a missing draft page'
);
select is((select count(*)::integer from public.pages where slug = 'seed-page'), 1, 'seed import creates one page');
select is((select count(*)::integer from public.sections where page_slug = 'seed-page'), 2, 'seed import creates the exact section set');
select is(
  (public.import_initial_cms_seed('[{"slug":"seed-page","title":"Seed page","description":"Approved seed description","status":"published","seo":{},"sections":[{"blockType":"introduction","eyebrow":"Support","heading":"Seed heading","body":["Seed body"],"align":"left"},{"blockType":"reusable_collection","heading":"Selected resources","entryType":"resource","keys":["guide"],"tone":"mist"}]}]'::jsonb)->>'repaired')::integer,
  1,
  'retrying the seed import repairs the same unpublished draft'
);
select is((select count(*)::integer from public.sections where page_slug = 'seed-page'), 2, 'a retry does not duplicate sections');

create function public.test_invalid_seed_is_atomic()
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  perform public.import_initial_cms_seed('[{"slug":"atomic-valid","title":"Atomic valid","description":"Should roll back","status":"published","seo":{},"sections":[{"blockType":"introduction","eyebrow":"Support","heading":"Heading","body":["Body"]}]},{"slug":"atomic-invalid","title":"Atomic invalid","description":"Invalid block rolls back all","status":"published","seo":{},"sections":[{"blockType":"introduction","heading":"Missing eyebrow","body":["Body"]}]}]'::jsonb);
  return false;
exception when invalid_parameter_value then
  return not exists(select 1 from public.pages where slug in ('atomic-valid','atomic-invalid'));
end;
$$;

select ok(public.test_invalid_seed_is_atomic(), 'one invalid seed page rolls back the complete import');
select ok(
  public.publish_page(
    (select id from public.pages where slug = 'seed-page'),
    '{"slug":"seed-page","title":"Seed page","description":"Approved seed description","status":"published","seo":{},"sections":[{"blockType":"introduction","eyebrow":"Support","heading":"Seed heading","body":["Seed body"],"align":"left"},{"blockType":"reusable_collection","heading":"Selected resources","entryType":"resource","keys":["guide"],"tone":"mist"}]}'::jsonb,
    'Production readiness test'
  ) is not null,
  'the imported draft publishes through the immutable version path'
);
select is(
  (public.import_initial_cms_seed('[{"slug":"seed-page","title":"Overwrite attempt","description":"Must not replace published content","status":"published","seo":{},"sections":[{"blockType":"introduction","eyebrow":"Support","heading":"Changed","body":["Changed"]}]}]'::jsonb)->>'skippedPublished')::integer,
  1,
  'seed import skips a page that has ever been published'
);
select is((select title from public.pages where slug = 'seed-page'), 'Seed page', 'published page content is preserved');

create function public.test_last_owner_is_preserved()
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  perform public.manage_user_role('61000000-0000-0000-0000-000000000001','owner',false);
  return false;
exception when invalid_parameter_value then
  return exists(select 1 from public.user_roles where user_id = '61000000-0000-0000-0000-000000000001' and role = 'owner');
end;
$$;

select ok(public.test_last_owner_is_preserved(), 'the last owner cannot be revoked');
select matches(
  pg_get_functiondef('public.manage_user_role(uuid,public.app_role,boolean)'::regprocedure),
  'pg_advisory_xact_lock',
  'owner role changes serialise their invariant check'
);
select ok(
  has_function_privilege('authenticated', 'public.import_initial_cms_seed(jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.import_initial_cms_seed(jsonb)', 'execute'),
  'seed import execution is granted narrowly'
);

reset role;
select * from finish();
rollback;
