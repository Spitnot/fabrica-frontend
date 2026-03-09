'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase/client'

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? ''

    if (code) {
      // Flujo PKCE — intercambiar código por sesión
      supabaseClient.auth.exchangeCodeForSession(code).then(({ data: { session }, error }) => {
        if (error || !session) {
          router.push('/login?error=auth')
          return
        }
        const role = session.user.user_metadata?.role
        const dest = next || (role === 'customer' ? '/portal' : '/dashboard')
        router.push(dest)
      })
      return
    }

    // Flujo implícito — escuchar el hash #access_token
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
        const role = session.user.user_metadata?.role
        const dest = next || (event === 'PASSWORD_RECOVERY' ? '/reset-password' : role === 'customer' ? '/portal' : '/dashboard')
        router.push(dest)
        subscription.unsubscribe()
      }
    })

    return () => subscription.unsubscribe()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#D93A35] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-400">Signing you in...</p>
      </div>
    </div>
  )
}