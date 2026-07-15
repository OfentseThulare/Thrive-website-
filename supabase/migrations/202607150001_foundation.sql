begin;

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.app_role as enum (
  'owner',
  'publisher',
  'editor',
  'scheduler',
  'finance',
  'auditor'
);

create type public.content_status as enum ('draft', 'published', 'archived');
create type public.booking_state as enum (
  'HELD',
  'PAYMENT_PENDING',
  'PAID',
  'CALENDAR_SYNC_PENDING',
  'CONFIRMED',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED',
  'CALENDAR_FAILED',
  'NO_SHOW'
);
create type public.payment_state as enum (
  'CREATED',
  'PENDING',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUND_PENDING',
  'REFUNDED'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_.-]+$'),
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  location text not null check (location in ('primary', 'footer', 'legal')),
  label text not null check (char_length(label) between 1 and 80),
  href text not null check (char_length(href) between 1 and 300),
  position integer not null default 0 check (position >= 0),
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 140),
  description text not null check (char_length(description) between 1 and 320),
  status public.content_status not null default 'draft',
  seo jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  change_summary text check (char_length(change_summary) <= 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (page_id, version_number)
);

alter table public.pages
  add column published_version_id uuid references public.page_versions(id) on delete set null;

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null references public.pages(slug) on update cascade on delete cascade,
  block_type text not null check (
    block_type in ('hero', 'introduction', 'card_collection', 'call_to_action')
  ),
  schema_version integer not null default 1 check (schema_version > 0),
  position integer not null default 0 check (position >= 0),
  visible boolean not null default true,
  variant text not null default 'default' check (char_length(variant) between 1 and 60),
  content jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_slug, position)
);

create table public.reusable_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (
    entry_type in ('credential', 'faq', 'resource', 'testimonial', 'pricing_note', 'legal_notice')
  ),
  key text not null unique check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status public.content_status not null default 'draft',
  content jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique check (storage_path !~ '(^|/)\.\.(/|$)'),
  filename text not null check (char_length(filename) between 1 and 240),
  mime_type text not null check (mime_type like 'image/%' or mime_type = 'application/pdf'),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 15728640),
  width integer check (width > 0),
  height integer check (height > 0),
  alt_text text not null check (char_length(alt_text) between 1 and 240),
  focal_point jsonb not null default '{"x":0.5,"y":0.5}'::jsonb,
  source_url text,
  photographer text,
  licence_source text,
  source_identifier text,
  downloaded_on date,
  release_evidence text,
  restrictions text,
  status public.content_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.redirects (
  id uuid primary key default gen_random_uuid(),
  source_path text not null unique check (source_path like '/%'),
  destination_path text not null check (destination_path like '/%' or destination_path like 'https://%'),
  status_code integer not null default 308 check (status_code in (301, 302, 307, 308)),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 1 and 120),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id text not null check (char_length(entity_id) between 1 and 160),
  before_data jsonb,
  after_data jsonb,
  request_id uuid,
  occurred_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 140),
  description text not null check (char_length(description) between 1 and 1000),
  duration_minutes integer not null check (duration_minutes between 15 and 240),
  price_cents integer not null check (price_cents >= 0),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  active boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  timezone text not null default 'Africa/Johannesburg' check (timezone = 'Africa/Johannesburg'),
  effective_from date not null,
  effective_until date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (effective_until is null or effective_until >= effective_from)
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  available boolean not null default false,
  reason text check (char_length(reason) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.consent_versions (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('booking', 'privacy', 'communications')),
  version text not null check (char_length(version) between 1 and 30),
  wording text not null check (char_length(wording) between 1 and 10000),
  active boolean not null default false,
  effective_at timestamptz not null,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  unique (purpose, version),
  check (retired_at is null or retired_at > effective_at)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique check (public_reference ~ '^TTC-[A-Z0-9]{8,20}$'),
  service_id uuid not null references public.services(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  state public.booking_state not null default 'HELD',
  hold_expires_at timestamptz,
  client_name text not null check (char_length(client_name) between 1 and 160),
  client_email text not null check (char_length(client_email) between 3 and 320),
  client_telephone text check (char_length(client_telephone) <= 40),
  idempotency_key uuid not null unique,
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((state <> 'HELD') or hold_expires_at is not null),
  exclude using gist (
    service_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (state in ('HELD', 'PAYMENT_PENDING', 'PAID', 'CALENDAR_SYNC_PENDING', 'CONFIRMED'))
);

create table public.booking_consents (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  consent_version_id uuid not null references public.consent_versions(id) on delete restrict,
  accepted_at timestamptz not null,
  primary key (booking_id, consent_version_id)
);

create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_type text not null check (char_length(event_type) between 1 and 100),
  from_state public.booking_state,
  to_state public.booking_state,
  metadata jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  provider text not null check (provider in ('payfast', 'eft')),
  provider_reference text,
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  state public.payment_state not null default 'CREATED',
  idempotency_key uuid not null unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create table public.payment_events (
  id bigint generated always as identity primary key,
  payment_id uuid not null references public.payments(id) on delete cascade,
  event_type text not null check (char_length(event_type) between 1 and 100),
  from_state public.payment_state,
  to_state public.payment_state,
  provider_event_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  unique (payment_id, provider_event_id)
);

create table public.webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('payfast', 'google_calendar')),
  provider_event_id text not null,
  payload_hash text not null check (char_length(payload_hash) = 64),
  signature_valid boolean not null default false,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('booking_confirmation', 'booking_reminder', 'booking_cancelled')),
  recipient text not null check (char_length(recipient) between 3 and 320),
  payload jsonb not null,
  idempotency_key uuid not null unique,
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table public.calendar_sync_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  direction text not null check (direction in ('push', 'pull', 'reconcile')),
  outcome text not null check (outcome in ('pending', 'succeeded', 'failed')),
  external_event_id text,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index page_versions_page_id_idx on public.page_versions(page_id);
