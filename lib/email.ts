// lib/email.ts
// ─── Transactional emails via Resend + audit log via Supabase ────────────────

import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Customer, Order, OrderItem } from '@/types';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_NOREPLY = 'noreply@firmarollers.com';
const FROM_PEDIDOS = 'pedidos@firmarollers.com';
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL ?? FROM_PEDIDOS;

// ─── Log helper ──────────────────────────────────────────────────────────────

interface LogEntry {
  type:        'welcome' | 'order_confirmation' | 'new_order_admin' | 'shipped';
  recipient:   string;
  status:      'sent' | 'failed';
  error?:      string | null;
  order_id?:   string | null;
  customer_id?: string | null;
}

async function logEmail(entry: LogEntry) {
  console.log('[email] logEmail called:', JSON.stringify(entry));
  console.log('[email] supabaseAdmin initialized:', !!supabaseAdmin);

  const { error } = await supabaseAdmin.from('email_logs').insert({
    type:        entry.type,
    recipient:   entry.recipient,
    status:      entry.status,
    error:       entry.error ?? null,
    order_id:    entry.order_id ?? null,
    customer_id: entry.customer_id ?? null,
  });

  if (error) {
    console.error('[email] logEmail insert error:', error.message);
  } else {
    console.log('[email] logEmail insert OK');
  }
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(customer: Customer) {
  console.log('[email] sendWelcomeEmail called, RESEND_API_KEY set:', !!process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from:    FROM_NOREPLY,
      to:      customer.email,
      subject: `Bienvenido a Firma Rollers, ${customer.company_name}`,
      html: `
        <p>Hola ${customer.contacto_nombre},</p>
        <p>Tu cuenta en el portal B2B de <strong>Firma Rollers</strong> ha sido creada correctamente.</p>
        <p>Puedes acceder en cualquier momento desde el portal con tu email y contraseña.</p>
        <p>Si tienes alguna duda, escríbenos a <a href="mailto:${FROM_PEDIDOS}">${FROM_PEDIDOS}</a>.</p>
        <p>¡Gracias por confiar en nosotros!</p>
      `,
    });

    if (error) throw new Error(error.message);

    await logEmail({ type: 'welcome', recipient: customer.email, status: 'sent', customer_id: customer.id });
  } catch (err: any) {
    console.error('[email] sendWelcomeEmail error:', err?.message ?? err);
    await logEmail({ type: 'welcome', recipient: customer.email, status: 'failed', error: err?.message ?? String(err), customer_id: customer.id });
  }
}

// ─── Order confirmation (to customer) ────────────────────────────────────────

function buildItemsTable(items: OrderItem[]): string {
  const rows = items.map(i => `
    <tr>
      <td style="padding:4px 8px;border:1px solid #ddd">${i.sku}</td>
      <td style="padding:4px 8px;border:1px solid #ddd">${i.nombre_producto}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;text-align:center">${i.cantidad}</td>
      <td style="padding:4px 8px;border:1px solid #ddd;text-align:right">${i.precio_unitario.toFixed(2)} €</td>
    </tr>
  `).join('');

  return `
    <table style="border-collapse:collapse;width:100%;margin-top:12px">
      <thead>
        <tr style="background:#f5f5f5">
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">SKU</th>
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:left">Producto</th>
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:center">Cant.</th>
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:right">Precio</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export async function sendOrderConfirmation(order: Order, customer: Customer) {
  console.log('[email] sendOrderConfirmation called, RESEND_API_KEY set:', !!process.env.RESEND_API_KEY);

  try {
    const items = order.order_items ?? [];
    const { error } = await resend.emails.send({
      from:    FROM_NOREPLY,
      to:      customer.email,
      subject: `Pedido confirmado #${order.id.slice(0, 8).toUpperCase()}`,
      html: `
        <p>Hola ${customer.contacto_nombre},</p>
        <p>Hemos recibido tu pedido correctamente. Aquí tienes el resumen:</p>
        ${buildItemsTable(items)}
        <p><strong>Total productos:</strong> ${order.total_productos.toFixed(2)} €</p>
        ${order.coste_envio_estimado != null ? `<p><strong>Coste de envío estimado:</strong> ${order.coste_envio_estimado.toFixed(2)} €</p>` : ''}
        <p>Te informaremos cuando tu pedido esté listo para envío.</p>
        <p>Gracias,<br>El equipo de Firma Rollers</p>
      `,
    });

    if (error) throw new Error(error.message);

    await logEmail({ type: 'order_confirmation', recipient: customer.email, status: 'sent', order_id: order.id, customer_id: customer.id });
  } catch (err: any) {
    console.error('[email] sendOrderConfirmation error:', err?.message ?? err);
    await logEmail({ type: 'order_confirmation', recipient: customer.email, status: 'failed', error: err?.message ?? String(err), order_id: order.id, customer_id: customer.id });
  }
}

