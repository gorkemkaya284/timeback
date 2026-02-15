/**
 * Server-side admin data: KPIs and lists. Uses getReadClient() so SELECTs work
 * with service role or anon (reads work when SUPABASE_SERVICE_ROLE_KEY is missing).
 * Uses tb_reward_redemptions and tb_admin_audit_log.
 */

import { getReadClient } from '@/lib/supabase/admin';

export type AdminOverview = {
  totalUsers: number;
  totalPointsIssued: number;
  totalPointsSpent: number;
  pendingRedemptions: number;
  recentAudit: Array<{
    id: string;
    admin_user_id: string;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
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
    client.from('tb_reward_redemptions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    client.from('tb_admin_audit_log').select('id, admin_user_id, action, entity_type, entity_id, created_at').order('created_at', { ascending: false }).limit(10),
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

  const recentAudit = (auditRes.data || []).map((r: { id: string; admin_user_id: string; action: string; entity_type: string | null; entity_id: string | null; created_at: string }) => ({
    id: r.id,
    admin_user_id: r.admin_user_id,
    action: r.action,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
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
