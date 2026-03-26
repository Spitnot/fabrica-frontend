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
  welcome:            'Welcome',
  order_confirmation: 'Confirmed',
  order_shipped:      'Shipped',
  admin_notification: 'Admin',
  admin_invite:       'Team invite',
};

const TYPE_COLORS: Record<string, string> = {
  welcome:            '#0087B8',
  order_confirmation: '#0DA265',
  order_shipped:      '#876693',
  admin_notification: '#999',
  admin_invite:       '#E6883E',
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
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid #111', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Emails</div>
          <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>Last 200 transactional emails</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        <div className="card" style={{ borderLeft: '3px solid #111' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 4 }}>Total</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#111', lineHeight: 1 }}>{logs.length}</div>
        </div>
        <div className="card" style={{ borderLeft: '3px solid #0DA265' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 4 }}>Sent</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#0DA265', lineHeight: 1 }}>{sentCount}</div>
        </div>
        <div className="card" style={{ borderLeft: `3px solid ${failedCount > 0 ? '#D93A35' : '#eee'}` }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#aaa', marginBottom: 4 }}>Failed</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: failedCount > 0 ? '#D93A35' : '#ccc', lineHeight: 1 }}>{failedCount}</div>
        </div>
      </div>

      {/* Email log — cards on mobile, compact list on desktop */}
      {logs.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', fontSize: 12, color: '#aaa' }}>No emails logged yet.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Desktop header */}
          <div className="fr-email-hd" style={{ display: 'grid', gridTemplateColumns: '90px 1fr 110px 130px 70px', gap: 8, padding: '8px 14px', background: '#111' }}>
            <style>{`@media(max-width:600px){.fr-email-hd{display:none!important}}`}</style>
            {['Type', 'Recipient / Subject', 'Company', 'Date', 'Status'].map(h => (
              <div key={h} style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff' }}>{h}</div>
            ))}
          </div>

          {logs.map((log, i) => (
            <div
              key={log.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 110px 130px 70px',
                gap: 8,
                padding: '10px 14px',
                background: log.status === 'failed' ? '#fff8f8' : '#fff',
                borderBottom: i < logs.length - 1 ? '1px solid #f5f5f5' : 'none',
                alignItems: 'start',
              }}
              className="fr-email-row"
            >
              <style>{`@media(max-width:600px){.fr-email-row{grid-template-columns:1fr!important}.fr-email-col-hide{display:none!important}}`}</style>

              {/* Type */}
              <div>
                <span className="badge" style={{ background: TYPE_COLORS[log.type] ?? '#999' }}>
                  {TYPE_LABELS[log.type] ?? log.type}
                </span>
              </div>

              {/* Recipient + subject */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.recipient}
                </div>
                <div style={{ fontSize: 10, color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {log.subject}
                </div>
                {/* Mobile extra */}
                <div className="fr-email-mobile" style={{ display: 'none', marginTop: 4, fontSize: 9, color: '#aaa' }}>
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
              <div className="fr-email-col-hide" style={{ fontSize: 10, color: '#777', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.customer?.company_name ?? '—'}
              </div>

              {/* Date */}
              <div className="fr-email-col-hide" style={{ fontSize: 9, color: '#bbb', whiteSpace: 'nowrap' }}>
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
