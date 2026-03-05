import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // Default to /portal if 'next' isn't provided
  const next = requestUrl.searchParams.get('next') ?? '/portal'

  if (code) {
    // 1. Prepare cookie handlers (Required for Next.js 16+)
    const cookieStore = await cookies()

    // 2. Create the Supabase server client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // 3. Exchange the code for a session (sets the auth cookie)
    await supabase.auth.exchangeCodeForSession(code)
  }

  // 4. Redirect to the final destination
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}