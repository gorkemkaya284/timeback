/**
 * Server-side logout: clears Supabase auth cookies so the session is fully ended.
 * Call this before redirecting the client to /auth/login to fix logout loops.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true') {
      console.error('[auth] Server logout error:', e);
    }
    return NextResponse.json({ ok: false, error: 'Logout failed' }, { status: 500 });
  }
}
