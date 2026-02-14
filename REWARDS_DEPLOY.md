# Ödül (Rewards) Sistemi — Deploy Adımları

## Yapılan Değişiklikler

### A) DB migration
- `supabase/migrations/20250225000000_rewards_system_v2.sql`
- Eski `rewards` ve `redemptions` tabloları kaldırıldı
- Yeni tablolar: `rewards`, `reward_variants`, `reward_redemptions`, `admin_actions`
- RLS kuralları ve `redeem_reward` RPC
- Seed: Timeback Dijital Ödül (50/100 TL), Banka Havalesi (300 TL)

### B) API
- `POST /api/rewards/redeem` — variantId, idempotencyKey, note
- Admin: `GET/POST /api/admin/rewards`, `PATCH /api/admin/rewards/:id`
- Admin: `POST /api/admin/reward-variants`, `PATCH /api/admin/reward-variants/:id`
- Admin: `GET /api/admin/redemptions?status=pending`
- Admin: `POST /api/admin/redemptions/:id/approve`, `.../reject` (puan iadesi ile)

### C) UI
- `/app/rewards` — yeni variant tabanlı liste + redeem
- `/app/admin/rewards` — rewards + variants CRUD
- `/app/admin/redemptions` — pending listesi, approve/reject

---

## Deploy Komutları

```bash
# 1. DB migration
supabase db push

# 2. Build doğrulama
pnpm lint
pnpm typecheck   # varsa
pnpm build

# 3. Git
git add -A
git commit -m "Add rewards system with redeem + admin approvals"
git push origin main
```

## Kurallar
- 1P = 0.01 TL → cost_points = denomination_tl × 100
- Havale her zaman PENDING başlar, admin onayı ile tamamlanır
- Red durumunda puanlar otomatik iade edilir
- İdempotency: aynı `idempotency_key` ile tekrar istek double redeem oluşturmaz
