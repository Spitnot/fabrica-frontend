import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { AdminRole } from '@/types';

const ADMIN_ROLES: AdminRole[] = ['admin', 'manager', 'viewer'];

// PATCH — update role for an admin user
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await req.json();

  if (!role || !ADMIN_ROLES.includes(role as AdminRole)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${ADMIN_ROLES.join(', ')}` }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { role },
  });

  if (error) {
    console.error('[admin/users PATCH]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — remove an admin user
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (error) {
    console.error('[admin/users DELETE]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
