/**
 * Server-side admin data: KPIs and lists. Uses getReadClient() so SELECTs work
 * with service role or anon (reads work when SUPABASE_SERVICE_ROLE_KEY is missing).
 */

import { getReadClient } from '@/lib/supabase/admin';

export type AdminOverview = {
  totalUsers: number;
  totalPointsIssued: number;
  totalPointsSpent: number;
  pendingRedemptions: number;
  recentAudit: Array<{
    id: string;
    actor: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    payload: unknown;
    created_at: string;
  }>;
};

const emptyOverview: AdminOverview = {
  totalUsers: 0,
  totalPointsIssued: 0,
  totalPointsSpent: 0,
  pendingRedemptions: 0,
  recentAudit: [],
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const client = getReadClient();
  if (!client) return emptyOverview;

  const [profilesRes, ledgerRes, redemptionsRes, auditRes] = await Promise.all([
    client.from('profiles').select('user_id', { count: 'exact', head: true }),
    client.from('points_ledger').select('delta'),
    client.from('reward_redemptions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    client.from('audit_log').select('*').order('created_at', { ascending: false }).limit(10),
  ]);

  let totalUsers = 0;
  if (profilesRes.count != null) totalUsers = profilesRes.count;

  let totalPointsIssued = 0;
  let totalPointsSpent = 0;
  if (ledgerRes.data) {
    for (const row of ledgerRes.data) {
      if (row.delta > 0) totalPointsIssued += row.delta;
      else totalPointsSpent += Math.abs(row.delta);
    }
  }

  let pendingRedemptions = 0;
  if (redemptionsRes.count != null) pendingRedemptions = redemptionsRes.count;

  const recentAudit = (auditRes.data || []).map((r) => ({
    id: r.id,
    actor: r.actor,
    action: r.action,
    target_type: r.target_type,
    target_id: r.target_id,
    payload: r.payload,
    created_at: r.created_at,
  }));

  return {
    totalUsers,
    totalPointsIssued,
    totalPointsSpent,
    pendingRedemptions,
    recentAudit,
  };
}
