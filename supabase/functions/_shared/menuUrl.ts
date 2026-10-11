/**
 * Menu URL acceptance rules (spec section 7). Pure so they can be unit-tested without Deno.
 *
 * A URL is accepted as "verified" only when it lives on the restaurant's own website domain
 * (or a subdomain of it). Anything else is rejected rather than stored as unverified,
 * because the schema has no pending state and a wrong menu link is worse than none.
 */

const MAX_URL_LENGTH = 2048;

export type MenuUrlCheck =
  | { ok: true; url: string }
  | { ok: false; reason: string };

function hostOf(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function checkMenuUrl(candidate: string, restaurantWebsite: string | null): MenuUrlCheck {
  const trimmed = candidate.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_URL_LENGTH) {
    return { ok: false, reason: 'Enter a valid menu link.' };
  }

  const candidateHost = hostOf(trimmed);
  if (!candidateHost) return { ok: false, reason: 'The link must start with http:// or https://.' };

  if (!restaurantWebsite) {
    return { ok: false, reason: 'This restaurant has no website on file to verify the link against.' };
  }
  const siteHost = hostOf(restaurantWebsite);
  if (!siteHost) return { ok: false, reason: 'This restaurant has no usable website on file.' };

  const sameSite = candidateHost === siteHost || candidateHost.endsWith(`.${siteHost}`);
  if (!sameSite) {
    return { ok: false, reason: 'The link must be on the restaurant’s own website.' };
  }

  return { ok: true, url: new URL(trimmed).toString() };
}
