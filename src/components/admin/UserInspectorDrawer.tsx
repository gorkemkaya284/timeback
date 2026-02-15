'use client';

import { useState, useEffect, useCallback } from 'react';

type Summary = { user_id: string; risk_max_24h: number | null; risk_max_7d: number | null; blocks_24h: number | null; blocks_7d: number | null; last_risk_at: string | null; last_ip: string | null; last_user_agent: string | null } | null;
type Assessment = { id: string; entity_type: string; entity_id: string; risk_score: number; flags: string[]; recommended_action: string; details: unknown; created_at: string };
type SecEvent = { id: string; event_type: string; ip: string; user_agent: string; country: string | null; created_at: string; metadata: unknown };
type Redemption = { id: string; status: string; cost_points: number; payout_tl: number; created_at: string; note: string | null };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

function RiskBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-gray-400 text-xs">–</span>;
  const level = score >= 70 ? 'high' : score >= 30 ? 'medium' : 'low';
  const cls = level === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : level === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{score}</span>;
}

export default function UserInspectorDrawer({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'overview' | 'risk' | 'events'>('overview');
  const [summary, setSummary] = useState<Summary>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [events, setEvents] = useState<SecEvent[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchRisk = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/risk`, { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setSummary(data.summary ?? null);
        setAssessments(data.risk_assessments ?? []);
        setEvents(data.security_events ?? []);
        setRedemptions(data.redemptions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchRisk();
  }, [userId, fetchRisk]);

  const copyUserId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      setToast('User ID kopyalandı');
      setTimeout(() => setToast(null), 2000);
    }
  };

  if (!userId) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" aria-hidden onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-lg z-50 bg-white dark:bg-gray-900 shadow-xl flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">User Inspector</h3>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{userId}</p>
            <div className="flex items-center gap-2 mt-2">
              <RiskBadge score={summary?.risk_max_24h ?? null} />
              {summary?.last_ip && <span className="text-xs text-gray-600 dark:text-gray-300">IP: {summary.last_ip}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={copyUserId} className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500">
              Copy user id
            </button>
            <button type="button" onClick={onClose} className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">✕</button>
          </div>
        </div>
        {toast && <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm">{toast}</div>}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {(['overview', 'risk', 'events'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {t === 'overview' ? 'Overview' : t === 'risk' ? 'Risk Assessments' : 'Security Events'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Yükleniyor…</p>
          ) : (
            <>
              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500 dark:text-gray-400">risk_max_24h</span><br /><RiskBadge score={summary?.risk_max_24h ?? null} /></div>
                    <div><span className="text-gray-500 dark:text-gray-400">risk_max_7d</span><br /><RiskBadge score={summary?.risk_max_7d ?? null} /></div>
                    <div><span className="text-gray-500 dark:text-gray-400">blocks_24h</span><br /><span className="font-medium">{summary?.blocks_24h ?? 0}</span></div>
                    <div><span className="text-gray-500 dark:text-gray-400">blocks_7d</span><br /><span className="font-medium">{summary?.blocks_7d ?? 0}</span></div>
                    <div className="col-span-2"><span className="text-gray-500 dark:text-gray-400">last_ip</span><br /><span className="font-mono text-xs">{summary?.last_ip ?? '–'}</span></div>
                  </div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Son redemptions</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead><tr className="text-left text-gray-500"><th className="pb-1 pr-2">Tarih</th><th className="pb-1 pr-2">Status</th><th className="pb-1">P / Puan</th></tr></thead>
                      <tbody>
                        {redemptions.slice(0, 10).map((r) => (
                          <tr key={r.id}><td className="pr-2">{formatDate(r.created_at)}</td><td className="pr-2">{r.status}</td><td>{r.payout_tl} TL / {r.cost_points} P</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {redemptions.length === 0 && <p className="text-sm text-gray-500">Redemption yok</p>}
                </div>
              )}
              {tab === 'risk' && (
                <div className="space-y-2">
                  {assessments.map((a) => (
                    <div key={a.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-xs">
                      <div className="flex justify-between"><span>{formatDate(a.created_at)}</span><RiskBadge score={a.risk_score} /></div>
                      <div>action: <span className="font-medium">{a.recommended_action}</span> · flags: {Array.isArray(a.flags) ? a.flags.join(', ') : '–'}</div>
                      {Boolean(a.details) && (
                        <pre className="mt-1 overflow-x-auto text-[10px]">
                          {JSON.stringify(a.details ?? null, null, 2).slice(0, 500)}
                        </pre>
                      )}
                    </div>
                  ))}
                  {assessments.length === 0 && <p className="text-sm text-gray-500">Assessment yok</p>}
                </div>
              )}
              {tab === 'events' && (
                <div className="space-y-2">
                  {events.map((e) => (
                    <div key={e.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-xs">
                      <div className="flex justify-between"><span>{e.event_type}</span><span className="text-gray-500">{formatDate(e.created_at)}</span></div>
                      <div>IP: {e.ip} {e.country ? `(${e.country})` : ''}</div>
                      {e.user_agent && <div className="truncate max-w-full text-gray-500" title={e.user_agent}>{String(e.user_agent).slice(0, 80)}…</div>}
                    </div>
                  ))}
                  {events.length === 0 && <p className="text-sm text-gray-500">Event yok</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
