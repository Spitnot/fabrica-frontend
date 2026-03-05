'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    // Supabase exchanges the code from the URL automatically on client init usually,
    // but strictly speaking, the previous /auth/callback step already logged them in.
    // We just need to verify we have a session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // If no session, the link might be invalid or expired
        setError('Invalid or expired reset link. Please try again.')
      }
    })
  }, [supabase])

  const handleUpdate = async () => {
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Password updated successfully!')
      setTimeout(() => router.push('/auth/login?reset=success'), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#D93A35]">
      <div className="w-full max-w-[400px] bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-black tracking-wide text-gray-900 mb-6 text-center">Set New Password</h2>

        {message ? (
          <div className="text-center text-green-600 bg-green-50 p-4 rounded-lg">{message}</div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-[#D93A35]">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>
            <button
              onClick={handleUpdate}
              className="w-full py-3 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] transition-colors"
            >
              Update Password
            </button>
          </div>
        )}
      </div>
    </div>
  )
}