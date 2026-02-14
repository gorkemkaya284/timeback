import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/utils';

/**
 * Returns false if user is banned (profiles.is_banned = true). Use in APIs before
 * allowing earn, redeem, or other user actions.
 */
export async function canUserAct(userId: string): Promise<boolean> {
  const admin = getAdminClient();
  const supabase = admin ?? await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('is_banned')
    .eq('user_id', userId)
    .maybeSingle();
  return !(data?.is_banned === true);
}

/**
 * When DEV_MODE=true: always true. When DEV_MODE=false: true if user is in public.admins
 * or in ADMIN_EMAILS env. Uses admins table first (Option 1), then ADMIN_EMAILS (Option 2).
 */
export async function allowAdminAccess(user: { id: string; email: string } | null): Promise<boolean> {
  if (process.env.DEV_MODE === 'true' || process.env.NEXT_PUBLIC_DEV_MODE === 'true') return true;
  if (!user) return false;

  try {
    const admin = getAdminClient();
    if (admin) {
      const { data } = await admin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
      if (data) return true;
    }
  } catch {
    // ignore
  }
  return isAdminEmail(user.email);
}
