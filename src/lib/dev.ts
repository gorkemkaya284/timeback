import 'server-only';
// DEV_MODE: when true, auth is bypassed and mock user is used. Default is false.
import { createClient } from '@/lib/supabase/server';
import { DEV_USER_ID, DEV_USER } from '@/lib/devUser';

/** Only true when explicitly set to "true" in env. Default is false. */
export const DEV_MODE =
  process.env.DEV_MODE === 'true' || process.env.NEXT_PUBLIC_DEV_MODE === 'true';

export const MOCK_USER_ID = DEV_USER_ID;
export const MOCK_USER = DEV_USER;

export type AuthUser = { id: string; email: string };

/**
 * Returns current user: in DEV_MODE the fixed mock user; otherwise the Supabase session user.
 * Returns null when not in DEV_MODE and there is no session.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (DEV_MODE) return DEV_USER;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.email ?? '',
    };
  } catch {
    return null;
  }
}
