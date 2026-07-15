begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(42);

select set_config('app.cms_fixture_bypass', 'on', true);
insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('84000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','schedule-owner@example.test','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
('84000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','schedule-operator@example.test','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
('84000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','schedule-multi@example.test','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now());
insert into public.profiles(id,display_name) values
('84000000-0000-0000-0000-000000000001','Schedule Owner'),
('84000000-0000-0000-0000-000000000002','Schedule Operator'),
('84000000-0000-0000-0000-000000000003','Schedule Multi-role');
insert into public.user_roles(user_id,role) values
('84000000-0000-0000-0000-000000000001','owner'),
('84000000-0000-0000-0000-000000000002','scheduler'),
('84000000-0000-0000-0000-000000000003','owner'),
('84000000-0000-0000-0000-000000000003','scheduler');
insert into public.services(id,slug,name,description,duration_minutes,buffer_minutes,price_cents,currency,active,position) values
('81000000-0000-0000-0000-000000000001','health-coaching-test','Health coaching test','Test-only service description.',60,15,125000,'ZAR',true,1),
('81000000-0000-0000-0000-000000000002','counselling-test','Counselling test','Second test-only service.',60,0,125000,'ZAR',true,2);
insert into public.availability_rules(service_id,weekday,starts_at,ends_at,effective_from,effective_until)
select null, extract(dow from ((now() at time zone 'Africa/Johannesburg')::date + 1))::smallint, '10:00', '12:00', (now() at time zone 'Africa/Johannesburg')::date + 1, (now() at time zone 'Africa/Johannesburg')::date + 1;
insert into public.consent_versions(id,purpose,version,wording,active,effective_at) values
('82000000-0000-0000-0000-000000000001','booking','test-1','I agree to the test booking contact processing wording.',true,now() - interval '1 day');
select set_config('app.cms_fixture_bypass', 'off', true);

select is(
  (select count(*)::integer from public.list_booking_slots('81000000-0000-0000-0000-000000000001', (now() at time zone 'Africa/Johannesburg')::date + 1, (now() at time zone 'Africa/Johannesburg')::date + 1)),
  3,
  'a two-hour window yields three sixty-minute slots on a thirty-minute grid'
);
select is(
  (select starts_at from public.list_booking_slots('81000000-0000-0000-0000-000000000001', (now() at time zone 'Africa/Johannesburg')::date + 1, (now() at time zone 'Africa/Johannesburg')::date + 1) order by starts_at limit 1),
  (((now() at time zone 'Africa/Johannesburg')::date + 1 + time '10:00') at time zone 'Africa/Johannesburg'),
  'local ten o clock is converted with the Johannesburg time zone'
);
select throws_ok(
  $$select * from public.list_booking_slots('81000000-0000-0000-0000-000000000001', (now() at time zone 'Africa/Johannesburg')::date, (now() at time zone 'Africa/Johannesburg')::date)$$,
  'P0001', 'BOOKING_DATE_RANGE_INVALID', 'same-day booking is outside the bounded horizon'
);

insert into public.availability_exceptions(service_id,starts_at,ends_at,available,reason)
values(null, (((now() at time zone 'Africa/Johannesburg')::date + 1 + time '10:00') at time zone 'Africa/Johannesburg'), (((now() at time zone 'Africa/Johannesburg')::date + 1 + time '10:30') at time zone 'Africa/Johannesburg'), false, 'Test closure');
select is((select count(*)::integer from public.list_booking_slots('81000000-0000-0000-0000-000000000001', (now() at time zone 'Africa/Johannesburg')::date + 1, (now() at time zone 'Africa/Johannesburg')::date + 1)), 2, 'a global closure removes overlapping candidates');
delete from public.availability_exceptions;

set local role service_role;
select lives_ok(
  $$select * from public.create_booking_hold(
    '81000000-0000-0000-0000-000000000001',
    (((now() at time zone 'Africa/Johannesburg')::date + 1 + time '10:00') at time zone 'Africa/Johannesburg'),
    'Test Person','test.person@example.test','+27 82 000 0000',
    '82000000-0000-0000-0000-000000000001','TTC-AAAAAAAAAAAA',
    '83000000-0000-0000-0000-000000000001',repeat('a',64)
  )$$,
  'anonymous booking writes are permitted only through the hold RPC'
);
select is((select count(*)::integer from public.get_booking_status(repeat('a',64))), 1, 'the opaque token hash retrieves one status');
select ok((select hold_expires_at between now() + interval '14 minutes 59 seconds' and now() + interval '15 minutes' from public.get_booking_status(repeat('a',64))), 'the authoritative hold duration is exactly fifteen minutes');
select lives_ok(
  $$select * from public.create_booking_hold(
    '81000000-0000-0000-0000-000000000001',
    (((now() at time zone 'Africa/Johannesburg')::date + 1 + time '10:00') at time zone 'Africa/Johannesburg'),
    'Test Person','test.person@example.test','',
    '82000000-0000-0000-0000-000000000001','TTC-AAAAAAAAAAAA',
    '83000000-0000-0000-0000-000000000001',repeat('a',64)
  )$$,
  'repeating the same idempotency key and token is idempotent'
);
select is((select count(*)::integer from public.recover_booking_hold('83000000-0000-0000-0000-000000000001', repeat('a',64))), 1, 'a lost response recovers the live hold with the stable expected credential');
select is((select count(*)::integer from public.get_booking_status(repeat('a',64))), 1, 'recovery leaves the stable access credential valid');
select is((select count(*)::integer from public.recover_booking_hold('83000000-0000-0000-0000-000000000001', repeat('d',64))), 0, 'recovery rejects a mismatched access credential');
select is((select count(*)::integer from public.get_booking_status(repeat('d',64))), 0, 'a mismatched credential gains no booking access');
update public.services set price_cents = 150000 where id = '81000000-0000-0000-0000-000000000001';
select is((select price_cents from public.get_booking_status(repeat('a',64))), 125000, 'booking status retains the commercial snapshot after catalogue pricing changes');
select throws_ok(
  $$update public.bookings set price_cents = 150000 where public_reference = 'TTC-AAAAAAAAAAAA'$$,
  'P0001', 'BOOKING_SNAPSHOT_IMMUTABLE', 'a booking commercial snapshot cannot be changed later'
);
select throws_ok(
  $$select * from public.create_booking_hold(
    '81000000-0000-0000-0000-000000000002',
    (((now() at time zone 'Africa/Johannesburg')::date + 1 + time '10:00') at time zone 'Africa/Johannesburg'),
    'Other Person','other@example.test','',
    '82000000-0000-0000-0000-000000000001','TTC-BBBBBBBBBBBB',
    '83000000-0000-0000-0000-000000000002',repeat('b',64)
  )$$,
  'P0001', 'BOOKING_SLOT_UNAVAILABLE', 'a cross-service concurrent hold cannot overlap the practitioner'
);
select throws_ok(
  $$select * from public.create_booking_hold(
    '81000000-0000-0000-0000-000000000001',
    (((now() at time zone 'Africa/Johannesburg')::date + 1 + time '11:00') at time zone 'Africa/Johannesburg'),
    'x','not-an-email','',
    '82000000-0000-0000-0000-000000000001','TTC-CCCCCCCCCCCC',
    '83000000-0000-0000-0000-000000000003',repeat('c',64)
  )$$,
  'P0001', 'BOOKING_REQUEST_INVALID', 'invalid contact details are rejected'
);
select throws_ok(
  $$select * from public.create_booking_hold(
    '81000000-0000-0000-0000-000000000001',
    (((now() at time zone 'Africa/Johannesburg')::date + 1 + time '11:00') at time zone 'Africa/Johannesburg'),
    'Test Person','test@example.test','',
    '82000000-0000-0000-0000-000000000099','TTC-DDDDDDDDDDDD',
    '83000000-0000-0000-0000-000000000004',repeat('d',64)
  )$$,
  'P0001', 'BOOKING_CONSENT_UNAVAILABLE', 'an inactive or missing consent version is rejected'
);
reset role;

set local role anon;
select is((select count(*)::integer from public.bookings), 0, 'anonymous users cannot enumerate booking rows directly');
reset role;

update public.bookings set hold_expires_at = now() - interval '1 minute' where public_reference = 'TTC-AAAAAAAAAAAA';
select is(public.expire_stale_booking_holds(), 1, 'one stale hold is expired atomically');
select is((select state::text from public.bookings where public_reference = 'TTC-AAAAAAAAAAAA'), 'EXPIRED', 'expired holds leave the active exclusion set');
select ok(exists(select 1 from public.booking_events where event_type = 'hold.expired' and to_state = 'EXPIRED'), 'expiry appends an auditable booking event');
select is((select count(*)::integer from public.list_booking_slots('81000000-0000-0000-0000-000000000001', (now() at time zone 'Africa/Johannesburg')::date + 1, (now() at time zone 'Africa/Johannesburg')::date + 1)), 3, 'an expired hold releases its slot');

select ok(not has_table_privilege('anon', 'public.bookings', 'insert'), 'anonymous users have no direct booking insert grant');
select ok(not has_function_privilege('anon', 'public.create_booking_hold(uuid,timestamptz,text,text,text,uuid,text,uuid,text)', 'execute'), 'anonymous users cannot bypass the server calendar boundary');
select ok(not has_function_privilege('anon', 'public.expire_stale_booking_holds()', 'execute'), 'anonymous users cannot invoke the internal expiry function');
select ok(not has_function_privilege('anon', 'public.list_booking_slots(uuid,date,date)', 'execute'), 'anonymous users cannot invoke the slot catalogue directly');
select ok(has_function_privilege('service_role', 'public.list_booking_slots(uuid,date,date)', 'execute'), 'the server booking boundary can invoke the slot catalogue');
select matches(pg_get_functiondef('public.list_booking_slots(uuid,date,date)'::regprocedure), 'Africa/Johannesburg', 'slot SQL uses named time-zone conversion');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.bookings'::regclass and conname = 'bookings_active_time_exclusion' and contype = 'x'), 'the active cross-service exclusion constraint exists');
select ok(exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'consent_versions_one_active_per_purpose' and indexdef like '%WHERE active%'), 'one active consent per purpose is enforced by a partial unique index');

select set_config('request.jwt.claims', '{"sub":"84000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select ok(not public.can_mutate_schedule(), 'an owner at AAL1 cannot mutate the schedule');
select is((with changed as (update public.services set name = 'Forbidden owner update' where id = '81000000-0000-0000-0000-000000000001' returning 1) select count(*)::integer from changed), 0, 'schedule RLS blocks an owner at AAL1');
select throws_ok(
  $$select public.transition_booking_state('89000000-0000-0000-0000-000000000001','CANCELLED')$$,
  'P0001', 'BOOKING_NOT_AUTHORISED', 'the transition RPC blocks an owner at AAL1'
);
select throws_ok(
  $$select public.save_booking_consent_version('test-2', 'I agree to the replacement booking contact processing wording.', now(), true)$$,
  'P0001', 'BOOKING_NOT_AUTHORISED', 'the consent replacement RPC blocks an owner at AAL1'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"84000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select ok(public.can_mutate_schedule(), 'an owner at AAL2 can mutate the schedule');
select lives_ok(
  $$select public.transition_booking_state('89000000-0000-0000-0000-000000000001','CANCELLED')$$,
  'the transition RPC admits an owner at AAL2'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"84000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select ok(public.can_mutate_schedule(), 'a scheduler at AAL1 can mutate the schedule');
select is((with changed as (update public.services set name = 'Scheduler managed service' where id = '81000000-0000-0000-0000-000000000001' returning 1) select count(*)::integer from changed), 1, 'schedule RLS admits a scheduler at AAL1');
select lives_ok(
  $$select public.transition_booking_state('89000000-0000-0000-0000-000000000001','CANCELLED')$$,
  'the transition RPC admits a scheduler at AAL1'
);
select lives_ok(
  $$select public.save_booking_consent_version('test-3', 'I agree to the new booking contact processing wording.', now(), true)$$,
  'the consent replacement RPC admits a scheduler at AAL1'
);
select is((select count(*)::integer from public.consent_versions where purpose = 'booking' and active), 1, 'consent replacement leaves exactly one active booking consent');
reset role;

select set_config('request.jwt.claims', '{"sub":"84000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select ok(not public.can_mutate_schedule(), 'an owner cannot bypass MFA through an additional scheduler role');
reset role;

select * from finish();
rollback;
