import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { config } from "../config/env";

function makeToken(username: string): string {
  return crypto
    .createHmac("sha256", config.auth.secret)
    .update(username)
    .digest("hex");
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ") && auth.slice(7) === makeToken(config.auth.username)) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}

export function handleLogin(req: Request, res: Response): void {
  const { username, password } = req.body as { username: string; password: string };
  if (username === config.auth.username && password === config.auth.password) {
    res.json({ token: makeToken(username) });
    return;
  }
  res.status(401).json({ error: "Invalid username or password" });
}
