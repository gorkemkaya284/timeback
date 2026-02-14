'use client';

import { useState, useEffect, useRef } from 'react';

const METRICS = [
  { value: 847, suffix: '', label: 'Bugün ödeme alan kullanıcı' },
  { value: 4, suffix: ' dk', label: 'Ortalama ödeme süresi' },
  { value: 12400, suffix: '₺', label: 'Toplam dağıtılan ödül' },
  { value: 12, suffix: 'K+', label: 'Aktif kullanıcı' },
];

function MetricCard({
  value,
  suffix,
  label,
  start,
}: {
  value: number;
  suffix: string;
  label: string;
  start: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    const end = value;
    const duration = 1800;
    const step = end / (duration / 36);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 36);
    return () => clearInterval(timer);
  }, [start, value]);

  const display = value >= 1000 ? count.toLocaleString('tr-TR') : String(count);
  return (
    <div
      className="rounded-xl border px-5 py-5 shadow-sm transition-all duration-300 ease-out hover:shadow-lg hover:border-slate-300"
      style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
    >
      <p className="text-3xl font-bold tabular-nums" style={{ color: '#0f172a' }}>
        {display}{suffix}
      </p>
      <p className="mt-2 text-xs font-semibold" style={{ color: '#64748b' }}>
        {label}
      </p>
    </div>
  );
}

export default function TrustMetrics() {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {METRICS.map((m, i) => (
        <MetricCard key={i} value={m.value} suffix={m.suffix} label={m.label} start={inView} />
      ))}
    </section>
  );
}
