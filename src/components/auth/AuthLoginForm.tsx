'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getPublicSupabaseEnv } from '@/lib/env';
import Link from 'next/link';
import EnvErrorDisplay from './EnvErrorDisplay';

const INPUT_CLASS =
  'block w-full h-12 rounded-xl border border-gray-200 bg-white px-4 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow';

export default function AuthLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailNorm,
      password,
    });

    if (signInError) {
      setError(signInError.message || 'Giriş başarısız.');
      setLoading(false);
      return;
    }

    // IP log will run when user lands on /app/* (IpLogOnMount in AppShell)
    window.location.assign('/app/dashboard');
  };

  if (!envCheck.isValid) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg shadow-gray-200/50">
        <EnvErrorDisplay missing={envCheck.missing} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl shadow-gray-200/50">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Giriş yap</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1.5">
            E-posta
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
            placeholder="ornek@email.com"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Şifre
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASS}
            placeholder="Şifrenizi girin"
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
          {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>

      <div className="mt-5 text-center">
        <Link
          href="/auth/forgot-password"
          className="text-sm font-medium text-gray-600 hover:text-green-600"
        >
          Şifreni mi unuttun?
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-gray-600">
        Hesabın yok mu?{' '}
        <Link href="/auth/signup" className="font-semibold text-green-600 hover:text-green-700">
          Kayıt ol
        </Link>
      </p>
    </div>
  );
}