create index assets_status_idx on public.assets(status);
create index availability_rules_service_id_idx on public.availability_rules(service_id);
create index availability_exceptions_service_id_idx on public.availability_exceptions(service_id);
create index bookings_state_starts_at_idx on public.bookings(state, starts_at);
create index booking_events_booking_id_idx on public.booking_events(booking_id);
create index payments_booking_id_idx on public.payments(booking_id);
create index payment_events_payment_id_idx on public.payment_events(payment_id);
create index notification_outbox_available_idx on public.notification_outbox(available_at)
where sent_at is null;
create index calendar_sync_booking_id_idx on public.calendar_sync_events(booking_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.has_any_role(required_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = any(required_roles)
  );
$$;

create function public.validate_page_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  published_snapshot jsonb;
begin
  if new.status <> 'published' then
    return new;
  end if;

  if new.published_version_id is null or new.published_at is null then
    raise exception 'Published pages require a version and publication timestamp';
  end if;

  select snapshot into published_snapshot
  from public.page_versions
  where id = new.published_version_id and page_id = new.id;

  if published_snapshot is null then
    raise exception 'Published version must belong to the page';
  end if;

  if (published_snapshot ->> 'slug') is distinct from new.slug
    or (published_snapshot ->> 'title') is distinct from new.title
    or (published_snapshot ->> 'description') is distinct from new.description
    or (published_snapshot ->> 'status') is distinct from 'published' then
    raise exception 'Published page metadata must match its immutable version snapshot';
  end if;

  return new;
end;
$$;

create function public.prevent_page_version_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Page versions are immutable';
end;
$$;

revoke all on function public.has_any_role(public.app_role[]) from public;
grant execute on function public.has_any_role(public.app_role[]) to anon, authenticated;

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger site_settings_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();
create trigger navigation_items_updated_at before update on public.navigation_items
for each row execute function public.set_updated_at();
create trigger pages_updated_at before update on public.pages
for each row execute function public.set_updated_at();
create trigger pages_validate_publication before insert or update on public.pages
for each row execute function public.validate_page_publication();
create trigger page_versions_immutable before update or delete on public.page_versions
for each row execute function public.prevent_page_version_mutation();
create trigger sections_updated_at before update on public.sections
for each row execute function public.set_updated_at();
create trigger reusable_entries_updated_at before update on public.reusable_entries
for each row execute function public.set_updated_at();
create trigger assets_updated_at before update on public.assets
for each row execute function public.set_updated_at();
create trigger redirects_updated_at before update on public.redirects
for each row execute function public.set_updated_at();
create trigger services_updated_at before update on public.services
for each row execute function public.set_updated_at();
create trigger availability_rules_updated_at before update on public.availability_rules
for each row execute function public.set_updated_at();
create trigger availability_exceptions_updated_at before update on public.availability_exceptions
for each row execute function public.set_updated_at();
create trigger bookings_updated_at before update on public.bookings
for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
for each row execute function public.set_updated_at();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_roles', 'site_settings', 'navigation_items', 'pages',
    'page_versions', 'sections', 'reusable_entries', 'assets', 'redirects',
    'content_audit_log', 'services', 'availability_rules',
    'availability_exceptions', 'consent_versions', 'bookings',
    'booking_consents', 'booking_events', 'payments', 'payment_events',
    'webhook_receipts', 'notification_outbox', 'calendar_sync_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end;
$$;

create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.has_any_role(array['owner', 'auditor']::public.app_role[]));
create policy profiles_insert_self on public.profiles for insert to authenticated
with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
using (id = (select auth.uid()) or public.has_any_role(array['owner']::public.app_role[]))
with check (id = (select auth.uid()) or public.has_any_role(array['owner']::public.app_role[]));

