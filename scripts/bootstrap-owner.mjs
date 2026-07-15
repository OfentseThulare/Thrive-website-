import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseBootstrapInput(args, environment) {
  const mode = String(args[0] ?? "");
  if (!["create", "rotate"].includes(mode)) throw new Error("Choose the explicit create or rotate mode.");
  const email = String(args[1] ?? "").trim().toLowerCase();
  const hours = args[2] === undefined ? 168 : Number(args[2]);
  if (!emailPattern.test(email) || email.length > 320) throw new Error("Enter a valid owner email address.");
  if (!Number.isInteger(hours) || hours < 1 || hours > 720) throw new Error("Expiry hours must be an integer from 1 to 720.");

  const rawDatabaseUrl = environment.SUPABASE_DB_URL;
  if (!rawDatabaseUrl) throw new Error("SUPABASE_DB_URL is required.");
  let databaseUrl;
  try {
    databaseUrl = new URL(rawDatabaseUrl);
  } catch {
    throw new Error("SUPABASE_DB_URL must be a valid PostgreSQL connection URL.");
  }
  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)
    || !databaseUrl.hostname
    || !databaseUrl.username
    || !databaseUrl.pathname.slice(1)) {
    throw new Error("SUPABASE_DB_URL must include the PostgreSQL host, user and database.");
  }

  return { mode, email, hours, databaseUrl };
}

export function buildPostgresEnvironment(databaseUrl, environment) {
  return {
    PATH: environment.PATH,
    LANG: environment.LANG,
    LC_ALL: environment.LC_ALL,
    PGHOST: databaseUrl.hostname,
    PGPORT: databaseUrl.port || "5432",
    PGUSER: decodeURIComponent(databaseUrl.username),
    PGPASSWORD: decodeURIComponent(databaseUrl.password),
    PGDATABASE: decodeURIComponent(databaseUrl.pathname.slice(1)),
    PGSSLMODE: databaseUrl.searchParams.get("sslmode") || "require",
  };
}

export function runBootstrap(args = process.argv.slice(2), environment = process.env) {
  const { mode, email, hours, databaseUrl } = parseBootstrapInput(args, environment);
  const databaseFunction = mode === "rotate"
    ? "rotate_first_owner_invitation"
    : "bootstrap_first_owner_invitation";
  const result = spawnSync(
    "psql",
    [
      "-X",
      "--no-psqlrc",
      "--set",
      "ON_ERROR_STOP=1",
      "--set",
      `bootstrap_email=${email}`,
      "--set",
      `expires_hours=${hours}`,
      "--tuples-only",
      "--no-align",
      "--command",
      `select public.${databaseFunction}(:'bootstrap_email', now() + (:'expires_hours' || ' hours')::interval);`,
    ],
    {
      encoding: "utf8",
      env: buildPostgresEnvironment(databaseUrl, environment),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.error?.code === "ENOENT") throw new Error("psql is required to run the owner bootstrap.");
  if (result.status !== 0) throw new Error(`The database rejected the owner bootstrap ${mode} request.`);
  const invitationId = result.stdout.trim();
  if (!/^[0-9a-f-]{36}$/i.test(invitationId)) throw new Error("The database returned an unexpected bootstrap result.");
  process.stdout.write(`First owner invitation ${mode === "rotate" ? "rotated" : "created"}: ${invitationId}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runBootstrap();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Owner bootstrap failed."}\n`);
    process.exitCode = 1;
  }
}
