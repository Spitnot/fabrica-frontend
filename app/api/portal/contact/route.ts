import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const SUPPORT_EMAIL = 'wholesale@firmarollers.com';
const FROM = 'Firma Rollers B2B <noreply@firmarollers.com>';

const SUBJECT_LABELS: Record<string, string> = {
  order:    'Order inquiry',
  shipping: 'Shipping question',
  billing:  'Billing / payment',
  account:  'Account & access',
  other:    'Other',
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subject, message, orderId } = await req.json();

  if (!subject || !SUBJECT_LABELS[subject]) {
    return NextResponse.json({ error: 'Invalid subject' }, { status: 400 });
  }
  if (!message?.trim() || message.trim().length < 10) {
    return NextResponse.json({ error: 'Message too short' }, { status: 400 });
  }

  const subjectLabel = SUBJECT_LABELS[subject];
  const emailSubject = `[B2B Support] ${subjectLabel}${orderId ? ` — Order ${orderId.slice(0, 8).toUpperCase()}` : ''}`;

  const html = `
    <div style="font-family:sans-serif;color:#333;max-width:600px;margin:auto">
      <div style="background:#111;color:#fff;padding:16px 20px;margin-bottom:20px">
        <div style="font-size:10px;letter-spacing:0.2em;color:#D93A35;font-weight:700;margin-bottom:4px">FIRMA ROLLERS B2B · SUPPORT</div>
        <div style="font-size:18px;font-weight:900">${subjectLabel}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
        <tr><td style="padding:6px 0;color:#999;width:120px">From</td><td style="font-weight:700">${user.email}</td></tr>
        ${orderId ? `<tr><td style="padding:6px 0;color:#999">Order</td><td style="font-family:monospace;font-weight:700">#${orderId.slice(0,8).toUpperCase()}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#999">Category</td><td>${subjectLabel}</td></tr>
      </table>
      <div style="background:#F7F7F2;border-left:3px solid #D93A35;padding:16px 18px;font-size:13px;line-height:1.7;white-space:pre-wrap">${message.trim()}</div>
      <p style="font-size:11px;color:#999;margin-top:20px">Reply directly to this email to respond to the customer.</p>
    </div>
  `;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM,
      to: SUPPORT_EMAIL,
      replyTo: user.email,
      subject: emailSubject,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[portal/contact]', e.message);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
