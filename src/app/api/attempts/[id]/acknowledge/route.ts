import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { addScore } from "@/lib/score";

const STAR_RE = /^[0-5]$/;

// Acknowledges the survey outcome (completed or screenout) and stores the
// optional 0-5 star rating. The trust-score penalty for a screenout is applied
// exactly once — when the outcome is first acknowledged.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attempt = await prisma.surveyAttempt.findUnique({
    where: { id: Number(id) },
    include: { survey: { select: { title: true } } },
  });
  if (!attempt || attempt.userId !== user.id) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const stars = Number(body?.stars ?? 0);
  if (!STAR_RE.test(String(stars))) {
    return NextResponse.json({ error: "stars must be 0-5" }, { status: 400 });
  }

  const outcome = attempt.status === "screenout" ? "screenout" : "completed";
  if (attempt.status !== "screenout" && attempt.status !== "completed") {
    return NextResponse.json({ error: "Attempt is not finished yet" }, { status: 409 });
  }

  await prisma.surveyRating.create({
    data: {
      attemptId: attempt.id,
      surveyId: attempt.surveyId,
      userId: user.id,
      outcome,
      stars,
    },
  });

  // Acknowledging a screenout costs 5 trust points — but only once, since the
  // rating row is unique per attempt and we just created it.
  if (outcome === "screenout") {
    await addScore({
      userId: user.id,
      delta: -5,
      reason: "screenout",
      detail: `Survey #${attempt.surveyId} · ${attempt.survey.title}`,
    });
  }

  return NextResponse.json({ ok: true, outcome });
}
