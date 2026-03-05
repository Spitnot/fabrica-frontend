import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_NO_REPLY = 'Firma Rollers <noreply@firmarollers.com>';
const FROM_PEDIDOS  = 'Firma Rollers <orders@firmarollers.com>';
const SITE_URL      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://b2b.firmarollers.com';

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);
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

// ─── 2. Order confirmation (to customer) ─────────────────────────────────────

export async function sendOrderConfirmationToCustomer({
  to, nombre, orderId, total, itemCount, customerId,
}: {
  to: string;
  nombre: string;
  orderId: string;
  total: number;
  itemCount: number;
  customerId?: string;
}) {
  const shortId = orderId.slice(0, 8).toUpperCase();
  const subject = `Order confirmed #${shortId} · ${fmt(total)}`;
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

        <tr>
          <td style="background:#D93A35;padding:28px 32px;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;">
              FIRMA ROLLERS
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#111827;font-size:16px;font-weight:700;">
              Order received, ${nombre}
            </p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
              We've received your order and our team is processing it.
              We'll notify you when the status changes.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;">
                        <span style="color:#6b7280;font-size:12px;">Reference</span>
                      </td>
                      <td align="right" style="padding:4px 0;">
                        <span style="color:#111827;font-size:12px;font-family:monospace;font-weight:700;">#${shortId}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;">
                        <span style="color:#6b7280;font-size:12px;">Product lines</span>
                      </td>
                      <td align="right" style="padding:4px 0;">
                        <span style="color:#111827;font-size:12px;">${itemCount}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0 4px;border-top:1px solid #e5e7eb;">
                        <span style="color:#111827;font-size:14px;font-weight:700;">Products total</span>
                      </td>
                      <td align="right" style="padding:8px 0 4px;border-top:1px solid #e5e7eb;">
                        <span style="color:#D93A35;font-size:16px;font-weight:900;">${fmt(total)}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <a href="${SITE_URL}/portal/pedidos/${orderId}"
               style="display:inline-block;padding:12px 28px;background:#D93A35;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;">
              View order in portal →
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Questions about your order? Email us at
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
    void logEmail({ type: 'order_confirmation', recipient: to, subject, customer_id: customerId, order_id: orderId, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'order_confirmation', recipient: to, subject, customer_id: customerId, order_id: orderId, status: 'failed', error: e?.message });
    throw e;
  }
}

// ─── 3. New order (to admin) ──────────────────────────────────────────────────

export async function sendNewOrderToAdmin({
  orderId, customerName, company, total, itemCount, customerId,
}: {
  orderId: string;
  customerName: string;
  company: string;
  total: number;
  itemCount: number;
  customerId?: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('[email] ADMIN_EMAIL not set — skipping admin notification');
    return;
  }

  const shortId = orderId.slice(0, 8).toUpperCase();
  const subject = `New order · ${company} · ${fmt(total)}`;
  try {
    const { error: resendError } = await resend.emails.send({
      from:    FROM_PEDIDOS,
      to:      adminEmail,
      subject,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

        <tr>
          <td style="background:#111827;padding:28px 32px;">
            <p style="margin:0;color:#ffffff;font-size:13px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;">
              FIRMA ROLLERS · ADMIN
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 6px;color:#D93A35;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">
              New order received
            </p>
            <p style="margin:0 0 24px;color:#111827;font-size:20px;font-weight:900;">
              ${company}
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;"><span style="color:#6b7280;font-size:12px;">Reference</span></td>
                      <td align="right" style="padding:4px 0;"><span style="font-family:monospace;font-size:12px;color:#111827;">#${shortId}</span></td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;"><span style="color:#6b7280;font-size:12px;">Client</span></td>
                      <td align="right" style="padding:4px 0;"><span style="font-size:12px;color:#111827;">${customerName}</span></td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;"><span style="color:#6b7280;font-size:12px;">Lines</span></td>
                      <td align="right" style="padding:4px 0;"><span style="font-size:12px;color:#111827;">${itemCount}</span></td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0 4px;border-top:1px solid #e5e7eb;"><span style="font-size:14px;font-weight:700;color:#111827;">Total</span></td>
                      <td align="right" style="padding:8px 0 4px;border-top:1px solid #e5e7eb;"><span style="font-size:18px;font-weight:900;color:#D93A35;">${fmt(total)}</span></td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <a href="${SITE_URL}/pedidos/${orderId}"
               style="display:inline-block;padding:12px 28px;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;">
              View order in dashboard →
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })}
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
    void logEmail({ type: 'admin_notification', recipient: adminEmail, subject, customer_id: customerId, order_id: orderId, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'admin_notification', recipient: adminEmail, subject, customer_id: customerId, order_id: orderId, status: 'failed', error: e?.message });
    throw e;
  }
}

