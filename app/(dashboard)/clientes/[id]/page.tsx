'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', confirmado: 'Confirmed', produccion: 'In Production',
  listo_envio: 'Ready to Ship', enviado: 'Shipped', cancelado: 'Cancelled',
};
const STATUS_STYLES: Record<string, string> = {
  draft:       'text-gray-500 bg-gray-100 border-gray-200',
  confirmado:  'text-[#0087B8] bg-blue-50 border-blue-200',
  produccion:  'text-[#b85e00] bg-orange-50 border-orange-200',
  listo_envio: 'text-[#876693] bg-purple-50 border-purple-200',
  enviado:     'text-[#0DA265] bg-green-50 border-green-200',
  cancelado:   'text-[#D93A35] bg-red-50 border-red-200',
};
const TARIFA_STYLES: Record<string, string> = {
  retail:    'text-[#0087B8] bg-blue-50 border-blue-200',
  wholesale: 'text-[#876693] bg-purple-50 border-purple-200',
};
const TIPO_CLIENTE_LABELS: Record<string, string> = {
  distribuidor:  'Distribuidor',
  mayorista:     'Mayorista',
  tienda_fisica: 'Tienda física',
  ecommerce:     'E-commerce',
  cadena:        'Cadena',
  marketplace:   'Marketplace',
};
const FORMA_PAGO_LABELS: Record<string, string> = {
  transferencia:   'Transferencia bancaria',
  sepa:            'SEPA (domiciliación)',
  carta_credito:   'Carta de crédito',
  pago_anticipado: 'Pago anticipado',
};
const CONDICIONES_PAGO_LABELS: Record<string, string> = {
  prepago: 'Prepago', '30dias': '30 días', '60dias': '60 días', '90dias': '90 días',
};

interface Tarifa { id: string; nombre: string; descripcion?: string; }

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
function initials(name: string) { return name.split(' ').map((w) => w[0]).slice(0, 2).join(''); }

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm gap-2">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className="font-mono text-xs text-gray-700 text-right">{value}</span>
    </div>
  );
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
      <span className="text-[10px] font-black tracking-[0.12em] uppercase text-gray-400"
            style={{ fontFamily: 'var(--font-alexandria)' }}>{title}</span>
      {action}
    </div>
  );
}

