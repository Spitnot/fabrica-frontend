'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'invalid_link') {
      setError('This setup link has expired. Ask an admin to generate a new one.');
    }
    if (params.get('reset') === 'success') {
      setError(''); // clear any errors
      // optionally show a success banner — add a separate `success` state
    }
  }, []);

  async function handleLogin() {
    setError(''); setLoading(true);

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

    if (role === 'admin' || role === 'manager' || role === 'viewer') {
      router.push('/dashboard');
    } else if (role === 'customer') {
      router.push('/portal');
    } else {
      setError(`Unknown role: ${role}. Contact the administrator.`);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-[#D93A35]">

      {/* LEFT — brand panel (Desktop) */}
      <div className="hidden md:flex w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center">
          {/* White Logo for Red Background */}
          <img 
            src="/FR_ICON_W.svg" 
            alt="Firma Rollers Logo" 
            className="w-24 h-auto mb-6" 
          />
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
             {/* Black Logo for White Background */}
            <img 
              src="/FR_ICON_B.svg" 
              alt="Firma Rollers Logo" 
              className="w-16 h-auto mx-auto mb-3" 
            />
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
            <div className="flex justify-end -mt-1">
              {/* UPDATED LINK */}
              <a href="/forgot-password" className="text-xs text-gray-400 hover:text-[#D93A35] transition-colors">Forgot password?</a>
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