import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicSupabaseEnvironment } from "@/lib/env";

export async function createServerSupabaseClient() {
  const environment = getPublicSupabaseEnvironment();

  if (!environment) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(environment.url, environment.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. Middleware or a Server Action
          // will refresh sessions when authenticated routes are introduced.
        }
      },
    },
  });
}
