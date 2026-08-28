import React, { useEffect, useMemo, useState } from 'react';
import { Check, Link, Loader2, Megaphone, MonitorUp, Plus, RotateCcw, Save, Tv2, X } from 'lucide-react';
import { Appointment } from '../types/health';
import { CallTicket } from '../types/callPanel';
import { callTicket, configureCallPanelSource, getCallPanelId, issueCallTicket, listenCallTickets, listenPublicCallPanel, updateCallTicketStatus } from '../services/callPanelService';

interface Props {
  ownerId: string;
  clinicId?: string;
  clinicName: string;
  appointments: Appointment[];
}

type ManagedScreen = { availLeft: number; availTop: number; availWidth: number; availHeight: number };
type ManagedScreenDetails = { screens: ManagedScreen[]; currentScreen: ManagedScreen };

const CallPanelControl: React.FC<Props> = ({ ownerId, clinicId, clinicName, appointments }) => {
  const [tickets, setTickets] = useState<CallTicket[]>([]);
  const [prefix, setPrefix] = useState('C');
  const [destination, setDestination] = useState('Consultório 01');
  const [appointmentId, setAppointmentId] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [screenDetails, setScreenDetails] = useState<ManagedScreenDetails | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!ownerId) return;
    return listenCallTickets(ownerId, clinicId, setTickets);
  }, [clinicId, ownerId]);

  useEffect(() => {
    if (!ownerId) return;
    return listenPublicCallPanel(getCallPanelId(ownerId, clinicId), panel => {
      if (panel?.tvUrl) setYoutubeUrl(panel.tvUrl);
    });
  }, [clinicId, ownerId]);

  useEffect(() => {
    const managedWindow = window as Window & { getScreenDetails?: () => Promise<ManagedScreenDetails> };
    if (!managedWindow.getScreenDetails || !navigator.permissions?.query) return;
    navigator.permissions.query({ name: 'window-management' as PermissionName })
      .then(permission => {
        if (permission.state === 'granted') managedWindow.getScreenDetails?.().then(setScreenDetails).catch(() => undefined);
      })
      .catch(() => undefined);
  }, []);

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

  const saveYoutube = async () => {
    if (!ownerId) return;
    setSaving(true); setMessage('');
    try {
      await configureCallPanelSource({ ownerId, clinicId, clinicName, youtubeUrl });
      setMessage('Link da TV salvo. O ERCMed TV abrirá esse endereço automaticamente.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o canal.'); }
    finally { setSaving(false); }
  };

  const launchTvMode = async () => {
    if (!ownerId || launching) return;
    setLaunching(true); setMessage('');
    try {
      const managedWindow = window as Window & { getScreenDetails?: () => Promise<ManagedScreenDetails> };
      if (!managedWindow.getScreenDetails) throw new Error('Seu navegador precisa ser atualizado para organizar o segundo monitor automaticamente.');
      if (!screenDetails) {
        const details = await managedWindow.getScreenDetails();
        setScreenDetails(details);
        if (details.screens.length < 2) throw new Error('O segundo monitor não foi detectado. No Windows, selecione “Estender estes monitores”.');
        setMessage('Acesso aos monitores autorizado. Clique novamente em “Iniciar ERCMed TV”.');
        setLaunching(false); return;
      }
      const details = screenDetails;
      const target = details.screens.find(screen =>
        screen.availLeft !== details.currentScreen.availLeft || screen.availTop !== details.currentScreen.availTop
      ) || details.currentScreen;
      if (details.screens.length < 2) throw new Error('O segundo monitor não foi detectado. No Windows, selecione “Estender estes monitores”.');
      const panelId = getCallPanelId(ownerId, clinicId);
      const panelUrl = `${window.location.origin}/painel/${encodeURIComponent(panelId)}`;
      const panelFeatures = `popup=yes,left=${target.availLeft},top=${target.availTop},width=${target.availWidth},height=${target.availHeight}`;
      const launchId = Date.now();
      const panelWindow = window.open('about:blank', `ercmed-tv-painel-${launchId}`, panelFeatures);
      if (!panelWindow) throw new Error('O Edge bloqueou a janela. Clique no aviso de pop-up na barra de endereço, escolha “Sempre permitir” e tente novamente.');
      panelWindow.moveTo(target.availLeft, target.availTop);
      panelWindow.resizeTo(target.availWidth, target.availHeight);
      panelWindow.opener = null;
      panelWindow.location.replace(panelUrl);
      setMessage('ERCMed TV iniciado no segundo monitor com vídeo e senhas na mesma tela.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível organizar o segundo monitor.');
    } finally { setLaunching(false); }
  };

  const launchWindowsTvMode = () => {
    if (!ownerId) return;
    const panelId = getCallPanelId(ownerId, clinicId);
    const panelUrl = `${window.location.origin}/painel/${encodeURIComponent(panelId)}?overlay=1`;
    const globoplayUrl = youtubeUrl.trim() || 'https://globoplay.globo.com/tv-globo/ao-vivo/6120663/';
    const command = `ercmedtv://start?panelUrl=${encodeURIComponent(panelUrl)}&tvUrl=${encodeURIComponent(globoplayUrl)}`;
    window.location.href = command;
    setMessage('Comando enviado ao ERCMed TV para Windows. O Edge e o painel serão abertos no segundo monitor.');
  };

  return <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
    <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-teal-100 p-3 text-teal-700"><Tv2 className="h-6 w-6"/></span><div><h2 className="font-extrabold text-slate-900">ERCMed TV — Painel de Atendimento</h2><p className="text-xs text-slate-500">Emita e chame senhas no segundo monitor conectado por HDMI.</p></div></div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={launchWindowsTvMode} disabled={!ownerId} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"><MonitorUp className="h-5 w-5"/>Iniciar ERCMed TV</button>
        <a href="/downloads/ERCMed-TV-Setup-1.0.2.exe" download className="flex items-center justify-center rounded-xl border border-teal-600 bg-white px-4 py-3 text-xs font-bold text-teal-700 hover:bg-teal-50">Instalar ERCMed TV</a>
        <button onClick={launchTvMode} disabled={!ownerId || launching} title="Usar sem o aplicativo para Windows" className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{launching ? <Loader2 className="h-4 w-4 animate-spin"/> : <Tv2 className="h-4 w-4"/>}Abrir somente painel</button>
      </div>
    </div>
    <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_auto] lg:items-end">
      <label className="text-xs font-bold text-slate-500"><span className="flex items-center gap-1"><Link className="h-3.5 w-3.5"/>Link da TV — Globoplay ou YouTube</span><input value={youtubeUrl} onChange={event => setYoutubeUrl(event.target.value)} placeholder="Cole aqui o link do Globoplay ao vivo ou YouTube" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-900 outline-none focus:border-teal-500"/></label>
      <button onClick={saveYoutube} disabled={saving || !youtubeUrl.trim()} className="flex items-center justify-center gap-2 rounded-xl border border-teal-600 bg-white px-4 py-3 text-sm font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}Salvar canal</button>
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
