import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate the password recovery link using Admin privileges
    // This bypasses Supabase's built-in email sender and just gives us the link.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (error) {
      console.error('Generate Link Error:', error);
      // Return generic error to avoid email enumeration
      return NextResponse.json({ error: 'Could not generate link' }, { status: 500 });
    }

    // Return the link properties
    return NextResponse.json({ 
      link: data.properties?.action_link 
    });

  } catch (err) {
    console.error('Server Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}