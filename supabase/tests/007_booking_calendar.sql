begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(20);

select set_config('app.cms_fixture_bypass', 'on', true);
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
select matches(pg_get_functiondef('public.list_booking_slots(uuid,date,date)'::regprocedure), 'Africa/Johannesburg', 'slot SQL uses named time-zone conversion');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.bookings'::regclass and conname = 'bookings_active_time_exclusion' and contype = 'x'), 'the active cross-service exclusion constraint exists');

select * from finish();
rollback;
