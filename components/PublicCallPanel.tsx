import React, { useEffect, useRef, useState } from 'react';
import { Clock3, Maximize, MonitorUp, Volume2, VolumeX } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { listenPublicCallPanel } from '../services/callPanelService';
import { PublicCallPanel as PanelData } from '../types/callPanel';

const speakTicket = (ticket: string, destination: string) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const spacedTicket = ticket.split('').join(' ');
  const utterance = new SpeechSynthesisUtterance(`Senha ${spacedTicket}. Dirija-se a ${destination}.`);
  utterance.lang = 'pt-BR'; utterance.rate = 0.88; utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
};

const PublicCallPanel: React.FC = () => {
  const { panelId = '' } = useParams();
  const overlayMode = new URLSearchParams(window.location.search).get('overlay') === '1';
  const [panel, setPanel] = useState<PanelData | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(overlayMode);
  const [now, setNow] = useState(new Date());
  const lastCallId = useRef('');

  useEffect(() => {
    if (!overlayMode) return;
    const elements = [document.documentElement, document.body, document.getElementById('root')].filter(Boolean) as HTMLElement[];
    const previous = elements.map(element => element.style.backgroundColor);
    elements.forEach(element => { element.style.backgroundColor = 'transparent'; });
    return () => elements.forEach((element, index) => { element.style.backgroundColor = previous[index]; });
  }, [overlayMode]);

  useEffect(() => listenPublicCallPanel(panelId, setPanel), [panelId]);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const call = panel?.currentCall;
    if (!call || call.callId === lastCallId.current) return;
    lastCallId.current = call.callId;
    if (soundEnabled) speakTicket(call.ticketNumber, call.destination);
  }, [panel?.currentCall?.callId, soundEnabled]);

  const activateSound = () => {
    setSoundEnabled(true);
    const test = new SpeechSynthesisUtterance('Som do painel ativado.'); test.lang = 'pt-BR'; window.speechSynthesis.speak(test);
  };

  const callIsFresh = panel?.currentCall && Date.now() - panel.currentCall.calledAtMs < 12000;

  return <main className={`min-h-screen overflow-hidden text-white ${overlayMode ? 'bg-transparent' : 'bg-[#071c24]'}`}>
    <header className={`flex min-h-20 items-center justify-between gap-4 border-b border-white/10 px-5 py-3 lg:px-7 ${overlayMode ? 'bg-[#0b2932]' : 'bg-[#0b2932]'}`}>
      <div><p className="text-xs font-bold uppercase tracking-[0.28em] text-teal-300">ERCMed TV</p><h1 className="text-2xl font-black">{panel?.clinicName || 'Painel de Atendimento'}</h1></div>
      <div className="flex items-center gap-2"><button onClick={soundEnabled ? () => setSoundEnabled(false) : activateSound} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold lg:px-4 lg:text-sm ${soundEnabled ? 'bg-teal-500 text-slate-950' : 'bg-white/10'}`}>{soundEnabled ? <Volume2 className="h-5 w-5"/> : <VolumeX className="h-5 w-5"/>}<span className="hidden sm:inline">{soundEnabled ? 'Som ativado' : 'Ativar som'}</span></button><button onClick={() => document.documentElement.requestFullscreen?.()} title="Tela cheia" className="hidden rounded-xl bg-white/10 p-2.5 hover:bg-white/20 lg:block"><Maximize className="h-5 w-5"/></button><div className="ml-1 text-right"><p className="text-2xl font-black tabular-nums lg:text-3xl">{now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p><p className="hidden text-xs capitalize text-slate-300 lg:block">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p></div></div>
    </header>
    <div className={`grid h-[calc(100vh-5rem)] grid-cols-1 ${overlayMode ? '' : 'lg:grid-cols-[minmax(0,3fr)_minmax(300px,1fr)]'}`}>
      <section className={`relative items-center justify-center overflow-hidden p-10 ${overlayMode ? 'hidden' : 'hidden bg-gradient-to-br from-[#0a3039] via-[#0b2630] to-[#07181f] lg:flex'}`}>
        {!overlayMode && panel?.youtubeVideoId ? <iframe
          key={panel.youtubeVideoId}
          className="absolute inset-0 h-full w-full border-0"
          src={`https://www.youtube-nocookie.com/embed/${panel.youtubeVideoId}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1`}
          title="Canal ao vivo da clínica"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        /> : !overlayMode && <><div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#2dd4bf_0,transparent_28%),radial-gradient(circle_at_80%_75%,#38bdf8_0,transparent_25%)]"/><div className="relative max-w-3xl text-center"><MonitorUp className="mx-auto mb-7 h-24 w-24 text-teal-300/80"/><h2 className="text-5xl font-black">Configure a TV da clínica</h2><p className="mt-5 text-2xl text-slate-300">Cole um link do YouTube na tela Recepção / Caixa.</p></div></>}
        {callIsFresh && <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 p-10 backdrop-blur-sm"><div className="w-full max-w-4xl animate-pulse rounded-[2rem] border border-teal-300/50 bg-[#0b2932] p-12 text-center shadow-2xl"><p className="mb-4 text-2xl font-black uppercase tracking-[0.35em] text-teal-300">Chamando</p><p className="text-[clamp(6rem,16vw,13rem)] font-black leading-none tracking-tight">{panel?.currentCall?.ticketNumber}</p><p className="mt-7 text-[clamp(2rem,5vw,4rem)] font-extrabold text-amber-300">{panel?.currentCall?.destination}</p>{panel?.currentCall?.professionalName && <p className="mt-3 text-2xl text-slate-200">{panel.currentCall.professionalName}</p>}</div></div>}
      </section>
      <aside className={`relative overflow-y-auto border-l border-white/10 p-4 lg:p-6 ${overlayMode ? 'bg-[#0b252e]' : 'bg-[#0b252e]'}`}>
        {callIsFresh && <div className="mb-5 rounded-2xl border border-teal-300 bg-teal-400/10 p-5 text-center lg:hidden"><p className="text-sm font-black uppercase tracking-[0.25em] text-teal-300">Chamando</p><p className="mt-2 text-7xl font-black">{panel?.currentCall?.ticketNumber}</p><p className="mt-3 text-2xl font-black text-amber-300">{panel?.currentCall?.destination}</p></div>}
        <h2 className="mb-5 flex items-center gap-2 text-lg font-black uppercase tracking-wider text-slate-200"><Clock3 className="h-5 w-5 text-teal-300"/>Últimas chamadas</h2><div className="space-y-3">{panel?.recentCalls?.length ? panel.recentCalls.map((call, index) => <div key={call.callId} className={`rounded-2xl border p-4 ${index === 0 ? 'border-teal-400 bg-teal-400/10' : 'border-white/10 bg-white/5'}`}><div className="flex items-center justify-between gap-3"><span className="text-4xl font-black">{call.ticketNumber}</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{new Date(call.calledAtMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div><p className="mt-2 text-lg font-bold text-amber-300">{call.destination}</p></div>) : <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-400">As chamadas aparecerão aqui.</p>}</div><footer className="mt-8 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tecnologia ERCMed</footer></aside>
    </div>
  </main>;
};

export default PublicCallPanel;
