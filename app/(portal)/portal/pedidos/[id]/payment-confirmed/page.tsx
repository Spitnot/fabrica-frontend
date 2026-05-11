import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { FR } from '@/components/fr/Atoms';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ id: string }> }

export default async function PaymentConfirmedPage({ params }: Props) {
  const { id: orderId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: customerRow } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!customerRow) notFound();

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('customer_id', customerRow.id)
    .single();
  if (!order) notFound();

  const { data: payment } = await supabaseAdmin
    .from('revolut_payments')
    .select('status, amount, currency, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!payment) notFound();

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: payment.currency }).format(n);

  const isCompleted = payment.status === 'completed';
  const isFailed = payment.status === 'failed' || payment.status === 'cancelled';

  return (
    <div style={{ padding: '24px 28px', maxWidth: 600, margin: '0 auto' }}>

      {/* Header band */}
      <div style={{
        background: isCompleted ? '#111' : isFailed ? '#D93A35' : '#0DA265',
        color: '#fff',
        padding: '24px 28px',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontWeight: 700, fontSize: 9, letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: isCompleted ? FR.yellow : 'rgba(255,255,255,0.7)',
          marginBottom: 10,
        }}>
          ● PAYMENT · {isCompleted ? 'CONFIRMED' : isFailed ? 'FAILED' : 'PROCESSING'}
        </div>
        <div style={{
          fontFamily: 'var(--font-alexandria), Alexandria, sans-serif',
          fontWeight: 900, fontSize: 48, lineHeight: 0.9, letterSpacing: '-0.04em',
        }}>
          {isCompleted ? 'PAID' : isFailed ? 'FAILED' : 'PENDING'}
        </div>
      </div>

      {/* Detail card */}
      <div className="fr-card" style={{ marginTop: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {isCompleted && (
          <div style={{
            padding: '12px 16px',
            border: '1px solid #0DA265',
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 11, color: '#0DA265',
          }}>
            Pago recibido correctamente. Tu pedido ha pasado a producción.
          </div>
        )}

        {!isCompleted && !isFailed && (
          <div style={{
            padding: '12px 16px',
            border: '1px solid #0087B8',
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 11, color: '#0087B8',
          }}>
            Tu pago está siendo procesado. Recibirás confirmación en breve.
          </div>
        )}

        {isFailed && (
          <div style={{
            padding: '12px 16px',
            border: '1px solid #D93A35',
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 11, color: '#D93A35',
          }}>
            El pago no pudo completarse. Vuelve al pedido para intentarlo de nuevo.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
            fontSize: 10, letterSpacing: '0.14em', color: 'rgba(17,17,17,0.5)',
          }}>
            TOTAL
          </span>
          <span style={{
            fontFamily: 'var(--font-alexandria), Alexandria, sans-serif',
            fontWeight: 900, fontSize: 32, letterSpacing: '-0.04em',
            color: isCompleted ? '#0DA265' : '#111',
          }}>
            {fmt(payment.amount)}
          </span>
        </div>

        <div style={{ borderTop: '1px solid #111', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link
            href={`/portal/pedidos/${orderId}`}
            style={{
              display: 'block', textAlign: 'center',
              padding: '10px 20px',
              background: '#111', color: '#fff',
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
              textDecoration: 'none', textTransform: 'uppercase',
            }}
          >
            ← VER PEDIDO
          </Link>
          <Link
            href="/portal"
            style={{
              display: 'block', textAlign: 'center',
              padding: '10px 20px',
              border: '1px solid #111', color: '#111',
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
              textDecoration: 'none', textTransform: 'uppercase',
            }}
          >
            TODOS LOS PEDIDOS
          </Link>
        </div>
      </div>

    </div>
  );
}
