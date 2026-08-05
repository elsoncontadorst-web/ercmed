import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface AuditEvent {
  managerId: string;
  userId: string;
  action: string;
  origin: string;
  entityType: string;
  entityId?: string;
  reason?: string;
  payload?: Record<string, unknown>;
}

export const registerAuditEvent = async (event: AuditEvent) => {
  await addDoc(collection(db, 'users', event.managerId, 'audit_logs'), {
    ...event,
    createdAt: serverTimestamp()
  });
};
