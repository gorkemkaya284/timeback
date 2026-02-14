import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database.types';

const SECRET_KEYS = ['sig', 'signature', 'secret', 'key', 'password', 'token'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizePayloadForLog(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    const keyLower = k.toLowerCase();
    if (SECRET_KEYS.some((sk) => keyLower.includes(sk))) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = v;
    }
  }
  return out;
}

function extractString(payload: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && !isNaN(v)) return String(v);
  }
  return '';
}

function extractNumber(payload: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === 'number' && !isNaN(v)) return Math.floor(v);
    if (typeof v === 'string') {
      const n = parseInt(v, 10);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

function parsePayload(request: Request): Promise<Record<string, unknown>> {
  const url = new URL(request.url);
  if (request.method === 'GET') {
    const params: Record<string, unknown> = {};
    url.searchParams.forEach((v, k) => {
      params[k] = v;
    });
    return Promise.resolve(params);
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return request.json().then((json) => {
      if (typeof json === 'object' && json !== null) return json as Record<string, unknown>;
      return { _raw: String(json) };
    }).catch(() => ({ _parseError: 'Invalid JSON' }));
  }

  if (contentType.includes('multipart/form-data')) {
    return request.formData().then((fd) => {
      const params: Record<string, unknown> = {};
      fd.forEach((v, k) => { params[k] = typeof v === 'string' ? v : (v as File).name || ''; });
      return params;
    }).catch(() => ({}));
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return request.text().then((text) => {
      const params: Record<string, unknown> = {};
      try {
        new URLSearchParams(text).forEach((v, k) => { params[k] = v; });
      } catch {
        return {};
      }
      return params;
    }).catch(() => ({}));
  }

  return request.text().then((text) => {
    if (!text.trim()) return {};
    try {
      const json = JSON.parse(text);
      return typeof json === 'object' && json !== null ? json : { _raw: text };
    } catch {
      const params: Record<string, unknown> = {};
      try {
        new URLSearchParams(text).forEach((v, k) => { params[k] = v; });
      } catch {
        return {};
      }
      return Object.keys(params).length > 0 ? params : {};
    }
  }).catch(() => ({}));
}

const okResponse = () =>
  new NextResponse('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });

export async function GET(request: Request) {
  return handlePostback(request);
}

export async function POST(request: Request) {
  return handlePostback(request);
}

async function handlePostback(request: Request) {
  try {
    const payload = await parsePayload(request);
    const sanitized = sanitizePayloadForLog(payload);
    console.log('[AdGem postback]', JSON.stringify(sanitized));

    const userIdRaw = extractString(payload, ['user_id', 'subid', 'uid']);
    const transactionId = extractString(payload, ['transaction_id', 'txid', 'tid']);
    const rewardPoints = extractNumber(payload, ['points', 'reward', 'amount']);
    const status = extractString(payload, ['status', 'event']);

    const userId = userIdRaw && UUID_REGEX.test(userIdRaw) ? userIdRaw : null;

    const adminClient = getAdminClient();
    if (!adminClient) {
      console.warn('[AdGem postback] SUPABASE_SERVICE_ROLE_KEY not set; event not stored');
      return okResponse();
    }

    if (transactionId) {
      const { data: existing } = await adminClient
        .from('offerwall_events')
        .select('id')
        .eq('provider', 'adgem')
        .eq('transaction_id', transactionId)
        .maybeSingle();

      if (existing) {
        return okResponse();
      }
    }

    const rawPayload: Json = Object.keys(payload).length > 0 ? (payload as Json) : {};

    const { error } = await adminClient.from('offerwall_events').insert({
      provider: 'adgem',
      user_id: userId,
      transaction_id: transactionId || null,
      status: status || null,
      reward_points: rewardPoints,
      raw_payload: rawPayload,
    });

    if (error) {
      if (error.code === '23505') {
        return okResponse();
      }
      if (error.code === '42P01') {
        console.warn('[AdGem postback] Table offerwall_events missing. Run supabase_offerwall_events.sql');
      } else {
        console.error('[AdGem postback] Insert error:', error.message);
      }
    }

    return okResponse();
  } catch (err) {
    console.error('[AdGem postback] Error:', err);
    return okResponse();
  }
}
