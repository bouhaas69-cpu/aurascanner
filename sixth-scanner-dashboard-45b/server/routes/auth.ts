import { createHmac, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

const username = process.env.AUTH_USERNAME ?? "admin";
const password = process.env.AUTH_PASSWORD ?? "admin123";
const secret = process.env.AUTH_SECRET ?? "aura-scanner-local-secret";
const role = process.env.AUTH_ROLE === "user" ? "user" : "admin";

type SessionPayload = { username: string; role: string; exp: number };

function sign(payload: SessionPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verify(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SessionPayload;
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!verify(token)) return res.status(401).json({ error: "Unauthorized" });
  next();
};

export const handleLogin: RequestHandler = (req, res) => {
  const body = req.body as { username?: string; password?: string };
  if (body.username !== username || body.password !== password) return res.status(401).json({ error: "Invalid username or password" });
  const user = { id: 1, username, role };
  const token = sign({ username, role, exp: Date.now() + 8 * 60 * 60 * 1000 });
  return res.json({ token, user });
};

export const handleStats: RequestHandler = (_req, res) => res.json({ stripeKeys: 284, stripeLive: 67, awsKeys: 41, smtpAccts: 19, verifiedKeys: 118, totalHits: 2847, vpsNodes: 4, campaigns: 12 });
