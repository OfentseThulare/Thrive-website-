import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/admin") && !requestedNext.startsWith("//") ? requestedNext : "/admin";
  const supabase = await createServerSupabaseClient();
  if (!code || !supabase) return NextResponse.redirect(new URL("/admin/login", request.url));
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(error ? "/admin/login" : next, request.url));
}
