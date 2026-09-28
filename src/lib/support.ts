/**
 * The address users write to when something is wrong.
 *
 * It is shown in the footer, on the legal pages and inside the transactional
 * emails, so it lives in one place. This is deliberately the same inbox the app
 * sends from (see mailer.ts): a reply to a verification or reset email then
 * reaches a human instead of bouncing off a no-reply address.
 */
export const SUPPORT_EMAIL = "skysurvey.support@gmail.com";