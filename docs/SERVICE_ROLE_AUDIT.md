# Service role kullanım audit özeti

## 1) Aranan stringler ve bulgular

### SUPABASE_SERVICE_ROLE_KEY
| Dosya | Kod (2–6 satır) | Ortam |
|-------|------------------|--------|
| `src/app/api/admin/redemptions/route.ts` | `const key = process.env.SUPABASE_SERVICE_ROLE_KEY;` / `if (!url \|\| !key) return null` | server (API route) |
| `src/app/api/admin/redemptions/stats/route.ts` | `const key = process.env.SUPABASE_SERVICE_ROLE_KEY;` / `if (!url \|\| !key) { return NextResponse.json(..., 500); }` | server (API route) |
| `src/app/api/rewards/route.ts` | `if (!process.env.NEXT_PUBLIC_SUPABASE_URL \|\| !process.env.SUPABASE_SERVICE_ROLE_KEY)` / `createClient(..., process.env.SUPABASE_SERVICE_ROLE_KEY, ...)` | server (API route) |
| `src/lib/security/logSecurityEvent.ts` | `const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;` / `createClient(url, serviceKey, ...)` | server (lib, sadece server’dan çağrılıyor) |
| `src/lib/supabase/admin.ts` | `const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;` / `if (!supabaseUrl \|\| !supabaseServiceRoleKey) return null` | server (server-only modül) |
| `src/lib/admin-data.ts` | Yorum: `SUPABASE_SERVICE_ROLE_KEY is missing` | — |
| `src/app/api/postback/adgem/route.ts` | Log mesajı: `SUPABASE_SERVICE_ROLE_KEY not set` | server (API route) |
| `src/app/api/admin/redemptions/[id]/approve/route.ts` | Hata mesajı: `Set SUPABASE_SERVICE_ROLE_KEY.` | server (API route) |
| `src/app/api/admin/redemptions/[id]/reject/route.ts` | Aynı hata mesajı | server (API route) |
| `src/app/api/admin/reward-variants/route.ts` | Aynı hata mesajı | server (API route) |
| `src/app/api/admin/rewards/route.ts` | Aynı hata mesajı | server (API route) |
| `src/app/api/admin/rewards/[id]/route.ts` | Aynı hata mesajı | server (API route) |
| `src/app/api/admin/reward-variants/[id]/route.ts` | Aynı hata mesajı | server (API route) |
| `src/app/api/admin/ledger/adjust/route.ts` | `message: 'Admin client disabled. Set SUPABASE_SERVICE_ROLE_KEY.'` | server (API route) |
| `src/app/api/admin/ledger/route.ts` | Aynı mesaj | server (API route) |
| `src/lib/user-ip-log.ts` | `throw new Error('MISSING_SERVICE_ROLE: SUPABASE_SERVICE_ROLE_KEY not set');` | server (lib) |
| `src/app/api/admin/users/route.ts` | `warning: 'SUPABASE_SERVICE_ROLE_KEY not set'` / `message: 'SUPABASE_SERVICE_ROLE_KEY not set.'` | server (API route) |

### service_role
| Dosya | Kod | Ortam |
|-------|-----|--------|
| `src/lib/supabase/admin.ts` | Yorum: `Returns service role client when SUPABASE_SERVICE_ROLE_KEY is set` / `otherwise anon key so reads still work when SUPABASE_SERVICE_ROLE_KEY is missing` | server |
| `src/lib/admin-data.ts` | Yorum: `with service role or anon` | — |
| Migration’lar (RLS policy) | `auth.jwt() ->> 'role' = 'service_role'` | DB (policy) |

### createAdminClient
| Dosya | Kod | Ortam |
|-------|-----|--------|
| `src/lib/supabase/admin.ts` | `export function createAdminClient(): SupabaseClient<Database> {` / `const client = getAdminClient();` / `throw new Error('...SUPABASE_SERVICE_ROLE_KEY not set');` | server (server-only) |

