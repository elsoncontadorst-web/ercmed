import React, { useEffect, useMemo, useState } from 'react';
import {
  Banknote, CalendarDays, Check, ChevronLeft, ChevronRight, CircleDollarSign,
  Clock3, CreditCard, FileText, Loader2, MoreHorizontal, Plus, Printer,
  QrCode, ReceiptText, Search, ShieldCheck, Stethoscope, Users, X,
} from 'lucide-react';
import { AppView } from '../types';
import { Appointment, Patient } from '../types/health';
import { Professional } from '../types/finance';
import { auth } from '../services/firebase';
import { addAppointment, addPatient, getAllAppointments, getAllPatients, updateAppointment } from '../services/healthService';
import { getAllUsers } from '../services/userManagementService';
import { getSchedulingProfessionals } from '../services/schedulingProfessionalService';
import { addReceipt } from '../services/receiptsService';
import { addTransaction, getTransactions, SavedTransaction } from '../services/userDataService';
import { getManagerIdForUser } from '../services/accessControlService';
import { getActiveClinicScopeId } from '../services/activeClinicStorage';
import { getClinicServices, resolveClinicServicePrice } from '../services/clinicErpService';
import { getClinics } from '../services/clinicService';
import { ClinicService } from '../types/clinicErp';

type Filter = 'all' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
type PaymentMethod = NonNullable<SavedTransaction['paymentMethod']>;

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateLabel = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  const today = isoDate(new Date());
  const prefix = value === today ? 'Hoje, ' : '';
  return prefix + new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
};
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'PA';
const statusMeta: Record<Appointment['status'], { label: string; dot: string; border: string }> = {
  scheduled: { label: 'Aguardando', dot: 'bg-amber-400', border: 'border-l-amber-400' },
  confirmed: { label: 'Confirmado', dot: 'bg-emerald-500', border: 'border-l-emerald-400' },
  completed: { label: 'Atendido', dot: 'bg-blue-500', border: 'border-l-blue-400' },
  cancelled: { label: 'Cancelado', dot: 'bg-rose-400', border: 'border-l-rose-300' },
};

const paymentOptions: Array<{ value: PaymentMethod; label: string; icon: React.ElementType }> = [
  { value: 'pix', label: 'PIX', icon: QrCode },
  { value: 'cash', label: 'Dinheiro', icon: Banknote },
  { value: 'debit_card', label: 'Débito', icon: CreditCard },
  { value: 'credit_card', label: 'Crédito', icon: CreditCard },
  { value: 'bank_transfer', label: 'Transferência', icon: CircleDollarSign },
  { value: 'other', label: 'Outro', icon: MoreHorizontal },
];

