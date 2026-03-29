// app/api/orders/preview/invoice/route.ts
// Redirects to the last order's invoice for preview purposes

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) {
    return new NextResponse('No orders found to preview', { status: 404 })
  }

  return NextResponse.redirect(
    new URL(`/api/orders/${data.id}/invoice`, process.env.NEXT_PUBLIC_SITE_URL ?? 'https://b2b.firmarollers.com')
  )
}
