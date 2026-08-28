import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';
import { ConsultingRoom } from '../types/consultingRoom';

const scopeId = (clinicId?: string) => clinicId || 'geral';

export const listenConsultingRooms = (
  ownerId: string,
  clinicId: string | undefined,
  callback: (rooms: ConsultingRoom[]) => void,
): Unsubscribe => onSnapshot(collection(db, 'users', ownerId, 'consulting_rooms'), snapshot => {
  const clinic = scopeId(clinicId);
  callback(snapshot.docs
    .map(item => ({ id: item.id, ...item.data() } as ConsultingRoom))
    .filter(item => item.clinicId === clinic)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
});

export const createConsultingRoom = async (input: {
  ownerId: string;
  clinicId?: string;
  name: string;
  professionalId?: string;
  professionalName?: string;
}) => addDoc(collection(db, 'users', input.ownerId, 'consulting_rooms'), {
  clinicId: scopeId(input.clinicId),
  name: input.name.trim(),
  professionalId: input.professionalId || '',
  professionalName: input.professionalName || '',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

export const deleteConsultingRoom = (ownerId: string, roomId: string) =>
  deleteDoc(doc(db, 'users', ownerId, 'consulting_rooms', roomId));
