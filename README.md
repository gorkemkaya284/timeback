# Timeback

A clean, long-term reward platform MVP.

## Tech Stack

- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)
- `ADMIN_EMAILS` (comma-separated list of admin emails)

Optional:
- `ADGEM_POSTBACK_SECRET` – if set, AdGem postback requires matching `sig` or `signature` param

### Security, risk, fulfillment

- `CRON_SECRET` – required for `/api/cron/fulfill` (Vercel Cron: `Authorization: Bearer <CRON_SECRET>`).
- `OFFERWALL_ADGEM_BASE_URL` – base URL for offerwall redirect (default: `https://api.adgem.com/wall`). Used by `/api/offerwall/out?provider=adgem`; `c1` = click_id, `playerid` = user id.
- Provider allowlist / postback signature: validate in your postback handler (e.g. AdGem); invalid source can be logged and optionally set `invalid_source` in risk metadata.

3. Run the database migrations:
   - Copy the SQL from `supabase/schema.sql`
   - Run it in your Supabase SQL editor

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

- `/src/app` - Next.js App Router pages
- `/src/components` - Reusable React components
- `/src/lib` - Utilities and Supabase client
- `/src/types` - TypeScript type definitions
- `/supabase` - Database schema and migrations

## Security & risk layer

- **Security events:** `tb_security_events` stores login, offerwall_click, redeem_attempt, redeem_success, redeem_blocked, admin_action. Server logs via `logSecurityEvent()`; IP/UA from headers; optional `X-Device-Fingerprint` header or `device_fingerprint` cookie (MVP).
- **Risk:** `assess_risk(entity_type, entity_id)` runs after offerwall credit and after each redeem; result in `tb_risk_assessments`. Block → redemption rejected and debit reversed in same transaction.
- **Rate limit:** `can_redeem(user_id, variant_id, cost_points)` enforces new-user (1 redeem/day, 50 TL/day) and level-based daily caps (Level 1: 50 TL, 2: 150 TL, 3: 500 TL). Called inside `redeem_reward`.
- **Fulfillment:** Admin Approve creates a row in `tb_fulfillment_jobs`. Cron `GET /api/cron/fulfill` (with `CRON_SECRET`) processes queued jobs and sets redemption to `fulfilled`.

### How to test

1. **Redeem flow:** Redeem as user → security event `redeem_attempt` then `redeem_success` or `redeem_blocked`; `tb_risk_assessments` has one row per redemption; if risk = block, response is `RISK_BLOCKED` and no debit.
2. **Concurrency:** With one variant `stock_remaining = 1`, fire two simultaneous redeems; only one should succeed.
3. **Admin:** Approve a pending redemption → fulfillment job created; call `/api/cron/fulfill` with correct `Authorization` → redemption becomes `fulfilled`.
4. **Reject:** Reject pending → ledger credit (reversal) and `tb_admin_audit_log` entry.
