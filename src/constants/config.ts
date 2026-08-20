/**
 * Bitebook non-secret client configuration.
 *
 * Only ever read `EXPO_PUBLIC_*` environment variables here — those are the only
 * ones safe to expose in the client bundle. Never add service-role keys or other
 * private credentials to this file or to `EXPO_PUBLIC_*` variables.
 */
export const config = {
  appName: 'Bitebook',
  tagline: 'Log it. Rate it. Remember it.',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
} as const;
