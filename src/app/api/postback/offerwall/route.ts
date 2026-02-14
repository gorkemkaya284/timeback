import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { canUserAct } from '@/lib/utils-server';
import { writeAuditLog } from '@/lib/admin-audit';
import { parseOfferwallPayload } from '@/lib/offerwall/parsers';
import type { Database, Json } from '@/types/database.types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(s: string): boolean {
  return UUID_REGEX.test(s);
}

/**
 * POST /api/postback/offerwall
 *
 * Offerwall conversion callback. Credits user points for completed offers.
 * - Requires OFFERWALL_POSTBACK_SECRET in query (?secret=...) or header (X-Offerwall-Secret)
 * - Idempotent: duplicate transaction_id returns 200 without re-crediting
 * - Logs to offer_conversions and points_ledger
 */
export async function POST(request: Request) {
  try {
    const secret = process.env.OFFERWALL_POSTBACK_SECRET;
    if (!secret || secret.length < 16) {
      return NextResponse.json({ error: 'Postback not configured' }, { status: 503 });
    }

    const url = new URL(request.url);
    const querySecret = url.searchParams.get('secret');
    const headerSecret = request.headers.get('x-offerwall-secret');
    const receivedSecret = querySecret ?? headerSecret ?? '';

    if (receivedSecret !== secret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    const provider = process.env.OFFERWALL_PROVIDER ?? 'default';
    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Body must be JSON object' }, { status: 400 });
    }

    const parsed = parseOfferwallPayload(provider, body);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid payload: missing or invalid user_id, transaction_id, or reward_points' },
        { status: 400 }
      );
    }

    if (!isValidUuid(parsed.userId)) {
      return NextResponse.json({ error: 'Invalid user_id: must be UUID' }, { status: 400 });
    }

    if (parsed.rewardPoints < 1) {
      return NextResponse.json({ error: 'reward_points must be positive' }, { status: 400 });
    }

    if (!(await canUserAct(parsed.userId))) {
      return NextResponse.json({ error: 'User is banned' }, { status: 403 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const txId = `${provider}:${parsed.transactionId}`;

    const { data: existing } = await adminClient
      .from('offer_conversions')
      .select('id')
      .eq('provider', provider)
      .eq('transaction_id', parsed.transactionId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already credited' });
    }

    const insertPayload: Database['public']['Tables']['offer_conversions']['Insert'] = {
      provider,
      user_id: parsed.userId,
      transaction_id: parsed.transactionId,
      offer_id: parsed.offerId ?? null,
      reward_points: parsed.rewardPoints,
      raw_payload: (parsed.rawPayload ?? null) as Json | null,
    };
    const { data: conversion, error: insertError } = await adminClient
      .from('offer_conversions')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true, message: 'Already credited' });
      }
      return NextResponse.json(
        { error: 'Failed to record conversion', details: insertError.message },
        { status: 500 }
      );
    }

    const { error: ledgerError } = await adminClient.from('points_ledger').insert({
      user_id: parsed.userId,
      delta: parsed.rewardPoints,
      reason: `Offerwall: ${provider}${parsed.offerId ? ` (${parsed.offerId})` : ''}`,
      ref_type: 'offerwall',
      ref_id: conversion?.id ? String(conversion.id) : txId,
    });

    if (ledgerError) {
      return NextResponse.json(
        { error: 'Failed to credit points', details: ledgerError.message },
        { status: 500 }
      );
    }

    await writeAuditLog({
      actor: `offerwall:${provider}`,
      action: 'offerwall_credit',
      target_type: 'offer_conversion',
      target_id: conversion?.id ? String(conversion.id) : txId,
      payload: {
        user_id: parsed.userId,
        transaction_id: parsed.transactionId,
        reward_points: parsed.rewardPoints,
        offer_id: parsed.offerId,
      },
    });

    return NextResponse.json({
      success: true,
      conversion_id: conversion?.id,
      reward_points: parsed.rewardPoints,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
