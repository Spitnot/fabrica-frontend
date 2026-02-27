'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setError(''); setLoading(true);

    try {
      const { data, error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (authError || !data.user) {
        setError('Incorrect credentials. Please check your email and password.');
        setLoading(false);
        return;
      }

      const role = data.user.user_metadata?.role as string | undefined;

      if (!role) {
        setError('This user has no role assigned. Contact the administrator.');
        setLoading(false);
        return;
      }

      if (role === 'admin') {
        router.push('/dashboard');
      } else if (role === 'customer') {
        router.push('/portal');
      } else {
        setError(`Unknown role: ${role}. Contact the administrator.`);
        setLoading(false);
        return;
      }

      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Connection error: ${msg}`);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#D93A35]">

      {/* LEFT — brand panel */}
      <div className="hidden md:flex w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Subtle wavy pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="waves" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                <path d="M0 60 Q30 20 60 60 Q90 100 120 60" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M0 80 Q30 40 60 80 Q90 120 120 80" stroke="white" strokeWidth="2" fill="none"/>
                <path d="M0 40 Q30 0 60 40 Q90 80 120 40" stroke="white" strokeWidth="2" fill="none"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#waves)"/>
          </svg>
        </div>

        {/* Logo */}
        <div className="relative text-center">
          <svg width="80" height="80" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-5">
            <path d="M20 80 Q50 10 100 55 Q150 100 180 30" stroke="white" strokeWidth="22" strokeLinecap="round" fill="none"/>
            <path d="M20 110 Q50 40 100 85 Q150 130 180 60" stroke="rgba(255,255,255,0.7)" strokeWidth="17" strokeLinecap="round" fill="none"/>
            <path d="M20 140 Q50 70 100 115 Q150 160 180 90" stroke="rgba(255,255,255,0.4)" strokeWidth="13" strokeLinecap="round" fill="none"/>
          </svg>
          <div className="text-white text-[11px] font-black tracking-[0.4em] uppercase mb-1 opacity-80"
               style={{ fontFamily: 'var(--font-alexandria)' }}>FIRMA ROLLERS</div>
          <div className="text-white text-5xl font-black tracking-widest"
               style={{ fontFamily: 'var(--font-alexandria)' }}>B2B</div>
          <div className="text-white/60 text-xs mt-4 tracking-widest uppercase font-medium">Management Platform</div>
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-[360px]">

          {/* Mobile brand */}
          <div className="md:hidden text-center mb-8">
            <svg width="48" height="48" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-3">
              <path d="M20 80 Q50 10 100 55 Q150 100 180 30" stroke="#D93A35" strokeWidth="22" strokeLinecap="round" fill="none"/>
              <path d="M20 110 Q50 40 100 85 Q150 130 180 60" stroke="#E6883E" strokeWidth="17" strokeLinecap="round" fill="none"/>
              <path d="M20 140 Q50 70 100 115 Q150 160 180 90" stroke="#F6E451" strokeWidth="13" strokeLinecap="round" fill="none"/>
            </svg>
            <div className="text-2xl font-black tracking-widest text-gray-900"
                 style={{ fontFamily: 'var(--font-alexandria)' }}>B2B</div>
          </div>

          <h2 className="text-2xl font-black tracking-wide text-gray-900 mb-1"
              style={{ fontFamily: 'var(--font-alexandria)' }}>Sign In</h2>
          <p className="text-sm text-gray-400 mb-8">Internal panel · Administrators only</p>

          {error && (
            <div className="mb-5 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-[#D93A35]">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="admin@firmarollers.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors" />
            </div>

            <button onClick={handleLogin} disabled={loading || !email || !password}
              className="w-full py-3 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-2">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
