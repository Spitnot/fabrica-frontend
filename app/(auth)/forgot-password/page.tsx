'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleReset = async () => {
    if (!email) return;
    setLoading(true);

    try {
      await fetch('/api/auth/generate-reset-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      // Siempre mostrar mensaje genérico — nunca confirmar si el email existe
      setMessage('If an account with that email exists, a reset link has been sent.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/FR_ICON_B.svg" alt="Logo" className="w-12 h-auto mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-alexandria)' }}>Forgot Password</h1>
          <p className="text-xs text-gray-400 mt-1">Enter your email to receive a reset link.</p>
        </div>

        {message ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center text-sm text-green-800">
            {message}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                placeholder="you@company.com"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:border-[#D93A35] outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleReset}
              disabled={loading || !email}
              className="w-full py-2.5 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-xs text-gray-400 hover:text-[#D93A35] transition-colors">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}