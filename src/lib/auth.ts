import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_NAME = "ss_token";
const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export type SessionPayload = { uid: number; role: string };

export function signToken(payload: SessionPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || !user.isActive) return null;
  return user;
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

/**
 * The caller's IP, as reported by the proxy in front of us.
 *
 * Order matters for security. Fraud screening counts accounts and attempts per
 * IP, so a spoofable value defeats it: any client can send its own
 * X-Forwarded-For and proxies *append* to that header rather than replacing it,
 * which makes the first entry attacker-controlled. So we prefer headers only a
 * trusted proxy can set, and fall back to the LAST X-Forwarded-For entry — the
 * one written by the hop closest to us.
 */
export function clientIp(req: Request) {
  const flyClientIp = req.headers.get("fly-client-ip");
  if (flyClientIp) return flyClientIp.trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return "local";
}

export function userAgent(req: Request) {
  return req.headers.get("user-agent") || "";
}
