import { randomUUID } from "node:crypto";
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

export function createAuthModule(options: AuthOptions) {
  const sessions = new Map<string, Session>();
  const router = Router();

  function createSession(): string {
    const token = randomUUID();
    sessions.set(token, { createdAt: Date.now() });
    return token;
  }

  function isValidSession(token: string): boolean {
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
    if (username !== options.username || password !== options.password) {
      res.status(401).json({
        success: false,
        error: "Invalid username or password.",
      });
      return;
    }

    const token = createSession();
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

  return { router, validate, sessions };
}
