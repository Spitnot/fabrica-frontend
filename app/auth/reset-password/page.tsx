'use client'

import { useState, useEffect } from 'react'
import { supabaseClient } from '@/lib/supabase/client' // Updated import
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('Invalid or expired reset link. Please try again.')
      }
    })
  }, [])

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

    setLoading(true)
    const { error } = await supabaseClient.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setMessage('Password updated successfully!')
      setTimeout(() => router.push('/auth/login?reset=success'), 2000)
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

          <h2 className="text-2xl font-black tracking-wide text-gray-900 mb-1" style={{ fontFamily: 'var(--font-alexandria)' }}>Set New Password</h2>
          <p className="text-sm text-gray-400 mb-8">Enter and confirm your new password.</p>

          {message ? (
            <div className="text-center text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">
              {message}
            </div>
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
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#D93A35] outline-none transition-colors" 
                />
              </div>

              <button 
                onClick={handleUpdate} 
                disabled={loading || !password || !confirmPassword}
                className="w-full py-3 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-2"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}