create policy user_roles_read on public.user_roles for select to authenticated
using (user_id = (select auth.uid()) or public.has_any_role(array['owner', 'auditor']::public.app_role[]));
create policy user_roles_owner_manage on public.user_roles for all to authenticated
using (public.has_any_role(array['owner']::public.app_role[]))
with check (public.has_any_role(array['owner']::public.app_role[]));

create policy site_settings_public_read on public.site_settings for select to anon, authenticated
using (is_public);
create policy site_settings_admin_manage on public.site_settings for all to authenticated
using (public.has_any_role(array['owner', 'publisher']::public.app_role[]))
with check (public.has_any_role(array['owner', 'publisher']::public.app_role[]));

create policy navigation_public_read on public.navigation_items for select to anon, authenticated
using (visible);
create policy navigation_cms_read on public.navigation_items for select to authenticated
using (public.has_any_role(array['owner', 'publisher', 'editor', 'auditor']::public.app_role[]));
create policy navigation_editor_insert_hidden on public.navigation_items for insert to authenticated
with check (not visible and public.has_any_role(array['editor']::public.app_role[]));
create policy navigation_editor_update_hidden on public.navigation_items for update to authenticated
using (not visible and public.has_any_role(array['editor']::public.app_role[]))
with check (not visible and public.has_any_role(array['editor']::public.app_role[]));
create policy navigation_editor_delete_hidden on public.navigation_items for delete to authenticated
using (not visible and public.has_any_role(array['editor']::public.app_role[]));
create policy navigation_publishers_manage on public.navigation_items for all to authenticated
using (public.has_any_role(array['owner', 'publisher']::public.app_role[]))
with check (public.has_any_role(array['owner', 'publisher']::public.app_role[]));

create policy pages_public_read on public.pages for select to anon, authenticated
using (status = 'published');
create policy pages_cms_read on public.pages for select to authenticated
using (public.has_any_role(array['owner', 'publisher', 'editor', 'auditor']::public.app_role[]));
create policy pages_editor_insert_draft on public.pages for insert to authenticated
with check (
  status = 'draft' and published_version_id is null and published_at is null
  and public.has_any_role(array['editor']::public.app_role[])
);
create policy pages_editor_update_draft on public.pages for update to authenticated
using (
  status = 'draft' and published_version_id is null
  and public.has_any_role(array['editor']::public.app_role[])
)
with check (
  status = 'draft' and published_version_id is null and published_at is null
  and public.has_any_role(array['editor']::public.app_role[])
);
create policy pages_editor_delete_draft on public.pages for delete to authenticated
using (
  status = 'draft' and published_version_id is null
  and public.has_any_role(array['editor']::public.app_role[])
);
create policy pages_publishers_manage on public.pages for all to authenticated
using (public.has_any_role(array['owner', 'publisher']::public.app_role[]))
with check (public.has_any_role(array['owner', 'publisher']::public.app_role[]));

create policy page_versions_public_read on public.page_versions for select to anon, authenticated
using (
  exists (
    select 1 from public.pages
    where pages.published_version_id = page_versions.id and pages.status = 'published'
  )
);
create policy page_versions_cms_read on public.page_versions for select to authenticated
using (public.has_any_role(array['owner', 'publisher', 'editor', 'auditor']::public.app_role[]));
create policy page_versions_publish on public.page_versions for insert to authenticated
with check (public.has_any_role(array['owner', 'publisher']::public.app_role[]));

create policy sections_cms_read on public.sections for select to authenticated
using (public.has_any_role(array['owner', 'publisher', 'editor', 'auditor']::public.app_role[]));
create policy sections_draft_manage on public.sections for all to authenticated
using (public.has_any_role(array['owner', 'publisher', 'editor']::public.app_role[]))
with check (public.has_any_role(array['owner', 'publisher', 'editor']::public.app_role[]));