const ReceptionCashierView: React.FC<{ setView: (view: AppView) => void }> = ({ setView }) => {
  const [date, setDate] = useState(isoDate(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [catalogServices, setCatalogServices] = useState<ClinicService[]>([]);
  const [activeUnitName, setActiveUnitName] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [transactions, setTransactions] = useState<SavedTransaction[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    patientId: '', patientName: '', patientPhone: '', patientCpf: '', newPatient: false,
    professionalId: '', professionalName: '', specialty: '', serviceId: '', serviceName: '',
    date: isoDate(new Date()), time: '', amount: '', notes: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [amount, setAmount] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [emitReceipt, setEmitReceipt] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoading(true);
    const managerId = await getManagerIdForUser(uid);
    const effectiveOwner = managerId || uid;
    setOwnerId(effectiveOwner);
    const clinicId = getActiveClinicScopeId() || undefined;
    const [items, financial, patientItems, teamUsers, partnerProfessionals, services, clinics] = await Promise.all([
      getAllAppointments(effectiveOwner), getTransactions(effectiveOwner), getAllPatients(effectiveOwner), getAllUsers(effectiveOwner), getSchedulingProfessionals(effectiveOwner, clinicId), getClinicServices(effectiveOwner), getClinics(effectiveOwner),
    ]);
    setAppointments(items);
    setTransactions(financial);
    setPatients(patientItems);
    setCatalogServices(services);
    setActiveUnitName(clinics.find(item => item.id === clinicId)?.name || '');
    const teamProfessionals: Professional[] = teamUsers
      .filter(item => ['professional', 'health_professional', 'autonomous_provider'].includes(item.role) && !['inactive', 'rejected'].includes(item.status))
      .filter(item => !clinicId || item.clinicId === clinicId || item.clinicIds?.includes(clinicId))
      .map(item => ({
        id: item.professionalId || item.id, userId: item.id, name: item.professionalName || item.name,
        email: item.email || '', specialty: item.specialty || 'Profissional de Saúde', role: item.specialty || 'Profissional de Saúde',
        repasseConfig: { taxRate: 0, splitPercentage: 0, roomRentalAmount: 0, customDeductions: [] },
        active: true, clinicId: item.clinicId, clinicIds: item.clinicIds, createdAt: item.createdAt, updatedAt: item.updatedAt,
      }));
    const knownIds = new Set(teamProfessionals.map(item => item.id));
    setProfessionals([...teamProfessionals, ...partnerProfessionals.filter(item => !knownIds.has(item.id)).map(item => ({
      id: item.id, name: item.name, email: '', phone: item.phone, specialty: item.specialty, role: item.specialty,
      repasseConfig: { taxRate: 0, splitPercentage: 0, roomRentalAmount: 0, customDeductions: [] },
      active: true, clinicId: item.clinicId, createdAt: null, updatedAt: null,
    }))].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const paidByAppointment = useMemo(() => new Map(
    transactions.filter(item => item.sourceAppointmentId && item.status === 'paid').map(item => [item.sourceAppointmentId!, item])
  ), [transactions]);

  const activeClinicId = getActiveClinicScopeId();
  const scopedAppointments = useMemo(() => activeClinicId ? appointments.filter(item => item.clinicId === activeClinicId) : appointments, [activeClinicId, appointments]);

  const dayItems = useMemo(() => scopedAppointments
    .filter(item => item.date === date)
    .filter(item => filter === 'all' || item.status === filter)
    .filter(item => `${item.patientName || ''} ${item.patientPhone || ''} ${item.patientCpf || ''} ${item.professionalName}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.time.localeCompare(b.time)), [scopedAppointments, date, filter, search]);

  const allDayItems = useMemo(() => scopedAppointments.filter(item => item.date === date), [scopedAppointments, date]);
  const dayTransactions = useMemo(() => transactions.filter(item => item.type === 'income' && (item.receivedAt || item.date) === date && item.status === 'paid' && (!activeClinicId || item.clinicId === activeClinicId)), [transactions, date, activeClinicId]);
  const received = dayTransactions.reduce((sum, item) => sum + item.amount, 0);
  const pending = allDayItems.filter(item => !paidByAppointment.has(item.id) && item.status !== 'cancelled').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const average = dayTransactions.length ? received / dayTransactions.length : 0;

  const moveDate = (days: number) => {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + days);
    setDate(isoDate(next));
  };

  const openPayment = (appointment: Appointment) => {
    setShowSchedule(false);
    setSelected(appointment);
    setPaymentMethod('pix');
    setDiscount('0');
    setAmount(String(Number(appointment.amount || 0)));
    setMessage('');
  };

  const openSchedule = () => {
    setSelected(null);
    setShowSchedule(true);
    setServiceSearch('');
    setCatalogOpen(false);
    setMessage('');
    setScheduleForm({
      patientId: '', patientName: '', patientPhone: '', patientCpf: '', newPatient: false,
      professionalId: '', professionalName: '', specialty: '', serviceId: '', serviceName: '',
      date, time: '', amount: '', notes: '',
    });
  };

  const choosePatient = (patientId: string) => {
    const patient = patients.find(item => item.id === patientId);
    setScheduleForm(current => patient ? {
      ...current, patientId: patient.id, patientName: patient.name, patientPhone: patient.phone || '', patientCpf: patient.cpf || '', newPatient: false,
    } : { ...current, patientId: '', patientName: '', patientPhone: '', patientCpf: '' });
  };

  const chooseProfessional = (professionalId: string) => {
    const professional = professionals.find(item => item.id === professionalId);
    setScheduleForm(current => professional ? {
      ...current, professionalId: professional.id, professionalName: professional.name, specialty: professional.specialty || professional.role || '',
      serviceId: '', serviceName: '', amount: '',
    } : { ...current, professionalId: '', professionalName: '', specialty: '', serviceId: '', serviceName: '', amount: '' });
    setServiceSearch('');
  };

  const availableCatalogServices = useMemo(() => {
    const term = serviceSearch.trim().toLocaleLowerCase('pt-BR');
    const applicable = catalogServices.filter(service => {
      const privatePayer = service.payers?.length ? service.payers.includes('private') : service.payer === 'private';
      return service.active && privatePayer &&
        (!service.effectiveFrom || service.effectiveFrom <= scheduleForm.date) &&
        (!service.effectiveTo || service.effectiveTo >= scheduleForm.date) &&
        (!service.professionalId || service.professionalId === scheduleForm.professionalId) &&
        (!service.specialty || !scheduleForm.specialty || service.specialty === scheduleForm.specialty) &&
        (!service.unitName || !activeUnitName || service.unitName === activeUnitName) &&
        (!term || `${service.name} ${service.code || ''} ${service.category || ''}`.toLocaleLowerCase('pt-BR').includes(term));
    });
    const unique = new Map<string, ClinicService>();
    applicable.forEach(service => { if (!unique.has(`${service.code}|${service.name}`)) unique.set(`${service.code}|${service.name}`, service); });
    return [...unique.values()].slice(0, 12);
  }, [activeUnitName, catalogServices, scheduleForm.date, scheduleForm.professionalId, scheduleForm.specialty, serviceSearch]);

  const chooseCatalogService = async (service: ClinicService) => {
    const resolved = await resolveClinicServicePrice(ownerId, service.id, {
      payer: 'private', date: scheduleForm.date, professionalId: scheduleForm.professionalId || undefined,
      specialty: scheduleForm.specialty || undefined, unitName: activeUnitName || undefined,
    });
    const selectedService = resolved || service;
    setScheduleForm(current => ({
      ...current, serviceId: selectedService.id, serviceName: selectedService.name,
      specialty: current.specialty || selectedService.specialty || selectedService.category,
      amount: String(selectedService.grossPrice || 0).replace('.', ','),
    }));
    setServiceSearch(selectedService.name);
    setCatalogOpen(false);
  };

  const saveSchedule = async () => {
    if (!ownerId) return;
    if (!scheduleForm.patientName.trim()) { setMessage('Selecione ou informe o paciente.'); return; }
    if (!scheduleForm.professionalId || !scheduleForm.date || !scheduleForm.time) { setMessage('Informe profissional, data e horário.'); return; }
    const occupied = appointments.some(item =>
      item.professionalId === scheduleForm.professionalId && item.date === scheduleForm.date &&
      item.time === scheduleForm.time && item.status !== 'cancelled'
    );
    if (occupied) { setMessage('Este profissional já possui um atendimento nesse horário.'); return; }
    setSaving(true);
    setMessage('');
    try {
      const clinicId = getActiveClinicScopeId() || undefined;
      let patientId = scheduleForm.patientId;
      if (scheduleForm.newPatient || !patientId) {
        const createdPatientId = await addPatient({
          name: scheduleForm.patientName.trim(), phone: scheduleForm.patientPhone.trim(),
          ...(scheduleForm.patientCpf.trim() ? { cpf: scheduleForm.patientCpf.trim() } : {}),
          birthdate: '', isMinor: false, active: true, ...(clinicId ? { clinicId } : {}),
        });
        if (!createdPatientId) throw new Error('Não foi possível cadastrar o paciente.');
        patientId = createdPatientId;
      }
      const appointmentId = await addAppointment(ownerId, {
        managerId: ownerId, patientId, patientName: scheduleForm.patientName.trim(),
        patientPhone: scheduleForm.patientPhone.trim(),
        ...(scheduleForm.patientCpf.trim() ? { patientCpf: scheduleForm.patientCpf.trim() } : {}),
        professionalId: scheduleForm.professionalId, professionalName: scheduleForm.professionalName,
        specialty: scheduleForm.specialty || 'Atendimento', serviceName: scheduleForm.serviceName.trim() || scheduleForm.specialty || 'Atendimento',
        ...(scheduleForm.serviceId ? { serviceId: scheduleForm.serviceId } : {}),
        date: scheduleForm.date, time: scheduleForm.time, status: 'scheduled',
        amount: Math.max(0, Number(scheduleForm.amount.replace(',', '.')) || 0),
        ...(scheduleForm.notes.trim() ? { notes: scheduleForm.notes.trim() } : {}),
        ...(clinicId ? { clinicId } : {}),
      });
      if (!appointmentId) throw new Error('Não foi possível criar o agendamento.');
      setDate(scheduleForm.date);
      await load();
      setShowSchedule(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o agendamento.');
    } finally { setSaving(false); }
  };

  const changeStatus = async (appointment: Appointment, status: Appointment['status']) => {
    const ok = await updateAppointment(appointment.userId, appointment.id, { status });
    if (ok) setAppointments(current => current.map(item => item.id === appointment.id ? { ...item, status } : item));
  };

  const confirmPayment = async () => {
    if (!selected || !ownerId) return;
    const gross = Math.max(0, Number(amount.replace(',', '.')) || 0);
    const discountValue = Math.max(0, Number(discount.replace(',', '.')) || 0);
    const total = Math.max(0, gross - discountValue);
    if (total <= 0) { setMessage('Informe um valor de pagamento maior que zero.'); return; }
    setSaving(true);
    setMessage('');
    try {
      const existing = paidByAppointment.get(selected.id);
      if (existing) { setMessage('Este atendimento já possui pagamento registrado.'); setSaving(false); return; }
      const transactionId = await addTransaction(ownerId, {
        date, receivedAt: date, dueDate: date,
        description: `${selected.serviceName || selected.specialty || 'Atendimento'} — ${selected.patientName || 'Paciente'}`,
        category: 'Receita de atendimentos', costCenter: 'Atendimento', resultCenter: 'Operação', revenueUnit: 'clinical',
        amount: total, type: 'income', status: 'paid', paymentMethod,
        sourceType: 'manual', sourceAppointmentId: selected.id,
        professionalId: selected.professionalId, professionalName: selected.professionalName,
        clinicId: selected.clinicId || getActiveClinicScopeId() || undefined,
        settlementNotes: discountValue ? `Valor original: ${money(gross)}; desconto: ${money(discountValue)}` : undefined,
      });
      if (!transactionId) throw new Error('Não foi possível criar o lançamento financeiro.');
      if (emitReceipt) {
        const receiptMethod = paymentMethod === 'cash' ? 'cash' : paymentMethod === 'pix' ? 'pix' : paymentMethod === 'bank_transfer' ? 'transfer' : 'card';
        await addReceipt(ownerId, {
          userId: ownerId,
          patientId: selected.patientId, patientName: selected.patientName || 'Paciente', patientCpf: selected.patientCpf,
          amount: total, description: selected.serviceName || selected.specialty || 'Atendimento', paymentMethod: receiptMethod,
          referenceDate: date, issueDate: isoDate(new Date()), relatedAppointmentId: selected.id,
          professionalName: selected.professionalName, clinicId: selected.clinicId || getActiveClinicScopeId() || undefined,
          paymentDate: new Date().toISOString(),
          notes: discountValue ? `Desconto concedido: ${money(discountValue)}` : undefined,
        });
      }
      await changeStatus(selected, 'completed');
      await load();
      setSelected(null);
      if (window.confirm('Pagamento confirmado. Deseja emitir a Nota Fiscal de Serviço (NFS-e) agora?')) {
        sessionStorage.setItem('ercmed:nfse-financial-draft', JSON.stringify({
          transactionId, clinicId: selected.clinicId || getActiveClinicScopeId() || '',
          customerName: selected.patientName || '', customerDocument: selected.patientCpf || '',
          description: selected.serviceName || selected.specialty || 'Atendimento', amount: total,
          competenceDate: selected.date || date,
        }));
        setView(AppView.NFSE);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível confirmar o pagamento.');
    } finally { setSaving(false); }
  };

  const printList = () => window.print();
  const total = Math.max(0, (Number(amount.replace(',', '.')) || 0) - (Number(discount.replace(',', '.')) || 0));

  return (
    <div className="min-h-full bg-slate-50 p-4 text-slate-900 sm:p-6 print:bg-white">
      <div className={`mx-auto max-w-[1440px] ${selected ? 'xl:pr-[380px]' : ''}`}>
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Operação</p><h1 className="text-2xl font-extrabold">Recepção / Caixa</h1><p className="mt-1 text-sm text-slate-500">Gerencie agendamentos e receba pagamentos em um só lugar.</p></div>
          <div className="flex gap-2 print:hidden"><button onClick={printList} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:border-teal-300"><Printer className="h-4 w-4"/> Imprimir lista</button><button onClick={openSchedule} className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-teal-900/10 hover:bg-teal-800"><Plus className="h-4 w-4"/> Agendar</button></div>
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-[305px_1fr] print:hidden">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"><CalendarDays className="h-5 w-5 text-teal-700"/><button onClick={() => moveDate(-1)} className="rounded-lg p-2 hover:bg-slate-100"><ChevronLeft className="h-4 w-4"/></button><button onClick={() => setDate(isoDate(new Date()))} className="text-sm font-bold capitalize">{dateLabel(date)}</button><button onClick={() => moveDate(1)} className="rounded-lg p-2 hover:bg-slate-100"><ChevronRight className="h-4 w-4"/></button></div>
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm md:flex-row md:items-center">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente, CPF ou telefone..." className="w-full rounded-lg bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none ring-teal-200 focus:ring-2"/></div>
            <div className="flex gap-1 overflow-x-auto">{(['all','scheduled','confirmed','completed','cancelled'] as Filter[]).map(key => <button key={key} onClick={() => setFilter(key)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${filter === key ? 'bg-teal-100 text-teal-800' : 'text-slate-500 hover:bg-slate-50'}`}>{key === 'all' ? 'Todos' : statusMeta[key].label}</button>)}</div>
          </div>
        </div>

        {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-teal-600"/></div> : dayItems.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><CalendarDays className="mx-auto mb-3 h-10 w-10 text-slate-300"/><h2 className="font-bold text-slate-700">Nenhum agendamento encontrado</h2><p className="mt-1 text-sm text-slate-500">Altere a data ou os filtros para consultar a agenda.</p></div> : <div className="space-y-3">{dayItems.map((item, index) => {
          const status = statusMeta[item.status]; const paid = paidByAppointment.has(item.id);
          return <article key={item.id} className={`grid gap-4 rounded-2xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md md:grid-cols-[64px_1.25fr_1.1fr_.8fr_110px] md:items-center ${status.border} ${item.status === 'cancelled' ? 'opacity-60' : ''}`}>
            <div><p className="text-xl font-extrabold">{item.time}</p><p className="text-xs text-slate-500">{index ? '30min' : 'Horário'}</p></div>
            <div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">{initials(item.patientName)}</div><div className="min-w-0"><p className="truncate font-bold">{item.patientName || 'Paciente'}</p><p className="truncate text-xs text-slate-500">{item.patientPhone || item.patientCpf || 'Contato não informado'}</p></div></div>
            <div className="border-slate-100 md:border-l md:pl-4"><p className="font-bold">{item.serviceName || item.specialty || 'Atendimento'}</p><p className="text-xs text-slate-500">{item.professionalName}</p></div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600"><span className={`h-2 w-2 rounded-full ${paid ? 'bg-blue-500' : status.dot}`}/>{paid ? 'Pago' : status.label}</div>
            <div className="text-right"><p className="mb-2 font-extrabold">{item.amount ? money(item.amount) : '—'}</p>{paid ? <button onClick={() => setView(AppView.RECEIPTS)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">Ver recibo</button> : item.status === 'confirmed' || item.status === 'scheduled' ? <button onClick={() => openPayment(item)} className="w-full rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800">Receber</button> : item.status === 'completed' ? <button onClick={() => openPayment(item)} className="w-full rounded-lg border border-teal-600 px-3 py-2 text-xs font-bold text-teal-700">Cobrar</button> : null}</div>
          </article>;
        })}</div>}

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><p className="-mt-6 mb-3 ml-1 w-fit rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Caixa do dia</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
          { label: 'Recebido', value: money(received), note: `${dayTransactions.length} pagamentos`, icon: ReceiptText, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Pendente', value: money(pending), note: `${allDayItems.filter(i => !paidByAppointment.has(i.id) && i.status !== 'cancelled').length} agendamentos`, icon: Clock3, color: 'bg-orange-50 text-orange-600' },
          { label: 'Atendimentos', value: String(allDayItems.length), note: 'No dia', icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Ticket médio', value: money(average), note: 'Valor médio', icon: Stethoscope, color: 'bg-violet-50 text-violet-600' },
        ].map(card => <div key={card.label} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center gap-3"><span className={`rounded-lg p-2 ${card.color}`}><card.icon className="h-5 w-5"/></span><div><p className="text-xs text-slate-500">{card.label}</p><p className="text-lg font-extrabold">{card.value}</p><p className="text-xs text-slate-400">{card.note}</p></div></div></div>)}</div></section>
      </div>

      {selected && <aside className="fixed inset-y-0 right-0 z-[70] w-full overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl sm:w-[400px] print:hidden"><div className="flex items-center justify-between border-b border-slate-200 pb-4"><h2 className="text-lg font-extrabold">Cobrar atendimento</h2><button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>
        <div className="flex items-center gap-3 border-b border-slate-200 py-5"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-600">{initials(selected.patientName)}</div><div><p className="font-bold">{selected.patientName}</p><p className="text-sm text-slate-500">{selected.specialty} • {selected.professionalName}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5"/>{new Date(`${selected.date}T12:00:00`).toLocaleDateString('pt-BR')} • {selected.time}</p></div></div>
        <div className="space-y-3 border-b border-slate-200 py-5"><label className="flex items-center justify-between text-sm"><span>Valor do atendimento</span><input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-right font-bold outline-none focus:border-teal-500"/></label><label className="flex items-center justify-between text-sm"><span>Desconto</span><input value={discount} onChange={e => setDiscount(e.target.value)} inputMode="decimal" className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-right outline-none focus:border-teal-500"/></label><div className="flex justify-between border-t border-dashed border-slate-200 pt-3 text-lg font-extrabold"><span>Total</span><span className="text-teal-700">{money(total)}</span></div></div>
        <div className="py-5"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Forma de pagamento</p><div className="grid grid-cols-3 gap-2">{paymentOptions.map(option => <button key={option.value} onClick={() => setPaymentMethod(option.value)} className={`flex h-20 flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold ${paymentMethod === option.value ? 'border-teal-600 bg-teal-50 text-teal-700 ring-1 ring-teal-500' : 'border-slate-200 hover:bg-slate-50'}`}><option.icon className="h-5 w-5"/>{option.label}</button>)}</div></div>
        <label className="mb-5 flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-medium"><input type="checkbox" checked={emitReceipt} onChange={e => setEmitReceipt(e.target.checked)} className="h-4 w-4 accent-teal-700"/>Emitir recibo automaticamente</label>
        {message && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
        <button onClick={confirmPayment} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3.5 font-bold text-white hover:bg-teal-800 disabled:opacity-60">{saving ? <Loader2 className="h-5 w-5 animate-spin"/> : <><Check className="h-5 w-5"/>Confirmar pagamento</>}</button><p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-teal-600"/>Pagamento seguro e dados protegidos</p>
      </aside>}

      {showSchedule && <aside className="fixed inset-y-0 right-0 z-[70] w-full overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl sm:w-[440px] print:hidden">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4"><div><h2 className="text-lg font-extrabold">Novo agendamento</h2><p className="text-xs text-slate-500">Cadastre sem sair da Recepção / Caixa</p></div><button onClick={() => setShowSchedule(false)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>
        <div className="space-y-5 py-5">
          <section><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Paciente</p><button type="button" onClick={() => setScheduleForm(current => ({ ...current, newPatient: !current.newPatient, patientId: '', patientName: '', patientPhone: '', patientCpf: '' }))} className="text-xs font-bold text-teal-700">{scheduleForm.newPatient ? 'Selecionar existente' : '+ Cadastro rápido'}</button></div>
            {!scheduleForm.newPatient && <select value={scheduleForm.patientId} onChange={event => choosePatient(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-500"><option value="">Selecione um paciente...</option>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.name}{patient.phone ? ` — ${patient.phone}` : ''}</option>)}</select>}
            {scheduleForm.newPatient && <div className="grid gap-3 sm:grid-cols-2"><input value={scheduleForm.patientName} onChange={e => setScheduleForm(current => ({ ...current, patientName: e.target.value }))} placeholder="Nome completo *" className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-500 sm:col-span-2"/><input value={scheduleForm.patientPhone} onChange={e => setScheduleForm(current => ({ ...current, patientPhone: e.target.value }))} placeholder="Telefone" className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-500"/><input value={scheduleForm.patientCpf} onChange={e => setScheduleForm(current => ({ ...current, patientCpf: e.target.value }))} placeholder="CPF" className="rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-500"/></div>}
            {!scheduleForm.newPatient && scheduleForm.patientId && <div className="mt-3 rounded-xl bg-teal-50 p-3 text-sm"><p className="font-bold text-teal-900">{scheduleForm.patientName}</p><p className="text-xs text-teal-700">{scheduleForm.patientPhone || scheduleForm.patientCpf || 'Contato não informado'}</p></div>}
          </section>
          <section><p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Atendimento</p><div className="grid gap-3 sm:grid-cols-2"><select value={scheduleForm.professionalId} onChange={event => chooseProfessional(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-500 sm:col-span-2"><option value="">Selecione o profissional...</option>{professionals.map(professional => <option key={professional.id} value={professional.id}>{professional.name} — {professional.specialty || professional.role}</option>)}</select>
            <div className="relative sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Serviço ou procedimento do Catálogo vigente</label>
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={serviceSearch} onFocus={() => setCatalogOpen(true)} onChange={e => { setServiceSearch(e.target.value); setCatalogOpen(true); setScheduleForm(current => ({ ...current, serviceId: '', serviceName: '' })); }} placeholder="Buscar por nome, código ou categoria..." className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-teal-500"/></div>
              {catalogOpen && <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {availableCatalogServices.length > 0 ? availableCatalogServices.map(service => <button key={service.id} type="button" onClick={() => chooseCatalogService(service)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left hover:bg-teal-50"><span><span className="block text-sm font-bold text-slate-800">{service.name}</span><span className="block text-xs text-slate-500">{[service.code, service.category, `${service.durationMinutes} min`].filter(Boolean).join(' · ')}</span></span><span className="whitespace-nowrap text-sm font-bold text-teal-700">{money(service.grossPrice)}</span></button>) : <p className="px-3 py-4 text-center text-sm text-slate-500">Nenhum serviço vigente encontrado para estes dados.</p>}
              </div>}
              {scheduleForm.serviceId && <p className="mt-1 text-xs font-semibold text-emerald-700">✓ Serviço selecionado no Catálogo vigente</p>}
            </div>
            <label className="text-xs font-semibold text-slate-500">Data<input type="date" value={scheduleForm.date} onChange={e => { setScheduleForm(current => ({ ...current, date: e.target.value, serviceId: '', serviceName: '', amount: '' })); setServiceSearch(''); }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none focus:border-teal-500"/></label><label className="text-xs font-semibold text-slate-500">Horário<input type="time" value={scheduleForm.time} onChange={e => setScheduleForm(current => ({ ...current, time: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none focus:border-teal-500"/></label><label className="text-xs font-semibold text-slate-500 sm:col-span-2">Valor do atendimento<input value={scheduleForm.amount} onChange={e => setScheduleForm(current => ({ ...current, amount: e.target.value }))} inputMode="decimal" placeholder="0,00" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none focus:border-teal-500"/></label><textarea value={scheduleForm.notes} onChange={e => setScheduleForm(current => ({ ...current, notes: e.target.value }))} placeholder="Observações (opcional)" rows={3} className="resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-500 sm:col-span-2"/></div></section>
        </div>
        {message && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
        <button onClick={saveSchedule} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3.5 font-bold text-white hover:bg-teal-800 disabled:opacity-60">{saving ? <Loader2 className="h-5 w-5 animate-spin"/> : <><CalendarDays className="h-5 w-5"/>Confirmar agendamento</>}</button>
      </aside>}
    </div>
  );
};

export default ReceptionCashierView;
