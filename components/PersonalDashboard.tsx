import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, Briefcase, Calendar, CheckCircle2, Clock3,
  ClipboardList, DollarSign, RefreshCw, UserPlus, Users,
} from 'lucide-react';
import { AppView } from '../types';
import { useUser } from '../contexts/UserContext';
import { getAllAppointments, getAllPatients } from '../services/healthService';
import { getAllBillingRecords } from '../services/repasseService';
import { Appointment, Patient } from '../types/health';
import { ConsultationBilling } from '../types/finance';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const todayIso = () => new Date().toISOString().slice(0, 10);
const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const PersonalDashboard: React.FC<{ setView: (view: AppView) => void }> = ({ setView }) => {
  const { user, userProfile } = useUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [billings, setBillings] = useState<ConsultationBilling[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const professionalId = userProfile?.professionalId || user.uid;
      const [appointmentData, patientData, billingData] = await Promise.all([
        getAllAppointments(),
        getAllPatients(),
        getAllBillingRecords(undefined, professionalId),
      ]);
      if (active) {
        setAppointments(appointmentData);
        setPatients(patientData);
        setBillings(billingData);
        setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [user?.uid, userProfile?.professionalId]);

  const metrics = useMemo(() => {
    const today = todayIso();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const monthPrefix = today.slice(0, 7);

    const todayAppointments = appointments
      .filter(item => item.date === today)
      .sort((a, b) => a.time.localeCompare(b.time));
    const upcoming = todayAppointments.filter(item =>
      ['scheduled', 'confirmed'].includes(item.status) &&
      new Date(`${item.date}T${item.time || '00:00'}`).getTime() >= now.getTime()
    );
    const weekAppointments = appointments.filter(item =>
      new Date(`${item.date}T00:00:00`).getTime() >= weekStart.getTime()
    );
    const todayBillings = billings.filter(item => item.consultationDate === today && item.paymentStatus !== 'cancelled');
    const monthBillings = billings.filter(item =>
      item.consultationDate?.startsWith(monthPrefix) && item.paymentStatus !== 'cancelled'
    );
    const pendingPayments = monthBillings.filter(item => item.paymentStatus === 'pending');

    const dailyProduction = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const iso = date.toISOString().slice(0, 10);
      return {
        label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        value: billings
          .filter(item => item.consultationDate === iso && item.paymentStatus !== 'cancelled')
          .reduce((sum, item) => sum + (item.grossAmount || 0), 0),
      };
    });

    return {
      todayAppointments,
      upcoming,
      next: upcoming[0],
      completedToday: todayAppointments.filter(item => item.status === 'completed').length,
      pendingToday: todayAppointments.filter(item => ['scheduled', 'confirmed'].includes(item.status)).length,
      unconfirmedToday: todayAppointments.filter(item => item.status === 'scheduled').length,
      noShowsWeek: weekAppointments.filter(item => item.status === 'cancelled').length,
      completedWeek: weekAppointments.filter(item => item.status === 'completed').length,
      productionToday: todayBillings.reduce((sum, item) => sum + (item.grossAmount || 0), 0),
      productionMonth: monthBillings.reduce((sum, item) => sum + (item.grossAmount || 0), 0),
      repasseMonth: monthBillings.reduce((sum, item) => sum + (item.repasseAmount || 0), 0),
      receivedMonth: monthBillings
        .filter(item => item.paymentStatus === 'received')
        .reduce((sum, item) => sum + (item.repasseAmount || item.grossAmount || 0), 0),
      pendingPaymentCount: pendingPayments.length,
      dailyProduction,
    };
  }, [appointments, billings]);

  const firstName = (userProfile?.displayName || 'Profissional').trim().split(/\s+/)[0];
  const maxProduction = Math.max(...metrics.dailyProduction.map(item => item.value), 1);

  if (loading) {
    return <div className="flex min-h-full items-center justify-center"><RefreshCw className="h-7 w-7 animate-spin text-brand-600" /></div>;
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{greeting()}, {firstName}! 👋</h1>
              <p className="mt-1 text-sm text-slate-500">Aqui está o resumo da sua rotina e da sua produção pessoal.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: 'Consultas hoje', value: metrics.todayAppointments.length, icon: Calendar, tone: 'bg-blue-50 text-blue-600' },
                { label: 'Pendências hoje', value: metrics.pendingToday, icon: ClipboardList, tone: 'bg-red-50 text-red-600' },
                { label: 'Produção hoje', value: currency.format(metrics.productionToday), icon: DollarSign, tone: 'bg-emerald-50 text-emerald-600' },
                { label: 'Repasse previsto', value: currency.format(metrics.repasseMonth), icon: Briefcase, tone: 'bg-violet-50 text-violet-600' },
              ].map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="flex min-w-[170px] items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <div className={`rounded-lg p-2 ${tone}`}><Icon className="h-5 w-5" /></div>
                  <div><p className="text-lg font-bold text-slate-900">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">Próximo atendimento</h2><Clock3 className="h-5 w-5 text-brand-600" /></div>
            {metrics.next ? (
              <div className="mt-5">
                <p className="text-xl font-bold text-slate-900">{metrics.next.patientName || 'Paciente'}</p>
                <p className="mt-1 text-sm text-slate-500">{metrics.next.serviceName || metrics.next.specialty || 'Atendimento'}</p>
                <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <span className="font-semibold">{metrics.next.time}</span>
                  <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />{metrics.next.status === 'confirmed' ? 'Confirmado' : 'Agendado'}</span>
                </div>
              </div>
            ) : <p className="mt-8 text-sm text-slate-500">Nenhum atendimento futuro para hoje.</p>}
            <button onClick={() => setView(AppView.APPOINTMENTS)} className="mt-5 w-full rounded-lg border border-slate-200 py-2 text-sm font-semibold hover:bg-slate-50">Ver agenda</button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between"><h2 className="font-bold text-slate-900">Agenda de hoje</h2><span className="text-sm text-slate-500">{metrics.todayAppointments.length} consultas</span></div>
            <div className="mt-4 space-y-2">
              {metrics.todayAppointments.slice(0, 4).map(item => (
                <div key={item.id} className="grid grid-cols-[55px_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                  <span className="text-sm font-bold">{item.time}</span>
                  <div><p className="text-sm font-semibold">{item.patientName || 'Paciente'}</p><p className="text-xs text-slate-500">{item.serviceName || item.specialty}</p></div>
                  <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : item.status === 'confirmed' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                    {item.status === 'completed' ? 'Realizado' : item.status === 'confirmed' ? 'Confirmado' : item.status === 'cancelled' ? 'Cancelado' : 'Aguardando'}
                  </span>
                </div>
              ))}
              {metrics.todayAppointments.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Agenda livre hoje.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Pendências e alertas</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between"><span className="text-sm">Não confirmadas hoje</span><strong className="text-amber-600">{metrics.unconfirmedToday}</strong></div>
              <div className="flex items-center justify-between"><span className="text-sm">Pagamentos pendentes</span><strong className="text-red-600">{metrics.pendingPaymentCount}</strong></div>
              <div className="flex items-center justify-between"><span className="text-sm">Cancelamentos na semana</span><strong className="text-slate-700">{metrics.noShowsWeek}</strong></div>
            </div>
            {(metrics.unconfirmedToday + metrics.pendingPaymentCount + metrics.noShowsWeek) === 0 && (
              <div className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />Sem pendências relevantes.</div>
            )}
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Minha produção — últimos 7 dias</h2><p className="mt-1 text-2xl font-bold">{currency.format(metrics.dailyProduction.reduce((sum, item) => sum + item.value, 0))}</p></div><BarChart3 className="h-6 w-6 text-brand-600" /></div>
            <div className="mt-6 flex h-40 items-end gap-3">
              {metrics.dailyProduction.map(item => (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t bg-brand-500" style={{ height: `${Math.max(4, (item.value / maxProduction) * 110)}px` }} title={currency.format(item.value)} />
                  <span className="text-xs capitalize text-slate-500">{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Resumo pessoal do mês</h2>
            <div className="mt-5 space-y-4">
              <div><p className="text-xs text-slate-500">Produção gerada</p><p className="text-xl font-bold">{currency.format(metrics.productionMonth)}</p></div>
              <div><p className="text-xs text-slate-500">Repasse previsto</p><p className="text-xl font-bold text-violet-700">{currency.format(metrics.repasseMonth)}</p></div>
              <div><p className="text-xs text-slate-500">Valores recebidos</p><p className="text-xl font-bold text-emerald-700">{currency.format(metrics.receivedMonth)}</p></div>
              <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">Somente valores vinculados à sua produção.</p>
            </div>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Atalhos rápidos</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Cadastro de Pacientes', view: AppView.PATIENTS, icon: UserPlus },
                { label: 'Nova consulta', view: AppView.APPOINTMENTS, icon: Calendar },
                { label: 'Controle de Atendimentos', view: AppView.ATTENDANCES, icon: ClipboardList },
                { label: 'Produção', view: AppView.PRODUCTION_ENTRY, icon: DollarSign },
              ].map(({ label, view, icon: Icon }) => (
                <button key={label} onClick={() => setView(view)} className="rounded-xl bg-slate-50 p-4 text-center hover:bg-brand-50">
                  <Icon className="mx-auto h-5 w-5 text-brand-600" /><span className="mt-2 block text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Resumo da semana</h2>
            <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 text-center">
              <div><p className="text-2xl font-bold">{metrics.completedWeek}</p><p className="text-xs text-slate-500">Realizados</p></div>
              <div><p className="text-2xl font-bold">{metrics.noShowsWeek}</p><p className="text-xs text-slate-500">Cancelados</p></div>
              <div><p className="text-2xl font-bold">{patients.length}</p><p className="text-xs text-slate-500">Meus pacientes</p></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PersonalDashboard;
