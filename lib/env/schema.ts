import { z } from "zod";

const publicSupabaseSchema = z.object({
  url: z.string().trim().url().refine(
    (value) => value.startsWith("https://") || value.startsWith("http://localhost"),
    "Supabase URL must use HTTPS outside local development",
  ),
  anonKey: z.string().trim().min(20, "Supabase anonymous key is too short"),
});

const siteUrlSchema = z.string().trim().url();

const runtimeEnvironmentSchema = z.enum(["development", "test", "production"]);

export type PublicSupabaseEnvironment = z.infer<typeof publicSupabaseSchema>;

const bookingServerSchema = z.object({
  url: z.string().trim().url().refine(
    (value) => value.startsWith("https://") || value.startsWith("http://localhost"),
    "Supabase URL must use HTTPS outside local development",
  ),
  serviceRoleKey: z.string().trim().min(20, "Supabase service role key is too short"),
  rateLimitSecret: z.string().trim().min(32, "Booking rate limit secret must contain at least 32 characters"),
  accessTokenSecret: z.string().trim().min(32, "Booking access token secret must contain at least 32 characters"),
});

export type BookingServerEnvironment = z.infer<typeof bookingServerSchema>;

type EnvironmentSource = Record<string, string | undefined>;

const bookingCalendarModeSchema = z.enum(["disabled", "google", "mock"]);

export type BookingCalendarEnvironment =
  | { mode: "disabled" }
  | { mode: "mock" }
  | {
      mode: "google";
      calendarId: string;
      clientId: string;
      clientSecret: string;
      refreshToken: string;
    };

export function parsePublicSupabaseEnvironment(
  source: EnvironmentSource,
): PublicSupabaseEnvironment | null {
  const url = source.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = source.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url && !anonKey) {
    return null;
  }

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is partially configured. Set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return publicSupabaseSchema.parse({ url, anonKey });
}

export function parseBookingServerEnvironment(source: EnvironmentSource): BookingServerEnvironment {
  const values = requireServerEnvironment(
    ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "BOOKING_RATE_LIMIT_SECRET", "BOOKING_ACCESS_TOKEN_SECRET"] as const,
    source,
  );
  return bookingServerSchema.parse({
    url: values.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: values.SUPABASE_SERVICE_ROLE_KEY,
    rateLimitSecret: values.BOOKING_RATE_LIMIT_SECRET,
    accessTokenSecret: values.BOOKING_ACCESS_TOKEN_SECRET,
  });
}

export function parseSiteUrl(
  source: EnvironmentSource,
  runtimeOverride?: "development" | "test" | "production",
): URL {
  const runtime = runtimeEnvironmentSchema.parse(
    runtimeOverride ?? source.NODE_ENV ?? "development",
  );
  const configuredUrl = source.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredUrl) {
    if (runtime === "production") {
      throw new Error("NEXT_PUBLIC_SITE_URL is required in production.");
    }

    return new URL("http://localhost:3000");
  }

  const siteUrl = new URL(siteUrlSchema.parse(configuredUrl));
  const isLocalhost = siteUrl.hostname === "localhost" || siteUrl.hostname === "127.0.0.1";

  if (runtime === "production" && (siteUrl.protocol !== "https:" || isLocalhost)) {
    throw new Error("Production site URL must be a public HTTPS origin.");
  }

  if (siteUrl.username || siteUrl.password || siteUrl.pathname !== "/" || siteUrl.search || siteUrl.hash) {
    throw new Error("Site URL must be an origin without credentials, path, query or fragment.");
  }

  if (siteUrl.protocol !== "https:" && !(isLocalhost && siteUrl.protocol === "http:")) {
    throw new Error("Site URL must use HTTPS outside local development.");
  }

  return siteUrl;
}

export function requireServerEnvironment<const T extends readonly string[]>(
  names: T,
  source: EnvironmentSource,
): { [K in T[number]]: string } {
  const missing = names.filter((name) => !source[name]?.trim());

  if (missing.length > 0) {
    throw new Error(`Required server configuration is unavailable: ${missing.join(", ")}`);
  }

  return Object.fromEntries(names.map((name) => [name, source[name]!.trim()])) as {
    [K in T[number]]: string;
  };
}

export function parseBookingCalendarEnvironment(
  source: EnvironmentSource,
  runtimeOverride?: "development" | "test" | "production",
): BookingCalendarEnvironment {
  const runtime = runtimeEnvironmentSchema.parse(
    runtimeOverride ?? source.NODE_ENV ?? "development",
  );
  const mode = bookingCalendarModeSchema.parse(
    source.BOOKING_CALENDAR_MODE?.trim() || "disabled",
  );

  if (mode === "disabled") return { mode };
  if (mode === "mock") {
    if (runtime === "production") {
      throw new Error("The mock booking calendar is forbidden in production.");
    }
    return { mode };
  }

  const values = requireServerEnvironment(
    [
      "GOOGLE_CALENDAR_ID",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_REFRESH_TOKEN",
    ] as const,
    source,
  );
  return {
    mode,
    calendarId: values.GOOGLE_CALENDAR_ID,
    clientId: values.GOOGLE_CLIENT_ID,
    clientSecret: values.GOOGLE_CLIENT_SECRET,
    refreshToken: values.GOOGLE_REFRESH_TOKEN,
  };
}
