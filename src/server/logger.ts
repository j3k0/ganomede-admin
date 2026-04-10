import pino from "pino";

export function createLogger(name: string, level?: string): pino.Logger {
  return pino({
    name,
    level: level ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
    ...(process.env.NODE_ENV !== "production" && {
      transport: { target: "pino-pretty", options: { colorize: true } },
    }),
  });
}

export const logger = createLogger(process.env.BRANDING_TITLE ?? "Ganomede");
