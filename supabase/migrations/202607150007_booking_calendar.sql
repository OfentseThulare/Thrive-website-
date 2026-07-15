begin;

alter table public.services add column if not exists buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 120);
alter table public.bookings
  add column if not exists access_token_hash text,
  add column if not exists blocked_until timestamptz,
  add column if not exists price_cents integer,
  add column if not exists currency char(3);
update public.bookings set access_token_hash = encode(gen_random_bytes(32), 'hex') where access_token_hash is null;
update public.bookings set blocked_until = ends_at where blocked_until is null;
update public.bookings b set price_cents = s.price_cents, currency = s.currency from public.services s where b.service_id = s.id and (b.price_cents is null or b.currency is null);
alter table public.bookings
  alter column access_token_hash set not null,
  alter column blocked_until set not null,
  alter column price_cents set not null,
  alter column currency set not null;
alter table public.bookings
  add constraint bookings_access_token_hash_format check (access_token_hash ~ '^[a-f0-9]{64}$'),
  add constraint bookings_blocked_until_valid check (blocked_until >= ends_at),
  add constraint bookings_price_snapshot_nonnegative check (price_cents >= 0),
  add constraint bookings_currency_snapshot_zar check (currency = 'ZAR');
alter table public.bookings drop constraint if exists bookings_tstzrange_excl;
alter table public.bookings add constraint bookings_active_time_exclusion exclude using gist (tstzrange(starts_at, blocked_until, '[)') with &&) where (state in ('HELD', 'PAYMENT_PENDING', 'PAID', 'CALENDAR_SYNC_PENDING', 'CONFIRMED'));
create unique index bookings_access_token_hash_idx on public.bookings(access_token_hash);

