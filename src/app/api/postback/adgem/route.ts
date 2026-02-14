import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database.types';

const SECRET_KEYS = ['sig', 'signature', 'secret', 'key', 'password', 'token'];

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

async function parsePayload(request: Request): Promise<Record<string, unknown>> {
  const url = new URL(request.url);
  if (request.method === 'GET') {
    const params: Record<string, unknown> = {};
    url.searchParams.forEach((v, k) => {
      params[k] = v;
    });
    return params;
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const json = await request.json();
      return typeof json === 'object' && json !== null ? json : { _raw: String(json) };
    } catch {
      return { _parseError: 'Invalid JSON' };
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    const params: Record<string, unknown> = {};
    new URLSearchParams(text).forEach((v, k) => {
      params[k] = v;
    });
    return params;
  }

  try {
    const text = await request.text();
    if (!text.trim()) return {};
    try {
      const json = JSON.parse(text);
      return typeof json === 'object' && json !== null ? json : { _raw: text };
    } catch {
      const params: Record<string, unknown> = {};
      new URLSearchParams(text).forEach((v, k) => {
        params[k] = v;
      });
      return Object.keys(params).length > 0 ? params : { _raw: text };
    }
  } catch {
    return {};
  }
}

const okResponse = () => new NextResponse('OK', {
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

    const secret = process.env.ADGEM_POSTBACK_SECRET;
    if (secret) {
      const sig = (payload.sig ?? payload.signature) as string | undefined;
      const received = typeof sig === 'string' ? sig.trim() : '';
      if (received !== secret) {
        console.warn('[AdGem postback] Signature mismatch or missing');
        return okResponse();
      }
    }

    const transactionId = (payload.transaction_id ?? payload.txid ?? '') as string;
    const userId = (payload.user_id ?? payload.uid ?? payload.sub_id ?? '') as string;

    const adminClient = getAdminClient();
    if (adminClient && transactionId) {
      const { data: existing } = await adminClient
        .from('offerwall_events')
        .select('id')
        .eq('provider', 'adgem')
        .eq('transaction_id', transactionId)
        .maybeSingle();

      if (existing) {
        return okResponse();
      }

      const { error } = await adminClient.from('offerwall_events').insert({
        provider: 'adgem',
        user_id: userId || null,
        transaction_id: transactionId,
        raw_payload: payload as Json,
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
    }

    return okResponse();
  } catch (err) {
    console.error('[AdGem postback] Error:', err);
    return okResponse();
  }
}
