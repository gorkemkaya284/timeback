export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export interface EnvCheckResult {
  isValid: boolean;
  env?: SupabaseEnv;
  missing: string[];
}

/**
 * Checks for required Supabase environment variables from .env.local.
 * No fallbacks - requires real env vars to be set.
 * Returns validation result with missing variables list.
 * Works in both server and client contexts.
 */
export function getPublicSupabaseEnv(): EnvCheckResult {
  const rawEnvUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawEnvAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Trim to avoid subtle whitespace / newline issues
  const envUrl = rawEnvUrl?.trim();
  const envAnonKey = rawEnvAnonKey?.trim();

  const missing: string[] = [];

  if (!envUrl) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!envAnonKey) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (missing.length > 0 || !envUrl || !envAnonKey) {
    return {
      isValid: false,
      missing,
    };
  }

  // Validate anon key length - must be > 100 characters
  if (envAnonKey.length <= 100) {
    return {
      isValid: false,
      missing: ['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    };
  }

  return {
    isValid: true,
    env: {
      url: envUrl,
      anonKey: envAnonKey,
    },
    missing: [],
  };
}

/**
 * Returns Supabase env values from .env.local.
 * Throws if env vars are missing or invalid.
 */
export function requireSupabaseEnv(): SupabaseEnv {
  const check = getPublicSupabaseEnv();

  if (!check.isValid || !check.env) {
    throw new Error(
      'Supabase environment variables are missing. ' +
        'Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
    );
  }

  return check.env;
}
