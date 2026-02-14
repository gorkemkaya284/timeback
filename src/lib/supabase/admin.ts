import 'server-only';
// Admin (service role) for WRITES; read client (service role or anon) for SELECTs so reads work when key missing
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { getPublicSupabaseEnv } from '@/lib/env';

/**
 * Returns service role client when SUPABASE_SERVICE_ROLE_KEY is set.
 * Use for WRITES only. Returns null when key is missing (e.g. DEV without key).
 */
export function getAdminClient(): SupabaseClient<Database> | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Returns a client for admin SELECT queries. Uses service role when available,
 * otherwise anon key so reads still work when SUPABASE_SERVICE_ROLE_KEY is missing.
 */
export function getReadClient(): SupabaseClient<Database> | null {
  const admin = getAdminClient();
  if (admin) return admin;
  const env = getPublicSupabaseEnv();
  if (!env.isValid || !env.env) return null;
  return createClient<Database>(env.env.url, env.env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** @deprecated Use getAdminClient() and check for null. Throws in DEV_MODE or when key missing. */
export function createAdminClient(): SupabaseClient<Database> {
  const client = getAdminClient();
  if (!client) {
    throw new Error('Admin Supabase client disabled in DEV MODE or SUPABASE_SERVICE_ROLE_KEY not set');
  }
  return client;
}
