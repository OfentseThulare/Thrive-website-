export type BootstrapEnvironment = Record<string, string | undefined>;

export function parseBootstrapInput(
  args: string[],
  environment: BootstrapEnvironment,
): { email: string; hours: number; databaseUrl: URL };

export function buildPostgresEnvironment(
  databaseUrl: URL,
  environment: BootstrapEnvironment,
): Record<string, string | undefined>;

export function runBootstrap(args?: string[], environment?: BootstrapEnvironment): void;
