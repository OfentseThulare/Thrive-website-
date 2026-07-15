begin;

create or replace function public.check_booking_rate_limit(p_scope text, p_fingerprint_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare window_size interval; declare maximum_requests integer; declare current_count integer;
begin
  if p_fingerprint_hash !~ '^[a-f0-9]{64}$' then raise exception 'BOOKING_RATE_LIMIT_INVALID'; end if;
  case p_scope
    when 'hold' then window_size := interval '15 minutes'; maximum_requests := 8;
    when 'release' then window_size := interval '15 minutes'; maximum_requests := 8;
    when 'payment' then window_size := interval '15 minutes'; maximum_requests := 8;
    when 'services' then window_size := interval '10 minutes'; maximum_requests := 40;
    when 'availability' then window_size := interval '10 minutes'; maximum_requests := 60;
    when 'status' then window_size := interval '10 minutes'; maximum_requests := 60;
    else raise exception 'BOOKING_RATE_LIMIT_INVALID';
  end case;
  perform pg_advisory_xact_lock(hashtextextended(p_scope || ':' || p_fingerprint_hash, 0));
  delete from public.booking_rate_limits where window_started_at < now() - interval '1 day';
  insert into public.booking_rate_limits(scope, fingerprint_hash, window_started_at, request_count)
  values (p_scope, p_fingerprint_hash, now(), 1)
  on conflict (scope, fingerprint_hash) do update set
    window_started_at = case when booking_rate_limits.window_started_at <= now() - window_size then now() else booking_rate_limits.window_started_at end,
    request_count = case when booking_rate_limits.window_started_at <= now() - window_size then 1 else booking_rate_limits.request_count + 1 end
  returning request_count into current_count;
  return current_count <= maximum_requests;
end; $$;
revoke all on function public.check_booking_rate_limit(text, text) from public, anon, authenticated;
grant execute on function public.check_booking_rate_limit(text, text) to service_role;

create function public.can_mutate_finance() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and public.has_any_role(array['owner', 'finance']::public.app_role[])
    and (
      not public.has_any_role(array['owner']::public.app_role[])
      or public.current_session_is_aal2()
    );
$$;
revoke all on function public.can_mutate_finance() from public;
grant execute on function public.can_mutate_finance() to authenticated;

create unique index payments_one_open_payfast_attempt_per_booking
on public.payments(booking_id)
where provider = 'payfast' and state in ('CREATED', 'PENDING', 'PAID');
create unique index payment_events_provider_event_global_unique
on public.payment_events(provider_event_id) where provider_event_id is not null;

create function public.prevent_payment_snapshot_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.booking_id is distinct from old.booking_id
    or new.provider is distinct from old.provider
    or new.provider_reference is distinct from old.provider_reference
    or new.amount_cents is distinct from old.amount_cents
    or new.currency is distinct from old.currency
    or new.idempotency_key is distinct from old.idempotency_key
  then raise exception 'PAYMENT_SNAPSHOT_IMMUTABLE'; end if;
  return new;
end; $$;
create trigger payments_snapshot_immutable before update on public.payments
for each row execute function public.prevent_payment_snapshot_mutation();

create function public.prevent_payment_event_mutation() returns trigger
language plpgsql set search_path = '' as $$ begin raise exception 'Payment events are append only'; end; $$;
create trigger payment_events_immutable before update or delete on public.payment_events
for each row execute function public.prevent_payment_event_mutation();

create function public.create_payfast_payment_attempt(
  p_access_token_hash text,
  p_provider_reference text,
  p_idempotency_key uuid,
  p_legal_version text,
  p_legal_accepted boolean,
  p_early_performance_accepted boolean
) returns table(
  payment_id uuid, merchant_payment_id text, amount_cents integer, currency char(3),
  item_name text, booking_reference text, hold_expires_at timestamptz
) language plpgsql security definer set search_path = '' as $$
declare v_booking record; v_payment record; v_new_expiry timestamptz;
begin
  if p_access_token_hash !~ '^[a-f0-9]{64}$'
    or p_provider_reference !~ '^TTC-PF-[A-F0-9]{24}$'
    or p_legal_version !~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}-[a-z0-9.-]{1,40}$'
    or p_legal_accepted is not true
  then raise exception 'PAYMENT_REQUEST_INVALID'; end if;

  perform public.expire_stale_booking_holds();
  select b.*, s.name as service_name into v_booking
  from public.bookings b join public.services s on s.id = b.service_id
  where b.access_token_hash = p_access_token_hash for update of b;
  if not found or v_booking.state not in ('HELD', 'PAYMENT_PENDING')
    or v_booking.hold_expires_at <= now()
    or v_booking.price_cents < 500
  then raise exception 'PAYMENT_BOOKING_UNAVAILABLE'; end if;
  if v_booking.starts_at < now() + interval '7 days' and p_early_performance_accepted is not true
  then raise exception 'PAYMENT_EARLY_PERFORMANCE_ACCEPTANCE_REQUIRED'; end if;

  select * into v_payment from public.payments
  where booking_id = v_booking.id and provider = 'payfast'
    and state in ('CREATED', 'PENDING', 'PAID')
  order by created_at desc limit 1 for update;

  if found then
    v_new_expiry := v_booking.hold_expires_at;
    if v_payment.amount_cents <> v_booking.price_cents or v_payment.currency <> v_booking.currency
    then raise exception 'PAYMENT_SNAPSHOT_MISMATCH'; end if;
  else
    v_new_expiry := greatest(v_booking.hold_expires_at, now() + interval '30 minutes');
    insert into public.payments(
      booking_id, provider, provider_reference, amount_cents, currency, state, idempotency_key
    ) values (
      v_booking.id, 'payfast', p_provider_reference, v_booking.price_cents,
      v_booking.currency, 'PENDING', p_idempotency_key
    ) returning * into v_payment;
    insert into public.payment_events(payment_id, event_type, from_state, to_state, metadata)
    values (v_payment.id, 'checkout.created', 'CREATED', 'PENDING',
      jsonb_build_object('legal_version', p_legal_version, 'legal_accepted', true,
        'early_performance_accepted', p_early_performance_accepted is true, 'accepted_at', now()));
  end if;

  if v_booking.state = 'HELD' then
    update public.bookings set state = 'PAYMENT_PENDING', hold_expires_at = v_new_expiry, updated_at = now()
    where id = v_booking.id;
    insert into public.booking_events(booking_id, event_type, from_state, to_state, metadata)
    values (v_booking.id, 'payment.window_opened', 'HELD', 'PAYMENT_PENDING', '{}'::jsonb);
  else
    update public.bookings set hold_expires_at = v_new_expiry, updated_at = now() where id = v_booking.id;
  end if;

  return query select v_payment.id, v_payment.provider_reference, v_payment.amount_cents,
    v_payment.currency, left(v_booking.service_name, 100), v_booking.public_reference, v_new_expiry;
