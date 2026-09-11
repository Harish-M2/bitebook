/**
 * Maps a provider's own category vocabulary onto the Bitebook cuisine taxonomy
 * (`public.cuisines`, seeded in 0023).
 *
 * This lives in the provider layer, not the database, because it is inherently
 * provider-specific: Google's `indian_restaurant` and some future provider's `Indian` are
 * both inputs to the same nineteen slugs, and the database should only ever see the slugs.
 *
 * Two rules throughout:
 *
 * 1. **An unrecognised category maps to nothing.** It is tempting to fall back to `fusion`
 *    so every restaurant gets a chip, but `fusion` means something — inventing it for a
 *    steakhouse is worse than leaving the cuisine unknown, because a wrong cuisine is
 *    undiscoverable-by-filter *and* actively misleading, while an absent one is only the
 *    former.
 * 2. **Generic categories are not cuisines.** `restaurant`, `bar`, `cafe`, `fast_food` and
 *    friends say nothing about what the food is, so they are deliberately absent rather
 *    than mapped to something plausible.
 */

/** Every slug in `public.cuisines`. Anything not in here must never be emitted. */
const KNOWN_SLUGS = new Set([
  'indian',
  'italian',
  'japanese',
  'chinese',
  'thai',
  'korean',
  'mexican',
  'american',
  'british',
  'french',
  'mediterranean',
  'middle-eastern',
  'spanish',
  'greek',
  'vietnamese',
  'turkish',
  'caribbean',
  'african',
  'fusion',
]);

/**
 * Google Places (New) `types` / `primaryType` values.
 *
 * Several entries are judgement calls rather than translations, and are marked as such:
 * a ramen or sushi place is Japanese, a steakhouse is American in the sense the taxonomy
 * uses the word, and a pizzeria is Italian. These are the associations a user filtering by
 * cuisine would expect, which is the only thing the mapping is for.
 */
const GOOGLE_TYPE_TO_SLUG: Record<string, string> = {
  afghani_restaurant: 'middle-eastern',
  african_restaurant: 'african',
  american_restaurant: 'american',
  barbecue_restaurant: 'american',
  brazilian_restaurant: 'american',
  chinese_restaurant: 'chinese',
  french_restaurant: 'french',
  greek_restaurant: 'greek',
  hamburger_restaurant: 'american',
  indian_restaurant: 'indian',
  indonesian_restaurant: 'thai',
  italian_restaurant: 'italian',
  japanese_restaurant: 'japanese',
  korean_restaurant: 'korean',
  lebanese_restaurant: 'middle-eastern',
  mediterranean_restaurant: 'mediterranean',
  mexican_restaurant: 'mexican',
  middle_eastern_restaurant: 'middle-eastern',
  // Judgement call: a pizzeria is what most people mean by "Italian" on a filter chip.
  pizza_restaurant: 'italian',
  ramen_restaurant: 'japanese',
  spanish_restaurant: 'spanish',
  steak_house: 'american',
  sushi_restaurant: 'japanese',
  thai_restaurant: 'thai',
  turkish_restaurant: 'turkish',
  vietnamese_restaurant: 'vietnamese',
};

/**
 * Last resort for providers that give only free text, and for names that are their own
 * description ("Sushi Tetsu"). Matched as whole words against a lowercased haystack, so
 * "thai" does not fire on "Thailand Express"… but more importantly does not fire on the
 * "thai" inside another word.
 *
 * Ordered longest-first at use, so "middle eastern" is tested before "eastern" could ever
 * match something else.
 */
const KEYWORD_TO_SLUG: Record<string, string> = {
  indian: 'indian',
  curry: 'indian',
  tandoori: 'indian',
  italian: 'italian',
  pizza: 'italian',
  pasta: 'italian',
  trattoria: 'italian',
  japanese: 'japanese',
  sushi: 'japanese',
  ramen: 'japanese',
  izakaya: 'japanese',
  chinese: 'chinese',
  'dim sum': 'chinese',
  szechuan: 'chinese',
  sichuan: 'chinese',
  thai: 'thai',
  korean: 'korean',
  mexican: 'mexican',
  taqueria: 'mexican',
  taco: 'mexican',
  american: 'american',
  barbecue: 'american',
  bbq: 'american',
  burger: 'american',
  steakhouse: 'american',
  british: 'british',
  french: 'french',
  bistro: 'french',
  brasserie: 'french',
  mediterranean: 'mediterranean',
  'middle eastern': 'middle-eastern',
  'middle-eastern': 'middle-eastern',
  lebanese: 'middle-eastern',
  persian: 'middle-eastern',
  spanish: 'spanish',
  tapas: 'spanish',
  greek: 'greek',
  souvlaki: 'greek',
  vietnamese: 'vietnamese',
  pho: 'vietnamese',
  turkish: 'turkish',
  kebab: 'turkish',
  meze: 'turkish',
  caribbean: 'caribbean',
  jamaican: 'caribbean',
  african: 'african',
  ethiopian: 'african',
  nigerian: 'african',
  fusion: 'fusion',
};

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Slugs implied by free text, e.g. a restaurant's name or a provider's keyword list. */
export function cuisineSlugsFromText(...parts: (string | null | undefined)[]): string[] {
  const haystack = parts.filter(Boolean).join(' ').toLowerCase();
  if (haystack.length === 0) return [];

  const found = new Set<string>();

  // Longest phrase first so "middle eastern" is consumed before "eastern" is considered.
  const keywords = Object.keys(KEYWORD_TO_SLUG).sort((a, b) => b.length - a.length);

  for (const keyword of keywords) {
    // Word boundaries matter: without them "thai" matches inside unrelated words, and a
    // single wrong chip is more damaging than a missing one.
    if (new RegExp(`\\b${escapeForRegExp(keyword)}\\b`).test(haystack)) {
      found.add(KEYWORD_TO_SLUG[keyword]);
    }
  }

  return [...found];
}

/**
 * Slugs for a Google place.
 *
 * `primaryType` is trusted over `types`: Google lists every applicable type, so a Japanese
 * restaurant that also serves coffee carries `cafe`, and an Italian one inside a hotel
 * carries `lodging`. Taking the primary first keeps the most-specific answer at the front.
 */
export function cuisineSlugsFromGoogleTypes(
  types: string[] | undefined,
  primaryType: string | undefined,
): string[] {
  const ordered = [primaryType, ...(types ?? [])].filter(
    (value): value is string => typeof value === 'string',
  );

  const found: string[] = [];
  for (const type of ordered) {
    const slug = GOOGLE_TYPE_TO_SLUG[type];
    if (slug && !found.includes(slug)) {
      found.push(slug);
    }
  }
  return found;
}

/**
 * Final gate before anything reaches the database.
 *
 * The import RPC silently ignores slugs it cannot resolve, so an unknown value would fail
 * invisibly; filtering here means the provider layer is the only thing that has to know the
 * taxonomy, and a typo shows up in a test rather than as a missing chip in production.
 *
 * Capped at three: a restaurant tagged with six cuisines is not usefully filterable, and
 * Google in particular will happily return a long tail of loosely applicable types.
 */
export function sanitiseCuisineSlugs(slugs: string[]): string[] {
  return [...new Set(slugs.filter((slug) => KNOWN_SLUGS.has(slug)))].slice(0, 3);
}