create policy reusable_public_read on public.reusable_entries for select to anon, authenticated
using (status = 'published');
create policy reusable_cms_read on public.reusable_entries for select to authenticated
using (public.has_any_role(array['owner', 'publisher', 'editor', 'auditor']::public.app_role[]));
create policy reusable_editor_insert_draft on public.reusable_entries for insert to authenticated
with check (status = 'draft' and public.has_any_role(array['editor']::public.app_role[]));
create policy reusable_editor_update_draft on public.reusable_entries for update to authenticated
using (status = 'draft' and public.has_any_role(array['editor']::public.app_role[]))
with check (status = 'draft' and public.has_any_role(array['editor']::public.app_role[]));
create policy reusable_editor_delete_draft on public.reusable_entries for delete to authenticated
using (status = 'draft' and public.has_any_role(array['editor']::public.app_role[]));
create policy reusable_publishers_manage on public.reusable_entries for all to authenticated
using (public.has_any_role(array['owner', 'publisher']::public.app_role[]))
with check (public.has_any_role(array['owner', 'publisher']::public.app_role[]));

create policy assets_public_read on public.assets for select to anon, authenticated
using (status = 'published');
create policy assets_cms_read on public.assets for select to authenticated
using (public.has_any_role(array['owner', 'publisher', 'editor', 'auditor']::public.app_role[]));
create policy assets_editor_insert_draft on public.assets for insert to authenticated
with check (status = 'draft' and public.has_any_role(array['editor']::public.app_role[]));
create policy assets_editor_update_draft on public.assets for update to authenticated
using (status = 'draft' and public.has_any_role(array['editor']::public.app_role[]))
with check (status = 'draft' and public.has_any_role(array['editor']::public.app_role[]));
create policy assets_editor_delete_draft on public.assets for delete to authenticated
using (status = 'draft' and public.has_any_role(array['editor']::public.app_role[]));
create policy assets_publishers_manage on public.assets for all to authenticated
using (public.has_any_role(array['owner', 'publisher']::public.app_role[]))
with check (public.has_any_role(array['owner', 'publisher']::public.app_role[]));

create policy redirects_public_read on public.redirects for select to anon, authenticated
using (active);
create policy redirects_cms_manage on public.redirects for all to authenticated
using (public.has_any_role(array['owner', 'publisher']::public.app_role[]))
with check (public.has_any_role(array['owner', 'publisher']::public.app_role[]));

create policy content_audit_read on public.content_audit_log for select to authenticated
using (public.has_any_role(array['owner', 'publisher', 'auditor']::public.app_role[]));
create policy content_audit_append on public.content_audit_log for insert to authenticated
with check (actor_id = (select auth.uid()) and public.has_any_role(array['owner', 'publisher', 'editor']::public.app_role[]));

create policy services_public_read on public.services for select to anon, authenticated
using (active);
create policy services_staff_read on public.services for select to authenticated
using (public.has_any_role(array['owner', 'publisher', 'editor', 'scheduler', 'finance', 'auditor']::public.app_role[]));
create policy services_staff_write on public.services for all to authenticated
using (public.has_any_role(array['owner', 'scheduler']::public.app_role[]))
with check (public.has_any_role(array['owner', 'scheduler']::public.app_role[]));

create policy availability_rules_read on public.availability_rules for select to authenticated
using (public.has_any_role(array['owner', 'scheduler', 'auditor']::public.app_role[]));
create policy availability_rules_insert on public.availability_rules for insert to authenticated
with check (public.has_any_role(array['owner', 'scheduler']::public.app_role[]));
create policy availability_rules_update on public.availability_rules for update to authenticated
using (public.has_any_role(array['owner', 'scheduler']::public.app_role[]))
with check (public.has_any_role(array['owner', 'scheduler']::public.app_role[]));
create policy availability_rules_delete on public.availability_rules for delete to authenticated
using (public.has_any_role(array['owner', 'scheduler']::public.app_role[]));
create policy availability_exceptions_read on public.availability_exceptions for select to authenticated
using (public.has_any_role(array['owner', 'scheduler', 'auditor']::public.app_role[]));
create policy availability_exceptions_insert on public.availability_exceptions for insert to authenticated
with check (public.has_any_role(array['owner', 'scheduler']::public.app_role[]));
create policy availability_exceptions_update on public.availability_exceptions for update to authenticated
using (public.has_any_role(array['owner', 'scheduler']::public.app_role[]))
with check (public.has_any_role(array['owner', 'scheduler']::public.app_role[]));
create policy availability_exceptions_delete on public.availability_exceptions for delete to authenticated
using (public.has_any_role(array['owner', 'scheduler']::public.app_role[]));

