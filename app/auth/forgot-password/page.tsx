'use client'

import { useState } from 'react'
import { supabaseClient } from '@/lib/supabase/client' // Updated import to match your project
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleReset = async () => {
    setError('')
    setLoading(true)

    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#D93A35]">
      {/* LEFT — brand panel (Desktop) */}
      <div className="hidden md:flex w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center">
          <img src="/FR_ICON_W.svg" alt="Firma Rollers Logo" className="w-24 h-auto mb-6" />
          <div className="text-white text-[11px] font-black tracking-[0.4em] uppercase mb-1 opacity-80" style={{ fontFamily: 'var(--font-alexandria)' }}>FIRMA ROLLERS</div>
          <div className="text-white text-5xl font-black tracking-widest" style={{ fontFamily: 'var(--font-alexandria)' }}>B2B</div>
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-[360px]">
          <div className="md:hidden text-center mb-8">
            <img src="/FR_ICON_B.svg" alt="Firma Rollers Logo" className="w-16 h-auto mx-auto mb-3" />
            <div className="text-2xl font-black tracking-widest text-gray-900" style={{ fontFamily: 'var(--font-alexandria)' }}>B2B</div>
          </div>

          <h2 className="text-2xl font-black tracking-wide text-gray-900 mb-1" style={{ fontFamily: 'var(--font-alexandria)' }}>Reset Password</h2>
          <p className="text-sm text-gray-400 mb-8">Enter your email to receive a reset link.</p>

          {sent ? (
            <div className="text-center text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">
              Check your email for the reset link.
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-[#D93A35]">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="you@example.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors" 
                />
              </div>

              <button 
                onClick={handleReset} 
                disabled={loading || !email}
                className="w-full py-3 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-2"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                onClick={() => router.push('/auth/login')}
                className="w-full text-sm text-gray-500 hover:text-gray-800 transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}