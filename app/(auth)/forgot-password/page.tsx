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
      await fetch('/api/auth/generate-reset-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    } catch (err) { console.error(err); } finally {
      setMessage('If an account with that email exists, a reset link has been sent.');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/FR_ICON_B.svg" alt="Logo" style={{ width: 48, height: 'auto', margin: '0 auto 16px' }} />
          <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: 22, color: '#111' }}>Forgot Password</h1>
          <p style={{ fontSize: 12, color: '#111', marginTop: 4 }}>Enter your email to receive a reset link.</p>
        </div>

        {message ? (
          <div style={{ padding: '12px 16px', border: '1px solid #0DA265', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#0DA265', textAlign: 'center' }}>
            {message}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="fr-label">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()} placeholder="you@company.com" />
            </div>
            <button onClick={handleReset} disabled={loading || !email} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link href="/login" className="fr-label" style={{ color: '#111', textDecoration: 'none' }}>← Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
