import { prisma } from "./prisma";

export type NotifyType =
  | "survey"
  | "screenout"
  | "referral"
  | "payout"
  | "voucher"
  | "crypto"
  | "level"
  | "hold"
  | "coins";

/**
 * Creates an in-app notification for the user. Failures must never break the
 * calling flow — best effort by design.
 */
export async function notify(opts: {
  userId: number;
  type: NotifyType;
  title: string;
  body?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body ?? "",
      },
    });
  } catch (error) {
    console.error("notify failed", error);
  }
}
