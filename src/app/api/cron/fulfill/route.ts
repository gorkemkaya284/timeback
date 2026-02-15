import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/cron/fulfill
 * Vercel Cron: process queued fulfillment jobs (simulate fulfillment -> status=fulfilled).
 * Protected by CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const now = new Date().toISOString();

  const { data: jobs, error: fetchErr } = await admin
    .from('tb_fulfillment_jobs')
    .select('id, redemption_id, attempts')
    .in('status', ['queued', 'processing'])
    .lte('next_run_at', now)
    .lt('attempts', 5)
    .limit(10);

  if (fetchErr) {
    console.error('[cron/fulfill] fetch', fetchErr);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const list = (jobs ?? []) as { id: string; redemption_id: string; attempts: number }[];
  let processed = 0;

  for (const job of list) {
    const { error: upJob } = await admin
      .from('tb_fulfillment_jobs')
      .update({ status: 'processing', updated_at: now })
      .eq('id', job.id)
      .eq('status', 'queued');

    if (upJob) continue;

    const { error: upRed } = await admin
      .from('tb_reward_redemptions')
      .update({ status: 'fulfilled', fulfilled_at: now })
      .eq('id', job.redemption_id)
      .eq('status', 'approved');

    if (upRed) {
      const nextRun = new Date();
      nextRun.setSeconds(nextRun.getSeconds() + Math.min(60 * Math.pow(2, job.attempts), 3600));
      await admin
        .from('tb_fulfillment_jobs')
        .update({
          status: 'queued',
          attempts: job.attempts + 1,
          last_error: upRed.message,
          next_run_at: nextRun.toISOString(),
          updated_at: now,
        })
        .eq('id', job.id);
      continue;
    }

    await admin
      .from('tb_fulfillment_jobs')
      .update({ status: 'success', updated_at: now })
      .eq('id', job.id);
    processed++;
  }

  return NextResponse.json({ ok: true, processed, total: list.length });
}
