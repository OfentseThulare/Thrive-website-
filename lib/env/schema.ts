import { z } from "zod";

const publicSupabaseSchema = z.object({
  url: z.string().trim().url().refine(
    (value) => value.startsWith("https://") || value.startsWith("http://localhost"),
    "Supabase URL must use HTTPS outside local development",
  ),
  anonKey: z.string().trim().min(20, "Supabase anonymous key is too short"),
});

const siteUrlSchema = z
  .string()
  .trim()
  .url()
  .refine(
    (value) => value.startsWith("https://") || value.startsWith("http://localhost"),
    "Site URL must use HTTPS outside local development",
  );

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

export function parseSiteUrl(source: EnvironmentSource): URL {
  const fallback = "http://localhost:3000";
  return new URL(siteUrlSchema.parse(source.NEXT_PUBLIC_SITE_URL || fallback));
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
