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

  if (error) {
    console.error('[emails page]', error.message);
    return [];
  }
  return (data ?? []) as EmailLog[];
}

const TYPE_LABELS: Record<EmailLog['type'], string> = {
  welcome:            'Bienvenida',
  order_confirmation: 'Confirmación',
  order_shipped:      'Enviado',
  admin_notification: 'Admin',
};

const TYPE_STYLES: Record<EmailLog['type'], string> = {
  welcome:            'text-blue-700 bg-blue-50 border-blue-200',
  order_confirmation: 'text-green-700 bg-green-50 border-green-200',
  order_shipped:      'text-purple-700 bg-purple-50 border-purple-200',
  admin_notification: 'text-gray-600 bg-gray-100 border-gray-200',
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function EmailsPage() {
  const logs = await getLogs();

  const sentCount   = logs.filter((l) => l.status === 'sent').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;

  return (
    <div className="p-6 md:p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-black text-gray-900 tracking-tight">Email</h1>
        <p className="text-sm text-gray-400 mt-0.5">Historial de los últimos 200 envíos</p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total</span>
          <span className="text-[15px] font-black text-gray-900">{logs.length}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-[11px] font-bold uppercase tracking-wider text-green-600">Enviados</span>
          <span className="text-[15px] font-black text-green-700">{sentCount}</span>
        </div>
        {failedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-500">Fallidos</span>
            <span className="text-[15px] font-black text-red-600">{failedCount}</span>
          </div>
        )}
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-40">
            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
          </svg>
          <p className="text-sm">No hay emails registrados todavía</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Tipo</th>
                <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Destinatario</th>
                <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 hidden md:table-cell">Asunto</th>
                <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 hidden lg:table-cell">Cliente</th>
                <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 hidden lg:table-cell">Pedido</th>
                <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Estado</th>
                <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i === logs.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold border rounded-md tracking-wide uppercase ${TYPE_STYLES[log.type]}`}>
                      {TYPE_LABELS[log.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-[12px]">{log.recipient}</td>
                  <td className="px-4 py-3 text-gray-500 text-[12.5px] hidden md:table-cell max-w-[240px] truncate">{log.subject}</td>
                  <td className="px-4 py-3 text-gray-700 text-[12.5px] hidden lg:table-cell">
                    {log.customer?.company_name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {log.order ? (
                      <a
                        href={`/pedidos/${log.order.id}`}
                        className="font-mono text-[11px] text-[#D93A35] hover:underline"
                      >
                        #{log.order.id.slice(0, 8).toUpperCase()}
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {log.status === 'sent' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        Enviado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500" title={log.error ?? undefined}>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                        Error
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-[12px] whitespace-nowrap">{fmt(log.sent_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
