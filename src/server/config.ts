import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.string().default("development"),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  API_SECRET: z.string().min(1),
  UPSTREAM_URL: z
    .string()
    .url()
    .refine(
      (s) => s.startsWith("http://") || s.startsWith("https://"),
      "UPSTREAM_URL must be an HTTP(S) URL",
    )
    .optional(),
  // Override UPSTREAM_URL for directory service only (e.g. https://account.ggs.ovh)
  DIRECTORY_URL: z
    .string()
    .url()
    .refine(
      (s) => s.startsWith("http://") || s.startsWith("https://"),
      "DIRECTORY_URL must be an HTTP(S) URL",
    )
    .optional(),
  BRANDING_TITLE: z.string().default("Ganomede"),
  CURRENCY_CODES: z
    .string({ error: "CURRENCY_CODES env var is required (comma-separated)" })
    .min(1)
    .transform((s) => s.split(",")),
  USER_METADATA_LIST: z
    .string()
    .default("")
    .transform((s) => (s ? s.split(",") : [])),
  CHAT_ROOM_PREFIX: z.string().default(""),
  // Grafana URL template for a user's analytics events; "{userId}" is replaced
  // with the username. Empty = no link shown in the UI.
  ANALYTICS_GRAFANA_URL: z.string().default(""),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().default(30_000),

  // Mailer config (all optional — if MAILER_HOST is absent, mailer is disabled)
  MAILER_HOST: z.string().optional(),
  MAILER_PORT: z.coerce.number().default(587),
  MAILER_SECURE: z
    .string()
    .default("false")
    .transform((s) => s === "true"),
  MAILER_USER: z.string().optional(),
  MAILER_PASSWORD: z.string().optional(),
  MAILER_SEND_FROM: z.string().default("noreply@ganomede.com"),
});

export type Config = z.infer<typeof envSchema>;

/**
 * Parse config from an env-like object. Exported for testing.
 */
export function parseConfig(env: Record<string, string | undefined>): Config {
  return envSchema.parse(env);
}

/**
 * Config keys whose values may appear in logs. Deny by default: a key added
 * to the schema is masked until someone lists it here, so a new secret can't
 * leak just because nobody remembered to mask it.
 */
const LOGGABLE_KEYS: ReadonlySet<keyof Config> = new Set<keyof Config>([
  "PORT",
  "HOST",
  "NODE_ENV",
  "ADMIN_USERNAME",
  "UPSTREAM_URL",
  "DIRECTORY_URL",
  "BRANDING_TITLE",
  "CURRENCY_CODES",
  "USER_METADATA_LIST",
  "CHAT_ROOM_PREFIX",
  "ANALYTICS_GRAFANA_URL",
  "UPSTREAM_TIMEOUT_MS",
  "MAILER_HOST",
  "MAILER_PORT",
  "MAILER_SECURE",
  "MAILER_USER",
  "MAILER_SEND_FROM",
]);

/** URLs may carry credentials (https://user:pass@host): drop them. */
function stripUrlCredentials(value: string): string {
  try {
    const url = new URL(value);
    if (!url.username && !url.password) return value;
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return value;
  }
}

/**
 * Copy of the config safe to log: values of keys not in LOGGABLE_KEYS are
 * replaced with "***" (unset ones stay undefined), URL credentials removed.
 */
export function redactConfig(config: Config): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) safe[key] = undefined;
    else if (!LOGGABLE_KEYS.has(key as keyof Config)) safe[key] = "***";
    else if (typeof value === "string") safe[key] = stripUrlCredentials(value);
    else safe[key] = value;
  }
  return safe;
}

/**
 * Singleton config parsed from process.env. Used at runtime.
 * Throws on startup if env vars are invalid.
 */
export const config: Config = parseConfig(process.env);
