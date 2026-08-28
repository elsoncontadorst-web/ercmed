export type CallTicketStatus = 'waiting' | 'called' | 'in_service' | 'completed' | 'cancelled';

export interface CallTicket {
  id: string;
  ownerId: string;
  clinicId: string;
  appointmentId?: string;
  patientId?: string;
  patientName?: string;
  professionalId?: string;
  professionalName?: string;
  ticketNumber: string;
  prefix: string;
  sequence: number;
  destination: string;
  status: CallTicketStatus;
  date: string;
  createdAt?: unknown;
  calledAt?: unknown;
  updatedAt?: unknown;
}

export interface PublicCall {
  ticketNumber: string;
  patientName?: string;
  destination: string;
  professionalName?: string;
  calledAtMs: number;
  callId: string;
}

export interface PublicCallPanel {
  ownerId: string;
  clinicName: string;
  tvUrl?: string;
  youtubeVideoId?: string;
  currentCall?: PublicCall;
  recentCalls: PublicCall[];
  updatedAtMs: number;
}
