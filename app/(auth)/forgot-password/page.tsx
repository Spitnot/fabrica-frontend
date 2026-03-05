'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sendEmail } from '@/lib/emailService'; // NEW IMPORT

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (!email) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // 1. Call backend API to generate a reset link
      // We assume an endpoint exists that securely generates a Supabase recovery link
      // and returns it, rather than Supabase sending the email directly.
      const res = await fetch('/api/auth/generate-reset-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        // For security, often better to say "If this email exists..."
        // But for this implementation, we'll show the specific error for debugging.
        throw new Error(data.error || 'Failed to generate link');
      }

      const resetLink = data.link;

      // 2. Send email using our Resend service
      const htmlContent = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto;">
          <h2 style="color: #D93A35;">Reset Your Password</h2>
          <p>Hello,</p>
          <p>We received a request to reset your password for your Fabrica B2B account.</p>
          <p>Click the button below to set a new password:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #D93A35; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">
            Reset Password
          </a>
          <p style="font-size: 12px; color: #999;">If you did not request this, please ignore this email.</p>
        </div>
      `;

      const result = await sendEmail(email, 'Reset Your Fabrica Password', htmlContent);

      if (!result.success) {
        throw new Error('Failed to send email');
      }

      setMessage('A reset link has been sent to your email address.');
      
    } catch (err: any) {
      console.error(err);
      // Generic message to prevent email enumeration
      setMessage('If an account with that email exists, a reset link has been sent.');
    } finally {
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
                placeholder="you@company.com"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:border-[#D93A35] outline-none transition-colors"
              />
            </div>
            {error && <div className="text-xs text-red-500 text-center">{error}</div>}
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