/**
 * Admin audit log: write every admin action for accountability.
 * Requires getAdminClient() (service role). No-op when admin client is disabled (e.g. DEV without key).
 */

import { getAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database.types';

export type AuditAction =
  | 'ban_user'
  | 'unban_user'
  | 'adjust_risk_score'
  | 'credit_points'
  | 'debit_points'
  | 'create_reward'
  | 'update_reward'
  | 'redemption_fulfilled'
  | 'redemption_rejected'
  | 'offerwall_credit';

export async function writeAuditLog(params: {
  actor: string;
  action: AuditAction | string;
  target_type?: string;
  target_id?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const client = getAdminClient();
  if (!client) return;

  await client.from('audit_log').insert({
    actor: params.actor,
    action: params.action,
    target_type: params.target_type ?? null,
    target_id: params.target_id ?? null,
    payload: (params.payload ?? null) as Json | null,
  });
}
