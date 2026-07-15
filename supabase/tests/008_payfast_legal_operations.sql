begin;
select plan(32);
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
select * from finish();
rollback;
