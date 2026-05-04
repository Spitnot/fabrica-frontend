import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface Props { params: Promise<{ id: string }> }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://b2b.firmarollers.com';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

// ─── IVA logic by destination ─────────────────────────────
// ES → 21% IVA normal
// EU B2B with valid VAT → 0% ISP (inversión sujeto pasivo)
// Non-EU → 0% export exempt

function getTaxLogic(customer: any, company: any) {
  const country = customer?.ship_country ?? 'ES'
  const hasEuVat = !!customer?.nif_iva_eu && customer?.vies_validated

  const EU_COUNTRIES = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE',
    'GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE']

  const isEU = EU_COUNTRIES.includes(country)
  const isSpain = country === 'ES'

  if (isSpain) {
    const rate = company?.iva_default ?? 21
    return {
      rate,
      label: `IVA (${rate}%)`,
      mention: null,
    }
  }

  if (isEU && hasEuVat) {
    return {
      rate: 0,
      label: 'VAT (0%)',
      mention: 'Exento de IVA — Inversión del sujeto pasivo (art. 194 Directiva 2006/112/CE)',
    }
  }

  if (isEU && !hasEuVat) {
    const rate = company?.iva_default ?? 21
    return {
      rate,
      label: `IVA (${rate}%)`,
      mention: null,
    }
  }

  // Non-EU export
  return {
    rate: 0,
    label: 'VAT (0%)',
    mention: 'Exento de IVA — Exportación (art. 21 LIVA)',
  }
}

