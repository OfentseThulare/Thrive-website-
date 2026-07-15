import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicSupabaseEnvironment } from "@/lib/env";

export async function proxy(request: NextRequest) {
  const environment = getPublicSupabaseEnvironment();
  if (!environment) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(environment.url, environment.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = { matcher: ["/admin/:path*", "/auth/callback"] };
