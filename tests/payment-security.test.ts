import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("payment SQL provides atomic snapshots, idempotency and late-payment safety", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202607150008_payfast_legal_operations.sql", import.meta.url), "utf8");
  assert.match(sql, /for update of b/);
  assert.match(sql, /PAYMENT_SNAPSHOT_IMMUTABLE/);
  assert.match(sql, /payment_events_provider_event_global_unique/);
  assert.match(sql, /payment\.received_after_release/);
  assert.match(sql, /requires_manual_reconciliation/);
  assert.match(sql, /reconciliation_required = v_booking\.state in \('EXPIRED', 'CANCELLED'\)/);
  assert.match(sql, /checkout\.acceptance/);
  assert.match(sql, /notification_outbox/);
  assert.match(sql, /current_session_is_aal2/);
  assert.match(sql, /booking_rate_limits_scope_allowed[\s\S]*?'payment'/);
  assert.doesNotMatch(sql, /create policy payments_finance_write/);
  assert.match(sql, /state = 'HELD' for update/);
  assert.doesNotMatch(sql.match(/create or replace function public\.release_booking_hold[\s\S]*?end; \$\$/)?.[0] ?? "", /PAYMENT_PENDING/);
});

test("late payment messaging and finance reconciliation queue are explicit", async () => {
  const status = await readFile(new URL("../app/book/status/page.tsx", import.meta.url), "utf8");
  const returned = await readFile(new URL("../app/payment/return/page.tsx", import.meta.url), "utf8");
  const list = await readFile(new URL("../app/admin/(protected)/finance/payments/page.tsx", import.meta.url), "utf8");
  const detail = await readFile(new URL("../app/admin/(protected)/finance/payments/[paymentId]/page.tsx", import.meta.url), "utf8");
  for (const source of [status, returned]) {
    assert.match(source, /Payment received, appointment not confirmed/);
    assert.match(source, /do not pay again/i);
  }
  assert.match(list, /reconciliation_required/);
  assert.match(list, /reconciliation=required/);
  assert.match(detail, /Action required: paid booking not confirmed/);
  assert.match(detail, /booking\.state/);
});

test("ITN authority is isolated from client routes and hashes receipts", async () => {
  const itn = await readFile(new URL("../app/api/payment/payfast/itn/route.ts", import.meta.url), "utf8");
  const ip = await readFile(new URL("../lib/payment/ip.ts", import.meta.url), "utf8");
  assert.match(ip, /x-vercel-forwarded-for/);
  assert.doesNotMatch(ip, /headers\.get\("x-forwarded-for"\)/);
  assert.match(itn, /AbortSignal\.timeout\(5_000\)/);
  assert.match(itn, /process_payfast_itn/);
  assert.match(itn, /receiptHash\(raw\)/);
  assert.match(itn, /REMOTE_VALIDATION_UNAVAILABLE/);
  assert.match(itn, /PROCESSING_REJECTED/);
  assert.match(itn, /rejectedReceiptId\(hash\)/);
  assert.doesNotMatch(itn, /console\.(log|error)|payload:\s*raw/);
});

test("finance mutations require AAL2 in the database, action and UI", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202607150008_payfast_legal_operations.sql", import.meta.url), "utf8");
  const action = await readFile(new URL("../app/admin/finance-actions.ts", import.meta.url), "utf8");
  const access = await readFile(new URL("../lib/payment/admin.ts", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/admin/(protected)/layout.tsx", import.meta.url), "utf8");
  const boundary = sql.match(/create function public\.can_mutate_finance[\s\S]*?\$\$;/)?.[0] ?? "";
  assert.match(boundary, /and public\.current_session_is_aal2\(\)/);
  assert.doesNotMatch(boundary, /not public\.has_any_role/);
  assert.match(action, /mfaData\.currentLevel !== "aal2"/);
  assert.doesNotMatch(action, /roles\.includes\("owner"\)/);
  assert.match(access, /editable = !error && data\.currentLevel === "aal2"/);
  assert.match(layout, /\["owner", "publisher", "finance"\]/);
});

test("legal CMS seeds remain typed content and expose all required routes", async () => {
  const legal = await readFile(new URL("../lib/content/legal-seed.ts", import.meta.url), "utf8");
  const routes = await readFile(new URL("../lib/site-routes.ts", import.meta.url), "utf8");
  for (const slug of ["privacy", "terms", "cancellation-refunds", "medical-disclaimer"]) {
    assert.match(legal, new RegExp(`slug: "${slug}"`));
    assert.match(routes, new RegExp(`/${slug}`));
  }
  assert.match(legal, /Last updated 15\/07\/2026/);
  assert.match(legal, /pending practice confirmation/i);
  assert.doesNotMatch(legal, /dangerouslySetInnerHTML|blockType: "html"/);
});
