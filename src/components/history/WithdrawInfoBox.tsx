/**
 * Compact info box explaining withdraw/redemption statuses.
 * Turkish, professional, no hype.
 */
export default function WithdrawInfoBox() {
  return (
    <section className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Çekim Nasıl İşler
      </h2>
      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <li>
          <span className="font-medium text-amber-800 dark:text-amber-200">Beklemede:</span>{' '}
          Talebin inceleniyor
        </li>
        <li>
          <span className="font-medium text-green-800 dark:text-green-200">Tamamlandı:</span>{' '}
          Ödeme/ödül tamamlandı
        </li>
        <li>
          <span className="font-medium text-red-800 dark:text-red-200">Reddedildi:</span>{' '}
          Talep reddedildi (gerekirse puan iadesi yapılabilir)
        </li>
        <li className="pt-1 border-t border-gray-200 dark:border-gray-700 mt-2">
          Bazı çekimler doğrulama süresi gerektirebilir.
        </li>
      </ul>
    </section>
  );
}