// ─── New order notification (to admin) ───────────────────────────────────────

export async function sendNewOrderToAdmin(order: Order, customer: Customer) {
  console.log('[email] sendNewOrderToAdmin called, RESEND_API_KEY set:', !!process.env.RESEND_API_KEY);

  try {
    const items = order.order_items ?? [];
    const { error } = await resend.emails.send({
      from:    FROM_NOREPLY,
      to:      ADMIN_EMAIL,
      subject: `Nuevo pedido de ${customer.company_name} — #${order.id.slice(0, 8).toUpperCase()}`,
      html: `
        <p><strong>Cliente:</strong> ${customer.company_name} (${customer.contacto_nombre})</p>
        <p><strong>Email:</strong> ${customer.email}</p>
        ${buildItemsTable(items)}
        <p><strong>Total productos:</strong> ${order.total_productos.toFixed(2)} €</p>
        ${order.coste_envio_estimado != null ? `<p><strong>Coste de envío estimado:</strong> ${order.coste_envio_estimado.toFixed(2)} €</p>` : ''}
      `,
    });

    if (error) throw new Error(error.message);

    await logEmail({ type: 'new_order_admin', recipient: ADMIN_EMAIL, status: 'sent', order_id: order.id, customer_id: customer.id });
  } catch (err: any) {
    console.error('[email] sendNewOrderToAdmin error:', err?.message ?? err);
    await logEmail({ type: 'new_order_admin', recipient: ADMIN_EMAIL, status: 'failed', error: err?.message ?? String(err), order_id: order.id, customer_id: customer.id });
  }
}

// ─── Shipped notification (to customer) ──────────────────────────────────────

export async function sendShippedEmail(order: Order, customer: Customer) {
  console.log('[email] sendShippedEmail called, RESEND_API_KEY set:', !!process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from:    FROM_NOREPLY,
      to:      customer.email,
      subject: `Tu pedido #${order.id.slice(0, 8).toUpperCase()} ha sido enviado`,
      html: `
        <p>Hola ${customer.contacto_nombre},</p>
        <p>Tu pedido <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> ha salido de nuestras instalaciones.</p>
        ${order.tracking_url ? `<p><a href="${order.tracking_url}">Seguir mi envío</a></p>` : ''}
        <p>Si tienes alguna duda, escríbenos a <a href="mailto:${FROM_PEDIDOS}">${FROM_PEDIDOS}</a>.</p>
        <p>Gracias por tu pedido,<br>El equipo de Firma Rollers</p>
      `,
    });

    if (error) throw new Error(error.message);

    await logEmail({ type: 'shipped', recipient: customer.email, status: 'sent', order_id: order.id, customer_id: customer.id });
  } catch (err: any) {
    console.error('[email] sendShippedEmail error:', err?.message ?? err);
    await logEmail({ type: 'shipped', recipient: customer.email, status: 'failed', error: err?.message ?? String(err), order_id: order.id, customer_id: customer.id });
  }
}
