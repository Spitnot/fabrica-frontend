import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendAdminInviteEmail } from '@/lib/email';
import type { AdminRole } from '@/types';

const ADMIN_ROLES: AdminRole[] = ['admin', 'manager', 'viewer'];

export async function GET() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
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

export async function POST(req: NextRequest) {
  const { full_name, email, role } = await req.json();

  if (!full_name || !email || !role) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  if (!ADMIN_ROLES.includes(role as AdminRole)) {
    return NextResponse.json({ error: `Invalid role.` }, { status: 400 });
  }

  // 1. Create the user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role, full_name },
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Error creating user' }, { status: 500 });
  }

  // 2. Generate Invite Link
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://b2b.firmarollers.com';
  
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { 
      redirectTo: `${siteUrl}/auth/callback` 
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[admin/users POST] link error:', linkError?.message);
    // We still return success, but log the error. The admin can "Resend Invite" later.
    return NextResponse.json({ id: authData.user.id, warning: 'User created but invite link failed.' }, { status: 201 });
  }

  // 3. Send Email
  try {
    await sendAdminInviteEmail({
      to: email,
      fullName: full_name,
      role: role,
      setupLink: linkData.properties.action_link,
    });
  } catch (e) {
    console.error('[admin/users POST] email error:', e);
    // Don't fail the request, but log it.
  }

  return NextResponse.json({ id: authData.user.id }, { status: 201 });
}