import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_NO_REPLY = 'Firma Rollers <noreply@firmarollers.com>';
const FROM_PEDIDOS  = 'Firma Rollers <orders@firmarollers.com>';
const SITE_URL      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://b2b.firmarollers.com';

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);
}

// Helper to validate email format
function isValidEmail(email: string) {
  if (!email) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

async function logEmail(params: {
  type: 'welcome' | 'order_confirmation' | 'order_shipped' | 'admin_notification' | 'admin_invite';
  recipient: string;
  subject: string;
  customer_id?: string;
  order_id?: string;
  status: 'sent' | 'failed';
  error?: string;
}) {
  const { error } = await supabaseAdmin.from('email_logs').insert(params);
  if (error) console.error('[email log]', error);
}

// ─── 1. Welcome email with password-setup link ───────────────────────────────

export async function sendWelcomeEmail({
  to, nombre, company, setupLink, customerId,
}: {
  to: string;
  nombre: string;
  company: string;
  setupLink: string;
  customerId?: string;
}) {
  // FIX: Validate email before sending
  if (!isValidEmail(to)) {
    console.error(`[email] Invalid email address provided: "${to}"`);
    // We throw an error to stop execution, but catch it in the route if needed
    throw new Error('Invalid email address format'); 
  }

  const subject = `Welcome to the Firma Rollers B2B Portal · ${company}`;
  try {
    const { error: resendError } = await resend.emails.send({
      from:    FROM_PEDIDOS,
      to,
      subject,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#D93A35;padding:28px 32px;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;">
              FIRMA ROLLERS
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#111827;font-size:16px;font-weight:700;">
              Hi ${nombre},
            </p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
              Your B2B portal account for <strong style="color:#111827;">${company}</strong> has been created.
              Use the button below to set your password and access the portal, where you can
              browse the catalogue, place orders and track your shipments.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Your login email</p>
                  <p style="margin:0;color:#111827;font-size:14px;font-family:monospace;">${to}</p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;color:#6b7280;font-size:13px;">
              This link is valid for 24 hours. After setting your password you can change it
              at any time from your profile inside the portal.
            </p>

            <a href="${setupLink}"
               style="display:inline-block;padding:12px 28px;background:#D93A35;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;letter-spacing:0.02em;">
              Set your password →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Questions? Contact your account manager at
              <a href="mailto:orders@firmarollers.com" style="color:#D93A35;text-decoration:none;">orders@firmarollers.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    if (resendError) throw new Error(resendError.message);
    void logEmail({ type: 'welcome', recipient: to, subject, customer_id: customerId, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'welcome', recipient: to, subject, customer_id: customerId, status: 'failed', error: e?.message });
    throw e;
  }
}

// ... (Rest of your file remains exactly the same: sendOrderConfirmationToCustomer, sendNewOrderToAdmin, etc.)