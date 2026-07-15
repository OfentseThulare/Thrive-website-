begin;
select plan(69);
select has_function('public', 'create_payfast_payment_attempt', array['text','text','uuid','text','boolean','boolean']);
select has_function('public', 'process_payfast_itn', array['text','text','integer','text']);
select has_function('public', 'finalise_paid_booking_calendar', array['uuid','boolean','text','text']);
select has_function('public', 'mark_payment_refund_state', array['uuid','payment_state']);
select has_function('public', 'can_mutate_finance', array[]::text[]);
select has_index('public', 'payments', 'payments_one_open_payfast_attempt_per_booking');
select has_index('public', 'payment_events', 'payment_events_provider_event_global_unique');
select has_trigger('public', 'payments', 'payments_snapshot_immutable');
select has_trigger('public', 'payment_events', 'payment_events_immutable');
select function_privs_are('public', 'create_payfast_payment_attempt', array['text','text','uuid','text','boolean','boolean'], 'service_role', array['EXECUTE']);
select function_privs_are('public', 'process_payfast_itn', array['text','text','integer','text'], 'service_role', array['EXECUTE']);
select function_privs_are('public', 'finalise_paid_booking_calendar', array['uuid','boolean','text','text'], 'service_role', array['EXECUTE']);
select function_privs_are('public', 'mark_payment_refund_state', array['uuid','payment_state'], 'authenticated', array['EXECUTE']);
select isnt_empty($$select 1 from pg_proc where proname='create_payfast_payment_attempt' and prosrc like '%price_cents%'$$, 'payment snapshots the booking amount');
select isnt_empty($$select 1 from pg_proc where proname='process_payfast_itn' and prosrc like '%for update%'$$, 'ITN locks the payment');
select isnt_empty($$select 1 from pg_proc where proname='process_payfast_itn' and prosrc like '%CALENDAR_SYNC_PENDING%'$$, 'paid booking queues calendar sync');
select isnt_empty($$select 1 from pg_proc where proname='finalise_paid_booking_calendar' and prosrc like '%notification_outbox%'$$, 'confirmation outbox is transactional');
select isnt_empty($$select 1 from pg_proc where proname='can_mutate_finance' and prosrc like '%current_session_is_aal2%'$$, 'every finance mutation requires aal2');
select isnt_empty($$select 1 from pg_proc where proname='mark_payment_refund_state' and prosrc like '%REFUND_PENDING%'$$, 'refund transitions are constrained');
select isnt_empty($$select 1 from pg_proc where proname='create_payfast_payment_attempt' and prosrc like '%price_cents < 500%'$$, 'PayFast minimum is enforced from snapshot');
select isnt_empty($$select 1 from pg_proc where proname='process_payfast_itn' and prosrc like '%payment.received_after_release%'$$, 'late valid payment becomes manual reconciliation');
select isnt_empty($$select 1 from pg_proc where proname='release_booking_hold' and prosrc like $needle$state = 'HELD'$needle$ and prosrc not like '%PAYMENT_PENDING%', 'public release is held-only');
select isnt_empty($$select 1 from pg_proc where proname='create_payfast_payment_attempt' and prosrc like '%PAYMENT_EARLY_PERFORMANCE_ACCEPTANCE_REQUIRED%'$$, 'early performance acceptance is server-enforced');
select isnt_empty($$select 1 from pg_proc where proname='create_payfast_payment_attempt' and prosrc like '%legal_version%'$$, 'legal version is snapshotted in immutable event');
select policies_are('public', 'payments', array['payments_staff_read']);
select policies_are('public', 'payment_events', array['payment_events_staff_read']);
select ok(exists(
  select 1 from pg_constraint
  where conrelid = 'public.booking_rate_limits'::regclass
    and conname = 'booking_rate_limits_scope_allowed'
    and pg_get_constraintdef(oid) like '%payment%'
), 'the stable rate limit scope constraint admits payment');

