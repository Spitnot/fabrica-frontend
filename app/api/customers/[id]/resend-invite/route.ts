import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface Props { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    // 1. Get user email from customers table (or auth if linked)
    const { data: customer, error: dbError } = await supabaseAdmin
      .from('customers')
      .select('email, contacto_nombre')
      .eq('id', id)
      .single();

    if (dbError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // 2. Generate a new setup link (magic link type works well for setup)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: customer.email,
    });

    if (linkError) throw linkError;

    const setupLink = linkData.properties?.action_link;

    // 3. Return the link to the frontend
    // The Frontend will use sendEmail() to send this link via Resend
    return NextResponse.json({ setup_link: setupLink, email: customer.email, name: customer.contacto_nombre });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}