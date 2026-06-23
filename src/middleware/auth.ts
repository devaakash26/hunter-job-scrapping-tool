import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { AUTH } from "../constants";

function makeToken(username: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(username).digest("hex");
}

function getSecret(): string {
  return process.env.AUTH_SECRET || "jh-default-secret-change-in-prod";
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Bearer token — React frontend / API clients
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    if (auth.slice(7) === makeToken(AUTH.USERNAME, getSecret())) {
      next();
      return;
    }
  }
  // Signed cookie — local dev / legacy EJS
  const val = (req as Request & { signedCookies: Record<string, string> })
    .signedCookies[AUTH.COOKIE_NAME];
  if (val === AUTH.COOKIE_VALUE) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}

export function handleLogin(req: Request, res: Response): void {
  const { username, password } = req.body as {
    username: string;
    password: string;
  };
  if (username === AUTH.USERNAME && password === AUTH.PASSWORD) {
    const token = makeToken(username, getSecret());
    res.cookie(AUTH.COOKIE_NAME, AUTH.COOKIE_VALUE, {
      signed: true,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: AUTH.COOKIE_MAX_AGE_MS,
      sameSite: "lax",
    });
    res.json({ token });
    return;
  }
  res.status(401).json({ error: "Invalid username or password" });
}

export function handleLogout(_req: Request, res: Response): void {
  res.clearCookie(AUTH.COOKIE_NAME);
  res.json({ success: true });
}
