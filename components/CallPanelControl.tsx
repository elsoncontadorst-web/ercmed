import React, { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, Megaphone, Play, Plus, RotateCcw, Tv2, X } from 'lucide-react';
import { Appointment } from '../types/health';
import { CallTicket } from '../types/callPanel';
import { callTicket, getCallPanelId, issueCallTicket, listenCallTickets, updateCallTicketStatus } from '../services/callPanelService';

interface Props {
  ownerId: string;
  clinicId?: string;
  clinicName: string;
  appointments: Appointment[];
}

const CallPanelControl: React.FC<Props> = ({ ownerId, clinicId, clinicName, appointments }) => {
  const [tickets, setTickets] = useState<CallTicket[]>([]);
  const [prefix, setPrefix] = useState('C');
  const [destination, setDestination] = useState('Consultório 01');
  const [appointmentId, setAppointmentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!ownerId) return;
    return listenCallTickets(ownerId, clinicId, setTickets);
  }, [clinicId, ownerId]);

  const waiting = useMemo(() => tickets.filter(item => item.status === 'waiting' || item.status === 'called'), [tickets]);
  const eligibleAppointments = useMemo(() => appointments.filter(item =>
    item.status !== 'cancelled' && !tickets.some(ticket => ticket.appointmentId === item.id && ticket.status !== 'cancelled')
  ), [appointments, tickets]);

  const emit = async () => {
    if (!ownerId) return;
    setSaving(true); setMessage('');
    try {
      const appointment = appointments.find(item => item.id === appointmentId);
      const ticketNumber = await issueCallTicket({
        ownerId, clinicId, clinicName, prefix, destination,
        appointmentId: appointment?.id, patientId: appointment?.patientId, patientName: appointment?.patientName,
        professionalId: appointment?.professionalId, professionalName: appointment?.professionalName,
      });
      setAppointmentId('');
      setMessage(`Senha ${ticketNumber} emitida com sucesso.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível emitir a senha.'); }
    finally { setSaving(false); }
  };

  const callNow = async (ticket: CallTicket) => {
    setSaving(true); setMessage('');
    try { await callTicket(ownerId, clinicId, clinicName, ticket); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível chamar a senha.'); }
    finally { setSaving(false); }
  };

  const openPanel = () => {
    const panelId = getCallPanelId(ownerId, clinicId);
    window.open(`${window.location.origin}/painel/${encodeURIComponent(panelId)}`, '_blank', 'noopener,noreferrer');
  };

  const openLiveTv = () => {
    window.open('https://globoplay.globo.com/tv-globo/ao-vivo/7832875/', '_blank', 'noopener,noreferrer');
  };

  return <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
    <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-teal-100 p-3 text-teal-700"><Tv2 className="h-6 w-6"/></span><div><h2 className="font-extrabold text-slate-900">ERCMed TV — Painel de Atendimento</h2><p className="text-xs text-slate-500">Emita e chame senhas no segundo monitor conectado por HDMI.</p></div></div>
      <div className="flex flex-col gap-2 sm:flex-row"><button onClick={openLiveTv} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:border-teal-300 hover:bg-teal-50"><Play className="h-4 w-4 text-teal-700"/>1. Abrir TV Globo</button><button onClick={openPanel} disabled={!ownerId} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><ExternalLink className="h-4 w-4"/>2. Abrir painel ERCMed</button></div>
    </div>
    <div className="grid gap-3 xl:grid-cols-[110px_1.2fr_1fr_auto]">
      <label className="text-xs font-bold text-slate-500">Prefixo<input value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase().slice(0, 2))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none focus:border-teal-500"/></label>
      <label className="text-xs font-bold text-slate-500">Paciente agendado (opcional)<select value={appointmentId} onChange={e => setAppointmentId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-900 outline-none focus:border-teal-500"><option value="">Atendimento sem vínculo</option>{eligibleAppointments.map(item => <option key={item.id} value={item.id}>{item.time} — {item.patientName || 'Paciente'} — {item.professionalName}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-500">Destino<input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Consultório 01" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal text-slate-900 outline-none focus:border-teal-500"/></label>
      <button onClick={emit} disabled={saving || !destination.trim()} className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}Emitir senha</button>
    </div>
    {message && <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p>}
    <div className="mt-4 grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
      {waiting.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500 lg:col-span-2 2xl:col-span-3">Nenhuma senha aguardando.</p> : waiting.map(ticket => <article key={ticket.id} className={`flex items-center gap-3 rounded-xl border p-3 ${ticket.status === 'called' ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
        <span className="min-w-20 rounded-lg bg-slate-900 px-3 py-2 text-center text-xl font-black text-white">{ticket.ticketNumber}</span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{ticket.patientName || 'Atendimento espontâneo'}</p><p className="truncate text-xs text-slate-500">{ticket.destination}{ticket.professionalName ? ` · ${ticket.professionalName}` : ''}</p></div>
        <button title={ticket.status === 'called' ? 'Chamar novamente' : 'Chamar senha'} onClick={() => callNow(ticket)} className="rounded-lg bg-teal-700 p-2 text-white hover:bg-teal-800">{ticket.status === 'called' ? <RotateCcw className="h-4 w-4"/> : <Megaphone className="h-4 w-4"/>}</button>
        {ticket.status === 'called' && <button title="Iniciar atendimento" onClick={() => updateCallTicketStatus(ownerId, ticket.id, 'in_service')} className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700"><Check className="h-4 w-4"/></button>}
        <button title="Cancelar senha" onClick={() => updateCallTicketStatus(ownerId, ticket.id, 'cancelled')} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4"/></button>
      </article>)}
    </div>
  </section>;
};

export default CallPanelControl;
