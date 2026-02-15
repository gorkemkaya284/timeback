# Admin Control Center — Test Plan

Değişikliklerden sonra aşağıdaki testleri yap ve sonuçları not et.

## 1) Withdrawals tabında approve/reject (tek tık)

- **Adım:** Withdrawals sayfasında 10 kez (farklı veya aynı taleplerde) Onayla veya Reddet’e tek tık yap.
- **Beklenen:** Her tıklamada istek atılır, buton loading gösterir (…), işlem bitince liste ve istatistikler tek seferde güncellenir. İkinci tık gerekmez.
- **Sonuç:** [ ] Geçti / [ ] Kaldı (not: …)

## 2) Risk badge doğruluğu

- **Adım:** multi_account_same_ip ile block üretilmiş bir kullanıcının Withdrawals satırına bak.
- **Beklenen:** Risk sütununda 70+ (kırmızı) veya High badge görünür.
- **Sonuç:** [ ] Geçti / [ ] Kaldı (not: …)

## 3) User Inspector drawer

- **Adım:** Withdrawals tablosunda bir satıra tıkla (User Inspector açılsın). Overview, Risk Assessments, Security Events sekmelerine geç.
- **Beklenen:** user_id, risk özeti, son redemptions, risk assessments listesi, security events listesi doğru yüklenir.
- **Sonuç:** [ ] Geçti / [ ] Kaldı (not: …)

## 4) Normal kullanıcı akışı (redeem, ledger, rewards)

- **Adım:** Admin dışında: giriş yap, ödül listesi aç, redeem dene, (varsa) ledger/bakiye kontrol et.
- **Beklenen:** Redeem, ledger ve rewards akışı önceki gibi çalışır; hiçbir davranış bozulmamıştır.
- **Sonuç:** [ ] Geçti / [ ] Kaldı (not: …)

## 5) Admin panel cache / stale data

- **Adım:** Dashboard veya Withdrawals’ta Refresh’e bas; bir approve/reject yap; tekrar Refresh’e bas.
- **Beklenen:** Refresh sonrası güncel veri gelir; approve/reject sonrası liste güncellenir, stale data kalmamalı.
- **Sonuç:** [ ] Geçti / [ ] Kaldı (not: …)

---

**Not:** Withdrawals tablo başlığında IP sütunu, sıra Risk’ten sonra olacak şekilde (Risk, IP, Flag'lar) tasarlandı. Eğer başlık sırası farklı görünüyorsa, `AdminRedemptionsTable.tsx` içinde `<thead>` içindeki `<th>` sırasını (Risk, IP, Flag'lar) manuel düzeltebilirsin.
