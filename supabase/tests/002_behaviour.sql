begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(21);

create function public.test_operation_changes_rows(operation_sql text)
returns boolean
language plpgsql
as $$
declare
  affected_rows bigint;
begin
  execute operation_sql;
  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

create function public.test_operation_is_denied(operation_sql text)
returns boolean
language plpgsql
as $$
begin
  execute operation_sql;
  return false;
exception
  when insufficient_privilege then return true;
end;
$$;

create function public.test_operation_has_overlap(operation_sql text)
returns boolean
language plpgsql
as $$
begin
  execute operation_sql;
  return false;
exception
  when exclusion_violation then return true;
end;
$$;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'publisher@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'auditor@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'scheduler@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'finance@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.profiles (id, display_name)
values
  ('10000000-0000-0000-0000-000000000001', 'Editor'),
  ('10000000-0000-0000-0000-000000000002', 'Publisher'),
  ('10000000-0000-0000-0000-000000000003', 'Auditor'),
  ('10000000-0000-0000-0000-000000000004', 'Scheduler'),
  ('10000000-0000-0000-0000-000000000005', 'Finance');

insert into public.user_roles (user_id, role)
values
  ('10000000-0000-0000-0000-000000000001', 'editor'),
  ('10000000-0000-0000-0000-000000000002', 'publisher'),
  ('10000000-0000-0000-0000-000000000003', 'auditor'),
  ('10000000-0000-0000-0000-000000000004', 'scheduler'),
  ('10000000-0000-0000-0000-000000000005', 'finance');

insert into public.pages (id, slug, title, description, status)
values
  ('20000000-0000-0000-0000-000000000001', 'published-page', 'Published page', 'Published description', 'draft'),
  ('20000000-0000-0000-0000-000000000002', 'draft-page', 'Draft page', 'Draft description', 'draft');

insert into public.page_versions (id, page_id, version_number, snapshot)
values
  (
    '21000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    1,
    '{"slug":"published-page","title":"Published page","description":"Published description","status":"published","sections":[]}'
  ),
  (
    '21000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    1,
    '{"slug":"draft-page","title":"Draft page","description":"Draft description","status":"published","sections":[]}'
  );

update public.pages
set status = 'published',
    published_version_id = '21000000-0000-0000-0000-000000000001',
    published_at = now()
where id = '20000000-0000-0000-0000-000000000001';

insert into public.sections (id, page_slug, block_type, position, content)
values (
  '22000000-0000-0000-0000-000000000001',
  'published-page',
  'introduction',
  0,
  '{"eyebrow":"Draft","heading":"Working copy","body":["Not public until published"]}'
);

insert into public.reusable_entries (id, entry_type, key, status, content)
values ('23000000-0000-0000-0000-000000000001', 'faq', 'draft-faq', 'draft', '{"question":"Draft?","answer":"Draft."}');

insert into public.assets (id, storage_path, filename, mime_type, byte_size, alt_text, status)
values ('24000000-0000-0000-0000-000000000001', 'draft/test.jpg', 'test.jpg', 'image/jpeg', 1000, 'Draft test image', 'draft');

insert into public.services (id, slug, name, description, duration_minutes, price_cents, active)
values
  ('30000000-0000-0000-0000-000000000001', 'health-coaching', 'Health coaching', 'Health coaching test service', 60, 100000, true),
  ('30000000-0000-0000-0000-000000000002', 'counselling', 'Counselling', 'Counselling test service', 60, 100000, true);

insert into public.availability_rules (id, service_id, weekday, starts_at, ends_at, effective_from)
values ('31000000-0000-0000-0000-000000000001', null, 1, '09:00', '17:00', '2030-01-01');

insert into public.availability_exceptions (id, service_id, starts_at, ends_at, available)
values ('32000000-0000-0000-0000-000000000001', null, '2030-01-08 10:00+02', '2030-01-08 11:00+02', false);

insert into public.bookings (
  id, public_reference, service_id, starts_at, ends_at, state,
  client_name, client_email, idempotency_key
)
values (
  '33000000-0000-0000-0000-000000000001', 'TTC-BASE0001',
  '30000000-0000-0000-0000-000000000001',
  '2030-01-08 12:00+02', '2030-01-08 13:00+02', 'CONFIRMED',
  'Test Client', 'client@example.test', '34000000-0000-0000-0000-000000000001'
);

insert into public.payments (
  id, booking_id, provider, amount_cents, state, idempotency_key
)
values (
  '35000000-0000-0000-0000-000000000001',
  '33000000-0000-0000-0000-000000000001',
  'payfast', 100000, 'PENDING', '36000000-0000-0000-0000-000000000001'
);

