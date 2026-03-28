'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { supabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ─── Schema ───────────────────────────────────────────────

const PasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirm_password: z.string(),
  })
  .refine(data => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  })

type PasswordForm = z.infer<typeof PasswordSchema>

// ─── Strength util ────────────────────────────────────────

function getStrength(password: string) {
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++

  const levels = [
    { label: 'Too weak',    color: 'bg-[#D93A35]', text: 'text-[#D93A35]' },
    { label: 'Weak',        color: 'bg-[#E6883E]', text: 'text-[#E6883E]' },
    { label: 'Fair',        color: 'bg-[#F6E451]', text: 'text-black'      },
    { label: 'Strong',      color: 'bg-[#0DA265]', text: 'text-[#0DA265]' },
    { label: 'Very strong', color: 'bg-[#0DA265]', text: 'text-[#0DA265]' },
  ]
  return { score, ...levels[Math.min(score, levels.length - 1)] }
}

// ─── Page ─────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword]     = useState(false)
  const [showConfirm, setShowConfirm]       = useState(false)
  const [serverError, setServerError]       = useState('')
  const [success, setSuccess]               = useState(false)
  const [userReady, setUserReady]           = useState(false)
  const [invalidLink, setInvalidLink]       = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(PasswordSchema),
  })

  const password = watch('password', '')
  const strength = getStrength(password)

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data: { user } }) => {
      if (!user) setInvalidLink(true)
      else setUserReady(true)
    })
  }, [])

  async function onSubmit(data: PasswordForm) {
    setServerError('')
    const { error } = await supabaseClient.auth.updateUser({ password: data.password })
    if (error) {
      setServerError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login?reset=success'), 2000)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#D93A35]">

      {/* Left panel */}
      <div className="hidden md:flex w-1/2 flex-col items-center justify-center p-12">
        <img src="/FR_ICON_W.svg" alt="Firma Rollers" className="w-24 h-auto mb-6" />
        <div
          className="text-white text-[11px] font-black tracking-[0.4em] uppercase mb-1 opacity-80"
          style={{ fontFamily: 'var(--font-alexandria)' }}
        >
          FIRMA ROLLERS
        </div>
        <div
          className="text-white text-5xl font-black tracking-widest"
          style={{ fontFamily: 'var(--font-alexandria)' }}
        >
          B2B
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="md:hidden text-center mb-8">
            <img src="/FR_ICON_B.svg" alt="Firma Rollers" className="w-16 h-auto mx-auto mb-3" />
            <div
              className="text-2xl font-black tracking-widest text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}
            >
              B2B
            </div>
          </div>

          <h2
            className="text-2xl font-black tracking-wide text-gray-900 mb-1"
            style={{ fontFamily: 'var(--font-alexandria)' }}
          >
            Set New Password
          </h2>
          <p className="text-sm text-gray-400 mb-8">Enter and confirm your new password.</p>

          {/* Invalid link */}
          {invalidLink && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 text-sm text-[#D93A35]">
              Invalid or expired reset link. Please request a new one.
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="text-center text-green-600 bg-green-50 p-4 border border-green-200 text-sm">
              Password updated successfully! Redirecting...
            </div>
          )}

          {/* Form */}
          {!success && !invalidLink && userReady && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {serverError && (
                <div className="px-3 py-2.5 bg-red-50 border border-red-200 text-sm text-[#D93A35]">
                  {serverError}
                </div>
              )}

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
                  New Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`w-full bg-gray-50 border px-3 py-2.5 pr-10 text-sm text-gray-900
                      placeholder-gray-400 outline-none transition-colors
                      ${errors.password ? 'border-[#D93A35]' : 'border-gray-200 focus:border-[#D93A35]'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 transition-colors ${i <= strength.score ? strength.color : 'bg-gray-200'}`}
                        />
                      ))}
                    </div>
                    <p className={`text-[11px] font-bold ${strength.text}`}>{strength.label}</p>
                  </div>
                )}

                {errors.password && (
                  <p className="text-[11px] text-[#D93A35] font-bold">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    {...register('confirm_password')}
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={`w-full bg-gray-50 border px-3 py-2.5 pr-10 text-sm text-gray-900
                      placeholder-gray-400 outline-none transition-colors
                      ${errors.confirm_password ? 'border-[#D93A35]' : 'border-gray-200 focus:border-[#D93A35]'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {errors.confirm_password && (
                  <p className="text-[11px] text-[#D93A35] font-bold">{errors.confirm_password.message}</p>
                )}
              </div>

              {/* Requirements */}
              {password.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {[
                    { label: 'At least 8 characters',      pass: password.length >= 8 },
                    { label: 'One uppercase letter',        pass: /[A-Z]/.test(password) },
                    { label: 'One number',                  pass: /[0-9]/.test(password) },
                  ].map(({ label, pass }) => (
                    <li key={label} className="flex items-center gap-2 text-[11px]">
                      <span className={`font-black ${pass ? 'text-[#0DA265]' : 'text-gray-300'}`}>
                        {pass ? '✓' : '○'}
                      </span>
                      <span className={pass ? 'text-[#0DA265] font-bold' : 'text-gray-400'}>
                        {label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#D93A35] text-white text-sm font-bold hover:bg-[#b52e2a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-2"
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
