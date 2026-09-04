import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// Demo-only path that stands in for a router sending the user back with a
// "screened out" status. Marks the attempt and sends the user to the feedback
// page, where the screenout is acknowledged (−5 trust score) and rated.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attempt = await prisma.surveyAttempt.findUnique({ where: { id: Number(id) } });
  if (!attempt || attempt.userId !== user.id) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.status !== "started") {
    return NextResponse.json({ error: "Attempt already finished" }, { status: 409 });
  }

  await prisma.surveyAttempt.update({
    where: { id: attempt.id },
    data: { status: "screenout", completedAt: new Date() },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      event: "survey_screenout",
      detail: `attempt=${attempt.id} survey=${attempt.surveyId}`,
    },
  });

  return NextResponse.json({ ok: true, redirect: `/feedback/${attempt.id}` });
}
