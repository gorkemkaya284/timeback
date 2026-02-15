# Timeback — End-to-End Security & Production Readiness Audit

**Scope:** Next.js App Router + Supabase. Focus: correctness, fraud safety, admin ops, production readiness.  
**Process:** Codebase search (auth, RPC, API routes, migrations). Supabase policies/RPC not in repo are marked **unverified** with exact checks to run.

---

## A) Top 10 Highest-Risk Issues

### 1. [CRITICAL] AdGem postback has no signature/secret verification — self-credit possible

**Rationale:** Anyone can POST/GET to `/api/postback/adgem` with arbitrary `user_id`, `transaction_id`, `points`/`payout_tl`. Server stores the event and calls `credit_offerwall_event` → points are credited. Attacker can credit their own account.

**Files:** `src/app/api/postback/adgem/route.ts` (handlePostback, no auth/signature check).

**Reproduce:**  
`curl "https://<host>/api/postback/adgem?user_id=<victim_uuid>&transaction_id=unique123&points=10000&status=approved"`  
→ Event stored, then credited if `OFFERWALL_CREDIT_ENABLED=true` or user in `OFFERWALL_TEST_ALLOWLIST`.

**Fix:**
1. Obtain AdGem postback secret/signature docs and add verification (e.g. HMAC of params with shared secret, or signed token).
2. Reject request with 400/403 before inserting into `offerwall_events` if signature invalid.
3. Optionally: rate-limit by IP and/or `transaction_id` to reduce replay/brute-force.
4. Until then: keep `OFFERWALL_CREDIT_ENABLED=false` in production or restrict credit to a small test allowlist and never expose that list.

---

### 2. [CRITICAL] Bulk redemption update RPC invoked from browser with anon client — admin check unverified

**Rationale:** `AdminRedemptionsTable.tsx` calls `supabase.rpc('admin_bulk_update_redemption_status', { p_ids, p_to_status, p_note })` using `createClient()` from `@/lib/supabase/client` (browser, anon + user JWT). If the RPC does not enforce “caller is admin”, any logged-in user could bulk approve/reject any redemptions.

**Files:**  
- `src/components/admin/AdminRedemptionsTable.tsx` (lines ~156, ~317: `createClient()` then `rpc('admin_bulk_update_redemption_status', ...)`).  
- **RPC definition not found in repo** (no migration defines `admin_bulk_update_redemption_status`).

**Reproduce:** Log in as non-admin, open admin redemptions page (if route is reachable), or call from browser console:  
`(await createClient()).rpc('admin_bulk_update_redemption_status', { p_ids: ['<redemption_id>'], p_to_status: 'approved', p_note: null })`.

**Fix:**
1. **Verify in Supabase:** In SQL editor run `\df admin_bulk_update_redemption_status` (or inspect function). Confirm the function body checks that `auth.uid()` is in `public.admins` (or equivalent) and returns an error otherwise. If it does not, treat as critical.
2. **Preferred:** Move bulk update to server: add `POST /api/admin/redemptions/bulk` that uses `getAdminClient()` and calls the RPC server-side (or replicates logic with service role). Remove RPC call from client; client only calls this API. Then the RPC can remain “admin-only” or be removed in favor of server-only updates.
3. If RPC stays callable by anon: add explicit guard at top of RPC, e.g.  
   `IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN RETURN jsonb_build_object('ok', false, 'message', 'Forbidden'); END IF;`

---

### 3. [HIGH] Single redemption approve API does not reject `note = 'risk_block'` (or high-risk) rows

**Rationale:** UI disables “Onayla” for locked rows (risk_block, risk_score ≥ 80, multi_account_same_ip), but the API only requires `status = 'pending'`. So a direct API call can approve a risk-blocked redemption.

**Files:** `src/app/api/admin/redemptions/[id]/approve/route.ts` — update uses `.eq('id', id).eq('status', 'pending')` only; no check on `note` or risk.

**Reproduce:**  
`POST /api/admin/redemptions/<id>/approve` with admin session for a redemption that has `note = 'risk_block'` or risk_score ≥ 80. It will be approved.

**Fix:**  
Before updating, fetch the row (or add a condition) and reject if `row.note === 'risk_block'` or if you have risk_score/risk_flags in the row and they indicate locked (e.g. risk_score >= 80 or `multi_account_same_ip` in flags). Return 400 with a clear message. Optionally enforce the same in DB with a trigger or inside an “approve” RPC that only allows non-blocked rows.

