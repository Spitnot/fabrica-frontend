'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleReset = async () => {
    setError('')
    
    // We redirect to /auth/callback first to handle the PKCE code exchange,
    // then it redirects to /auth/reset-password to show the form.
    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#D93A35]">
      <div className="w-full max-w-[400px] bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black tracking-wide text-gray-900">Reset Password</h2>
          <p className="text-sm text-gray-400 mt-1">Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div className="text-center text-green-600 bg-green-50 p-4 rounded-lg">
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
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:border-[#D93A35] outline-none"
              />
            </div>
            <button
              onClick={handleReset}
              disabled={!email}
              className="w-full py-3 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors"
            >
              Send Reset Link
            </button>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full text-sm text-gray-500 hover:text-gray-800"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}