create policy consent_versions_public_read on public.consent_versions for select to anon, authenticated
using (active and effective_at <= now() and (retired_at is null or retired_at > now()));
create policy consent_versions_admin_manage on public.consent_versions for all to authenticated
using (public.has_any_role(array['owner', 'publisher']::public.app_role[]))
with check (public.has_any_role(array['owner', 'publisher']::public.app_role[]));

create policy bookings_staff_read on public.bookings for select to authenticated
using (public.has_any_role(array['owner', 'scheduler', 'finance', 'auditor']::public.app_role[]));
create policy bookings_scheduler_write on public.bookings for all to authenticated
using (public.has_any_role(array['owner', 'scheduler']::public.app_role[]))
with check (public.has_any_role(array['owner', 'scheduler']::public.app_role[]));
create policy booking_consents_staff_read on public.booking_consents for select to authenticated
using (public.has_any_role(array['owner', 'scheduler', 'auditor']::public.app_role[]));
create policy booking_events_staff_read on public.booking_events for select to authenticated
using (public.has_any_role(array['owner', 'scheduler', 'finance', 'auditor']::public.app_role[]));
create policy booking_events_staff_append on public.booking_events for insert to authenticated
with check (public.has_any_role(array['owner', 'scheduler', 'finance']::public.app_role[]));

create policy payments_staff_read on public.payments for select to authenticated
using (public.has_any_role(array['owner', 'finance', 'auditor']::public.app_role[]));
create policy payments_finance_write on public.payments for all to authenticated
using (public.has_any_role(array['owner', 'finance']::public.app_role[]))
with check (public.has_any_role(array['owner', 'finance']::public.app_role[]));
create policy payment_events_staff_read on public.payment_events for select to authenticated
using (public.has_any_role(array['owner', 'finance', 'auditor']::public.app_role[]));
create policy payment_events_finance_append on public.payment_events for insert to authenticated
with check (public.has_any_role(array['owner', 'finance']::public.app_role[]));
create policy webhook_receipts_staff_read on public.webhook_receipts for select to authenticated
using (public.has_any_role(array['owner', 'finance', 'auditor']::public.app_role[]));

create policy notification_outbox_staff_read on public.notification_outbox for select to authenticated
using (public.has_any_role(array['owner', 'scheduler', 'auditor']::public.app_role[]));
create policy calendar_sync_staff_read on public.calendar_sync_events for select to authenticated
using (public.has_any_role(array['owner', 'scheduler', 'auditor']::public.app_role[]));
create policy calendar_sync_staff_append on public.calendar_sync_events for insert to authenticated
with check (public.has_any_role(array['owner', 'scheduler']::public.app_role[]));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy site_assets_public_read on storage.objects for select to anon, authenticated
using (
  bucket_id = 'site-assets'
  and (
    exists (
      select 1 from public.assets
      where assets.storage_path = storage.objects.name
        and assets.status = 'published'
    )
    or public.has_any_role(array['owner', 'publisher', 'editor', 'auditor']::public.app_role[])
  )
);
create policy site_assets_editor_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'site-assets'
  and public.has_any_role(array['owner', 'publisher', 'editor']::public.app_role[])
);
create policy site_assets_editor_update on storage.objects for update to authenticated
using (
  bucket_id = 'site-assets'
  and (
    public.has_any_role(array['owner', 'publisher']::public.app_role[])
    or (
      public.has_any_role(array['editor']::public.app_role[])
      and exists (
        select 1 from public.assets
        where assets.storage_path = storage.objects.name and assets.status = 'draft'
      )
    )
  )
)
with check (
  bucket_id = 'site-assets'
  and (
    public.has_any_role(array['owner', 'publisher']::public.app_role[])
    or (
      public.has_any_role(array['editor']::public.app_role[])
      and exists (
        select 1 from public.assets
        where assets.storage_path = storage.objects.name and assets.status = 'draft'
      )
    )
  )
);
create policy site_assets_editor_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'site-assets'
  and (
    public.has_any_role(array['owner', 'publisher']::public.app_role[])
    or (
      public.has_any_role(array['editor']::public.app_role[])
      and exists (
        select 1 from public.assets
        where assets.storage_path = storage.objects.name and assets.status = 'draft'
      )
    )
  )
);

commit;