select set_config('app.cms_fixture_bypass', 'on', true);
insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('85000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','finance-aal@example.test','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now());
insert into public.profiles(id,display_name) values ('85000000-0000-0000-0000-000000000001','Finance AAL test');
insert into public.user_roles(user_id,role) values ('85000000-0000-0000-0000-000000000001','finance');
insert into public.user_roles(user_id,role) values ('85000000-0000-0000-0000-000000000001','owner');
insert into public.services(id,slug,name,description,duration_minutes,buffer_minutes,price_cents,currency,active,position)
values ('85000000-0000-0000-0000-000000000002','finance-aal-service','Finance AAL service','Test-only finance service.',60,0,70000,'ZAR',false,99);
insert into public.bookings(id,public_reference,service_id,starts_at,ends_at,blocked_until,state,client_name,client_email,idempotency_key,access_token_hash,price_cents,currency)
values ('85000000-0000-0000-0000-000000000003','TTC-FINANCEAAL','85000000-0000-0000-0000-000000000002','2035-01-10 08:00+02','2035-01-10 09:00+02','2035-01-10 09:00+02','CONFIRMED','Finance Test','finance.test@example.test','85000000-0000-0000-0000-000000000004',repeat('f',64),70000,'ZAR');
insert into public.payments(id,booking_id,provider,provider_reference,amount_cents,currency,state,idempotency_key,paid_at)
values ('85000000-0000-0000-0000-000000000005','85000000-0000-0000-0000-000000000003','payfast','TTC-PF-AAAAAAAAAAAAAAAAAAAAAAAA',70000,'ZAR','PAID','85000000-0000-0000-0000-000000000006',now());
select set_config('app.cms_fixture_bypass', 'off', true);

select set_config('request.jwt.claims', '{"sub":"85000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
set local role authenticated;
select ok(not public.can_mutate_finance(), 'a finance user at AAL1 cannot mutate finance records');
select throws_ok(
  $$select public.mark_payment_refund_state('85000000-0000-0000-0000-000000000005','REFUND_PENDING')$$,
  'P0001', 'PAYMENT_NOT_AUTHORISED', 'the refund RPC rejects finance at AAL1'
);
reset role;

select set_config('request.jwt.claims', '{"sub":"85000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select ok(public.can_mutate_finance(), 'a finance user at AAL2 passes the finance boundary');
select lives_ok(
  $$select public.mark_payment_refund_state('85000000-0000-0000-0000-000000000005','REFUND_PENDING')$$,
  'the refund RPC admits finance at AAL2'
);
select is((select state::text from public.payments where id = '85000000-0000-0000-0000-000000000005'), 'REFUND_PENDING', 'the constrained AAL2 mutation is durable');
reset role;

insert into public.bookings(id,public_reference,service_id,starts_at,ends_at,blocked_until,state,hold_expires_at,client_name,client_email,idempotency_key,access_token_hash,price_cents,currency) values
('85000000-0000-0000-0000-000000000010','TTC-ITNNORMAL','85000000-0000-0000-0000-000000000002','2035-01-10 10:00+02','2035-01-10 11:00+02','2035-01-10 11:00+02','PAYMENT_PENDING','2035-01-10 09:30+02','ITN Normal','normal@example.test','85000000-0000-0000-0000-000000000020',repeat('a',64),70000,'ZAR'),
('85000000-0000-0000-0000-000000000012','TTC-ITNREUSE','85000000-0000-0000-0000-000000000002','2035-01-10 12:00+02','2035-01-10 13:00+02','2035-01-10 13:00+02','PAYMENT_PENDING','2035-01-10 11:30+02','ITN Reuse','reuse@example.test','85000000-0000-0000-0000-000000000021',repeat('b',64),70000,'ZAR'),
('85000000-0000-0000-0000-000000000014','TTC-ITNEXPIRED','85000000-0000-0000-0000-000000000002','2035-01-10 14:00+02','2035-01-10 15:00+02','2035-01-10 15:00+02','EXPIRED','2035-01-10 13:30+02','ITN Expired','expired@example.test','85000000-0000-0000-0000-000000000022',repeat('c',64),70000,'ZAR'),
('85000000-0000-0000-0000-000000000016','TTC-ITNCANCEL','85000000-0000-0000-0000-000000000002','2035-01-10 16:00+02','2035-01-10 17:00+02','2035-01-10 17:00+02','CANCELLED','2035-01-10 15:30+02','ITN Cancelled','cancelled@example.test','85000000-0000-0000-0000-000000000023',repeat('d',64),70000,'ZAR');
insert into public.bookings(id,public_reference,service_id,starts_at,ends_at,blocked_until,state,hold_expires_at,client_name,client_email,idempotency_key,access_token_hash,price_cents,currency)
values ('85000000-0000-0000-0000-000000000018','TTC-LEGALREUSE','85000000-0000-0000-0000-000000000002','2035-01-10 18:00+02','2035-01-10 19:00+02','2035-01-10 19:00+02','HELD','2035-01-10 17:30+02','Legal Reuse','legal.reuse@example.test','85000000-0000-0000-0000-000000000024',repeat('e',64),70000,'ZAR');
insert into public.payments(id,booking_id,provider,provider_reference,amount_cents,currency,state,idempotency_key) values
('85000000-0000-0000-0000-000000000011','85000000-0000-0000-0000-000000000010','payfast','TTC-PF-BBBBBBBBBBBBBBBBBBBBBBBB',70000,'ZAR','PENDING','85000000-0000-0000-0000-000000000030'),
('85000000-0000-0000-0000-000000000013','85000000-0000-0000-0000-000000000012','payfast','TTC-PF-CCCCCCCCCCCCCCCCCCCCCCCC',70000,'ZAR','PENDING','85000000-0000-0000-0000-000000000031'),
('85000000-0000-0000-0000-000000000015','85000000-0000-0000-0000-000000000014','payfast','TTC-PF-DDDDDDDDDDDDDDDDDDDDDDDD',70000,'ZAR','PENDING','85000000-0000-0000-0000-000000000032'),
('85000000-0000-0000-0000-000000000017','85000000-0000-0000-0000-000000000016','payfast','TTC-PF-EEEEEEEEEEEEEEEEEEEEEEEE',70000,'ZAR','PENDING','85000000-0000-0000-0000-000000000033');

set local role service_role;
select lives_ok(
  $$select * from public.create_payfast_payment_attempt(repeat('e',64),'TTC-PF-FFFFFFFFFFFFFFFFFFFFFFFF','85000000-0000-0000-0000-000000000034','15/07/2026-client-v1',true,false)$$,
  'the first legal version is accepted with payment attempt creation'
);
select lives_ok(
  $$select * from public.create_payfast_payment_attempt(repeat('e',64),'TTC-PF-1234567890ABCDEF12345678','85000000-0000-0000-0000-000000000035','16/07/2026-client-v2',true,false)$$,
  'a materially different legal version is accepted on the reused open attempt'
);
select is((select count(*)::integer from public.payment_events where payment_id = (select id from public.payments where booking_id = '85000000-0000-0000-0000-000000000018') and metadata ->> 'legal_version' = '15/07/2026-client-v1'), 1, 'the original legal acceptance remains immutable');
select is((select count(*)::integer from public.payment_events where payment_id = (select id from public.payments where booking_id = '85000000-0000-0000-0000-000000000018') and metadata ->> 'legal_version' = '16/07/2026-client-v2'), 1, 'the new legal version has its own immutable acceptance event');
select lives_ok(
  $$select * from public.create_payfast_payment_attempt(repeat('e',64),'TTC-PF-ABCDEFABCDEFABCDEFABCDEF','85000000-0000-0000-0000-000000000036','16/07/2026-client-v2',true,false)$$,
  'repeating the same legal version remains idempotent'
);
select is((select count(*)::integer from public.payment_events where payment_id = (select id from public.payments where booking_id = '85000000-0000-0000-0000-000000000018') and metadata ->> 'legal_version' = '16/07/2026-client-v2'), 1, 'repeated acceptance does not duplicate the immutable event');

select lives_ok(
  $$select * from public.process_payfast_itn('TTC-PF-BBBBBBBBBBBBBBBBBBBBBBBB','PF-FIRST-COMPLETE',70000,repeat('1',64))$$,
  'the first valid COMPLETE ITN is processed'
);
select is((select state::text from public.payments where id = '85000000-0000-0000-0000-000000000011'), 'PAID', 'first COMPLETE marks payment paid');
select is((select state::text from public.bookings where id = '85000000-0000-0000-0000-000000000010'), 'CALENDAR_SYNC_PENDING', 'first COMPLETE queues calendar sync');
select is((select duplicate from public.process_payfast_itn('TTC-PF-BBBBBBBBBBBBBBBBBBBBBBBB','PF-FIRST-COMPLETE',70000,repeat('1',64))), true, 'the same valid ITN is idempotent');
select is((select count(*)::integer from public.payment_events where provider_event_id = 'PF-FIRST-COMPLETE'), 1, 'duplicate ITN creates one provider event');
select throws_ok(
  $$select * from public.process_payfast_itn('TTC-PF-CCCCCCCCCCCCCCCCCCCCCCCC','PF-FIRST-COMPLETE',70000,repeat('2',64))$$,
  'P0001', 'PAYFAST_PROVIDER_EVENT_REUSED', 'a provider event cannot be reused across payments'
);

select lives_ok(
  $$select * from public.process_payfast_itn('TTC-PF-DDDDDDDDDDDDDDDDDDDDDDDD','PF-LATE-EXPIRED',70000,repeat('3',64))$$,
  'a valid late payment for an expired booking is durably recorded'
);
select is((select state::text from public.payments where id = '85000000-0000-0000-0000-000000000015'), 'PAID', 'expired late payment remains paid');
select ok((select reconciliation_required from public.payments where id = '85000000-0000-0000-0000-000000000015'), 'expired late payment requires reconciliation');
select is((select reconciliation_reason from public.payments where id = '85000000-0000-0000-0000-000000000015'), 'booking_expired', 'expired late payment records its reason');
select is((select state::text from public.bookings where id = '85000000-0000-0000-0000-000000000014'), 'EXPIRED', 'late payment does not falsely confirm an expired booking');
select is((select count(*)::integer from public.calendar_sync_events where booking_id = '85000000-0000-0000-0000-000000000014'), 0, 'expired late payment creates no calendar queue');

select lives_ok(
  $$select * from public.process_payfast_itn('TTC-PF-EEEEEEEEEEEEEEEEEEEEEEEE','PF-LATE-CANCELLED',70000,repeat('4',64))$$,
  'a valid late payment for a cancelled booking is durably recorded'
);
select is((select state::text from public.payments where id = '85000000-0000-0000-0000-000000000017'), 'PAID', 'cancelled late payment remains paid');
select ok((select reconciliation_required from public.payments where id = '85000000-0000-0000-0000-000000000017'), 'cancelled late payment requires reconciliation');
select is((select reconciliation_reason from public.payments where id = '85000000-0000-0000-0000-000000000017'), 'booking_cancelled', 'cancelled late payment records its reason');
select is((select state::text from public.bookings where id = '85000000-0000-0000-0000-000000000016'), 'CANCELLED', 'late payment does not falsely confirm a cancelled booking');
select is((select count(*)::integer from public.calendar_sync_events where booking_id = '85000000-0000-0000-0000-000000000016'), 0, 'cancelled late payment creates no calendar queue');

reset role;
select set_config('request.jwt.claims', '{"sub":"85000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select lives_ok($$select public.mark_payment_refund_state('85000000-0000-0000-0000-000000000017','REFUND_PENDING')$$, 'AAL2 finance can open the verified refund workflow');
select lives_ok($$select public.mark_payment_refund_state('85000000-0000-0000-0000-000000000017','REFUNDED')$$, 'AAL2 finance can record the completed refund');
select ok(not (select reconciliation_required from public.payments where id = '85000000-0000-0000-0000-000000000017'), 'completed refund resolves the reconciliation flag');
select ok((select reconciled_at is not null from public.payments where id = '85000000-0000-0000-0000-000000000017'), 'completed refund records reconciliation time');
reset role;

set local role service_role;
select lives_ok(
  $$select public.finalise_paid_booking_calendar('85000000-0000-0000-0000-000000000010',false,null,'TEST_FAILURE')$$,
  'calendar failure is finalised durably'
);
select is((select state::text from public.bookings where id = '85000000-0000-0000-0000-000000000010'), 'CALENDAR_FAILED', 'calendar failure is visible on the booking');
reset role;

select set_config('request.jwt.claims', '{"sub":"85000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
set local role authenticated;
select lives_ok(
  $$select public.retry_failed_calendar_sync('85000000-0000-0000-0000-000000000010')$$,
  'an AAL2 owner can queue a failed calendar retry'
);
select is((select state::text from public.bookings where id = '85000000-0000-0000-0000-000000000010'), 'CALENDAR_SYNC_PENDING', 'calendar retry restores the pending state');
reset role;

set local role service_role;
select lives_ok(
  $$select public.finalise_paid_booking_calendar('85000000-0000-0000-0000-000000000010',true,'google-event-test',null)$$,
  'calendar success confirms the retried booking'
);
select is((select state::text from public.bookings where id = '85000000-0000-0000-0000-000000000010'), 'CONFIRMED', 'successful retry confirms the booking');
select is((select count(*)::integer from public.notification_outbox where booking_id = '85000000-0000-0000-0000-000000000010' and kind = 'booking_confirmation'), 1, 'confirmation creates one outbox record');
select lives_ok(
  $$select public.finalise_paid_booking_calendar('85000000-0000-0000-0000-000000000010',true,'google-event-test',null)$$,
  'repeating calendar finalisation is idempotent'
);
select is((select count(*)::integer from public.notification_outbox where booking_id = '85000000-0000-0000-0000-000000000010' and kind = 'booking_confirmation'), 1, 'idempotent finalisation keeps exactly one outbox record');
reset role;
select * from finish();
rollback;
