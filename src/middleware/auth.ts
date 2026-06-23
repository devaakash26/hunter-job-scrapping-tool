import { Request, Response, NextFunction } from "express";
import { AUTH } from "../constants";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const val = (req as Request & { signedCookies: Record<string, string> })
    .signedCookies[AUTH.COOKIE_NAME];
  if (val === AUTH.COOKIE_VALUE) {
    next();
    return;
  }
  res.redirect(
    `${AUTH.LOGIN_PATH}?next=${encodeURIComponent(req.originalUrl)}`,
  );
}

export function handleLogin(req: Request, res: Response): void {
  const { username, password } = req.body as {
    username: string;
    password: string;
  };
  if (username === AUTH.USERNAME && password === AUTH.PASSWORD) {
    res.cookie(AUTH.COOKIE_NAME, AUTH.COOKIE_VALUE, {
      signed: true,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: AUTH.COOKIE_MAX_AGE_MS,
      sameSite: "lax",
    });
    const next = (req.query.next as string) || "/";
    res.redirect(next);
    return;
  }
  res.render("login", { error: "Invalid username or password" });
}

export function handleLogout(req: Request, res: Response): void {
  res.clearCookie(AUTH.COOKIE_NAME);
  res.redirect(AUTH.LOGIN_PATH);
}
