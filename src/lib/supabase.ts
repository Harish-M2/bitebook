import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { config } from '@/constants/config';
import type { Database } from '@/types/database';

const isConfigured = Boolean(config.supabaseUrl && config.supabasePublishableKey);

if (!isConfigured) {
  // Surface a clear signal during development instead of failing silently.
  console.warn(
    '[Bitebook] Missing Supabase environment variables. Copy .env.example to .env and set ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
  );
}

// `createClient` throws synchronously if the URL is empty, which would crash the whole
// app on boot before a real `.env` is ever configured. Fall back to a harmless, non-secret
// placeholder host so the client can construct; real auth/data calls will simply fail over
// the network until EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY are set for real.
const supabaseUrl = config.supabaseUrl || 'https://placeholder.supabase.co';
const supabasePublishableKey = config.supabasePublishableKey || 'placeholder-anon-key';

/**
 * Shared Supabase client. Only the public URL and publishable (anon) key are used here —
 * both are safe for the client bundle. Never add service-role or other private keys.
 */
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
