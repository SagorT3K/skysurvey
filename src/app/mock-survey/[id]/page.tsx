import { notFound, redirect } from "next/navigation";
import { Clock, Coins } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import CompleteMockSurvey from "@/components/CompleteMockSurvey";

export const dynamic = "force-dynamic";

// Stand-in for the real survey provider page.
// With a live router (TrayiStats/CPX/BitLabs) users are sent to the provider's URL instead,
// and completions arrive via server-to-server postback.
export default async function MockSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const attempt = await prisma.surveyAttempt.findUnique({
    where: { id: Number(id) },
    include: { survey: true },
  });
  if (!attempt || attempt.userId !== user.id) notFound();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-coffee-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
          Demo provider · {attempt.survey.provider}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-coffee-900">{attempt.survey.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} aria-hidden="true" />~{attempt.survey.loiMinutes} minutes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Coins size={14} className="text-coffee-500" aria-hidden="true" />
            Reward: {Math.floor((attempt.cpiCents * 70) / 100)} coins
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((q) => (
            <div key={q} className="rounded-xl border border-coffee-200 p-4">
              <p className="font-medium text-stone-800">
                {q}. Sample question {q} — please select an option
              </p>
              <div className="mt-3 space-y-2 text-sm text-stone-600">
                {["Option A", "Option B", "Option C"].map((o) => (
                  <label key={o} className="flex items-center gap-2">
                    <input type="radio" name={`q${q}`} /> {o}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <CompleteMockSurvey attemptId={attempt.id} disabled={attempt.status !== "started"} />
      </div>
    </main>
  );
}
