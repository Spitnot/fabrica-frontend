import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type EmailLog = {
  id: string;
  type: 'welcome' | 'order_confirmation' | 'order_shipped' | 'admin_notification';
  recipient: string;
  subject: string;
  status: 'sent' | 'failed';
  error: string | null;
  sent_at: string;
  customer: { company_name: string } | null;
  order: { id: string } | null;
};

async function getLogs(): Promise<EmailLog[]> {
  const { data, error } = await supabaseAdmin
    .from('email_logs')
    .select('*, customer:customers(company_name), order:orders(id)')
    .order('sent_at', { ascending: false })
    .limit(200);
  if (error) console.error('[emails page]', error.message);
  return (data ?? []) as EmailLog[];
}

const TYPE_LABELS: Record<string, string> = {
  welcome:               'Welcome',
  order_confirmation:    'Confirmed',
  order_shipped:         'Shipped',
  order_ready_to_pay:    'Pay Now',
  admin_notification:    'Admin',
  admin_invite:          'Team invite',
  customer_invite:       'Invite',
  reset_password:        'Reset',
};

const TYPE_COLORS: Record<string, string> = {
  welcome:               '#0087B8',
  order_confirmation:    '#0DA265',
  order_shipped:         '#876693',
  order_ready_to_pay:    '#E6883E',
  admin_notification:    '#111',
  admin_invite:          '#E6883E',
  customer_invite:       '#0087B8',
  reset_password:        '#111',
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function EmailsPage() {
  const logs = await getLogs();
  const sentCount   = logs.filter(l => l.status === 'sent').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;

  return (
    <div className="fr-page">

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="fr-label">{logs.length} records</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>Emails</h1>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <div className="fr-card" style={{ borderLeft: '3px solid #111', padding: '14px 16px' }}>
          <div className="fr-label" style={{ marginBottom: 4 }}>Total</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#111', lineHeight: 1 }}>{logs.length}</div>
        </div>
        <div className="fr-card" style={{ borderLeft: '3px solid #0DA265', padding: '14px 16px' }}>
          <div className="fr-label" style={{ marginBottom: 4 }}>Sent</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0DA265', lineHeight: 1 }}>{sentCount}</div>
        </div>
        <div className="fr-card" style={{ borderLeft: `3px solid ${failedCount > 0 ? '#D93A35' : '#111'}`, padding: '14px 16px' }}>
          <div className="fr-label" style={{ marginBottom: 4 }}>Failed</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: failedCount > 0 ? '#D93A35' : '#111', lineHeight: 1 }}>{failedCount}</div>
        </div>
      </div>

      {/* Email log */}
      {logs.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 12, color: '#111' }}>No emails logged yet.</div>
      ) : (
        <div className="fr-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="fr-email-hd" style={{ display: 'grid', gridTemplateColumns: '90px 1fr 110px 130px 70px', gap: 8, padding: '8px 14px', background: '#111' }}>
            <style>{`@media(max-width:600px){.fr-email-hd{display:none!important}}`}</style>
            {['Type', 'Recipient / Subject', 'Company', 'Date', 'Status'].map(h => (
              <div key={h} style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff' }}>{h}</div>
            ))}
          </div>

          {logs.map((log, i) => (
            <div
              key={log.id}
              className="fr-email-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 110px 130px 70px',
                gap: 8,
                padding: '10px 14px',
                background: '#fff',
                borderBottom: i < logs.length - 1 ? '1px solid #111' : 'none',
                alignItems: 'start',
              }}
            >
              <style>{`@media(max-width:600px){.fr-email-row{grid-template-columns:1fr!important}.fr-email-col-hide{display:none!important}}`}</style>

              {/* Type */}
              <div style={{ overflow: 'hidden' }}>
                <span className="badge" style={{ background: TYPE_COLORS[log.type] ?? '#111', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', whiteSpace: 'nowrap' }}>
                  {TYPE_LABELS[log.type] ?? log.type.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Recipient + subject */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.recipient}
                </div>
                <div className="fr-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {log.subject}
                </div>
                <div className="fr-email-mobile" style={{ display: 'none', marginTop: 4, fontSize: 9, color: '#111' }}>
                  <style>{`.fr-email-mobile{display:none!important}@media(max-width:600px){.fr-email-mobile{display:flex!important;gap:8px;flex-wrap:wrap;align-items:center}}`}</style>
                  {log.customer?.company_name && <span>{log.customer.company_name}</span>}
                  <span>{fmt(log.sent_at)}</span>
                  <span className="badge" style={{ background: log.status === 'sent' ? '#0DA265' : '#D93A35' }}>{log.status}</span>
                </div>
                {log.status === 'failed' && log.error && (
                  <div style={{ fontSize: 9, color: '#D93A35', marginTop: 3, fontFamily: 'monospace' }}>⚠ {log.error.slice(0, 80)}</div>
                )}
              </div>

              {/* Company */}
              <div className="fr-email-col-hide fr-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.customer?.company_name ?? '—'}
              </div>

              {/* Date */}
              <div className="fr-email-col-hide fr-label" style={{ whiteSpace: 'nowrap' }}>
                {fmt(log.sent_at)}
              </div>

              {/* Status */}
              <div className="fr-email-col-hide">
                <span className="badge" style={{ background: log.status === 'sent' ? '#0DA265' : '#D93A35' }}>
                  {log.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
