import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getWalletSummary } from "@/lib/ledger";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import SurveyFeedback from "@/components/SurveyFeedback";

export const dynamic = "force-dynamic";

// Post-survey landing: celebrates a completion or apologises for a screenout,
// collects the optional star rating, and ackowledges the outcome.
export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const attempt = await prisma.surveyAttempt.findUnique({
    where: { id: Number(id) },
    include: { survey: { select: { title: true } } },
  });
  if (!attempt || attempt.userId !== user.id) notFound();
  if (attempt.status !== "completed" && attempt.status !== "screenout") redirect("/dashboard");

  // Already acknowledged — no second feedback for the same attempt.
  const existing = await prisma.surveyRating.findUnique({ where: { attemptId: attempt.id } });
  if (existing) redirect("/dashboard");

  const wallet = await getWalletSummary(user.id);

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-cream">
      <AppHeader active="surveys" balance={wallet.balance} />
      <div className="flex-1">
        <SurveyFeedback
          attemptId={attempt.id}
          outcome={attempt.status === "screenout" ? "screenout" : "completed"}
          coins={attempt.coinsCredited}
          surveyTitle={attempt.survey.title}
        />
      </div>
      <AppFooter variant="app" />
    </main>
  );
}
