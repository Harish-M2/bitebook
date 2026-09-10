/**
 * HTTP helpers shared by the Edge Functions.
 *
 * CORS is needed because the app runs on web as well as native; `supabase.functions.invoke`
 * from a browser preflights every POST.
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

/**
 * Resolves the caller's user from the Authorization header.
 *
 * These functions are deployed with JWT verification on, so a malformed token never reaches
 * us — but verification does not distinguish a user token from the anon key, and the anon
 * key is embedded in the app. Checking for an actual user is what stops an unauthenticated
 * caller from burning the provider quota.
 */
export async function requireUser(
  request: Request,
): Promise<{ userId: string } | { error: Response }> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return { error: errorResponse('Missing Authorization header', 401) };
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return { error: errorResponse('Invalid or expired session', 401) };
  }

  return { userId: data.user.id };
}

/**
 * Service-role client. Used only to call `upsert_restaurant_from_place`, which is not
 * granted to `authenticated` precisely so that this is the only way in.
 */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
