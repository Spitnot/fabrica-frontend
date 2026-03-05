import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_NO_REPLY = 'Firma Rollers <noreply@firmarollers.com>';
const FROM_PEDIDOS  = 'Firma Rollers <orders@firmarollers.com>';
const SITE_URL      = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://b2b.firmarollers.com';

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(n);
}

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

// ─── 1. Welcome email
export async function sendWelcomeEmail({
  to, nombre, company, setupLink, customerId,
}: {
  to: string;
  nombre: string;
  company: string;
  setupLink: string;
  customerId?: string;
}) {
  if (!isValidEmail(to)) throw new Error('Invalid email address format');
  
  const subject = `Welcome to the Firma Rollers B2B Portal · ${company}`;
  try {
    const { error: resendError } = await resend.emails.send({
      from: FROM_PEDIDOS, to, subject,
      html: `... (Your existing HTML) ...`, // Keep your HTML from before
    });
    if (resendError) throw new Error(resendError.message);
    void logEmail({ type: 'welcome', recipient: to, subject, customer_id: customerId, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'welcome', recipient: to, subject, customer_id: customerId, status: 'failed', error: e?.message });
    throw e;
  }
}

// ─── 2. Order confirmation (to customer)
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
      from: FROM_PEDIDOS, to, subject,
      html: `... (Your existing HTML) ...`,
    });
    if (resendError) throw new Error(resendError.message);
    void logEmail({ type: 'order_confirmation', recipient: to, subject, customer_id: customerId, order_id: orderId, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'order_confirmation', recipient: to, subject, customer_id: customerId, order_id: orderId, status: 'failed', error: e?.message });
    throw e;
  }
}

// ─── 3. New order (to admin)
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
  if (!adminEmail) return;

  const shortId = orderId.slice(0, 8).toUpperCase();
  const subject = `New order · ${company} · ${fmt(total)}`;
  try {
    const { error: resendError } = await resend.emails.send({
      from: FROM_PEDIDOS, to: adminEmail, subject,
      html: `... (Your existing HTML) ...`,
    });
    if (resendError) throw new Error(resendError.message);
    void logEmail({ type: 'admin_notification', recipient: adminEmail, subject, customer_id: customerId, order_id: orderId, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'admin_notification', recipient: adminEmail, subject, customer_id: customerId, order_id: orderId, status: 'failed', error: e?.message });
    throw e;
  }
}

// ─── 4. Order shipped
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
      from: FROM_PEDIDOS, to, subject,
      html: `... (Your existing HTML) ...`,
    });
    if (resendError) throw new Error(resendError.message);
    void logEmail({ type: 'order_shipped', recipient: to, subject, customer_id: customerId, order_id: orderId, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'order_shipped', recipient: to, subject, customer_id: customerId, order_id: orderId, status: 'failed', error: e?.message });
    throw e;
  }
}

// ─── 5. Admin invite
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
      from: FROM_PEDIDOS, to, subject,
      html: `... (Your existing HTML) ...`,
    });
    if (resendError) throw new Error(resendError.message);
    void logEmail({ type: 'admin_invite', recipient: to, subject, status: 'sent' });
  } catch (e: any) {
    void logEmail({ type: 'admin_invite', recipient: to, subject, status: 'failed', error: e?.message });
    throw e;
  }
}