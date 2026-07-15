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

type EnvironmentSource = Record<string, string | undefined>;

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