set local role anon;
select is((select count(*) from public.pages where slug = 'published-page'), 1::bigint, 'anonymous user sees the published route');
select is((select count(*) from public.page_versions where id = '21000000-0000-0000-0000-000000000001'), 1::bigint, 'anonymous user sees only the selected published snapshot');
select is((select count(*) from public.sections), 0::bigint, 'anonymous user cannot read working section rows');
select ok(
  public.test_operation_is_denied($sql$insert into public.pages (slug, title, description) values ('anon-page', 'Anon', 'Denied')$sql$),
  'anonymous user cannot create content'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select ok(
  public.test_operation_changes_rows($sql$update public.sections set content = '{"eyebrow":"Edited","heading":"Working copy","body":["Still private"]}' where id = '22000000-0000-0000-0000-000000000001'$sql$),
  'editor can change working sections'
);
select ok(
  not public.test_operation_changes_rows($sql$update public.pages set title = 'Editor changed live title' where id = '20000000-0000-0000-0000-000000000001'$sql$),
  'editor cannot alter a published page record'
);
select ok(
  public.test_operation_is_denied($sql$update public.pages set status = 'published', published_version_id = '21000000-0000-0000-0000-000000000002', published_at = now() where id = '20000000-0000-0000-0000-000000000002'$sql$),
  'editor cannot publish a draft page'
);
select ok(
  public.test_operation_is_denied($sql$update public.reusable_entries set status = 'published' where id = '23000000-0000-0000-0000-000000000001'$sql$),
  'editor cannot publish a reusable entry'
);
select ok(
  public.test_operation_is_denied($sql$update public.assets set status = 'published' where id = '24000000-0000-0000-0000-000000000001'$sql$),
  'editor cannot publish an asset'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}', true);
select ok(
  public.test_operation_changes_rows($sql$insert into public.page_versions (id, page_id, version_number, snapshot) values ('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 2, '{"slug":"draft-page","title":"Draft page","description":"Draft description","status":"published","sections":[]}')$sql$),
  'publisher can create an immutable version'
);
select ok(
  public.test_operation_changes_rows($sql$update public.pages set status = 'published', published_version_id = '21000000-0000-0000-0000-000000000003', published_at = now() where id = '20000000-0000-0000-0000-000000000002'$sql$),
  'publisher can select the live page version'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.availability_rules), 1::bigint, 'auditor can read availability rules');
select ok(
  not public.test_operation_changes_rows($sql$delete from public.availability_rules where id = '31000000-0000-0000-0000-000000000001'$sql$),
  'auditor cannot delete availability rules'
);
select ok(
  not public.test_operation_changes_rows($sql$delete from public.availability_exceptions where id = '32000000-0000-0000-0000-000000000001'$sql$),
  'auditor cannot delete availability exceptions'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select ok(
  public.test_operation_changes_rows($sql$update public.availability_rules set ends_at = '16:00' where id = '31000000-0000-0000-0000-000000000001'$sql$),
  'scheduler can update availability rules'
);
select ok(
  public.test_operation_changes_rows($sql$update public.availability_exceptions set reason = 'Planned closure' where id = '32000000-0000-0000-0000-000000000001'$sql$),
  'scheduler can update availability exceptions'
);
select ok(
  public.test_operation_has_overlap($sql$insert into public.bookings (id, public_reference, service_id, starts_at, ends_at, state, client_name, client_email, idempotency_key) values ('33000000-0000-0000-0000-000000000002', 'TTC-CROSS001', '30000000-0000-0000-0000-000000000002', '2030-01-08 12:30+02', '2030-01-08 13:30+02', 'CONFIRMED', 'Second Client', 'second@example.test', '34000000-0000-0000-0000-000000000002')$sql$),
  'overlap is rejected across different services for the single practitioner'
);
select ok(
  not public.test_operation_changes_rows($sql$update public.payments set state = 'PAID' where id = '35000000-0000-0000-0000-000000000001'$sql$),
  'scheduler cannot mutate payment state'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
select is((select count(*) from public.payments), 1::bigint, 'finance user can read payments');
select ok(
  public.test_operation_changes_rows($sql$update public.payments set state = 'PAID', paid_at = now() where id = '35000000-0000-0000-0000-000000000001'$sql$),
  'finance user can update payment state'
);
select ok(
  not public.test_operation_changes_rows($sql$update public.bookings set state = 'COMPLETED' where id = '33000000-0000-0000-0000-000000000001'$sql$),
  'finance user cannot mutate booking state'
);
reset role;

select * from finish();
rollback;