create table public.booking_rate_limits (
  scope text not null check (scope in ('services', 'availability', 'hold', 'status', 'release')),
  fingerprint_hash text not null check (fingerprint_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  primary key (scope, fingerprint_hash)
);
create index booking_rate_limits_window_idx on public.booking_rate_limits(window_started_at);
alter table public.booking_rate_limits enable row level security;
alter table public.booking_rate_limits force row level security;
create policy booking_rate_limits_operator_read on public.booking_rate_limits for select to authenticated
using (public.has_any_role(array['owner', 'auditor']::public.app_role[]));

create function public.can_mutate_schedule() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and public.has_any_role(array['owner', 'scheduler']::public.app_role[])
    and (
      not public.has_any_role(array['owner']::public.app_role[])
      or public.current_session_is_aal2()
    );
$$;
revoke all on function public.can_mutate_schedule() from public;
grant execute on function public.can_mutate_schedule() to authenticated;

with ranked_active_consents as (
  select id, row_number() over (partition by purpose order by effective_at desc, created_at desc, id desc) as active_rank
  from public.consent_versions where active
)
update public.consent_versions c set
  active = false,
  retired_at = greatest(now(), c.effective_at + interval '1 microsecond')
from ranked_active_consents ranked
where c.id = ranked.id and ranked.active_rank > 1;
create unique index consent_versions_one_active_per_purpose on public.consent_versions(purpose) where active;

create function public.save_booking_consent_version(
  p_version text, p_wording text, p_effective_at timestamptz, p_active boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_consent_id uuid;
begin
  if not public.can_mutate_schedule() then raise exception 'BOOKING_NOT_AUTHORISED'; end if;
  if p_version is null or char_length(trim(p_version)) not between 1 and 30
    or p_wording is null or char_length(trim(p_wording)) not between 20 and 10000
    or p_effective_at is null then raise exception 'BOOKING_CONSENT_INVALID'; end if;
  if p_active then
    perform pg_advisory_xact_lock(hashtextextended('consent-version:booking', 0));
    update public.consent_versions set
      active = false,
      retired_at = greatest(now(), effective_at + interval '1 microsecond')
    where purpose = 'booking' and active;
  end if;
  insert into public.consent_versions(purpose, version, wording, active, effective_at)
  values ('booking', trim(p_version), trim(p_wording), p_active, p_effective_at)
  returning id into new_consent_id;
  return new_consent_id;
end; $$;
revoke all on function public.save_booking_consent_version(text, text, timestamptz, boolean) from public, anon;
grant execute on function public.save_booking_consent_version(text, text, timestamptz, boolean) to authenticated;

create function public.check_booking_rate_limit(p_scope text, p_fingerprint_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare window_size interval; declare maximum_requests integer; declare current_count integer;
begin
  if p_fingerprint_hash !~ '^[a-f0-9]{64}$' then raise exception 'BOOKING_RATE_LIMIT_INVALID'; end if;
  case p_scope
    when 'hold' then window_size := interval '15 minutes'; maximum_requests := 8;
    when 'release' then window_size := interval '15 minutes'; maximum_requests := 8;
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

create function public.prevent_booking_event_mutation() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Booking events are append only'; end; $$;
create trigger booking_events_immutable before update or delete on public.booking_events for each row execute function public.prevent_booking_event_mutation();

create function public.enforce_booking_state_transition() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.state = old.state then return new; end if;
  if not (
    (old.state = 'HELD' and new.state in ('PAYMENT_PENDING', 'EXPIRED', 'CANCELLED')) or
    (old.state = 'PAYMENT_PENDING' and new.state in ('PAID', 'EXPIRED', 'CANCELLED')) or
    (old.state = 'PAID' and new.state in ('CALENDAR_SYNC_PENDING', 'CANCELLED')) or
    (old.state = 'CALENDAR_SYNC_PENDING' and new.state in ('CONFIRMED', 'CALENDAR_FAILED', 'CANCELLED')) or
    (old.state = 'CALENDAR_FAILED' and new.state in ('CALENDAR_SYNC_PENDING', 'CANCELLED')) or
    (old.state = 'CONFIRMED' and new.state in ('COMPLETED', 'CANCELLED', 'NO_SHOW'))
  ) then raise exception 'BOOKING_STATE_TRANSITION_INVALID'; end if;
  return new;
end; $$;
create trigger bookings_validate_state_transition before update of state on public.bookings for each row execute function public.enforce_booking_state_transition();

create function public.prevent_booking_snapshot_mutation() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.service_id is distinct from old.service_id or new.price_cents is distinct from old.price_cents or new.currency is distinct from old.currency
  then raise exception 'BOOKING_SNAPSHOT_IMMUTABLE'; end if;
  return new;
end; $$;
create trigger bookings_snapshot_immutable before update of service_id, price_cents, currency on public.bookings for each row execute function public.prevent_booking_snapshot_mutation();

create function public.expire_stale_booking_holds() returns integer language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  with candidates as materialized (
    select id, state from public.bookings
    where state in ('HELD', 'PAYMENT_PENDING') and hold_expires_at <= now()
    for update
  ), expired as (
    update public.bookings b set state = 'EXPIRED', updated_at = now()
    from candidates c where b.id = c.id
    returning b.id, c.state as from_state
  ), events as (
    insert into public.booking_events(booking_id, event_type, from_state, to_state, metadata)
    select id, 'hold.expired', from_state, 'EXPIRED', '{}'::jsonb from expired
  ) select count(*) into changed from expired;
  return changed;
end; $$;
revoke all on function public.expire_stale_booking_holds() from public, anon, authenticated;

create function public.list_booking_slots(p_service_id uuid, p_from date, p_to date)
returns table(starts_at timestamptz, ends_at timestamptz, blocked_until timestamptz)
language plpgsql security definer set search_path = '' as $$
declare service_duration integer; declare service_buffer integer;
declare local_today date := (now() at time zone 'Africa/Johannesburg')::date;
begin
  perform public.expire_stale_booking_holds();
  if p_from < local_today + 1 or p_to < p_from or p_to > local_today + 90 then raise exception 'BOOKING_DATE_RANGE_INVALID'; end if;
  select duration_minutes, buffer_minutes into service_duration, service_buffer from public.services where id = p_service_id and active and currency = 'ZAR';
  if service_duration is null then raise exception 'BOOKING_SERVICE_UNAVAILABLE'; end if;
  return query
  with rule_windows as (
    select d::date local_date, r.starts_at, r.ends_at from public.availability_rules r
    cross join lateral generate_series(p_from, p_to, interval '1 day') d
    where r.active and (r.service_id is null or r.service_id = p_service_id)
      and extract(dow from d)::smallint = r.weekday and d::date >= r.effective_from
      and (r.effective_until is null or d::date <= r.effective_until)
  ), rule_candidates as (
    select generated local_start from rule_windows w cross join lateral generate_series(
      w.local_date + w.starts_at, w.local_date + w.ends_at - make_interval(mins => service_duration), interval '30 minutes') generated
  ), opening_candidates as (
    select generated local_start from public.availability_exceptions e cross join lateral generate_series(
      e.starts_at at time zone 'Africa/Johannesburg', (e.ends_at at time zone 'Africa/Johannesburg') - make_interval(mins => service_duration), interval '30 minutes') generated
    where e.available and (e.service_id is null or e.service_id = p_service_id)
      and (e.starts_at at time zone 'Africa/Johannesburg')::date between p_from and p_to
  ), candidates as (
    select distinct local_start from (select local_start from rule_candidates union all select local_start from opening_candidates) all_candidates
  ), utc_candidates as (
    select local_start at time zone 'Africa/Johannesburg' starts_at,
      (local_start + make_interval(mins => service_duration)) at time zone 'Africa/Johannesburg' ends_at,
      (local_start + make_interval(mins => service_duration + service_buffer)) at time zone 'Africa/Johannesburg' blocked_until from candidates
  )
  select c.starts_at, c.ends_at, c.blocked_until from utc_candidates c where c.starts_at > now()
    and not exists (select 1 from public.availability_exceptions e where not e.available and (e.service_id is null or e.service_id = p_service_id) and tstzrange(e.starts_at, e.ends_at, '[)') && tstzrange(c.starts_at, c.blocked_until, '[)'))
    and not exists (select 1 from public.bookings b where b.state in ('HELD', 'PAYMENT_PENDING', 'PAID', 'CALENDAR_SYNC_PENDING', 'CONFIRMED') and tstzrange(b.starts_at, b.blocked_until, '[)') && tstzrange(c.starts_at, c.blocked_until, '[)'))
  order by c.starts_at;
end; $$;
revoke all on function public.list_booking_slots(uuid, date, date) from public, anon, authenticated;
grant execute on function public.list_booking_slots(uuid, date, date) to service_role;

create function public.create_booking_hold(
  p_service_id uuid, p_starts_at timestamptz, p_client_name text, p_client_email text, p_client_telephone text,
  p_consent_version_id uuid, p_public_reference text, p_idempotency_key uuid, p_access_token_hash text
) returns table(public_reference text, hold_expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare service_record record; declare consent_id uuid; declare new_booking_id uuid; declare existing_record record;
declare local_date date;
begin
  if p_client_name !~ '\S' or char_length(trim(p_client_name)) not between 2 and 160 or p_client_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(p_client_email) > 320
    or (coalesce(p_client_telephone, '') <> '' and (char_length(p_client_telephone) > 40 or p_client_telephone !~ '^[+()0-9 .]*$'))
    or p_public_reference !~ '^TTC-[A-Z0-9]{12}$' or p_access_token_hash !~ '^[a-f0-9]{64}$'
  then raise exception 'BOOKING_REQUEST_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtext('thrive-single-practitioner-booking'));
  perform public.expire_stale_booking_holds();
  select b.public_reference, b.hold_expires_at into existing_record from public.bookings b where b.idempotency_key = p_idempotency_key and b.access_token_hash = p_access_token_hash;
  if found then return query select existing_record.public_reference, existing_record.hold_expires_at; return; end if;
  select * into service_record from public.services where id = p_service_id and active and currency = 'ZAR';
  if not found then raise exception 'BOOKING_SERVICE_UNAVAILABLE'; end if;
  select id into consent_id from public.consent_versions where id = p_consent_version_id and purpose = 'booking' and active and effective_at <= now() and (retired_at is null or retired_at > now());
  if consent_id is null then raise exception 'BOOKING_CONSENT_UNAVAILABLE'; end if;
  local_date := (p_starts_at at time zone 'Africa/Johannesburg')::date;
  if not exists (select 1 from public.list_booking_slots(p_service_id, local_date, local_date) s where s.starts_at = p_starts_at and s.ends_at = p_starts_at + make_interval(mins => service_record.duration_minutes))
  then raise exception 'BOOKING_SLOT_UNAVAILABLE'; end if;
  begin
    insert into public.bookings(public_reference, service_id, starts_at, ends_at, blocked_until, state, hold_expires_at, client_name, client_email, client_telephone, idempotency_key, access_token_hash, price_cents, currency)
    values (p_public_reference, p_service_id, p_starts_at, p_starts_at + make_interval(mins => service_record.duration_minutes), p_starts_at + make_interval(mins => service_record.duration_minutes + service_record.buffer_minutes), 'HELD', now() + interval '15 minutes', trim(p_client_name), lower(trim(p_client_email)), nullif(trim(p_client_telephone), ''), p_idempotency_key, p_access_token_hash, service_record.price_cents, service_record.currency)
    returning id, bookings.hold_expires_at into new_booking_id, hold_expires_at;
  exception when exclusion_violation or unique_violation then raise exception 'BOOKING_SLOT_UNAVAILABLE'; end;
  insert into public.booking_consents values (new_booking_id, consent_id, now());
  insert into public.booking_events(booking_id, event_type, to_state, metadata) values (new_booking_id, 'hold.created', 'HELD', jsonb_build_object('consent_version_id', consent_id));
  public_reference := p_public_reference; return next;
end; $$;
revoke all on function public.create_booking_hold(uuid, timestamptz, text, text, text, uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_booking_hold(uuid, timestamptz, text, text, text, uuid, text, uuid, text) to service_role;

create function public.recover_booking_hold(p_idempotency_key uuid, p_expected_access_token_hash text)
returns table(public_reference text, hold_expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  perform public.expire_stale_booking_holds();
  if p_expected_access_token_hash !~ '^[a-f0-9]{64}$' then return; end if;
  return query select b.public_reference, b.hold_expires_at from public.bookings b
    where b.idempotency_key = p_idempotency_key
      and b.access_token_hash = p_expected_access_token_hash
      and b.state in ('HELD', 'PAYMENT_PENDING') and b.hold_expires_at > now();
end; $$;
revoke all on function public.recover_booking_hold(uuid, text) from public, anon, authenticated;
grant execute on function public.recover_booking_hold(uuid, text) to service_role;

create function public.get_booking_status(p_access_token_hash text)
returns table(public_reference text, service_name text, starts_at timestamptz, ends_at timestamptz, state public.booking_state, hold_expires_at timestamptz, price_cents integer, currency char(3))
language plpgsql security definer set search_path = '' as $$
begin
  perform public.expire_stale_booking_holds(); if p_access_token_hash !~ '^[a-f0-9]{64}$' then return; end if;
  return query select b.public_reference, s.name, b.starts_at, b.ends_at, b.state, b.hold_expires_at, b.price_cents, b.currency from public.bookings b join public.services s on s.id = b.service_id where b.access_token_hash = p_access_token_hash;
end; $$;
revoke all on function public.get_booking_status(text) from public, anon, authenticated; grant execute on function public.get_booking_status(text) to service_role;

create function public.release_booking_hold(p_access_token_hash text) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_booking_id uuid; declare old_state public.booking_state;
begin
  perform pg_advisory_xact_lock(hashtext('thrive-single-practitioner-booking')); perform public.expire_stale_booking_holds();
  select id, state into v_booking_id, old_state from public.bookings where access_token_hash = p_access_token_hash and state in ('HELD', 'PAYMENT_PENDING') for update;
  if not found then return false; end if;
  update public.bookings set state = 'CANCELLED', updated_at = now() where id = v_booking_id;
  insert into public.booking_events(booking_id, event_type, from_state, to_state, metadata) values (v_booking_id, 'hold.released', old_state, 'CANCELLED', '{}'::jsonb); return true;
end; $$;
revoke all on function public.release_booking_hold(text) from public, anon, authenticated; grant execute on function public.release_booking_hold(text) to service_role;

create function public.transition_booking_state(p_booking_id uuid, p_to_state public.booking_state) returns boolean language plpgsql security definer set search_path = '' as $$
declare old_state public.booking_state;
begin
  if not public.can_mutate_schedule() then raise exception 'BOOKING_NOT_AUTHORISED'; end if;
  select state into old_state from public.bookings where id = p_booking_id for update; if old_state is null then return false; end if;
  update public.bookings set state = p_to_state where id = p_booking_id;
  insert into public.booking_events(booking_id, event_type, from_state, to_state, metadata, actor_id) values (p_booking_id, 'state.changed', old_state, p_to_state, '{}'::jsonb, auth.uid()); return true;
end; $$;
revoke all on function public.transition_booking_state(uuid, public.booking_state) from public; grant execute on function public.transition_booking_state(uuid, public.booking_state) to authenticated;

drop policy if exists consent_versions_admin_manage on public.consent_versions;
create policy consent_versions_scheduler_manage on public.consent_versions for all to authenticated using (public.can_mutate_schedule()) with check (public.can_mutate_schedule());

drop policy if exists services_staff_write on public.services;
create policy services_schedule_manage on public.services for all to authenticated using (public.can_mutate_schedule()) with check (public.can_mutate_schedule());

drop policy if exists availability_rules_insert on public.availability_rules;
drop policy if exists availability_rules_update on public.availability_rules;
drop policy if exists availability_rules_delete on public.availability_rules;
create policy availability_rules_schedule_manage on public.availability_rules for all to authenticated using (public.can_mutate_schedule()) with check (public.can_mutate_schedule());

drop policy if exists availability_exceptions_insert on public.availability_exceptions;
drop policy if exists availability_exceptions_update on public.availability_exceptions;
drop policy if exists availability_exceptions_delete on public.availability_exceptions;
create policy availability_exceptions_schedule_manage on public.availability_exceptions for all to authenticated using (public.can_mutate_schedule()) with check (public.can_mutate_schedule());

drop policy if exists calendar_sync_staff_append on public.calendar_sync_events;
create policy calendar_sync_schedule_append on public.calendar_sync_events for insert to authenticated with check (public.can_mutate_schedule());

drop policy if exists bookings_scheduler_write on public.bookings;
drop policy if exists booking_events_staff_append on public.booking_events;

commit;
