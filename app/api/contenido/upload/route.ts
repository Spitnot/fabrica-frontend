import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server'

const BUCKET = 'b2bImages'

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  const exists = buckets?.some(b => b.name === BUCKET)
  if (!exists) {
    await supabaseAdmin.storage.createBucket(BUCKET, { public: true, allowedMimeTypes: ['image/*'], fileSizeLimit: 10485760 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = user.user_metadata?.role
  if (!['admin', 'manager'].includes(role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  if (!allowed.includes(file.type))
    return NextResponse.json({ error: 'Only images are allowed (jpg, png, webp, gif, avif)' }, { status: 400 })

  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: 'Max file size is 10 MB' }, { status: 400 })

  await ensureBucket()

  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
