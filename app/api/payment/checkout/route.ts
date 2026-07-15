import { createCheckout } from "@/lib/payment/server";
import { checkBookingRateLimit } from "@/lib/booking/rate-limit";
import { createBookingAdminClient } from "@/lib/supabase/booking-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
}

export async function POST(request: Request) {
  try {
    const supabase = createBookingAdminClient();
    if (!(await checkBookingRateLimit(supabase, request, "payment"))) {
      return new Response("Too many payment attempts. Please try again shortly.", { status: 429, headers: { "Cache-Control": "no-store, private", "Retry-After": "900" } });
    }
    const formData = await request.formData();
    const legal = formData.get("legalAcceptance") === "accepted";
    const earlyPerformance = formData.get("earlyPerformanceAcceptance") === "accepted";
    if (!legal) return new Response("Explicit legal acceptance is required.", { status: 400, headers: { "Cache-Control": "no-store, private" } });
    const checkout = await createCheckout({ legal, earlyPerformance });
    const inputs = checkout.fields.map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(String(value))}">`).join("");
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Continue to secure payment</title><style>body{margin:0;background:#f6f0e8;color:#173d3b;font:18px Georgia,serif;display:grid;min-height:100vh;place-items:center}.card{background:#fff;max-width:34rem;margin:2rem;padding:3rem;border-radius:1.5rem;box-shadow:0 24px 70px #173d3b22;text-align:center}button{border:0;border-radius:999px;background:#bd583f;color:#fff;padding:1rem 1.5rem;font:700 1rem Arial,sans-serif;cursor:pointer}small{display:block;margin-top:1rem;color:#526c69}</style></head><body><main class="card"><p>Secure hosted checkout</p><h1>Continue to PayFast</h1><p>Your session details and total were verified against the private booking record. Card details are entered only on PayFast.</p><form method="post" action="${escapeHtml(checkout.processUrl)}">${inputs}<button type="submit">Continue securely</button></form><small>No card information is collected by this website.</small></main></body></html>`;
    return new Response(html, { status: 200, headers: {
      "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action https://www.payfast.co.za https://sandbox.payfast.co.za; base-uri 'none'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return new Response("Payment is not available for this booking.", { status: 503, headers: { "Cache-Control": "no-store, private", "Content-Type": "text/plain; charset=utf-8" } });
  }
}
