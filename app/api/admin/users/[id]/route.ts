import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

interface Props { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Props) {
  const { response } = await requireAdmin()
  if (response) return response

  try {
    const { id } = await params
    const { role } = await req.json()

    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: { role },
    })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const { response } = await requireAdmin()
  if (response) return response

  try {
    const { id } = await params
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
