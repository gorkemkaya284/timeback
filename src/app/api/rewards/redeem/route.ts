import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/dev';
import { canUserAct } from '@/lib/utils-server';
import { isValidUuid } from '@/lib/utils';

/**
 * POST /api/rewards/redeem
 * Body: { variantId: string, idempotencyKey: string, note?: string }
 * Atomik redeem: puan düş + redemption kaydı (RPC)
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    if (!(await canUserAct(user.id))) {
      return NextResponse.json({ ok: false, message: 'Hesabınız kısıtlı' }, { status: 403 });
    }

    const body = await request.json();
    const variantId = body.variantId ?? body.variant_id;
    const idempotencyKey = body.idempotencyKey ?? body.idempotency_key;
    const note = body.note ?? null;

    if (!variantId || typeof variantId !== 'string') {
      return NextResponse.json({ ok: false, message: 'variantId gerekli' }, { status: 400 });
    }
    if (!isValidUuid(variantId)) {
      return NextResponse.json(
        { ok: false, message: 'Geçersiz ödül seçeneği. Lütfen sayfayı yenileyin.', code: 'INVALID_VARIANT_ID' },
        { status: 400 }
      );
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return NextResponse.json({ ok: false, message: 'idempotencyKey gerekli' }, { status: 400 });
    }

    const supabase = await createClient();

    // Named args – signature: redeem_reward(p_variant_id uuid, p_idempotency_key text, p_note text default null)
    const { data, error } = await supabase.rpc('redeem_reward', {
      p_variant_id: variantId,
      p_idempotency_key: idempotencyKey,
      p_note: note ?? null,
    });

    if (error) {
      const err = error as { code?: string; message?: string; details?: string; hint?: string };
      console.error('Redeem RPC error:', {
        code: err.code,
        message: err.message,
        details: err.details,
        hint: err.hint,
      });
      return NextResponse.json(
        { ok: false, message: err.message ?? 'Çekim işlenemedi', code: err.code },
        { status: 500 }
      );
    }

    const raw = data as Record<string, unknown> | null;
    if (!raw) {
      return NextResponse.json({ ok: false, message: 'Beklenmeyen yanıt' }, { status: 500 });
    }

    const success = raw.success === true;
    if (!success) {
      const errCode = raw.error as string | undefined;
      const errMsg = (raw.message as string) ?? (raw.error as string) ?? 'Çekim işlenemedi';
      const status = errCode === 'INSUFFICIENT_POINTS' ? 400 : 400;
      return NextResponse.json(
        { ok: false, message: mapErrorToMessage(errCode, errMsg), code: errCode },
        { status }
      );
    }

    const redemption = {
      id: raw.redemption_id,
      status: raw.status,
      cost_points: raw.cost_points,
      payout_tl: raw.payout_tl,
      idempotent: raw.idempotent === true,
    };

    return NextResponse.json({
      ok: true,
      redemption,
      message: 'Talebin alındı (beklemede)',
    });
  } catch (err) {
    console.error('Redeem API error:', err);
    return NextResponse.json(
      { ok: false, message: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

function mapErrorToMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'INSUFFICIENT_POINTS':
      return 'Yetersiz puan';
    case 'VARIANT_INACTIVE':
      return 'Bu ödül şu an kullanılamıyor';
    case 'REWARD_INACTIVE':
      return 'Bu ödül şu an kullanılamıyor';
    case 'OUT_OF_STOCK':
      return 'Stok tükendi';
    case 'ACCOUNT_TOO_NEW':
      return 'Hesabınız henüz bu ödül için yeterince eski değil';
    case 'DAILY_LIMIT_EXCEEDED':
      return 'Günlük limit aşıldı';
    case 'VARIANT_NOT_FOUND':
      return 'Ödül bulunamadı';
    default:
      return fallback;
  }
}
