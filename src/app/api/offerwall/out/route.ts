import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/dev';
import { logSecurityEvent } from '@/lib/security-events';
import { randomUUID } from 'crypto';

const ADGEM_BASE = process.env.OFFERWALL_ADGEM_BASE_URL ?? 'https://api.adgem.com/wall';

/**
 * GET /api/offerwall/out?provider=adgem
 * Generate click_id, log offerwall_click, redirect to provider with click_id in c1 (or sub_id).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider')?.toLowerCase() ?? 'adgem';

  const clickId = randomUUID();

  const user = await getCurrentUser();
  await logSecurityEvent({
    event_type: 'offerwall_click',
    user_id: user?.id ?? null,
    metadata: { provider, click_id: clickId },
  });

  if (provider === 'adgem') {
    const base = process.env.OFFERWALL_ADGEM_BASE_URL ?? ADGEM_BASE;
    const url = new URL(base);
    url.searchParams.set('c1', clickId);
    if (user?.id) url.searchParams.set('playerid', user.id);
    return NextResponse.redirect(url.toString(), 302);
  }

  return NextResponse.json({ error: 'Unknown provider', click_id: clickId }, { status: 400 });
}