end; $$;
revoke all on function public.create_payfast_payment_attempt(text, text, uuid, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.create_payfast_payment_attempt(text, text, uuid, text, boolean, boolean) to service_role;

create function public.record_payfast_webhook_receipt(
  p_provider_event_id text, p_payload_hash text, p_signature_valid boolean, p_error text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_provider_event_id is null or char_length(p_provider_event_id) not between 1 and 160
    or p_payload_hash !~ '^[a-f0-9]{64}$' then raise exception 'PAYFAST_RECEIPT_INVALID'; end if;
  insert into public.webhook_receipts(provider, provider_event_id, payload_hash, signature_valid, processing_error, processed_at)
  values ('payfast', p_provider_event_id, p_payload_hash, p_signature_valid, left(p_error, 500), now())
  on conflict (provider, provider_event_id) do nothing;
end; $$;
revoke all on function public.record_payfast_webhook_receipt(text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.record_payfast_webhook_receipt(text, text, boolean, text) to service_role;

create function public.process_payfast_itn(
  p_merchant_payment_id text, p_pf_payment_id text, p_amount_cents integer, p_payload_hash text
) returns table(
  duplicate boolean, booking_id uuid, booking_reference text, starts_at timestamptz,
  ends_at timestamptz, service_name text, calendar_event_id text, calendar_eligible boolean
) language plpgsql security definer set search_path = '' as $$
declare v_payment record; v_booking record;
begin
  if p_pf_payment_id is null or char_length(p_pf_payment_id) not between 1 and 100
    or p_payload_hash !~ '^[a-f0-9]{64}$' then raise exception 'PAYFAST_ITN_INVALID'; end if;
  select * into v_payment from public.payments
  where provider = 'payfast' and provider_reference = p_merchant_payment_id for update;
  if not found then raise exception 'PAYFAST_REFERENCE_MISMATCH'; end if;
  if v_payment.amount_cents <> p_amount_cents or v_payment.currency <> 'ZAR'
  then raise exception 'PAYFAST_AMOUNT_MISMATCH'; end if;
  select b.*, s.name as service_name into v_booking
  from public.bookings b join public.services s on s.id = b.service_id
  where b.id = v_payment.booking_id for update of b;

  if exists(select 1 from public.payment_events where provider_event_id = p_pf_payment_id and payment_id <> v_payment.id) then
    raise exception 'PAYFAST_PROVIDER_EVENT_REUSED';
  end if;
  if exists(select 1 from public.payment_events where provider_event_id = p_pf_payment_id and payment_id = v_payment.id) then
    return query select true, v_booking.id, v_booking.public_reference, v_booking.starts_at,
      v_booking.ends_at, v_booking.service_name, v_booking.calendar_event_id,
      v_booking.state in ('CALENDAR_SYNC_PENDING', 'CONFIRMED');
    return;
  end if;
  if v_payment.state not in ('CREATED', 'PENDING')
    or v_booking.state not in ('PAYMENT_PENDING', 'EXPIRED', 'CANCELLED')
  then raise exception 'PAYFAST_STATE_MISMATCH'; end if;

  insert into public.webhook_receipts(provider, provider_event_id, payload_hash, signature_valid, processed_at)
  values ('payfast', p_pf_payment_id, p_payload_hash, true, now());
  update public.payments set state = 'PAID', paid_at = now(), updated_at = now() where id = v_payment.id;
  insert into public.payment_events(payment_id, event_type, from_state, to_state, provider_event_id, metadata)
  values (v_payment.id, 'itn.complete', v_payment.state, 'PAID', p_pf_payment_id, '{}'::jsonb);
  if v_booking.state = 'PAYMENT_PENDING' then
    update public.bookings set state = 'PAID', updated_at = now() where id = v_booking.id;
    insert into public.booking_events(booking_id, event_type, from_state, to_state, metadata)
    values (v_booking.id, 'payment.received', 'PAYMENT_PENDING', 'PAID', '{}'::jsonb);
    update public.bookings set state = 'CALENDAR_SYNC_PENDING', updated_at = now() where id = v_booking.id;
    insert into public.booking_events(booking_id, event_type, from_state, to_state, metadata)
    values (v_booking.id, 'calendar.sync_queued', 'PAID', 'CALENDAR_SYNC_PENDING', '{}'::jsonb);
    insert into public.calendar_sync_events(booking_id, direction, outcome, details)
    values (v_booking.id, 'push', 'pending', '{}'::jsonb);
  else
    insert into public.booking_events(booking_id, event_type, from_state, metadata)
    values (v_booking.id, 'payment.received_after_release', v_booking.state,
      jsonb_build_object('requires_manual_reconciliation', true));
  end if;
  return query select false, v_booking.id, v_booking.public_reference, v_booking.starts_at,
    v_booking.ends_at, v_booking.service_name, v_booking.calendar_event_id,
    v_booking.state = 'PAYMENT_PENDING';
end; $$;
revoke all on function public.process_payfast_itn(text, text, integer, text) from public, anon, authenticated;
grant execute on function public.process_payfast_itn(text, text, integer, text) to service_role;

create function public.finalise_paid_booking_calendar(
  p_booking_id uuid, p_succeeded boolean, p_external_event_id text, p_error_code text default null
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_booking record; v_target public.booking_state;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then return false; end if;
  if v_booking.state = 'CONFIRMED' and p_succeeded and v_booking.calendar_event_id = p_external_event_id then return true; end if;
  if v_booking.state <> 'CALENDAR_SYNC_PENDING' then return false; end if;
  v_target := case when p_succeeded then 'CONFIRMED'::public.booking_state else 'CALENDAR_FAILED'::public.booking_state end;
  if p_succeeded and (p_external_event_id is null or char_length(p_external_event_id) > 1024)
  then raise exception 'CALENDAR_EVENT_INVALID'; end if;
  update public.bookings set state = v_target,
    calendar_event_id = case when p_succeeded then p_external_event_id else calendar_event_id end,
    updated_at = now() where id = p_booking_id;
  insert into public.booking_events(booking_id, event_type, from_state, to_state, metadata)
  values (p_booking_id, case when p_succeeded then 'calendar.confirmed' else 'calendar.failed' end,
    'CALENDAR_SYNC_PENDING', v_target,
    case when p_succeeded then '{}'::jsonb else jsonb_build_object('error_code', left(coalesce(p_error_code, 'UNAVAILABLE'), 80)) end);
  insert into public.calendar_sync_events(booking_id, direction, outcome, external_event_id, details)
  values (p_booking_id, 'push', case when p_succeeded then 'succeeded' else 'failed' end,
    case when p_succeeded then p_external_event_id else null end,
    case when p_succeeded then '{}'::jsonb else jsonb_build_object('error_code', left(coalesce(p_error_code, 'UNAVAILABLE'), 80)) end);
  if p_succeeded then
    insert into public.notification_outbox(booking_id, kind, recipient, payload, idempotency_key)
    select b.id, 'booking_confirmation', b.client_email,
      jsonb_build_object('booking_reference', b.public_reference, 'starts_at', b.starts_at, 'service_name', s.name),
      (substr(md5('booking-confirmation:' || b.id::text),1,8)||'-'||substr(md5('booking-confirmation:' || b.id::text),9,4)||'-4'||substr(md5('booking-confirmation:' || b.id::text),14,3)||'-a'||substr(md5('booking-confirmation:' || b.id::text),18,3)||'-'||substr(md5('booking-confirmation:' || b.id::text),21,12))::uuid
    from public.bookings b join public.services s on s.id = b.service_id where b.id = p_booking_id
    on conflict (idempotency_key) do nothing;
  end if;
  return true;
end; $$;
revoke all on function public.finalise_paid_booking_calendar(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.finalise_paid_booking_calendar(uuid, boolean, text, text) to service_role;

create function public.retry_failed_calendar_sync(p_booking_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_mutate_schedule() then raise exception 'BOOKING_NOT_AUTHORISED'; end if;
  update public.bookings set state = 'CALENDAR_SYNC_PENDING', updated_at = now()
  where id = p_booking_id and state = 'CALENDAR_FAILED';
  if not found then return false; end if;
  insert into public.booking_events(booking_id, event_type, from_state, to_state, metadata, actor_id)
  values (p_booking_id, 'calendar.retry_queued', 'CALENDAR_FAILED', 'CALENDAR_SYNC_PENDING', '{}'::jsonb, auth.uid());
  return true;
end; $$;
revoke all on function public.retry_failed_calendar_sync(uuid) from public;
grant execute on function public.retry_failed_calendar_sync(uuid) to authenticated;

create function public.mark_payment_refund_state(p_payment_id uuid, p_to_state public.payment_state)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_from public.payment_state;
begin
  if not public.can_mutate_finance() then raise exception 'PAYMENT_NOT_AUTHORISED'; end if;
  select state into v_from from public.payments where id = p_payment_id for update;
  if v_from is null then return false; end if;
  if not ((v_from = 'PAID' and p_to_state = 'REFUND_PENDING') or (v_from = 'REFUND_PENDING' and p_to_state = 'REFUNDED'))
  then raise exception 'PAYMENT_STATE_TRANSITION_INVALID'; end if;
  update public.payments set state = p_to_state, updated_at = now() where id = p_payment_id;
  insert into public.payment_events(payment_id, event_type, from_state, to_state, metadata)
  values (p_payment_id, 'refund.state_changed', v_from, p_to_state, '{}'::jsonb);
  return true;
end; $$;
revoke all on function public.mark_payment_refund_state(uuid, public.payment_state) from public;
grant execute on function public.mark_payment_refund_state(uuid, public.payment_state) to authenticated;

create or replace function public.release_booking_hold(p_access_token_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_booking_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('thrive-single-practitioner-booking'));
  perform public.expire_stale_booking_holds();
  select id into v_booking_id from public.bookings
  where access_token_hash = p_access_token_hash and state = 'HELD' for update;
  if not found then return false; end if;
  update public.bookings set state = 'CANCELLED', updated_at = now() where id = v_booking_id;
  insert into public.booking_events(booking_id, event_type, from_state, to_state, metadata)
  values (v_booking_id, 'hold.released', 'HELD', 'CANCELLED', '{}'::jsonb);
  return true;
end; $$;
revoke all on function public.release_booking_hold(text) from public, anon, authenticated;
grant execute on function public.release_booking_hold(text) to service_role;

drop function public.get_booking_status(text);
create function public.get_booking_status(p_access_token_hash text)
returns table(
  public_reference text, service_name text, starts_at timestamptz, ends_at timestamptz,
  state public.booking_state, hold_expires_at timestamptz, price_cents integer,
  currency char(3), payment_state public.payment_state
) language plpgsql security definer set search_path = '' as $$
begin
  perform public.expire_stale_booking_holds();
  if p_access_token_hash !~ '^[a-f0-9]{64}$' then return; end if;
  return query select b.public_reference, s.name, b.starts_at, b.ends_at, b.state,
    b.hold_expires_at, b.price_cents, b.currency,
    (select p.state from public.payments p where p.booking_id = b.id order by p.created_at desc limit 1)
  from public.bookings b join public.services s on s.id = b.service_id
  where b.access_token_hash = p_access_token_hash;
end; $$;
revoke all on function public.get_booking_status(text) from public, anon, authenticated;
grant execute on function public.get_booking_status(text) to service_role;

drop policy if exists payments_finance_write on public.payments;
drop policy if exists payment_events_finance_append on public.payment_events;

commit;
