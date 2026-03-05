import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// GET: List all admin users
export async function GET() {
  try {
    // Fetch users from auth.users where role is admin/manager/viewer
    // Note: This requires a custom query or filtering user_metadata
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) throw error;

    const adminUsers = data.users
      .filter(u => ['admin', 'manager', 'viewer'].includes(u.user_metadata?.role))
      .map(u => ({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || 'No Name',
        role: u.user_metadata?.role,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));

    return NextResponse.json({ data: adminUsers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create a new admin user
export async function POST(req: NextRequest) {
  try {
    const { email, full_name, role } = await req.json();

    if (!email || !full_name || !role) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Create user with a generated link to set password
    // We use 'invite' type to generate a link, but we want the link returned, not emailed.
    // Or we can createUser and then generate a link.
    
    // 1. Create user (disabled password, we will send link)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'TempPass123!', // Temporary secure password
      email_confirm: true, // Auto confirm
      user_metadata: {
        full_name,
        role,
      },
    });

    if (userError) throw userError;

    // 2. Generate a setup link (recovery link essentially) for them to set their own password
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink', // or 'recovery' depending on your flow preference
      email: email,
    });
    
    // Ideally, we use 'invite' type but Supabase sometimes sends email automatically.
    // To stop Supabase email and use Resend, we create the user then generate a recovery link manually.
    
    // Let's use a better approach for "Invite": Generate a magic link
    const { data: magicLinkData, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (magicError) throw magicError;

    // The link is in action_link
    const setupLink = magicLinkData.properties?.action_link;

    return NextResponse.json({ id: userData.user?.id, setup_link: setupLink }, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}