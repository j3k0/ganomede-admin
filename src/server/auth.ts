import { createHash, timingSafeEqual } from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";

interface AuthOptions {
  username: string;
  password: string;
  isProduction: boolean;
  sessionTtlMs: number;
}

interface Session {
  createdAt: number;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function createAuthModule(options: AuthOptions) {
  const sessions = new Map<string, Session>();
  const router = Router();

  // Deterministic token derived from credentials — survives server restarts.
  // Different per deployment (different credentials = different token).
  const persistentToken = createHash("sha256")
    .update(options.username)
    .update(":")
    .update(options.password)
    .digest("hex");

  function isValidSession(token: string): boolean {
    // Accept the persistent token (always valid, survives restarts)
    if (token === persistentToken) return true;

    // Check ephemeral session tokens
    const session = sessions.get(token);
    if (!session) return false;
    if (Date.now() - session.createdAt > options.sessionTtlMs) {
      sessions.delete(token);
      return false;
    }
    return true;
  }

  router.post("/login", (req: Request, res: Response) => {
    const { username, password } = req.body ?? {};
    if (!safeEqual(username ?? "", options.username) || !safeEqual(password ?? "", options.password)) {
      res.status(401).json({
        success: false,
        error: "Invalid username or password.",
      });
      return;
    }

    // Use the persistent token so the session survives container restarts
    const token = persistentToken;
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      secure: options.isProduction,
      sameSite: "lax",
      maxAge: options.sessionTtlMs,
    });
    res.json({ success: true });
  });

  router.post("/logout", validate, (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (token) sessions.delete(token);
    res.clearCookie("token", { path: "/" });
    res.json({ success: true });
  });

  function validate(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.token;
    if (token && isValidSession(token)) {
      next();
      return;
    }
    res.status(401).json({
      success: false,
      error: "Need authentication",
      needAuthentication: true,
    });
  }

  // Sweep expired sessions every 10 minutes
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions) {
      if (now - session.createdAt > options.sessionTtlMs) {
        sessions.delete(token);
      }
    }
  }, 600_000);
  sweepInterval.unref();

  return { router, validate, sessions, sweepInterval };
}
