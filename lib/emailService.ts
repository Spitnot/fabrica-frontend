import { Resend } from 'resend'
import { getAdminClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Firma Rollers B2B <noreply@firmarollers.com>'

async function logEmail({
  type,
  recipient,
  subject,
  status,
  error,
  customerId,
  orderId,
}: {
  type: string
  recipient: string
  subject: string
  status: 'sent' | 'failed'
  error?: string
  customerId?: string
  orderId?: string
}) {
  try {
    await getAdminClient()
      .from('email_logs')
      .insert({
        type,
        recipient,
        subject,
        status,
        error: error ?? null,
        customer_id: customerId ?? null,
        order_id: orderId ?? null,
        sent_at: new Date().toISOString(),
      })
  } catch (e) {
    console.error('[emailService] Failed to log email:', e)
  }
}

// ─── Reset Password ───────────────────────────────────────────────────────────
export async function sendResetPasswordEmail(to: string, customerId?: string) {
  const subject = 'Reset your password — Firma Rollers B2B'
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;color:#333;max-width:600px;margin:auto">
          <h2 style="color:#D93A35">Reset Your Password</h2>
          <p>We received a request to reset your password. Check your email for the reset link sent by Firma Rollers B2B.</p>
          <p style="font-size:12px;color:#999">If you didn't request this, ignore this email.</p>
        </div>
      `,
    })
    await logEmail({ type: 'welcome', recipient: to, subject, status: 'sent', customerId })
  } catch (e: any) {
    await logEmail({ type: 'welcome', recipient: to, subject, status: 'failed', error: e.message, customerId })
    throw e
  }
}

// ─── Invitación cliente ───────────────────────────────────────────────────────
export async function sendCustomerInviteEmail(to: string, name: string, link: string, customerId?: string) {
  const subject = 'Welcome to Firma Rollers B2B — Activate your account'
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;color:#333;max-width:600px;margin:auto">
          <h2 style="color:#D93A35">Welcome, ${name}!</h2>
          <p>Your Firma Rollers B2B account has been created.</p>
          <p>Click below to set your password and access your portal:</p>
          <a href="${link}" style="display:inline-block;padding:12px 24px;background:#D93A35;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin:16px 0">
            Activate Account
          </a>
          <p style="font-size:12px;color:#999">This link expires in 24 hours.</p>
        </div>
      `,
    })
    await logEmail({ type: 'welcome', recipient: to, subject, status: 'sent', customerId })
  } catch (e: any) {
    await logEmail({ type: 'welcome', recipient: to, subject, status: 'failed', error: e.message, customerId })
    throw e
  }
}

// ─── Invitación miembro del equipo ────────────────────────────────────────────
export async function sendTeamInviteEmail(to: string, name: string, link: string) {
  const subject = 'You have been added to Firma Rollers B2B'
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;color:#333;max-width:600px;margin:auto">
          <h2 style="color:#D93A35">Welcome to the team, ${name}!</h2>
          <p>You have been added to the Firma Rollers B2B management platform.</p>
          <p>Click below to set your password:</p>
          <a href="${link}" style="display:inline-block;padding:12px 24px;background:#D93A35;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin:16px 0">
            Set Password
          </a>
          <p style="font-size:12px;color:#999">This link expires in 24 hours.</p>
        </div>
      `,
    })
    await logEmail({ type: 'admin_invite', recipient: to, subject, status: 'sent' })
  } catch (e: any) {
    await logEmail({ type: 'admin_invite', recipient: to, subject, status: 'failed', error: e.message })
    throw e
  }
}

// ─── Notificación de envío ────────────────────────────────────────────────────
export async function sendShippingEmail(
  to: string,
  name: string,
  orderRef: string,
  tracking?: string,
  carrier?: string,
  customerId?: string,
  orderId?: string,
) {
  const subject = `Your order ${orderRef} has been shipped — Firma Rollers B2B`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      html: `
        <div style="font-family:sans-serif;color:#333;max-width:600px;margin:auto">
          <h2 style="color:#D93A35">Your order is on its way!</h2>
          <p>Hi ${name},</p>
          <p>Your order <strong>${orderRef}</strong> has been shipped.</p>
          ${tracking ? `
          <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0">
            <p style="margin:0;font-size:13px;color:#666">Carrier: <strong>${carrier ?? '—'}</strong></p>
            <p style="margin:8px 0 0;font-size:13px;color:#666">Tracking: <strong>${tracking}</strong></p>
          </div>
          ` : ''}
          <p style="font-size:12px;color:#999;margin-top:24px">Firma Rollers B2B</p>
        </div>
      `,
    })
    await logEmail({ type: 'order_shipped', recipient: to, subject, status: 'sent', customerId, orderId })
  } catch (e: any) {
    await logEmail({ type: 'order_shipped', recipient: to, subject, status: 'failed', error: e.message, customerId, orderId })
    throw e
  }
}