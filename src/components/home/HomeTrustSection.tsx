export default function HomeTrustSection() {
  return (
    <div
      className="rounded-xl border p-6 shadow-sm"
      style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
    >
      <p className="text-center text-sm font-semibold" style={{ color: '#0f172a' }}>
        Ödemeler hızlı ve güvenli şekilde yapılır.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-8">
        {['Güvenli ödeme', 'Hızlı transfer', 'SSL korumalı'].map((label) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-lg border px-4 py-2.5"
            style={{ borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }}
          >
            <span
              className="h-8 w-8 shrink-0 rounded-md flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: '#10b981' }}
            >
              ✓
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