export default function ClientePerfilPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient]   = useState<any>(null);
  const [orders, setOrders]   = useState<any[]>([]);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [editingPricing, setEditingPricing] = useState(false);
  const [pricingForm, setPricingForm]       = useState({ tarifa_id: '', descuento_pct: '0' });
  const [savingPricing, setSavingPricing]   = useState(false);
  const [pricingSuccess, setPricingSuccess] = useState('');

  useEffect(() => {
    async function load() {
      const [clientRes, tarifasRes] = await Promise.all([
        fetch(`/api/customers/${id}`),
        fetch('/api/tarifas'),
      ]);
      if (!clientRes.ok) { setError('Cliente no encontrado'); setLoading(false); return; }
      const clientData  = await clientRes.json();
      const tarifasData = await tarifasRes.json();
      setClient(clientData.customer);
      setOrders(clientData.orders ?? []);
      setTarifas(tarifasData.data ?? []);
      setPricingForm({
        tarifa_id:    clientData.customer.tarifa_id ?? '',
        descuento_pct: String(clientData.customer.descuento_pct ?? 0),
      });
      setLoading(false);
    }
    load();
  }, [id]);

  async function savePricing() {
    setSavingPricing(true); setPricingSuccess('');
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tarifa_id:    pricingForm.tarifa_id || null,
        descuento_pct: parseFloat(pricingForm.descuento_pct) || 0,
      }),
    });
    setSavingPricing(false);
    if (res.ok) {
      const tarifa = tarifas.find(t => t.id === pricingForm.tarifa_id);
      setClient((prev: any) => ({
        ...prev,
        tarifa_id:    pricingForm.tarifa_id || null,
        descuento_pct: parseFloat(pricingForm.descuento_pct) || 0,
        tarifa,
      }));
      setPricingSuccess('Guardado');
      setEditingPricing(false);
      setTimeout(() => setPricingSuccess(''), 3000);
    }
  }

  if (loading) return (
    <div className="p-7 flex items-center gap-2 text-gray-400 text-sm">
      <div className="w-4 h-4 border border-gray-300 border-t-[#D93A35] rounded-full animate-spin" />
      Cargando…
    </div>
  );

  if (error || !client) return (
    <div className="p-7">
      <div className="text-sm text-[#D93A35]">{error || 'Cliente no encontrado'}</div>
      <Link href="/clientes" className="text-xs text-[#D93A35] mt-2 inline-block">← Volver</Link>
    </div>
  );

  const address   = client.direccion_envio as any;
  const fiscal    = client.direccion_fiscal as any;
  const cc        = client.condiciones_comerciales as any ?? {};
  const cl        = client.condiciones_legales as any ?? {};
  const totalBilled = orders.reduce((s: number, o: any) => s + (o.total_productos ?? 0), 0);
  const tarifaNombre = client.tarifa?.nombre ?? '—';
  const tarifaKey    = tarifaNombre.toLowerCase();
  const tarifaCls    = TARIFA_STYLES[tarifaKey] ?? 'text-gray-600 bg-gray-100 border-gray-200';
  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:border-[#D93A35] outline-none transition-colors";

  return (
    <div className="p-6 md:p-7">
      <Link href="/clientes" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        ← Volver a Clientes
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl bg-[#D93A35] flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
          {initials(client.contacto_nombre)}
        </div>
        <div>
          <h1 className="text-lg font-black tracking-wider uppercase text-gray-900"
              style={{ fontFamily: 'var(--font-alexandria)' }}>{client.contacto_nombre}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {client.company_name}
            {client.nombre_comercial && client.nombre_comercial !== client.company_name && (
              <span className="text-gray-300 ml-1.5">· {client.nombre_comercial}</span>
            )}
          </p>
        </div>
        <div className="ml-auto">
          <Link href={`/pedidos/nuevo?cliente=${id}`}
            className="px-4 py-2 bg-[#D93A35] text-white text-sm font-semibold rounded-lg hover:bg-[#b52e2a] transition-colors">
            + Nuevo Pedido
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* LEFT — order history */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-gray-400 whitespace-nowrap">Historial de Pedidos</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[480px]">
                <thead>
                  <tr className="bg-gray-50">
                    {['ID', 'Estado', 'Peso', 'Importe', 'Fecha'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 border-b border-gray-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">Sin pedidos aún</td></tr>
                  ) : (
                    orders.map((o: any) => (
                      <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <Link href={`/pedidos/${o.id}`} className="font-mono text-xs text-[#D93A35] hover:text-[#b52e2a] transition-colors">
                            {o.id.slice(0, 8)}…
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded-md ${STATUS_STYLES[o.status]}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                            {STATUS_LABELS[o.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-gray-400">{o.peso_total} kg</td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900">{fmt(o.total_productos)}</td>
                        <td className="px-5 py-3 font-mono text-xs text-gray-400">
                          {new Date(o.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-gray-400 mb-1">Pedidos</div>
              <div className="text-2xl font-black text-[#0087B8]" style={{ fontFamily: 'var(--font-alexandria)' }}>{orders.length}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-gray-400 mb-1">Facturado</div>
              <div className="text-lg font-black text-[#D93A35]" style={{ fontFamily: 'var(--font-alexandria)' }}>{fmt(totalBilled)}</div>
            </div>
          </div>

          {/* Pricing card */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader title="Precios" action={
              <button onClick={() => setEditingPricing(p => !p)}
                className="text-[11px] text-[#D93A35] font-semibold hover:text-[#b52e2a] transition-colors">
                {editingPricing ? 'Cancelar' : 'Editar'}
              </button>
            } />
            <div className="p-4">
              {!editingPricing ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Tarifa</span>
                    {client.tarifa ? (
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold border rounded-md tracking-wide uppercase ${tarifaCls}`}>
                        {tarifaNombre}
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Descuento</span>
                    <span className={`font-mono text-xs font-bold ${client.descuento_pct > 0 ? 'text-[#D93A35]' : 'text-gray-400'}`}>
                      {client.descuento_pct > 0 ? `-${client.descuento_pct}%` : '—'}
                    </span>
                  </div>
                  {cc.forma_pago && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Forma de pago</span>
                      <span className="text-xs text-gray-700">{FORMA_PAGO_LABELS[cc.forma_pago] ?? cc.forma_pago}</span>
                    </div>
                  )}
                  {cc.condiciones_pago && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Condiciones</span>
                      <span className="text-xs font-semibold text-gray-700">{CONDICIONES_PAGO_LABELS[cc.condiciones_pago] ?? cc.condiciones_pago}</span>
                    </div>
                  )}
                  {cc.notas_especiales && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">Notas internas</div>
                      <p className="text-xs text-gray-600 leading-relaxed">{cc.notas_especiales}</p>
                    </div>
                  )}
                  {pricingSuccess && (
                    <div className="text-[11px] text-[#0DA265] font-semibold text-center pt-1">{pricingSuccess}</div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Tarifa</label>
                    <select value={pricingForm.tarifa_id} onChange={e => setPricingForm(p => ({ ...p, tarifa_id: e.target.value }))}
                      className={inputCls}>
                      <option value="">— Sin tarifa —</option>
                      {tarifas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-gray-400">Descuento (%)</label>
                    <input type="number" min="0" max="100" step="0.5"
                      value={pricingForm.descuento_pct}
                      onChange={e => setPricingForm(p => ({ ...p, descuento_pct: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <button onClick={savePricing} disabled={savingPricing}
                    className="w-full py-2 bg-[#D93A35] text-white text-sm font-bold rounded-lg hover:bg-[#b52e2a] disabled:opacity-40 transition-colors">
                    {savingPricing ? 'Guardando…' : 'Guardar precios'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Contact & Legal */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader title="Contacto" action={
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold border rounded-md ${
                client.estado === 'active' ? 'text-[#0DA265] bg-green-50 border-green-200' : 'text-gray-400 bg-gray-100 border-gray-200'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                {client.estado === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            } />
            <div className="p-4 space-y-2">
              <InfoRow label="Razón social"   value={client.company_name} />
              <InfoRow label="Nombre comercial" value={client.nombre_comercial} />
              <InfoRow label="Tipo empresa"   value={client.tipo_empresa} />
              <InfoRow label={client.tipo_fiscal ?? 'NIF/CIF'} value={client.nif_cif} />
              <InfoRow label="EORI"           value={client.numero_eori} />
              <InfoRow label="Constitución"   value={client.fecha_constitucion} />
              <div className="pt-1 border-t border-gray-100 space-y-2">
                <InfoRow label="Email"    value={client.email} />
                <InfoRow label="Teléfono" value={client.telefono ?? '—'} />
                <InfoRow label="Alta"     value={new Date(client.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} />
              </div>
            </div>
          </div>

          {/* Commercial profile */}
          {(client.tipo_cliente || client.zona_distribucion || client.marcas_comercializadas || client.volumen_estimado) && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <CardHeader title="Perfil Comercial" />
              <div className="p-4 space-y-2">
                {client.tipo_cliente && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Tipo</span>
                    <span className="inline-flex px-2 py-0.5 text-[10px] font-bold border rounded-md text-[#876693] bg-purple-50 border-purple-200 uppercase tracking-wide">
                      {TIPO_CLIENTE_LABELS[client.tipo_cliente] ?? client.tipo_cliente}
                    </span>
                  </div>
                )}
                <InfoRow label="Zona"       value={client.zona_distribucion} />
                <InfoRow label="Marcas"     value={client.marcas_comercializadas} />
                <InfoRow label="Volumen"    value={client.volumen_estimado} />
                {client.num_puntos_venta != null && (
                  <InfoRow label="Puntos de venta" value={String(client.num_puntos_venta)} />
                )}
              </div>
            </div>
          )}

          {/* Addresses */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader title="Direcciones" />
            <div className="p-4 space-y-3">
              {fiscal && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-1">Fiscal</div>
                  <div className="text-sm text-gray-700">{fiscal.street}</div>
                  {fiscal.state && <div className="text-xs text-gray-500">{fiscal.state}</div>}
                  <div className="text-sm text-gray-500">{fiscal.postal_code} {fiscal.city}</div>
                  <div className="font-mono text-xs text-gray-400">{fiscal.country}</div>
                </div>
              )}
              {address && (
                <div className={fiscal ? 'pt-3 border-t border-gray-100' : ''}>
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-1">Envío</div>
                  <div className="text-sm text-gray-700">{address.street}</div>
                  <div className="text-sm text-gray-500">{address.postal_code} {address.city}</div>
                  <div className="font-mono text-xs text-gray-400">{address.country}</div>
                </div>
              )}
              {!fiscal && !address && <div className="text-sm text-gray-400">Sin dirección</div>}
            </div>
          </div>

          {/* GDPR status */}
          {(cl.acepta_condiciones || cl.acepta_privacidad) && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <CardHeader title="Legal / GDPR" />
              <div className="p-4 space-y-1.5">
                {[
                  ['Condiciones generales',      cl.acepta_condiciones],
                  ['Política de privacidad',      cl.acepta_privacidad],
                  ['Comunicaciones comerciales',  cl.consentimiento_comunicaciones],
                  ['Cumplimiento normativo',      cl.declaracion_cumplimiento],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{label}</span>
                    <span className={val ? 'text-[#0DA265] font-semibold' : 'text-gray-300'}>
                      {val ? '✓ Aceptado' : '–'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
