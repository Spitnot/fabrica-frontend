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
//   - PKCE flow     → ?code=xxx  (OAuth, magic links)
//   - Implicit flow → #access_token=xxx  (admin generateLink invite/recovery)
function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';

    if (code) {
      // PKCE flow — exchange code for session
      supabaseClient.auth.exchangeCodeForSession(code).then(({ error }) => {
        router.replace(error ? '/login?error=invalid_link' : next);
      });
      return;
    }

    // Implicit flow — tokens land in URL hash: #access_token=xxx&refresh_token=xxx
    // (happens with admin generateLink for invite/recovery types)
    // We read from window.location.hash and call setSession directly —
    // this is more reliable than waiting for onAuthStateChange which may
    // fire before the listener is attached when using createBrowserClient.
    const hash = window.location.hash.slice(1); // strip the leading '#'
    const hashParams = new URLSearchParams(hash);
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');

    if (access_token && refresh_token) {
      supabaseClient.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        router.replace(error ? '/login?error=invalid_link' : next);
      });
      return;
    }

    // No tokens anywhere — link is genuinely invalid or already consumed
    router.replace('/login?error=invalid_link');
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
