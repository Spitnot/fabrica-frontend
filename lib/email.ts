import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_NO_REPLY = 'Firma Rollers <noreply@firmarollers.com>';
const FROM_PEDIDOS  = 'Firma Rollers <pedidos@firmarollers.com>';
const SITE_URL      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.firmarollers.com';

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

async function logEmail(params: {
  type: 'welcome' | 'order_confirmation' | 'order_shipped' | 'admin_notification';
  recipient: string;
  subject: string;
  customer_id?: string;
  order_id?: string;
  status: 'sent' | 'failed';
  error?: string;
}) {
  await supabaseAdmin.from('email_logs').insert(params).catch(
    (e) => console.error('[email log]', e),
  );
}

// ─── 1. Bienvenida al portal (se envía cuando admin crea un cliente) ──────────

export async function sendWelcomeEmail({
  to, nombre, company, customerId,
}: {
  to: string;
  nombre: string;
  company: string;
  customerId?: string;
}) {
  const subject = `Bienvenido al portal B2B · ${company}`;
  try {
    await resend.emails.send({
      from:    FROM_NO_REPLY,
      to,
      subject,
      html: `
<!DOCTYPE html>
<html lang="es">
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
              Hola ${nombre},
            </p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
              Tu acceso al portal B2B de Firma Rollers para <strong style="color:#111827;">${company}</strong>
              ya está activo. Desde el portal podrás consultar el catálogo, hacer pedidos y
              seguir el estado de tus envíos.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Tu email de acceso</p>
                  <p style="margin:0;color:#111827;font-size:14px;font-family:monospace;">${to}</p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
              Tu contraseña inicial te la comunicará tu gestor de cuenta. Puedes cambiarla desde
              tu perfil una vez dentro.
            </p>

            <a href="${SITE_URL}/login"
               style="display:inline-block;margin-top:20px;padding:12px 28px;background:#D93A35;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;letter-spacing:0.02em;">
              Acceder al portal →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Si tienes alguna duda, contacta con tu gestor comercial en
              <a href="mailto:pedidos@firmarollers.com" style="color:#D93A35;text-decoration:none;">pedidos@firmarollers.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    void logEmail({ type: 'welcome', recipient: to, subject, customer_id: customerId, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'welcome', recipient: to, subject, customer_id: customerId, status: 'failed', error: e?.message });
    throw e;
  }
}

// ─── 2. Confirmación de pedido (al cliente) ───────────────────────────────────

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
  const subject = `Pedido confirmado #${shortId} · ${fmt(total)}`;
  try {
    await resend.emails.send({
      from:    FROM_PEDIDOS,
      to,
      subject,
      html: `
<!DOCTYPE html>
<html lang="es">
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
              Pedido recibido, ${nombre}
            </p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
              Hemos recibido tu pedido y está siendo procesado por nuestro equipo.
              Te notificaremos cuando haya novedades en el estado.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;">
                        <span style="color:#6b7280;font-size:12px;">Referencia</span>
                      </td>
                      <td align="right" style="padding:4px 0;">
                        <span style="color:#111827;font-size:12px;font-family:monospace;font-weight:700;">#${shortId}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;">
                        <span style="color:#6b7280;font-size:12px;">Líneas de producto</span>
                      </td>
                      <td align="right" style="padding:4px 0;">
                        <span style="color:#111827;font-size:12px;">${itemCount}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0 4px;border-top:1px solid #e5e7eb;">
                        <span style="color:#111827;font-size:14px;font-weight:700;">Total productos</span>
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
              Ver pedido en el portal →
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              ¿Dudas sobre tu pedido? Escríbenos a
              <a href="mailto:pedidos@firmarollers.com" style="color:#D93A35;text-decoration:none;">pedidos@firmarollers.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    void logEmail({ type: 'order_confirmation', recipient: to, subject, customer_id: customerId, order_id: orderId, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'order_confirmation', recipient: to, subject, customer_id: customerId, order_id: orderId, status: 'failed', error: e?.message });
    throw e;
  }
}

// ─── 3. Nuevo pedido (al admin) ───────────────────────────────────────────────

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
  const subject = `Nuevo pedido · ${company} · ${fmt(total)}`;
  try {
    await resend.emails.send({
      from:    FROM_PEDIDOS,
      to:      adminEmail,
      subject,
      html: `
<!DOCTYPE html>
<html lang="es">
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
              Nuevo pedido recibido
            </p>
            <p style="margin:0 0 24px;color:#111827;font-size:20px;font-weight:900;">
              ${company}
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;"><span style="color:#6b7280;font-size:12px;">Referencia</span></td>
                      <td align="right" style="padding:4px 0;"><span style="font-family:monospace;font-size:12px;color:#111827;">#${shortId}</span></td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;"><span style="color:#6b7280;font-size:12px;">Cliente</span></td>
                      <td align="right" style="padding:4px 0;"><span style="font-size:12px;color:#111827;">${customerName}</span></td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;"><span style="color:#6b7280;font-size:12px;">Líneas</span></td>
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
              Ver pedido en el dashboard →
            </a>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              ${new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    void logEmail({ type: 'admin_notification', recipient: adminEmail, subject, customer_id: customerId, order_id: orderId, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'admin_notification', recipient: adminEmail, subject, customer_id: customerId, order_id: orderId, status: 'failed', error: e?.message });
    throw e;
  }
}

// ─── 4. Pedido enviado (al cliente, con tracking) ─────────────────────────────

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
  const subject = `Tu pedido #${shortId} ha sido enviado · ${company}`;
  try {
    await resend.emails.send({
      from:    FROM_PEDIDOS,
      to,
      subject,
      html: `
<!DOCTYPE html>
<html lang="es">
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
              ¡Tu pedido está en camino, ${nombre}!
            </p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
              Hemos entregado tu pedido al transportista. En breve recibirás actualizaciones
              del estado del envío directamente del transportista.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;">
                        <span style="color:#6b7280;font-size:12px;">Referencia</span>
                      </td>
                      <td align="right" style="padding:4px 0;">
                        <span style="color:#111827;font-size:12px;font-family:monospace;font-weight:700;">#${shortId}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;">
                        <span style="color:#6b7280;font-size:12px;">Líneas de producto</span>
                      </td>
                      <td align="right" style="padding:4px 0;">
                        <span style="color:#111827;font-size:12px;">${itemCount}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0 4px;border-top:1px solid #e5e7eb;">
                        <span style="color:#111827;font-size:14px;font-weight:700;">Total productos</span>
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
                    Ver pedido →
                  </a>
                </td>
                ${trackingUrl ? `
                <td>
                  <a href="${trackingUrl}"
                     style="display:inline-block;padding:12px 24px;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:8px;">
                    Seguir envío →
                  </a>
                </td>` : ''}
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              ¿Dudas sobre tu envío? Escríbenos a
              <a href="mailto:pedidos@firmarollers.com" style="color:#D93A35;text-decoration:none;">pedidos@firmarollers.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    void logEmail({ type: 'order_shipped', recipient: to, subject, customer_id: customerId, order_id: orderId, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'order_shipped', recipient: to, subject, customer_id: customerId, order_id: orderId, status: 'failed', error: e?.message });
    throw e;
  }
}
