import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/dev';
import { canUserAct } from '@/lib/utils-server';
import { isValidUuid } from '@/lib/utils';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';

/**
 * POST /api/rewards/redeem
 * Body: { variantId: string, idempotencyKey: string, note?: string }
 * Atomik redeem: puan düş + redemption kaydı (RPC)
 */
export async function POST(request: Request) {
  console.log('REDEEM_REAL_ENTRY_VERSION', 'v2026-02-15-REAL');
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
      { ok: false, message: 'Oturum açmanız gerekiyor' },
      { status: 401, headers: { 'X-REDEEM-ENTRY-VERSION': 'v2026-02-15-REAL' } }
    );
    }

    if (!(await canUserAct(user.id))) {
      return NextResponse.json(
      { ok: false, message: 'Hesabınız kısıtlı' },
      { status: 403, headers: { 'X-REDEEM-ENTRY-VERSION': 'v2026-02-15-REAL' } }
    );
    }

    const body = await request.json();
    const variantId = body.variantId ?? body.variant_id;
    const idempotencyKey = body.idempotencyKey ?? body.idempotency_key;
    const note = body.note ?? null;

    if (!variantId || typeof variantId !== 'string') {
      return NextResponse.json(
      { ok: false, message: 'variantId gerekli' },
      { status: 400, headers: { 'X-REDEEM-ENTRY-VERSION': 'v2026-02-15-REAL' } }
    );
    }
    if (!isValidUuid(variantId)) {
      return NextResponse.json(
        { ok: false, message: 'Geçersiz ödül seçeneği. Lütfen sayfayı yenileyin.', code: 'INVALID_VARIANT_ID' },
        { status: 400, headers: { 'X-REDEEM-ENTRY-VERSION': 'v2026-02-15-REAL' } }
      );
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return NextResponse.json(
      { ok: false, message: 'idempotencyKey gerekli' },
      { status: 400, headers: { 'X-REDEEM-ENTRY-VERSION': 'v2026-02-15-REAL' } }
    );
    }

    console.log('[redeem] req', { variantId, idempotencyKey, notePresent: !!note, userId: user.id });

    await logSecurityEvent({
      userId: user.id,
      eventType: 'redeem_attempt',
      metadata: { variant_id: variantId, idempotency_key: idempotencyKey },
    });

    console.log('REDEEM_ROUTE_DEBUG', {
      hasUser: !!user,
      userId: user?.id,
    });

    const supabase = await createClient();

    const { data, error } = await supabase.rpc('redeem_reward', {
      p_variant_id: variantId,
      p_idempotency_key: idempotencyKey,
      p_note: note ?? null,
    });

    console.error('[redeem] rpc result', { data, error });

    let r: Record<string, unknown> = {};
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object') r = parsed;
      } catch (_) {}
    } else if (data != null && typeof data === 'object') {
      const raw = data as Record<string, unknown>;
      if (typeof raw.message === 'string') {
        try {
          const parsed = JSON.parse(raw.message) as Record<string, unknown>;
          if (parsed && typeof parsed === 'object') r = parsed;
        } catch (_) {}
        if (Object.keys(r).length === 0) r = raw;
      } else {
        r = raw;
      }
    }

    if (error) {
      const err = error as unknown as Record<string, unknown>;
      const code = err?.code != null ? String(err.code) : null;
      const message =
        err?.message != null ? String(err.message) : err?.msg != null ? String(err.msg) : JSON.stringify(error);
      const details = err?.details != null ? String(err.details) : null;
      const hint = err?.hint != null ? String(err.hint) : null;
      await logSecurityEvent({
        userId: user.id,
        eventType: 'redeem_blocked',
        metadata: {
          variant_id: variantId,
          error: code,
          message,
          raw_response: JSON.stringify({ data: r, error: err }).slice(0, 2000),
        },
      });
      return NextResponse.json(
        { ok: false, error: { code, message, details, hint } },
        { status: 400, headers: { 'X-REDEEM-ENTRY-VERSION': 'v2026-02-15-REAL' } }
      );
    }

    const isSuccess = r?.ok === true || r?.status === 'pending';

    if (isSuccess) {
      await logSecurityEvent({
        userId: user.id,
        eventType: 'redeem_success',
        metadata: { redemption_id: r?.id ?? r?.redemption_id, variant_id: variantId },
      });
      const redemption = {
        id: r?.redemption_id ?? r?.id,
        status: r?.status,
        cost_points: r?.cost_points,
        payout_tl: r?.payout_tl,
        idempotent: r?.idempotent === true,
      };
      return NextResponse.json(
        { ok: true, redemption, message: 'Talebin alındı (beklemede)' },
        { headers: { 'X-REDEEM-ENTRY-VERSION': 'v2026-02-15-REAL' } }
      );
    }

    await logSecurityEvent({
      userId: user.id,
      eventType: 'redeem_blocked',
      metadata: {
        variant_id: variantId,
        error: r?.error != null ? String(r.error) : null,
        message: r?.message != null ? String(r.message) : null,
        raw_response: JSON.stringify(r).slice(0, 2000),
      },
    });
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: r?.error != null ? String(r.error) : null,
          message: r?.message != null ? String(r.message) : String(r?.error ?? 'Redeem failed'),
          details: (r?.details as string) ?? null,
          hint: (r?.hint as string) ?? null,
        },
      },
      { status: 400, headers: { 'X-REDEEM-ENTRY-VERSION': 'v2026-02-15-REAL' } }
    );
  } catch (e) {
    console.error('[redeem] exception', e);
    const name = e instanceof Error ? e.name : undefined;
    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    return NextResponse.json(
      { ok: false, exception: { name, message, stack } },
      { status: 500, headers: { 'X-REDEEM-ENTRY-VERSION': 'v2026-02-15-REAL' } }
    );
  }
}
