'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleReset() {
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(''); setLoading(true);
    const { error: updateError } = await supabaseClient.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError('Could not update your password. The link may have expired.');
      return;
    }
    await supabaseClient.auth.signOut();
    router.push('/auth/login');
  }

  return (
    <div className="min-h-screen flex bg-[#D93A35]">
      <div className="hidden md:flex w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center">
          <img src="/FR_ICON_W.svg" alt="Firma Rollers Logo" className="w-24 h-auto mb-6" />
          <div className="text-white text-[11px] font-black tracking-[0.4em] uppercase mb-1 opacity-80"
            style={{ fontFamily: 'var(--font-alexandria)' }}>FIRMA ROLLERS</div>
          <div className="text-white text-5xl font-black tracking-widest"
            style={{ fontFamily: 'var(--font-alexandria)' }}>B2B</div>
          <div className="text-white/60 text-xs mt-4 tracking-widest uppercase font-medium">Management Platform</div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-[360px]">
          <div className="md:hidden text-center mb-8">
            <img src="/FR_ICON_B.svg" alt="Firma Rollers Logo" className="w-16 h-auto mx-auto mb-3" />
            <div className="text-2xl font-black tracking-widest text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>B2B</div>
          </div>

          <h2 className="text-2xl font-black tracking-wide text-gray-900 mb-1"
            style={{ fontFamily: 'var(--font-alexandria)' }}>New Password</h2>
          <p className="text-sm text-gray-400 mb-8">Choose a strong password for your account.</p>

          {error && (
            <div className="mb-5 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-[#D93A35]">
              {error}
            </div>
          )}

          {!ready ? (
            <div className="text-sm text-gray-400 text-center py-8">Verifying link…</div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && password && confirm && handleReset()}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors"
                />
              </div>
              <button
                onClick={handleReset}
                disabled={loading || !password || !confirm}
                className="w-full py-3 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-2"
              >
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          )}

          <Link href="/auth/login" className="block text-center text-xs text-gray-400 hover:text-gray-600 mt-6 transition-colors">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
