import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { ensureProfile } from '@/lib/supabase/profile';
import { logUserIp } from '@/lib/user-ip-log';
import { requireSupabaseEnv } from '@/lib/env';
import { Database } from '@/types/database.types';

/**
 * Auth callback handler for Supabase magic-link authentication.
 * 
 * Why this route is required:
 * - Supabase sends magic link with a code parameter
 * - This code must be exchanged for a session server-side
 * - Server-side exchange sets auth cookies properly
 * - Client-side session checks won't work until cookies are set
 * 
 * Flow:
 * 1. User clicks magic link → redirected here with ?code=...
 * 2. Exchange code for session (sets auth cookies)
 * 3. Create/ensure user profile exists
 * 4. Redirect to /app/dashboard
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectTo = requestUrl.searchParams.get('redirect') || '/app/dashboard';

  // If no code, redirect to login with error
  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/login?error=auth_failed', requestUrl.origin)
    );
  }

  try {
    const { url, anonKey } = requireSupabaseEnv();
    
    // Create response object that will hold cookies set by Supabase
    let response = NextResponse.next();

    // Create server client with request/response for proper cookie handling in route handler
    // Route handlers need direct cookie access from request headers
    const supabase = createServerClient<Database>(url, anonKey, {
      cookies: {
        getAll() {
          // Parse cookies from request headers
          const cookieHeader = request.headers.get('cookie');
          if (!cookieHeader) return [];
          return cookieHeader.split(';').map(cookie => {
            const [name, ...rest] = cookie.trim().split('=');
            return { name, value: rest.join('=') };
          });
        },
        setAll(cookiesToSet) {
          // Set cookies in the response - these will be sent to browser
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });
    
    // Exchange code for session - this sets auth cookies automatically
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(
        new URL('/auth/login?error=auth_failed', requestUrl.origin)
      );
    }

    // Ensure profile exists for the user (idempotent)
    if (data.user) {
      try {
        await ensureProfile(data.user.id, data.user.email ?? undefined);
      } catch (error) {
        console.error('Profile creation error:', error);
        // Continue anyway - profile might already exist
      }
      try {
        await logUserIp({ req: request, userId: data.user.id, event: 'login', pathOverride: '/auth/callback' });
      } catch (e) {
        console.error('[auth/callback] IP log failed:', e);
      }
    }

    // Redirect to dashboard - cookies are set in response object
    const redirectUrl = new URL(redirectTo, requestUrl.origin);
    return NextResponse.redirect(redirectUrl, {
      headers: response.headers,
    });
  } catch (error) {
    console.error('Callback handler error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=auth_failed', requestUrl.origin)
    );
  }
}
