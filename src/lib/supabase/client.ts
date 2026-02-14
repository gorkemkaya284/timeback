import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';
import { requireSupabaseEnv } from '@/lib/env';

/**
 * Creates a Supabase browser client.
 * Throws a developer-friendly error if env vars are missing.
 */
export function createClient() {
  const { url, anonKey } = requireSupabaseEnv();

  return createBrowserClient<Database>(url, anonKey);
}