// ─── 4. Order shipped (to customer, with tracking) ───────────────────────────

export async function sendShippedEmail({
  to, nombre, company, orderId, total, itemCount, trackingUrl, customerId,
}: {
  to: string;
  nombre: string;
  company: string;
  orderId: string;
  total: number;
  itemCount: number;
  trackingUrl: string | null;
  customerId?: string;
}) {
  const shortId = orderId.slice(0, 8).toUpperCase();
  const subject = `Your order #${shortId} has been shipped · ${company}`;
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

        <tr>
          <td style="background:#D93A35;padding:28px 32px;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;">
              FIRMA ROLLERS
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#111827;font-size:16px;font-weight:700;">
              Your order is on its way, ${nombre}!
            </p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
              We've handed your order to the carrier. You'll receive shipping status updates
              directly from the carrier.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;">
                        <span style="color:#6b7280;font-size:12px;">Reference</span>
                      </td>
                      <td align="right" style="padding:4px 0;">
                        <span style="color:#111827;font-size:12px;font-family:monospace;font-weight:700;">#${shortId}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;">
                        <span style="color:#6b7280;font-size:12px;">Product lines</span>
                      </td>
                      <td align="right" style="padding:4px 0;">
                        <span style="color:#111827;font-size:12px;">${itemCount}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0 4px;border-top:1px solid #e5e7eb;">
                        <span style="color:#111827;font-size:14px;font-weight:700;">Products total</span>
                      </td>
                      <td align="right" style="padding:8px 0 4px;border-top:1px solid #e5e7eb;">
                        <span style="color:#D93A35;font-size:16px;font-weight:900;">${fmt(total)}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;">
                  <a href="${SITE_URL}/portal/pedidos/${orderId}"
                     style="display:inline-block;padding:12px 24px;background:#D93A35;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;">
                    View order →
                  </a>
                </td>
                ${trackingUrl ? `
                <td>
                  <a href="${trackingUrl}"
                     style="display:inline-block;padding:12px 24px;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;">
                    Track shipment →
                  </a>
                </td>` : ''}
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Questions about your shipment? Email us at
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
    void logEmail({ type: 'order_shipped', recipient: to, subject, customer_id: customerId, order_id: orderId, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'order_shipped', recipient: to, subject, customer_id: customerId, order_id: orderId, status: 'failed', error: e?.message });
    throw e;
  }
}

// ─── 5. Admin invite (to new admin/manager/viewer) ────────────────────────────

export async function sendAdminInviteEmail({
  to, fullName, role, setupLink,
}: {
  to: string;
  fullName: string;
  role: string;
  setupLink: string;
}) {
  const subject = `You've been invited to Firma Rollers B2B · ${role}`;
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
          <td style="background:#111827;padding:28px 32px;">
            <p style="margin:0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;">
              FIRMA ROLLERS · ADMIN
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 6px;color:#D93A35;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">
              Team invitation
            </p>
            <p style="margin:0 0 16px;color:#111827;font-size:16px;font-weight:700;">
              Hi ${fullName},
            </p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
              You've been invited to the Firma Rollers B2B admin dashboard
              with the role of <strong style="color:#111827;">${role}</strong>.
              Click the button below to set your password and access the dashboard.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Login email</p>
                  <p style="margin:0;color:#111827;font-size:14px;font-family:monospace;">${to}</p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;color:#6b7280;font-size:13px;">
              This link is valid for 24 hours.
            </p>

            <a href="${setupLink}"
               style="display:inline-block;padding:12px 28px;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;letter-spacing:0.02em;">
              Set your password →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Questions? Contact us at
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
    void logEmail({ type: 'admin_invite', recipient: to, subject, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'admin_invite', recipient: to, subject, status: 'failed', error: e?.message });
    throw e;
  }
}
