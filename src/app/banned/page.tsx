import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BannedContent from './BannedContent';

/**
 * Banned page: shown when profiles.is_banned = true.
 * Requires auth; redirects to login if not authenticated.
 */
export default async function BannedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login?redirect=/banned');
  }

  return <BannedContent />;
}
