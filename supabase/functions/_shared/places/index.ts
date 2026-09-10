/**
 * Provider selection. The only place in the codebase that knows which provider is in use.
 *
 * Selection is by configuration, never by request parameter: letting a client choose its
 * provider would let it choose the cheap fake one and poison the catalogue with fixture
 * rows.
 */

import { FixturePlacesProvider } from './fixture.ts';
import { GooglePlacesProvider } from './google.ts';
import type { PlacesProvider } from './types.ts';

export type { NormalisedPlace, PlaceSearchParams, PlacesProvider } from './types.ts';
export { PlacesRequestError } from './types.ts';

let cached: PlacesProvider | null = null;

/**
 * Returns the configured provider, falling back to fixtures when no key is set.
 *
 * Falling back rather than throwing is deliberate for a pre-launch app: a developer with no
 * Google account can still run the whole log-a-dish flow. The trade-off is that a
 * production deploy which loses its secret degrades silently to eight fake London
 * restaurants instead of erroring, so `PLACES_PROVIDER=google` can be set to make the real
 * provider mandatory and turn that into a startup failure.
 */
export function getPlacesProvider(): PlacesProvider {
  if (cached) return cached;

  const requested = Deno.env.get('PLACES_PROVIDER')?.trim().toLowerCase();
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')?.trim();

  if (requested === 'fixture') {
    cached = new FixturePlacesProvider();
  } else if (apiKey) {
    cached = new GooglePlacesProvider(apiKey);
  } else if (requested === 'google') {
    throw new Error(
      'PLACES_PROVIDER=google but GOOGLE_PLACES_API_KEY is not set. ' +
        'Set the secret, or unset PLACES_PROVIDER to fall back to fixtures.',
    );
  } else {
    console.warn(
      '[places] GOOGLE_PLACES_API_KEY is not set — using the fixture provider. ' +
        'Search results are a fixed offline list, not real restaurants.',
    );
    cached = new FixturePlacesProvider();
  }

  return cached;
}
