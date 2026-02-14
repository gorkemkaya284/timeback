import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from './admin';
import { DEV_USER_ID } from '@/lib/devUser';

/**
 * Ensures a profile exists for the given user ID. Optionally set email if column exists.
 * Idempotent - safe to call multiple times.
 * Prefers service role; falls back to provided server client (user session) when admin is null.
 */
export async function ensureProfile(
  userId: string,
  email?: string | null,
  serverClient?: SupabaseClient | null
): Promise<void> {
  const supabase = getAdminClient() ?? serverClient ?? null;
  if (!supabase) return;

  const row: { user_id: string; risk_score: number; is_banned: boolean; email?: string } = {
    user_id: userId,
    risk_score: 0,
    is_banned: false,
  };
  if (email != null && email !== '') row.email = email;

  const { error } = await supabase
    .from('profiles')
    .upsert(row, {
      onConflict: 'user_id',
      ignoreDuplicates: false,
    });

  if (error) {
    console.warn('Profile upsert warning (non-blocking):', error);
  }
}

/**
 * Ensures the DEV user has a profiles row when in DEV MODE. Call from admin layout.
 * Idempotent; no-op when service role key is missing.
 */
export async function ensureDevProfile(): Promise<void> {
  const isDev =
    process.env.NODE_ENV === 'development' ||
    process.env.DEV_MODE === 'true' ||
    process.env.NEXT_PUBLIC_DEV_MODE === 'true';
  if (!isDev) return;
  await ensureProfile(DEV_USER_ID);
}
