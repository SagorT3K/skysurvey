import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const COOKIE_NAME = "ss_token";
const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export type SessionPayload = { uid: number; role: string; tv: number };

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

/**
 * The version a token was issued under. Cookies minted before `User.tokenVersion`
 * existed carry no `tv` claim; they count as 0, the value every existing row holds,
 * so that addition did not sign the whole site out.
 */
function tokenVersionOf(session: SessionPayload) {
  return typeof session.tv === "number" ? session.tv : 0;
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
  // A password change bumps tokenVersion, which retires every cookie issued before
  // it. The device that made the change is handed a fresh token, so only the other
  // devices are signed out.
  if (user.tokenVersion !== tokenVersionOf(session)) return null;
  return user;
}

/**
 * Signs `user` in on this request. The single place a session cookie is minted, so
 * the token version can never be forgotten: pass the row that was just written, so
 * a password change issues a token that matches the new version.
 */
export async function startSession(user: { id: number; role: string; tokenVersion: number }) {
  await setSessionCookie(signToken({ uid: user.id, role: user.role, tv: user.tokenVersion }));
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

/**
 * Admin suspensions: while `heldUntil` is in the future the user can sign in and
 * see their balance, but cannot earn (surveys, check-ins). Payout requests stay
 * available — the admin release review covers those separately.
 */
export function isHeld(user: { heldUntil?: Date | null }) {
  return !!user.heldUntil && user.heldUntil.getTime() > Date.now();
}

/** Remaining hold time, phrased for the user-facing banner. */
export function holdDurationLeft(user: { heldUntil?: Date | null }) {
  if (!isHeld(user)) return "";
  const ms = (user.heldUntil as Date).getTime() - Date.now();
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}