### adminClient (değişken adı)
Tüm kullanımlar: API route’lar veya Server Component’lar içinde `const adminClient = getAdminClient();` (veya `const admin = getAdminClient();`). Dosyalar: `src/app/api/postback/adgem/route.ts`, `src/app/api/admin/audit/route.ts`, `src/app/api/admin/ledger/adjust/route.ts`, `src/app/api/admin/ledger/route.ts`, `src/app/api/admin/presence/online/route.ts`, `src/app/api/admin/users/[userId]/ip-logs/route.ts`, `src/app/api/postback/offerwall/route.ts`, `src/lib/offerwall/credit-engine.ts`, `src/app/api/admin/users/route.ts`, `src/app/app/admin/users/[id]/page.tsx`, `src/app/app/admin/ledger/page.tsx`. Hepsi server.

### SERVICE_ROLE (literal)
| Dosya | Kod | Ortam |
|-------|-----|--------|
| `src/app/api/admin/redemptions/stats/route.ts` | `error: 'MISSING_SERVICE_ROLE'` | server (API route) |
| `src/app/api/admin/security/events/route.ts` | `error: 'MISSING_SERVICE_ROLE'` | server (API route) |
| `src/app/api/admin/security/suspicious-ips/route.ts` | Aynı | server (API route) |
| `src/app/api/admin/dashboard/route.ts` | Aynı | server (API route) |
| `src/app/api/admin/users/[userId]/risk/route.ts` | Aynı | server (API route) |
| `src/app/api/rewards/route.ts` | `reason: 'MISSING_SERVICE_ROLE'` | server (API route) |
| `src/lib/user-ip-log.ts` | `'MISSING_SERVICE_ROLE: SUPABASE_SERVICE_ROLE_KEY...'` | server (lib) |

---

## 2) Ortam özeti (client vs server)

- **API routes (`src/app/api/**/route.ts`):** Hepsi server-side.
- **Cron routes (`src/app/api/cron/**/route.ts`):** Server-side.
- **Lib’ler (`src/lib/*.ts`):** `admin.ts` başında `import 'server-only'` var; diğerleri sadece API/server’dan çağrılıyor → server.
- **Sayfalar/layout:**  
  - `src/app/app/admin/users/[id]/page.tsx` — async Server Component (use client yok).  
  - `src/app/app/admin/layout.tsx` — async Server Component.  
  - `src/app/app/admin/ledger/page.tsx` — async Server Component.  
  - `src/app/app/admin/audit/page.tsx` — sadece `getReadClient` (admin.ts), sayfa Server Component.

Hiçbir **client component** (`'use client'` olan .tsx) `getAdminClient` / `createAdminClient` / `admin.ts` import etmiyor.

---

## 3) Sonuç: client-side service role var mı?

**Yok.**

- Service role kullanımı yalnızca:
  - API route’larda,
  - cron route’larda,
  - `server-only` / server’da çalışan lib’lerde,
  - Server Component sayfa/layout’larda (admin users [id], admin layout, admin ledger).
- Client component’larda service role veya `SUPABASE_SERVICE_ROLE_KEY` kullanımı yok.
- `src/lib/supabase/admin.ts` zaten `server-only`; client’tan import edilirse build/runtime hata verir.

---

## 4) Patch önerisi

Mevcut durum doğru; **client-side’a taşımak veya client’ta service role kullanmak için yapılacak bir düzeltme yok.**

İstersen ileride ek güvenlik için:

- `src/lib/supabase/admin.ts` dosyasının sadece server’da kullanıldığını garanti etmek için zaten `server-only` var; buna dokunmaya gerek yok.
- Yeni bir API route veya server action yazarken service role ihtiyacı varsa, her zaman `getAdminClient()` ile API/server tarafında kullan; client tarafı sadece anon/auth client ile fetch/useMutation kullansın (mevcut pattern’e uygun).

Özet: **Client-side service role kullanımı yok; patch gerekmiyor.**
