'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const next = searchParams.get('next')
      const code = searchParams.get('code')

      // PKCE flow: code in query params
      if (code) {
        const { data: { user }, error } = await supabaseClient.auth.exchangeCodeForSession(code)
        if (!error && user) {
          const dest = next || (user.user_metadata?.role === 'customer' ? '/portal' : '/dashboard')
          router.replace(dest)
          return
        }
        router.replace('/login?error=auth')
        return
      }

      // Implicit flow: tokens in URL hash (from generateLink recovery)
      const hash = window.location.hash.substring(1)
      if (hash) {
        const params = new URLSearchParams(hash)
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')

        if (access_token && refresh_token) {
          const { data: { user }, error } = await supabaseClient.auth.setSession({
            access_token,
            refresh_token,
          })
          if (!error && user) {
            const dest = next || (user.user_metadata?.role === 'customer' ? '/portal' : '/dashboard')
            router.replace(dest)
            return
          }
        }
      }

      router.replace('/login?error=auth')
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#D93A35] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-400">Verifying...</p>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#D93A35] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
