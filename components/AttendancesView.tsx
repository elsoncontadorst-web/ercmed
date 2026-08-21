import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, RefreshCw, CalendarDays, Receipt, UserRound } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getAllAppointments } from '../services/healthService';
import { getAllBillingRecords } from '../services/repasseService';
import { Appointment } from '../types/health';
import { ConsultationBilling } from '../types/finance';
import { AppView } from '../types';
import { getManagerIdForUser } from '../services/accessControlService';

interface AttendancesViewProps {
  setView?: (view: AppView) => void;
}

const AttendancesView: React.FC<AttendancesViewProps> = ({ setView }) => {
  const { user } = useUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [billings, setBillings] = useState<ConsultationBilling[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const managerId = await getManagerIdForUser(user.uid);
      const ownerId = managerId || user.uid;
      const [appointmentsData, billingData] = await Promise.all([
        getAllAppointments(ownerId),
        getAllBillingRecords(ownerId)
      ]);
      setAppointments(appointmentsData);
      setBillings(billingData);
    } catch (error) {
      console.error('Erro ao carregar atendimentos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.uid]);

  const rows = useMemo(() => {
    return appointments
      .map(appointment => {
        const linkedBilling = billings.find(item => item.sourceAppointmentId === appointment.id);
        return {
          ...appointment,
          billingStatus: linkedBilling?.paymentStatus || null,
          billedValue: linkedBilling?.grossAmount || 0,
          serviceName: linkedBilling?.serviceName || appointment.serviceName || '-',
        };
      })
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }, [appointments, billings]);

  const totals = useMemo(() => ({
    total: rows.length,
    completed: rows.filter(item => item.status === 'completed').length,
    pendingBilling: rows.filter(item => item.status === 'completed' && item.billingStatus !== 'received').length,
    received: rows.filter(item => item.billingStatus === 'received').length,
  }), [rows]);

  const statusLabel: Record<string, string> = {
    scheduled: 'Agendado',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
    no_show: 'Falta',
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-3 sm:space-y-6 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <ClipboardCheck className="text-teal-600" />
            Atendimentos
          </h1>
          <p className="mt-1 text-slate-500">Entidade operacional do ERP para acompanhar atendimento, produção e reflexo financeiro.</p>
        </div>
        <button onClick={loadData} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Atualizar
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard icon={CalendarDays} label="Total no período" value={String(totals.total)} tone="slate" />
        <StatCard icon={ClipboardCheck} label="Finalizados" value={String(totals.completed)} tone="emerald" />
        <StatCard icon={Receipt} label="Aguardando faturamento" value={String(totals.pendingBilling)} tone="amber" />
        <StatCard icon={UserRound} label="Recebidos" value={String(totals.received)} tone="blue" />
      </section>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Painel operacional</h2>
            <p className="text-sm text-slate-500">Cada atendimento pode refletir em faturamento, financeiro e repasse.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button onClick={() => setView?.(AppView.APPOINTMENTS)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Ver agenda
            </button>
            <button onClick={() => setView?.(AppView.PRODUCTION_ENTRY)} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
              Registrar produção
            </button>
          </div>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {rows.length === 0 ? <p className="py-8 text-center text-slate-500">Nenhum atendimento encontrado.</p> : rows.map(row => <article key={row.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-slate-900">{row.patientName}</h3><p className="text-xs text-slate-500">{new Date(`${row.date}T00:00:00`).toLocaleDateString('pt-BR')} às {row.time}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{statusLabel[row.status] || row.status}</span></div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-slate-400">Profissional</p><p className="truncate text-slate-700">{row.professionalName || '—'}</p></div><div><p className="text-xs text-slate-400">Serviço</p><p className="truncate text-slate-700">{row.serviceName || '—'}</p></div></div>
            <div className="mt-3 border-t pt-3">{row.billingStatus ? <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.billingStatus === 'received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{row.billingStatus === 'received' ? 'Recebido' : 'Faturamento pendente'}{row.billedValue > 0 ? ` · R$ ${row.billedValue.toLocaleString('pt-BR')}` : ''}</span> : <span className="text-xs text-slate-400">Sem reflexo financeiro ainda</span>}</div>
          </article>)}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Profissional</th>
                <th className="px-4 py-3">Serviço</th>
                <th className="px-4 py-3">Status operacional</th>
                <th className="px-4 py-3">Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">Nenhum atendimento encontrado.</td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 text-sm text-slate-600">{new Date(`${row.date}T00:00:00`).toLocaleDateString('pt-BR')}<div className="text-xs text-slate-400">{row.time}</div></td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.patientName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.professionalName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.serviceName || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {statusLabel[row.status] || row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.billingStatus ? (
                        <div>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.billingStatus === 'received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {row.billingStatus === 'received' ? 'Recebido' : 'Pendente'}
                          </span>
                          {row.billedValue > 0 && <div className="mt-1 text-xs text-slate-500">R$ {row.billedValue.toLocaleString('pt-BR')}</div>}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Sem reflexo ainda</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: 'slate' | 'emerald' | 'amber' | 'blue' }) => {
  const tones = {
    slate: 'bg-slate-50 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700'
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex rounded-lg p-2 ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
};

export default AttendancesView;
