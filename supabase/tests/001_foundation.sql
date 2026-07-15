begin;

do $$
declare
  expected_tables text[] := array[
    'profiles', 'user_roles', 'site_settings', 'navigation_items', 'pages',
    'page_versions', 'sections', 'reusable_entries', 'assets', 'redirects',
    'content_audit_log', 'services', 'availability_rules',
    'availability_exceptions', 'consent_versions', 'bookings',
    'booking_consents', 'booking_events', 'payments', 'payment_events',
    'webhook_receipts', 'notification_outbox', 'calendar_sync_events'
  ];
  missing_rls text[];
  missing_policies text[];
begin
  select array_agg(name order by name)
  into missing_rls
  from unnest(expected_tables) as name
  where not exists (
    select 1
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = name
      and pg_class.relrowsecurity
      and pg_class.relforcerowsecurity
  );

  if coalesce(array_length(missing_rls, 1), 0) > 0 then
    raise exception 'Tables missing forced RLS: %', missing_rls;
  end if;

  select array_agg(name order by name)
  into missing_policies
  from unnest(expected_tables) as name
  where not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = name
  );

  if coalesce(array_length(missing_policies, 1), 0) > 0 then
    raise exception 'Tables missing policies: %', missing_policies;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.bookings'::regclass and contype = 'x'
  ) then
    raise exception 'Booking overlap exclusion constraint is missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'site_assets_public_read'
  ) then
    raise exception 'Storage read policy is missing';
  end if;
end;
$$;

rollback;
