import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Client, ClientInput } from '../types/client';
import type { FiscalDocumentDraft } from '../types/clinicErp';

const digits = (value?: string) => String(value || '').replace(/\D/g, '');
const slug = (value: string) => value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
const clientId = (taxId: string | undefined, name: string) => digits(taxId) || slug(name) || crypto.randomUUID();

export const getClients = async (managerId: string, clinicId?: string): Promise<Client[]> => {
  const snapshot = await getDocs(collection(db, 'users', managerId, 'clients'));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() } as Client))
    .filter(item => item.active !== false && (!clinicId || !item.clinicId || item.clinicId === clinicId))
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
};

export const saveClient = async (managerId: string, input: ClientInput, existingId?: string): Promise<string> => {
  const id = existingId || clientId(input.taxId, input.name);
  const reference = doc(db, 'users', managerId, 'clients', id);
  const current = await getDoc(reference);
  await setDoc(reference, {
    ...input,
    taxId: digits(input.taxId),
    createdAt: current.exists() ? current.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
  return id;
};

export const saveClientFromFiscalDraft = async (
  managerId: string,
  draft: FiscalDocumentDraft,
  direction: 'income' | 'expense' | 'review',
  clinicContext?: { clinicId?: string; unitName?: string },
  documentId?: string
) => {
  if (direction === 'expense') return null;
  if (!draft.recipientName && !draft.recipientCnpj) return null;
  return saveClient(managerId, {
    name: draft.recipientName || 'Cliente não identificado',
    taxId: draft.recipientCnpj,
    clinicId: clinicContext?.clinicId,
    unitName: clinicContext?.unitName,
    source: 'xml',
    lastDocumentAt: draft.issuedAt,
    lastDocumentId: documentId,
    active: true
  });
};

export const deleteClient = (managerId: string, id: string) => deleteDoc(doc(db, 'users', managerId, 'clients', id));
