import {
  collection, deleteField, doc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc, Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { CallTicket, PublicCall, PublicCallPanel } from '../types/callPanel';

const todayIso = () => new Date().toISOString().slice(0, 10);
const cleanPrefix = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2) || 'C';
const scopeId = (clinicId?: string) => clinicId || 'geral';

export const getCallPanelId = (ownerId: string, clinicId?: string) => `${ownerId}_${scopeId(clinicId)}`;

const youtubeVideoIdFromUrl = (value: string): string => {
  const trimmed = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || '';
    if (url.hostname.endsWith('youtube.com')) {
      return url.searchParams.get('v') || url.pathname.match(/\/(?:live|embed|shorts)\/([a-zA-Z0-9_-]{11})/)?.[1] || '';
    }
  } catch { return ''; }
  return '';
};

export const configureCallPanelSource = async (input: {
  ownerId: string;
  clinicId?: string;
  clinicName: string;
  youtubeUrl: string;
}): Promise<string> => {
  const youtubeVideoId = youtubeVideoIdFromUrl(input.youtubeUrl);
  let tvUrl = input.youtubeUrl.trim();
  try {
    const parsed = new URL(tvUrl);
    const isGloboplay = parsed.protocol === 'https:' && parsed.hostname === 'globoplay.globo.com';
    if (!isGloboplay && !youtubeVideoId) throw new Error();
  } catch { throw new Error('Informe um link válido do Globoplay ou YouTube.'); }
  await setDoc(doc(db, 'public_call_panels', getCallPanelId(input.ownerId, input.clinicId)), {
    ownerId: input.ownerId,
    clinicName: input.clinicName || 'Clínica',
    tvUrl,
    youtubeVideoId: youtubeVideoId || deleteField(),
    recentCalls: [],
    updatedAtMs: Date.now(),
  }, { merge: true });
  return tvUrl;
};

export const listenCallTickets = (
  ownerId: string,
  clinicId: string | undefined,
  callback: (tickets: CallTicket[]) => void,
): Unsubscribe => onSnapshot(collection(db, 'users', ownerId, 'call_tickets'), snapshot => {
  const date = todayIso();
  const items = snapshot.docs
    .map(item => ({ id: item.id, ...item.data() } as CallTicket))
    .filter(item => item.date === date && item.clinicId === scopeId(clinicId))
    .sort((a, b) => a.sequence - b.sequence);
  callback(items);
});

export const issueCallTicket = async (input: {
  ownerId: string;
  clinicId?: string;
  clinicName: string;
  prefix: string;
  destination: string;
  appointmentId?: string;
  patientId?: string;
  patientName?: string;
  professionalId?: string;
  professionalName?: string;
}): Promise<string> => {
  const clinic = scopeId(input.clinicId);
  const prefix = cleanPrefix(input.prefix);
  const date = todayIso();
  const counterRef = doc(db, 'users', input.ownerId, 'call_panel_settings', clinic);
  const ticketRef = doc(collection(db, 'users', input.ownerId, 'call_tickets'));
  const panelRef = doc(db, 'public_call_panels', getCallPanelId(input.ownerId, input.clinicId));

  return runTransaction(db, async transaction => {
    const counter = await transaction.get(counterRef);
    const counterData = counter.data();
    const previous = counterData?.date === date ? Number(counterData?.sequence || 0) : 0;
    const sequence = previous + 1;
    const ticketNumber = `${prefix}${String(sequence).padStart(3, '0')}`;
    transaction.set(counterRef, { date, sequence, prefix, updatedAt: serverTimestamp() }, { merge: true });
    transaction.set(ticketRef, {
      ownerId: input.ownerId, clinicId: clinic, appointmentId: input.appointmentId,
      patientId: input.patientId, patientName: input.patientName,
      professionalId: input.professionalId, professionalName: input.professionalName,
      ticketNumber, prefix, sequence, destination: input.destination.trim() || 'Recepção',
      status: 'waiting', date, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    transaction.set(panelRef, {
      ownerId: input.ownerId, clinicName: input.clinicName || 'Clínica', recentCalls: [], updatedAtMs: Date.now(),
    }, { merge: true });
    return ticketNumber;
  });
};

export const callTicket = async (
  ownerId: string,
  clinicId: string | undefined,
  clinicName: string,
  ticket: CallTicket,
): Promise<void> => {
  const ticketRef = doc(db, 'users', ownerId, 'call_tickets', ticket.id);
  const panelRef = doc(db, 'public_call_panels', getCallPanelId(ownerId, clinicId));
  await runTransaction(db, async transaction => {
    const panelSnapshot = await transaction.get(panelRef);
    const panel = panelSnapshot.data() as PublicCallPanel | undefined;
    const call: PublicCall = {
      ticketNumber: ticket.ticketNumber,
      patientName: ticket.patientName || '',
      destination: ticket.destination,
      professionalName: ticket.professionalName || '',
      calledAtMs: Date.now(),
      callId: `${ticket.id}-${Date.now()}`,
    };
    const { patientName: _privateName, ...historicalCall } = call;
    const previous = (panel?.recentCalls || []).map(({ patientName: _name, ...item }) => item);
    const recentCalls = [historicalCall, ...previous.filter(item => item.ticketNumber !== call.ticketNumber)].slice(0, 6);
    transaction.update(ticketRef, { status: 'called', calledAt: serverTimestamp(), updatedAt: serverTimestamp() });
    transaction.set(panelRef, { ownerId, clinicName: clinicName || 'Clínica', currentCall: call, recentCalls, updatedAtMs: Date.now() }, { merge: true });
  });
};

export const updateCallTicketStatus = async (ownerId: string, ticketId: string, status: CallTicket['status']) => {
  await updateDoc(doc(db, 'users', ownerId, 'call_tickets', ticketId), { status, updatedAt: serverTimestamp() });
};

export const listenPublicCallPanel = (panelId: string, callback: (panel: PublicCallPanel | null) => void): Unsubscribe =>
  onSnapshot(doc(db, 'public_call_panels', panelId), snapshot => callback(snapshot.exists() ? snapshot.data() as PublicCallPanel : null));
