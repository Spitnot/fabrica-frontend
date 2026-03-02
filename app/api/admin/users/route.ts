import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { AdminRole } from '@/types';

const ADMIN_ROLES: AdminRole[] = ['admin', 'manager', 'viewer'];

// GET — list all admin team members
export async function GET() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    console.error('[admin/users GET]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const adminUsers = (data.users ?? [])
    .filter((u) => ADMIN_ROLES.includes(u.user_metadata?.role as AdminRole))
    .map((u) => ({
      id:              u.id,
      email:           u.email ?? '',
      full_name:       u.user_metadata?.full_name ?? '',
      role:            u.user_metadata?.role as AdminRole,
      created_at:      u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return NextResponse.json({ data: adminUsers });
}

// POST — invite a new admin team member
export async function POST(req: NextRequest) {
  const { full_name, email, role } = await req.json();

  if (!full_name || !email || !role) {
    return NextResponse.json({ error: 'Missing required fields: full_name, email, role' }, { status: 400 });
  }

  if (!ADMIN_ROLES.includes(role as AdminRole)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${ADMIN_ROLES.join(', ')}` }, { status: 400 });
  }

  // Create auth user (no password — invite flow)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role, full_name },
  });

  if (authError || !authData.user) {
    console.error('[admin/users POST] auth error:', authError?.message);
    return NextResponse.json({ error: authError?.message ?? 'Error creating user' }, { status: 500 });
  }

  // Generate password-setup link (recovery type = one-time link)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://b2b.firmarollers.com';
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/dashboard` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[admin/users POST] link error:', linkError?.message);
    return NextResponse.json({ id: authData.user.id }, { status: 201 });
  }

  let setupLink = linkData.properties.action_link;
  try {
    const u = new URL(setupLink);
    const redirectTo = u.searchParams.get('redirect_to');
    if (redirectTo?.includes('localhost')) {
      u.searchParams.set('redirect_to', `${siteUrl}/dashboard`);
      setupLink = u.toString();
    }
  } catch { /* keep original link */ }

  return NextResponse.json({ id: authData.user.id, setup_link: setupLink }, { status: 201 });
}
