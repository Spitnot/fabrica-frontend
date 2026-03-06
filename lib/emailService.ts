// lib/emailService.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Firma Rollers B2B <noreply@firmarollers.com>'

// ─── Reset Password ───────────────────────────────────────────────────────────
export async function sendResetPasswordEmail(to: string, link: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your password — Firma Rollers B2B',
    html: `
      <div style="font-family:sans-serif;color:#333;max-width:600px;margin:auto">
        <h2 style="color:#D93A35">Reset Your Password</h2>
        <p>We received a request to reset your password.</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#D93A35;color:white;text-decoration:none;border-radius:8px;font-weight:bold;margin:16px 0">
          Reset Password
        </a>
        <p style="font-size:12px;color:#999">This link expires in 24 hours. If you didn't request this, ignore this email.</p>
      </div>
    `,
  })
}

// ─── Invitación cliente ───────────────────────────────────────────────────────
export async function sendCustomerInviteEmail(to: string, name: string, link: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to Firma Rollers B2B — Activate your account',
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
}

// ─── Invitación miembro del equipo ────────────────────────────────────────────
export async function sendTeamInviteEmail(to: string, name: string, link: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'You have been added to Firma Rollers B2B',
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
}

// ─── Notificación de envío ────────────────────────────────────────────────────
export async function sendShippingEmail(
  to: string,
  name: string,
  orderRef: string,
  tracking?: string,
  carrier?: string
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your order ${orderRef} has been shipped — Firma Rollers B2B`,
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
}