---

### 4. [HIGH] Offerwall postback has no replay protection

**Rationale:** Same `transaction_id` is idempotent (upsert/unique), but if the provider sends duplicates or an attacker replays a captured request, idempotency is by `(provider, transaction_id)`. So replay with same transaction_id is safe; replay with a new transaction_id would create a new event and credit again. Without signature, an attacker can generate unlimited new transaction_ids and credit repeatedly.

**Files:** `src/app/api/postback/adgem/route.ts`.

**Fix:** Signature verification (see #1) plus optional rate limiting per `user_id` or IP to cap damage. Replay of the same request is already handled by DB unique constraint.

---

### 5. [MEDIUM] Dual audit tables — `audit_log` vs `tb_admin_audit_log`; `audit_log` not in migrations

**Rationale:** Approve/reject and audit API use `tb_admin_audit_log`. `writeAuditLog()` in `admin-audit.ts` writes to `audit_log`. Migrations only create `tb_admin_audit_log`. If `audit_log` does not exist, ledger adjust and other actions that call `writeAuditLog` will fail at insert (or the table exists outside repo and may diverge).

**Files:**  
- `src/lib/admin-audit.ts` — `client.from('audit_log').insert(...)`.  
- `src/app/api/admin/ledger/adjust/route.ts`, `src/app/api/admin/ledger/route.ts`, `src/app/api/admin/users/route.ts`, `src/app/api/postback/offerwall/route.ts` — call `writeAuditLog`.  
- `supabase/migrations/20250231000000_security_risk_audit_tables.sql` — creates `tb_admin_audit_log` only.

**Fix:**
1. Confirm in DB whether `audit_log` exists and has the schema expected by `writeAuditLog` (actor, action, target_type, target_id, payload).
2. Either: (a) migrate to a single audit table (e.g. use `tb_admin_audit_log` for all admin actions and update `writeAuditLog` to insert there with a compatible shape), or (b) add a migration that creates `audit_log` and document when to use which table.
3. Ensure all admin actions that should be audited either go through `writeAuditLog` or write to `tb_admin_audit_log` consistently.

---

### 6. [MEDIUM] Admin check in production relies on `DEV_MODE` and `admins` table; no RPC-level enforcement for sensitive RPCs

**Rationale:** `allowAdminAccess()` uses `DEV_MODE=true` → always admin; else `admins` table or `ADMIN_EMAILS` env. API routes correctly call `allowAdminAccess` before using service role. However, any RPC callable with anon (e.g. `admin_bulk_update_redemption_status` from client) must enforce admin inside DB; otherwise a leaked or forged JWT is not enough to bypass API but could still call RPC if exposed.

**Files:** `src/lib/utils-server.ts` (allowAdminAccess). All admin API routes use it; bulk RPC is called from client (see #2).

**Fix:** Ensure every RPC that performs admin-only mutations checks `auth.uid()` in `public.admins` (or equivalent) and returns an error if not. Prefer moving admin mutations to server-only API routes that use service role.

---

### 7. [MEDIUM] `offerwall_events` table has no RLS

**Rationale:** If RLS is disabled, any role with table access could in theory modify it. Postback handler uses service role (bypasses RLS). Risk is lower because the only writer is your server, but for defense-in-depth, sensitive tables should have RLS with a “service role only” policy so anon/authenticated cannot insert/update.

**Files:** `supabase/migrations/20250215000000_offerwall_events.sql` — no RLS. No later migration found enabling RLS on `offerwall_events`.

**Fix:** Add migration:  
`ALTER TABLE public.offerwall_events ENABLE ROW LEVEL SECURITY;`  
Then add policy allowing only service_role (e.g. `USING (auth.jwt() ->> 'role' = 'service_role')` for ALL). So only server (service role) can write; anon cannot.

---

### 8. [MEDIUM] Rewards list API uses service role key

**Rationale:** `GET /api/rewards/route.ts` uses `createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)`. Public read of active rewards could use anon client and RLS (e.g. `rewards_select_active` / `reward_variants_select_active`). Using service role broadens blast radius if the route is ever misused or key leaks.

**Files:** `src/app/api/rewards/route.ts` (lines 46–57).

**Fix:** Use server createClient (anon) for this route so RLS applies. Only use service role where necessary (admin, postback, server-only writes).

---

### 9. [LOW] Reject flow writes ledger with `ref_id: id` (redemption UUID); idempotency not enforced

**Rationale:** Reject inserts into `points_ledger` with `ref_type: 'redeem_reversal'`, `ref_id: id` (redemption id). There is no unique on `(ref_type, ref_id)` for this pair, so duplicate reject calls could insert multiple reversal credits. Idempotency for reject is desirable (e.g. unique on ref_type+ref_id for this case, or “reject” implemented in an RPC that does redemption update + ledger insert in one transaction with a single reversal per redemption).

**Files:** `src/app/api/admin/redemptions/[id]/reject/route.ts` (lines 65–75).

**Fix:** Either: (a) Add a unique constraint (or partial unique) for `ref_type = 'redeem_reversal'` and `ref_id` (redemption id), and handle 23505 by treating as already reversed; or (b) Implement reject in an RPC that checks “if already rejected, skip ledger insert” and returns success.

---

### 10. [LOW] Rate limiting missing on redeem and postback

**Rationale:** No application-level rate limit on `POST /api/rewards/redeem` or `/api/postback/adgem`. Redeem is protected by RPC idempotency and balance checks but can be used to probe or stress the system; postback can be abused for self-credit (see #1). Rate limiting reduces brute-force and abuse surface.

**Files:** `src/app/api/rewards/redeem/route.ts`, `src/app/api/postback/adgem/route.ts` — no rate limit.

**Fix:** Add rate limiting (e.g. Vercel/server middleware or a small in-memory/store per IP and per user_id): e.g. max N redeem requests per user per minute, max M postback requests per IP per minute. Document limits and consider making redeem limits consistent with `can_redeem` daily limits.

---

## B) Per-issue: Files, reproduction, fix summary

| # | Severity | Location | Reproduce | Fix (short) |
|---|----------|----------|-----------|-------------|
| 1 | Critical | `src/app/api/postback/adgem/route.ts` | GET/POST postback with fake user_id/transaction_id/points | Add signature verification; keep credit off or allowlist-only until then |
| 2 | Critical | `AdminRedemptionsTable.tsx` + RPC (not in repo) | Call RPC from browser as non-admin | Verify RPC enforces admin; prefer moving bulk to API and calling from server |
| 3 | High | `src/app/api/admin/redemptions/[id]/approve/route.ts` | POST approve for risk_block redemption | Reject when note='risk_block' or risk indicates locked |
| 4 | High | `src/app/api/postback/adgem/route.ts` | Replay with new transaction_id | Signature + optional rate limit |
| 5 | Medium | `src/lib/admin-audit.ts`, ledger/user/postback routes | Call ledger adjust and check logs | Unify to one audit table or create `audit_log` in migration |
| 6 | Medium | `utils-server.ts` + all admin RPCs | — | Ensure admin RPCs check admins table |
| 7 | Medium | `supabase/migrations/20250215000000_offerwall_events.sql` | — | Enable RLS, service_role-only policy on offerwall_events |
| 8 | Medium | `src/app/api/rewards/route.ts` | — | Use anon server client for GET rewards |
| 9 | Low | `src/app/api/admin/redemptions/[id]/reject/route.ts` | POST reject twice for same id | Idempotent reversal (unique or RPC) |
| 10 | Low | redeem + postback routes | — | Add rate limits per user/IP |

---

## C) Next 7 Days Hardening Plan (priority order, max 10)

1. **Postback security (Day 1–2)**  
   - Add AdGem signature/secret verification to `/api/postback/adgem`.  
   - Keep `OFFERWALL_CREDIT_ENABLED=false` in prod until verification is in place.  
   - Optionally add IP or user_id rate limit for postback.

2. **Bulk update safety (Day 1)**  
   - In Supabase, inspect `admin_bulk_update_redemption_status`: confirm it checks `auth.uid()` in `public.admins`.  
   - If not: add guard in RPC or (preferred) add `POST /api/admin/redemptions/bulk` that uses service role and call it from the UI instead of client RPC.

3. **Single approve guard (Day 2)**  
   - In approve route, load redemption (or add condition) and return 400 if `note === 'risk_block'` or risk_score ≥ 80 / flags include `multi_account_same_ip`.

4. **Audit table consistency (Day 2–3)**  
   - Confirm `audit_log` exists and schema; unify with `tb_admin_audit_log` or add migration for `audit_log` and document usage.

5. **RLS on offerwall_events (Day 3)**  
   - Migration: enable RLS on `offerwall_events`, policy FOR ALL USING (service_role only).

6. **Rewards API client (Day 3)**  
   - Switch `GET /api/rewards` to server anon client so RLS applies.

7. **Rate limiting (Day 4–5)**  
   - Add rate limit for `POST /api/rewards/redeem` (per user) and for `/api/postback/adgem` (per IP).

8. **Reject idempotency (Day 5)**  
   - Make reject reversal idempotent (unique on ref_type+ref_id for redeem_reversal or RPC).

9. **RLS verification pass (Day 6)**  
   - Dump or list RLS policies for: points_ledger, tb_reward_redemptions, tb_rewards, tb_reward_variants, tb_security_events, tb_risk_assessments, offerwall_events, admin_actions, admins. Ensure “users see only own” where required and admin-only tables are service_role-only. Fix any missing or permissive policies.

10. **Env and key hygiene (Day 7)**  
    - Confirm no `SUPABASE_SERVICE_ROLE_KEY` in client bundle (search build output).  
    - Confirm Vercel prod/preview use correct env (URL + anon for client; service role only on server).  
    - Document that `DEV_MODE=true` disables real admin check.

---

## D) Quick Wins (≤5) — “System in hand” for admins, low risk

1. **Dashboard “pending count” and link**  
   - Admin dashboard already has pending count; ensure the “Beklemede” / pending count is visible and links to `/app/admin/redemptions?status=pending` so admins can jump straight to the queue.

2. **Audit page single source**  
   - Audit UI already reads `tb_admin_audit_log`. Ensure all admin actions (approve, reject, bulk, ledger adjust) write to `tb_admin_audit_log` (or the same table the audit page uses) so one screen shows full history. Resolves dual-table confusion over time.

3. **Redemptions list “last 24h” filter**  
   - Add optional query `?since=24h` (or similar) to GET `/api/admin/redemptions` and wire a “Son 24 saat” tab or filter in the table so admins can focus on recent items without changing status filter.

4. **Health check for critical RPCs**  
   - Add a minimal system-check or admin-only endpoint that calls `redeem_reward` with a no-op variant (or can_redeem) and expects a known error (e.g. VARIANT_NOT_FOUND or INSUFFICIENT_POINTS) to confirm DB and RPC are reachable. No balance or real data changed.

5. **Locked reason in tooltip**  
   - You already show “Locked” and lock reason in risk column/tooltip; ensure the same reason is visible on the row tooltip and in the “Kilitli” badge title so admins know why a row is locked without opening another panel.

---

## Unverified / Missing in repo (to confirm in Supabase)

- **RLS policies** for: points_ledger, tb_reward_redemptions, tb_rewards, tb_reward_variants, tb_security_events, tb_risk_assessments, offerwall_events, admin_actions, admins, tb_admin_audit_log.  
  **How:** In Supabase SQL: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public';` or export from Dashboard → Database → Policies. Compare to “users see own rows” and “admin tables service_role only”.

- **Function `admin_bulk_update_redemption_status`** body and whether it checks `auth.uid()` in admins.  
  **How:** `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'admin_bulk_update_redemption_status';`

- **Table `audit_log`** existence and columns.  
  **How:** `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_log';`

- **points_ledger** NOT NULL and unique constraints (type, ref_type+ref_id partial unique).  
  **How:** `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.points_ledger'::regclass;`

- **Table name consistency:** Redeem uses `tb_reward_redemptions` / `tb_reward_variants`. Some code uses `reward_variants` (system-check/redeem), `reward_redemptions` (withdrawals, dashboard, rewards page). Confirm in DB; prefer migrating to `tb_*` consistently.

- **Chargeback/reversal** handling: no explicit “chargeback” or “reversal” flow found beyond reject (which credits back). If offerwall has chargebacks, document and implement a dedicated path (e.g. debit + note) and idempotency.

---

## Summary

- **Critical:** Secure AdGem postback (signature/secret); verify or move bulk redemption update so it cannot be called by non-admins.  
- **High:** Block approve for risk_block/high-risk redemptions in API; add replay/signal protection for postback.  
- **Medium:** Unify audit logging, add RLS on offerwall_events, use anon client for public rewards GET, enforce admin in RPCs.  
- **Low:** Reject idempotency, rate limiting.  
- **Quick wins:** Single audit source, pending link, optional 24h filter, RPC health check, locked-reason tooltips.

All changes should be minimal and tied to real risk; no refactors suggested except where they close the gaps above.
