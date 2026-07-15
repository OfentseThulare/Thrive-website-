import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getBookingServerEnvironment } from "@/lib/env";

export function createBookingAdminClient() {
  const environment = getBookingServerEnvironment();
  return createClient(environment.url, environment.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: { headers: { "X-Client-Info": "thrive-booking-server" } },
  });
}
