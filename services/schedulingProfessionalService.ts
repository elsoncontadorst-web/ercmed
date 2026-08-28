import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface SchedulingProfessional {
  id: string;
  name: string;
  specialty: string;
  phone?: string;
  clinicId?: string;
  sourceContractId: string;
  active: boolean;
}

export const saveSchedulingProfessional = async (managerId: string, item: SchedulingProfessional) => {
  await setDoc(doc(db, 'users', managerId, 'scheduling_professionals', item.id), {
    ...item, updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const removeSchedulingProfessional = async (managerId: string, id: string) => {
  await deleteDoc(doc(db, 'users', managerId, 'scheduling_professionals', id));
};

export const getSchedulingProfessionals = async (managerId: string, clinicId?: string) => {
  const snapshot = await getDocs(collection(db, 'users', managerId, 'scheduling_professionals'));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() } as SchedulingProfessional))
    .filter(item => item.active !== false && (!clinicId || !item.clinicId || item.clinicId === clinicId))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
};
