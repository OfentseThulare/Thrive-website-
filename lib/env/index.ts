import {
  parsePublicSupabaseEnvironment,
  parseSiteUrl,
  parseBookingCalendarEnvironment,
  parseBookingServerEnvironment,
  parsePayFastEnvironment,
  requireServerEnvironment,
} from "./schema";

export function getPublicSupabaseEnvironment() {
  return parsePublicSupabaseEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function getSiteUrl() {
  return parseSiteUrl(process.env);
}

export function isSeedContentMode() {
  return getPublicSupabaseEnvironment() === null;
}

export function requireServerIntegration<const T extends readonly string[]>(names: T) {
  return requireServerEnvironment(names, process.env);
}

export function getBookingCalendarEnvironment() {
  return parseBookingCalendarEnvironment(process.env);
}

export function getBookingServerEnvironment() {
  return parseBookingServerEnvironment(process.env);
}

export function getPayFastEnvironment() {
  return parsePayFastEnvironment(process.env);
}
