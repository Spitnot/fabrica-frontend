'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#D93A35]">
    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  </div>
);

// Handles auth redirects from Supabase for both:
//   - PKCE flow  → ?code=xxx  (OAuth, magic links with PKCE)
//   - Implicit   → #access_token=xxx  (admin generateLink invite/recovery)
function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';

    if (code) {
      // PKCE flow — exchange code for session
      supabaseClient.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          router.replace('/login?error=invalid_link');
        } else {
          router.replace(next);
        }
      });
      return;
    }

    // Implicit flow — tokens are in URL hash (#access_token=...).
    // The Supabase browser client detects them automatically via onAuthStateChange.
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe();
          router.replace(next);
        }
      }
    );

    // Safety timeout — if no SIGNED_IN fires within 4s the token is truly invalid
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      router.replace('/login?error=invalid_link');
    }, 4000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  return <Spinner />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackHandler />
    </Suspense>
  );
}
