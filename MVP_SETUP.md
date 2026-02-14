# Timeback MVP Setup Guide

## ✅ Completed Tasks

### Task A — Database SQL
Created `supabase.sql` with:
- ✅ `public.profiles` table (user_id, created_at, risk_score, is_banned)
- ✅ `public.points_ledger` table (id bigserial, user_id references profiles, delta, reason, ref_type, ref_id, created_at)
- ✅ `public.rewards` table (id bigserial, title, points_cost, stock, status)
- ✅ `public.redemptions` table (id bigserial, user_id, reward_id, points_spent, status, created_at)
- ✅ Indexes for efficient queries
- ✅ RLS policies (commented, ready to enable)
- ✅ **Atomic `redeem_reward()` Postgres function** for safe redemptions

### Task B — Profile Auto-Creation
- ✅ `ensureProfile()` function in `src/lib/supabase/profile.ts` (idempotent)
- ✅ Called from `/app` layout on every authenticated access
- ✅ Also called from dashboard and rewards pages as safety net
- ✅ Uses upsert to prevent duplicates

### Task C — Dashboard Real Data
- ✅ Dashboard computes points from ledger: `SUM(delta) WHERE user_id = ?`
- ✅ Shows last 10 ledger entries with reason and date
- ✅ Handles empty state gracefully

### Task D — Atomic Redeem Flow
- ✅ `POST /api/redemptions/create` uses Postgres `redeem_reward()` function
- ✅ Function performs all steps atomically:
  1. Fetches reward with row lock
  2. Computes user points from ledger
  3. Validates points >= cost and stock >= 1
  4. Creates redemption record
  5. Inserts ledger entry (deducts points)
  6. Decrements stock
- ✅ Prevents double-spending and race conditions
- ✅ Returns clear error messages

### Task E — UI States
- ✅ Success message on redemption ("✓ Redeemed!")
- ✅ Error messages displayed clearly
- ✅ Empty states handled (no rewards, no transactions)
- ✅ Loading states during redemption
- ✅ No crashes on empty tables

## Setup Instructions

### 1. Run Database Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the entire contents of `supabase.sql`
4. Paste and run it
5. Verify tables were created in **Table Editor**

### 2. Test the MVP

1. **Login** - Profile will be auto-created
2. **Dashboard** - Should show 0 points (no ledger entries yet)
3. **Rewards** - Will show empty state (no rewards in DB yet)

### 3. Add Test Data (Optional)

To test the redeem flow, add a test reward:

```sql
INSERT INTO public.rewards (title, points_cost, stock, status)
VALUES ('Test Reward', 100, 10, 'active');
```

Add some test points to a user:

```sql
-- Replace USER_ID with your actual user ID from auth.users
INSERT INTO public.points_ledger (user_id, delta, reason)
VALUES ('USER_ID', 500, 'Test points');
```

### 4. Test Redemption Flow

1. Go to `/app/rewards`
2. Click "Redeem" on a reward
3. Should see success message
4. Dashboard should show updated points
5. Reward stock should decrement

## Key Features

### Points System
- **Single source of truth**: Points are NEVER stored, always computed from `points_ledger`
- **Full auditability**: Every transaction is recorded with reason and timestamp
- **Atomic operations**: Redemptions use Postgres function to prevent race conditions

### Profile Management
- **Auto-creation**: Profile created automatically on first `/app/*` access
- **Idempotent**: Safe to call multiple times, no duplicates

### Redemption Safety
- **Atomic function**: All steps happen in one transaction
- **Row locking**: Prevents concurrent modifications
- **Validation**: Checks points, stock, and user status before processing
- **Error handling**: Clear error messages for all failure cases

## File Structure

```
supabase.sql                    # Database schema + atomic function
src/lib/supabase/profile.ts    # Profile auto-creation helper
src/app/app/layout.tsx         # Calls ensureProfile()
src/app/app/dashboard/page.tsx # Shows computed points + ledger
src/app/app/rewards/page.tsx   # Lists rewards, handles empty state
src/app/api/redemptions/create/route.ts  # Atomic redeem endpoint
src/components/rewards/RedeemButton.tsx  # UI with success/error states
```

## Next Steps (Future)

- Add offerwall integrations
- Add admin panel for managing rewards
- Add payment processing
- Add referral system

The MVP is now ready for testing! 🎉
