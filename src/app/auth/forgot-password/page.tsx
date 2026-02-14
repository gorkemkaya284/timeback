'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getPublicSupabaseEnv } from '@/lib/env';
import Link from 'next/link';
import EnvErrorDisplay from '@/components/auth/EnvErrorDisplay';

const INPUT_CLASS =
  'block w-full h-12 rounded-xl border border-gray-200 bg-white px-4 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const envCheck = getPublicSupabaseEnv();
  const supabase = envCheck.isValid ? createClient() : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!supabase) {
      setError('Supabase yapılandırılmamış.');
      return;
    }

    const emailNorm = email.trim().toLowerCase();
    setLoading(true);
    setError('');
    setSuccess(false);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailNorm, {
      redirectTo: `${window.location.origin}/auth/callback?redirect=/app/dashboard`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (!envCheck.isValid) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/50">
        <EnvErrorDisplay missing={envCheck.missing} />
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl shadow-gray-200/50">
        <h2 className="text-xl font-bold text-gray-900 mb-4">E-posta gönderildi</h2>
        <p className="text-gray-600 mb-6">
          Şifre sıfırlama bağlantısı <strong>{email}</strong> adresine gönderildi. Lütfen gelen kutunuzu kontrol edin.
        </p>
        <Link
          href="/auth/login"
          className="block w-full h-12 flex items-center justify-center rounded-xl bg-green-600 text-white font-semibold text-base hover:bg-green-700 transition-colors"
        >
          Giriş sayfasına dön
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl shadow-gray-200/50">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Şifreni mi unuttun?</h2>
      <p className="text-gray-600 text-sm mb-6">
        E-posta adresini gir, sana şifre sıfırlama bağlantısı gönderelim.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1.5">
            E-posta
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
            placeholder="ornek@email.com"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 flex items-center justify-center rounded-xl bg-green-600 text-white font-semibold text-base hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors shadow-lg shadow-green-600/20"
        >
          {loading ? 'Gönderiliyor...' : 'Bağlantı gönder'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        <Link href="/auth/login" className="font-semibold text-green-600 hover:text-green-700">
          ← Giriş yap
        </Link>
      </p>
    </div>
  );
}
