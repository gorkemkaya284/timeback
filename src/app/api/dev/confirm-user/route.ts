/**
 * DEV ONLY — REMOVE OR DISABLE BEFORE PRODUCTION.
 * Auto-confirms newly created Supabase users when email confirmation is required and emails don't arrive.
 * Body: { email: string } (or { userId: string } for direct lookup). Never allow in production.
 * Only available when DEV_MODE=true; returns 404 otherwise.
 */

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  // Only allow when DEV_MODE is explicitly true — otherwise 404 (do not leak that the route exists)
  if (process.env.DEV_MODE !== 'true') {
    return new NextResponse(null, { status: 404 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Service role key missing' },
      { status: 503 }
    );
  }

  let body: { email?: string; userId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const email = typeof body.email === 'string' ? body.email.trim() : undefined;
  const userId = typeof body.userId === 'string' ? body.userId.trim() : undefined;

  if (!email && !userId) {
    return NextResponse.json(
      { error: 'Body must include email (or userId)' },
      { status: 400 }
    );
  }

  let targetId: string;

  if (userId) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    targetId = data.user.id;
  } else {
    // Look up by email via listUsers and find matching user
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      return NextResponse.json(
        { error: error.message ?? 'Failed to list users' },
        { status: 500 }
      );
    }
    const user = data?.users?.find((u) => u.email?.toLowerCase() === email?.toLowerCase());
    if (!user) {
      return NextResponse.json(
        { error: 'User not found for this email' },
        { status: 404 }
      );
    }
    targetId = user.id;
  }

  const { data, error } = await admin.auth.admin.updateUserById(targetId, {
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to confirm user' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
