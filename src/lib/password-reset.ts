import { SUPPORT_EMAIL } from "./support";

/**
 * Password-reset email. The code primitives (newCode, hashCode, codeMatches) are
 * shared with signup verification — only the wording differs, so both flows read
 * alike in the inbox and in the server log.
 */

/** The email carrying the reset code. Short, plain-text friendly, no links. */
export function passwordResetEmail(code: string, ttlMinutes: number) {
  const text =
    `Your SkySurvey password reset code is ${code}.\n\n` +
    `Enter it on the reset page to choose a new password. The code expires in ${ttlMinutes} minutes.\n\n` +
    `If you did not ask to reset your password you can ignore this email — your current password still works. ` +
    `Need help? Write to ${SUPPORT_EMAIL}.`;
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1917">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px">
      <h1 style="margin:0 0 8px;font-size:20px">Reset your password</h1>
      <p style="margin:0 0 20px;color:#57534e;font-size:14px">Enter this code on the reset page to choose a new SkySurvey password.</p>
      <p style="margin:0 0 20px;font-size:34px;font-weight:700;letter-spacing:8px">${code}</p>
      <p style="margin:0 0 12px;color:#78716c;font-size:13px">The code expires in ${ttlMinutes} minutes. If you did not ask to reset your password, you can ignore this email — your current password still works.</p>
      <p style="margin:0;color:#78716c;font-size:13px">Need help? Write to <a href="mailto:${SUPPORT_EMAIL}" style="color:#7c2d12">${SUPPORT_EMAIL}</a>.</p>
    </div>
  </body>
</html>`;
  return { text, html };
}

/**
 * Sent after a successful reset. Best effort: a user who did not make the change
 * learns about it in the inbox they control, which is the only warning they get —
 * sessions are signed for 7 days and cannot be revoked server-side.
 */
export function passwordChangedEmail() {
  const text =
    `Your SkySurvey password was changed.\n\n` +
    `If this was you, nothing else is needed — you are signed in already.\n\n` +
    `If it was not you, write to ${SUPPORT_EMAIL} straight away so we can secure the account.`;
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f5f4;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1917">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px">
      <h1 style="margin:0 0 8px;font-size:20px">Your password was changed</h1>
      <p style="margin:0 0 16px;color:#57534e;font-size:14px">Your SkySurvey password has just been changed and you have been signed in on this device.</p>
      <p style="margin:0;color:#78716c;font-size:13px">If this was not you, write to <a href="mailto:${SUPPORT_EMAIL}" style="color:#7c2d12">${SUPPORT_EMAIL}</a> straight away so we can secure the account.</p>
    </div>
  </body>
</html>`;
  return { text, html };
}