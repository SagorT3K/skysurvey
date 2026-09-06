import { fetchProviderSurveys, type LiveSurvey, type ProviderDef } from "./providers";

/**
 * Short-lived per-user cache for live router surveys.
 *
 * CPX (and most routers) ask publishers to refresh their survey list every
 * ~120 seconds and never serve stale entries longer than that — inventory is
 * user-targeted and expires fast. The cache keeps dashboard reloads from
 * hammering the router API while staying inside that window.
 *
 * Live hrefs are also user-bound, so entries are only ever served back to the
 * same user id that fetched them.
 */

const TTL_MS = 110 * 1000;
const MAX_ENTRIES = 500;

type Entry = { surveys: LiveSurvey[]; expiresAt: number };

const cache = new Map<string, Entry>();

function key(providerKey: string, userId: number) {
  return `${providerKey}:${userId}`;
}

function touch(key: string, entry: Entry) {
  // Rough LRU: drop expired and oldest entries when the map grows too big.
  if (cache.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of cache) if (v.expiresAt <= now) cache.delete(k);
    while (cache.size >= MAX_ENTRIES) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
      if (!oldest) break;
      cache.delete(oldest[0]);
    }
  }
  cache.set(key, entry);
}

export async function getLiveSurveys(
  provider: ProviderDef,
  vars: { userId: number; ip: string; userAgent: string },
): Promise<{ surveys: LiveSurvey[]; error?: string }> {
  const k = key(provider.key, vars.userId);
  const hit = cache.get(k);
  if (hit && hit.expiresAt > Date.now()) return { surveys: hit.surveys };

  try {
    const surveys = await fetchProviderSurveys(provider, vars);
    touch(k, { surveys, expiresAt: Date.now() + TTL_MS });
    return { surveys };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return { surveys: hit?.surveys ?? [], error: message };
  }
}

/**
 * Looks up one live survey by provider + external id for a user, reusing the
 * cached list when warm (and refetching once when cold) so the start call
 * cannot be used to mint entry links for surveys the API never offered.
 */
export async function findLiveSurvey(
  provider: ProviderDef,
  vars: { userId: number; ip: string; userAgent: string; externalId: string },
): Promise<LiveSurvey | null> {
  let { surveys } = await getLiveSurveys(provider, vars);
  let found = surveys.find((s) => s.externalId === vars.externalId) ?? null;
  if (!found && cache.get(key(provider.key, vars.userId))) {
    // Cache was warm but the id is missing — maybe inventory rotated. One
    // forced refresh before giving up.
    cache.delete(key(provider.key, vars.userId));
    ({ surveys } = await getLiveSurveys(provider, vars));
    found = surveys.find((s) => s.externalId === vars.externalId) ?? null;
  }
  return found;
}
