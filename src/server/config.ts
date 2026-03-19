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
 * Singleton config parsed from process.env. Used at runtime.
 * Throws on startup if env vars are invalid.
 */
export const config: Config = parseConfig(process.env);
