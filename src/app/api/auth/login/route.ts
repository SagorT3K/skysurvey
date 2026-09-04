import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, setSessionCookie, clientIp, userAgent } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }
  const email = String(body.email).trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(String(body.password), user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  if (!user.isActive) {
    return NextResponse.json({ error: "This account has been suspended" }, { status: 403 });
  }

  await prisma.activityLog.create({
    data: { userId: user.id, event: "login", ip: clientIp(req), userAgent: userAgent(req) },
  });

  await setSessionCookie(signToken({ uid: user.id, role: user.role }));
  return NextResponse.json({ ok: true, role: user.role });
}
