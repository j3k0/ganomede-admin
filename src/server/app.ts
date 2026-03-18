import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { Config } from "./config.js";
import { createAuthModule } from "./auth.js";
import { createMailer } from "./mailer.js";
import { createHealthRouter } from "./routes/health.js";
import { createMailRouter } from "./routes/mail.js";
import { errorHandler } from "./errors.js";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface AppDeps {
  config: Config;
  pkg: { name: string; version: string; description: string; api: string };
}

export function createApp({ config, pkg }: AppDeps) {
  const app = express();
  const baseUrl = `/${pkg.api}`;
  const apiRoot = `${baseUrl}/api`;
  const webRoot = `${baseUrl}/web`;

  // --- Middleware ---
  app.use(helmet({ contentSecurityPolicy: false })); // CSP will be refined in Phase 2
  app.use(express.json({ limit: "50mb" }));
  app.use(cookieParser());
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, url: req.originalUrl }, "request");
    next();
  });

  // --- Health (no auth) ---
  const healthRouter = createHealthRouter({
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
  });
  app.use("/", healthRouter);
  app.use(baseUrl, healthRouter);

  // --- Redirects ---
  const redirectToWeb = (_req: express.Request, res: express.Response) => res.redirect(webRoot);
  app.get("/", redirectToWeb);
  app.get(baseUrl, redirectToWeb);

  // --- Static / SPA ---
  const clientDist = path.resolve(__dirname, "../client");

  // Build injected HTML once at startup (config doesn't change at runtime)
  function buildIndexHtml(): string {
    const htmlPath = path.join(clientDist, "index.html");
    if (!fs.existsSync(htmlPath)) {
      return "<html><body>Admin panel (build not found — run npm run build)</body></html>";
    }

    const services = config.UPSTREAM_URL
      ? ["users", "usermeta", "avatars", "virtualcurrency", "data", "directory", "chat"]
      : [];

    const configScript = `<script>window.__ADMIN_CONFIG__=${JSON.stringify({
      brandingTitle: config.BRANDING_TITLE,
      services,
      currencies: config.CURRENCY_CODES,
      chatRoomPrefix: config.CHAT_ROOM_PREFIX,
      userMetadataList: config.USER_METADATA_LIST,
    })};</script>`;

    return fs
      .readFileSync(htmlPath, "utf-8")
      .replace("<!--ADMIN_CONFIG-->", configScript)
      .replace("<!--BRANDING_TITLE-->", `${config.BRANDING_TITLE} Administration`);
  }

  const indexHtml = buildIndexHtml();

  app.use(webRoot, express.static(clientDist));
  // Express 5 wildcard: must use {*path} syntax (path-to-regexp v8)
  app.get(`${webRoot}/{*path}`, (_req, res) => {
    res.type("html").send(indexHtml);
  });

  // --- Auth ---
  const auth = createAuthModule({
    username: config.ADMIN_USERNAME,
    password: config.ADMIN_PASSWORD,
    isProduction: config.NODE_ENV === "production",
    sessionTtlMs: 604_800_000,
  });

  // Rate limit on login only — must be mounted BEFORE auth router
  const loginLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    message: { error: "Too many login attempts, try again in a minute" },
  });
  app.post(`${apiRoot}/login`, loginLimiter);

  app.use(apiRoot, auth.router);

  // Everything below requires auth
  app.use(apiRoot, auth.validate);

  // --- islogged ---
  app.get(`${apiRoot}/islogged`, (_req, res) => {
    res.json({ success: true });
  });

  // --- Mailer ---
  const mailer = createMailer(config);
  app.use(apiRoot, createMailRouter(mailer, config.MAILER_SEND_FROM));

  // --- Error handler (must be last) ---
  app.use(errorHandler);

  return app;
}