export async function GET(_req: NextRequest, { params }: Props) {
  const { id } = await params;

  // Fetch order + company settings in parallel
  const [{ data: order, error }, { data: company }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('*, customer:customers(*), order_items(*)')
      .eq('id', id)
      .single(),
    supabaseAdmin
      .from('company_settings')
      .select('*')
      .limit(1)
      .single(),
  ])

  if (error || !order) return new NextResponse('Order not found', { status: 404 });

  const cust = order.customer as any
  const address = cust?.ship_street1
    ? { street: cust.ship_street1, street2: cust.ship_street2, city: cust.ship_city, postal_code: cust.ship_postal_code, country: cust.ship_country }
    : cust?.fiscal_street1
    ? { street: cust.fiscal_street1, city: cust.fiscal_city, postal_code: cust.fiscal_postal_code, country: cust.fiscal_country }
    : null

  const date = new Date(order.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  const year = new Date(order.created_at).getFullYear()
  const serie = company?.serie_default ?? 'FR'
  const num = String(company?.siguiente_numero ?? 1).padStart(4, '0')
  const invoiceNumber = `${serie}-${year}-${num}`

  const tax = getTaxLogic(cust, company)
  const netTotal = order.total_productos
  const taxAmount = netTotal * (tax.rate / 100)
  const grossTotal = netTotal + taxAmount + (order.coste_envio_final ?? 0)

  // Company data from settings or env fallback
  const fromName    = company?.razon_social    ?? process.env.PACKLINK_FROM_NAME    ?? 'FIRMA ROLLERS'
  const fromNif     = company?.nif             ?? 'B00000000'
  const fromEori    = company?.eori            ?? ''
  const fromStreet  = company?.direccion       ?? process.env.PACKLINK_FROM_STREET  ?? ''
  const fromCp      = company?.cp              ?? process.env.PACKLINK_FROM_POSTAL_CODE ?? ''
  const fromCity    = company?.ciudad          ?? process.env.PACKLINK_FROM_CITY    ?? ''
  const fromCountry = company?.pais            ?? 'ES'
  const fromEmail   = company?.email_fiscal    ?? process.env.PACKLINK_FROM_EMAIL   ?? ''
  const fromWeb     = company?.web             ?? SITE_URL
  const fromIban    = company?.iban            ?? ''
  const fromBic     = company?.bic             ?? ''
  const fromBanco   = company?.banco           ?? ''
  const primaryColor = company?.color_primario ?? '#D93A35'
  const logoUrl     = company?.logo_url        ?? `${SITE_URL}/FR_ICON_B.svg`
  const pieFactura  = company?.pie_factura     ?? ''
  const payTerms    = company?.payment_terms   ?? '30 días'
  const incoterm    = company?.incoterm_default ?? 'DAP'

  // Recipient name
  const recipientName = cust?.first_name
    ? `${cust.first_name} ${cust.last_name ?? ''}`.trim()
    : cust?.company_name ?? '—'

  const itemRows = (order.order_items ?? []).map((item: any) => `
    <tr>
      <td>${item.nombre_producto}</td>
      <td class="mono">${item.sku}</td>
      <td class="center">${item.cantidad}</td>
      <td class="right mono">${item.peso_unitario ?? '—'} kg</td>
      <td class="right">${fmt(item.precio_unitario)}</td>
      <td class="right bold">${fmt(item.cantidad * item.precio_unitario)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Factura ${invoiceNumber}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px; color: #111; background: #fff;
      padding: 32px 40px; max-width: 820px; margin: 0 auto;
    }
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 3px solid #111; padding-bottom: 18px; margin-bottom: 22px;
    }
    .brand-logo { height: 38px; width: auto; }
    .brand-sub { font-size: 9px; font-weight: 700; letter-spacing: .22em; color: ${primaryColor}; margin-top: 3px; }
    .brand-info { font-size: 9px; color: #999; margin-top: 6px; line-height: 1.5; }
    .doc-title { text-align: right; }
    .doc-title h1 { font-size: 20px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #111; }
    .doc-title .ref { font-family: monospace; font-size: 13px; color: ${primaryColor}; margin-top: 5px; font-weight: 700; }
    .doc-title .meta { font-size: 10px; color: #666; margin-top: 4px; line-height: 1.6; }
    .addresses {
      display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
      margin-bottom: 22px; padding: 16px; background: #f9f9f9; border: 1px solid #eee;
    }
    .address-block h3 {
      font-size: 8px; font-weight: 800; letter-spacing: .2em;
      text-transform: uppercase; color: #999; margin-bottom: 8px;
      padding-bottom: 4px; border-bottom: 1px solid #eee;
    }
    .address-block p { line-height: 1.7; color: #444; font-size: 11px; }
    .address-block .name { font-weight: 700; font-size: 12px; color: #111; margin-bottom: 2px; }
    .address-block .vat { font-family: monospace; font-size: 10px; color: #777; margin-top: 4px; }
    .incoterm-bar {
      display: flex; gap: 16px; padding: 8px 16px; margin-bottom: 18px;
      background: #fff; border: 1px solid #eee; font-size: 10px; color: #666;
    }
    .incoterm-bar span { font-weight: 700; color: #111; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #111; color: #fff; }
    thead th {
      padding: 9px 10px; text-align: left;
      font-size: 8px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    }
    thead th.right { text-align: right; }
    thead th.center { text-align: center; }
    tbody tr { border-bottom: 1px solid #f0f0f0; }
    tbody tr:last-child { border-bottom: 2px solid #eee; }
    tbody td { padding: 9px 10px; vertical-align: middle; color: #333; }
    tbody td.mono { font-family: monospace; font-size: 10px; color: #777; }
    tbody td.center { text-align: center; font-weight: 700; }
    tbody td.right { text-align: right; }
    tbody td.bold { font-weight: 700; color: #111; text-align: right; }
    .totals { margin-top: 14px; display: flex; justify-content: flex-end; }
    .totals-inner { width: 260px; }
    .totals-row {
      display: flex; justify-content: space-between;
      padding: 5px 0; font-size: 11px; color: #555; border-bottom: 1px solid #f0f0f0;
    }
    .totals-row.tax { color: #777; }
    .totals-row.grand {
      border-bottom: none; border-top: 2px solid #111;
      margin-top: 6px; padding-top: 10px;
      font-weight: 800; font-size: 14px; color: #111;
    }
    .totals-row.grand span:last-child { color: ${primaryColor}; }
    .mention {
      margin-top: 18px; padding: 10px 14px;
      background: #fffbf0; border-left: 3px solid #E6883E;
      font-size: 10px; color: #555; line-height: 1.6;
    }
    .payment-info {
      margin-top: 18px; padding: 12px 16px;
      border: 1px solid #eee; background: #f9f9f9;
    }
    .payment-info h4 {
      font-size: 8px; font-weight: 800; letter-spacing: .18em;
      text-transform: uppercase; color: #999; margin-bottom: 8px;
    }
    .payment-info p { font-size: 11px; color: #444; line-height: 1.7; }
    .payment-info .iban { font-family: monospace; font-weight: 700; color: #111; font-size: 12px; }
    .pie { margin-top: 10px; padding: 8px 14px; border: 1px solid #f0f0f0; font-size: 9.5px; color: #666; line-height: 1.6; }
    .footer {
      margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e5e5;
      font-size: 9px; color: #bbb; display: flex; justify-content: space-between;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      @page { margin: 1.5cm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:20px;text-align:right;display:flex;gap:10px;justify-content:flex-end">
    <button onclick="window.print()"
      style="padding:8px 18px;background:#111;color:#fff;border:none;font-size:12px;font-weight:600;cursor:pointer;letter-spacing:.04em">
      🖨 Print / Save PDF
    </button>
  </div>

  <div class="header">
    <div>
      <img src="${logoUrl}" alt="${fromName}" class="brand-logo" />
      <div class="brand-sub">B2B</div>
      <div class="brand-info">
        ${fromStreet}<br />
        ${fromCp} ${fromCity} · ${fromCountry}<br />
        ${fromEmail}
      </div>
    </div>
    <div class="doc-title">
      <h1>Factura</h1>
      <div class="ref">${invoiceNumber}</div>
      <div class="meta">
        Fecha: ${date}<br />
        Vencimiento: ${payTerms}<br />
        Incoterm: ${incoterm}
      </div>
    </div>
  </div>

  <div class="addresses">
    <div class="address-block">
      <h3>Emisor</h3>
      <p class="name">${fromName}</p>
      <p>${fromStreet}</p>
      <p>${fromCp} ${fromCity}</p>
      <p>${fromCountry}</p>
      <p class="vat">NIF/CIF: ${fromNif}${fromEori ? ` · EORI: ${fromEori}` : ''}</p>
    </div>
    <div class="address-block">
      <h3>Destinatario</h3>
      <p class="name">${cust?.company_name ?? recipientName}</p>
      ${recipientName !== cust?.company_name ? `<p>${recipientName}</p>` : ''}
      <p>${address?.street ?? '—'}${address?.street2 ? `, ${address.street2}` : ''}</p>
      <p>${address?.postal_code ?? ''} ${address?.city ?? ''}</p>
      <p>${address?.country ?? ''}</p>
      ${cust?.nif_cif ? `<p class="vat">Tax ID: ${cust.nif_cif}</p>` : ''}
      ${cust?.nif_iva_eu ? `<p class="vat">VAT EU: ${cust.nif_iva_eu}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th>SKU</th>
        <th class="center">Qty</th>
        <th class="right">Peso</th>
        <th class="right">Precio unit.</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-inner">
      <div class="totals-row"><span>Base imponible</span><span>${fmt(netTotal)}</span></div>
      <div class="totals-row tax">
        <span>${tax.label}</span>
        <span>${tax.rate === 0 ? '0,00 €' : fmt(taxAmount)}</span>
      </div>
      ${order.coste_envio_final ? `
      <div class="totals-row"><span>Envío (${incoterm})</span><span>${fmt(order.coste_envio_final)}</span></div>` : ''}
      <div class="totals-row grand">
        <span>Total</span>
        <span>${fmt(grossTotal)}</span>
      </div>
    </div>
  </div>

  ${tax.mention ? `<div class="mention">⚠️ ${tax.mention}</div>` : ''}

  ${fromIban ? `
  <div class="payment-info">
    <h4>Datos bancarios para transferencia</h4>
    <p>
      ${fromBanco ? `Banco: ${fromBanco}<br />` : ''}
      Titular: ${fromName}<br />
      <span class="iban">${fromIban}</span>
      ${fromBic ? `<br />BIC/SWIFT: ${fromBic}` : ''}
    </p>
  </div>` : ''}

  ${pieFactura ? `<div class="pie">${pieFactura}</div>` : ''}

  <div class="footer">
    <span>${fromName} · ${fromNif} · ${fromWeb}</span>
    <span>Generada el ${new Date().toLocaleDateString('es-ES')}</span>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
