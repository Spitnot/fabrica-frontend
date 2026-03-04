import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendWelcomeEmail } from '@/lib/email';

interface Props { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Props) {
  const { id } = await params;

  // Fetch customer
  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .select('id, email, contacto_nombre, company_name')
    .eq('id', id)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://b2b.firmarollers.com';
  const callbackUrl = `${siteUrl}/auth/callback?next=/auth/set-password`;

  let setupLink = `${siteUrl}/login`;

  // Try invite first, then recovery
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email: customer.email,
    options: { redirectTo: callbackUrl },
  });

  if (!inviteError && inviteData?.properties?.action_link) {
    setupLink = inviteData.properties.action_link;
  } else {
    console.warn('[resend-invite] invite failed:', inviteError?.message, '— trying recovery');
    const { data: recoveryData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: customer.email,
      options: { redirectTo: callbackUrl },
    });
    if (recoveryData?.properties?.action_link) {
      setupLink = recoveryData.properties.action_link;
    }
  }

  // Fix redirect_to if Supabase rewrote it
  try {
    const u = new URL(setupLink);
    const redirectTo = u.searchParams.get('redirect_to');
    if (redirectTo && !redirectTo.startsWith(siteUrl)) {
      u.searchParams.set('redirect_to', callbackUrl);
      setupLink = u.toString();
    }
  } catch { /* keep as-is */ }

  // Send welcome email
  try {
    await sendWelcomeEmail({
      to:         customer.email,
      nombre:     customer.contacto_nombre,
      company:    customer.company_name,
      setupLink,
      customerId: customer.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[resend-invite] email error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
