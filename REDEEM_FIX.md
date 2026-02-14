# redeem_reward Fonksiyon Hatası — Çözüm

## Hata
`Could not find the function public.redeem_reward(p_idempotency_key, p_note, p_variant_id) in the schema cache`

## 1) DB'de Fonksiyon Kontrolü

Supabase SQL Editor'da çalıştır:

```sql
-- supabase/sql/check_redeem_reward.sql
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'redeem_reward';
```

Fonksiyon yoksa veya imza uyuşmuyorsa devam et.

## 2) Migration ile Fonksiyon Oluşturma

```bash
supabase db push
```

Bu komut `20250227000000_redeem_reward_ensure.sql` migration'ını çalıştırır ve imzayı şöyle ayarlar:
`redeem_reward(p_variant_id uuid, p_idempotency_key text, p_note text default null)`

## 3) Supabase Schema Cache Yenileme

Supabase Dashboard: **Settings > API > Reload schema cache**

## 4) Next.js RPC Çağrısı

`src/app/api/rewards/redeem/route.ts` zaten named args kullanıyor:
```ts
supabase.rpc('redeem_reward', {
  p_variant_id: variantId,
  p_idempotency_key: idempotencyKey,
  p_note: note ?? null,
});
```

## Deploy Adımları

```bash
pnpm build
git add -A
git commit -m "Fix redeem_reward RPC: ensure function + named args + error logging"
git push origin main
```
