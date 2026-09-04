import { prisma } from "./prisma";

// Trust score: starts at 100. Level 1 = 100-199, level 2 = 200-299, and so on
// (the level never drops below 1 even when the score goes to 0). Each level
// above 1 adds +2% to the effective survey share, each drop takes it back.
export const LEVEL_STEP = 100;
export const LEVEL_SHARE_BONUS = 2;

export function levelFromScore(score: number) {
  return Math.max(1, Math.floor(score / LEVEL_STEP));
}

export function effectiveSharePercent(baseShare: number, score: number) {
  const level = levelFromScore(score);
  return baseShare + (level - 1) * LEVEL_SHARE_BONUS;
}

export function levelProgress(score: number) {
  const level = levelFromScore(score);
  const into = Math.max(0, score - level * LEVEL_STEP);
  return { level, into, needed: LEVEL_STEP, pct: Math.min(100, Math.round(into / LEVEL_STEP) * 100) };
}

/**
 * Applies a score delta (clamped so the score never goes below 0), records a
 * ScoreEvent for the audit trail, and returns the level before/after.
 */
export async function addScore(opts: {
  userId: number;
  delta: number;
  reason: string;
  detail?: string;
}): Promise<{ score: number; level: number; prevLevel: number; leveledUp: boolean; dropped: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { score: true },
  });
  if (!user) return { score: 0, level: 1, prevLevel: 1, leveledUp: false, dropped: false };

  const prevLevel = levelFromScore(user.score);
  const score = Math.max(0, user.score + opts.delta);

  await prisma.$transaction([
    prisma.user.update({ where: { id: opts.userId }, data: { score } }),
    prisma.scoreEvent.create({
      data: {
        userId: opts.userId,
        delta: opts.delta,
        reason: opts.reason,
        detail: opts.detail ?? "",
      },
    }),
  ]);

  const level = levelFromScore(score);
  return {
    score,
    level,
    prevLevel,
    leveledUp: level > prevLevel,
    dropped: level < prevLevel,
  };
}
