"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseEnvironment } from "@/lib/env";

export function createBrowserSupabaseClient() {
  const environment = getPublicSupabaseEnvironment();

  if (!environment) {
    throw new Error("Supabase browser access is unavailable in seed content mode.");
  }

  return createBrowserClient(environment.url, environment.anonKey);
}
