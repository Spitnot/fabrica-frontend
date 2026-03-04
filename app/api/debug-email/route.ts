import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// POST /api/debug-email
// Body: { to: string }
// Returns a detailed diagnostic of what's wrong with the email setup.
// DELETE THIS ROUTE once emails are working.
export async function POST(req: NextRequest) {
  const { to } = await req.json().catch(() => ({}));

  const diagnostics: Record<string, unknown> = {
    RESEND_API_KEY_set:   !!process.env.RESEND_API_KEY,
    RESEND_API_KEY_length: process.env.RESEND_API_KEY?.length ?? 0,
    RESEND_API_KEY_prefix: process.env.RESEND_API_KEY?.slice(0, 6) ?? '(none)',
    NEXT_PUBLIC_SITE_URL:  process.env.NEXT_PUBLIC_SITE_URL ?? '(not set)',
    ADMIN_EMAIL:           process.env.ADMIN_EMAIL ?? '(not set)',
    send_attempted:        false,
    send_result:           null,
    send_error:            null,
  };

  if (!to) {
    return NextResponse.json({ diagnostics, error: 'Pass { "to": "your@email.com" } in body' }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({
      diagnostics,
      error: 'RESEND_API_KEY is not set in environment variables. Add it in Vercel → Project Settings → Environment Variables.',
    }, { status: 500 });
  }

  // Attempt actual send
  diagnostics.send_attempted = true;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from:    'Firma Rollers <noreply@firmarollers.com>',
    to,
    subject: '[DEBUG] Email test — Firma Rollers B2B',
    html:    '<p>This is a test email from the B2B portal debug endpoint. If you see this, emails are working.</p>',
  });

  diagnostics.send_result = data ?? null;
  diagnostics.send_error  = error ?? null;

  if (error) {
    return NextResponse.json({ diagnostics, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ diagnostics, ok: true, message: 'Email sent — check your inbox.' });
}
