import { addDoc, collection, getDocs, orderBy, query, runTransaction, serverTimestamp, where, doc } from 'firebase/firestore';
import { db } from './firebase';
import { CarePackageBalance } from '../types/clinicErp';

type CreateCarePackageInput = Omit<CarePackageBalance, 'id' | 'usedSessions' | 'remainingSessions' | 'active' | 'createdAt' | 'updatedAt' | 'lastUsedAt'>;

export const getCarePackages = async (managerId: string): Promise<CarePackageBalance[]> => {
  try {
    const ref = collection(db, 'users', managerId, 'care_packages');
    const snapshot = await getDocs(query(ref, orderBy('createdAt', 'desc')));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as CarePackageBalance));
  } catch (error) {
    console.error('Erro ao buscar pacotes assistenciais:', error);
    return [];
  }
};

export const createCarePackage = async (managerId: string, data: CreateCarePackageInput): Promise<string | null> => {
  try {
    const ref = collection(db, 'users', managerId, 'care_packages');
    const created = await addDoc(ref, {
      ...data,
      usedSessions: 0,
      remainingSessions: Math.max(0, data.totalSessions),
      active: data.totalSessions > 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return created.id;
  } catch (error) {
    console.error('Erro ao criar pacote assistencial:', error);
    return null;
  }
};

export const ensureCarePackageBalance = async (
  managerId: string,
  data: CreateCarePackageInput
): Promise<CarePackageBalance> => {
  const ref = collection(db, 'users', managerId, 'care_packages');
  const existingQuery = query(
    ref,
    where('patientName', '==', data.patientName),
    where('serviceId', '==', data.serviceId),
    where('active', '==', true)
  );
  const existingSnapshot = await getDocs(existingQuery);
  const match = existingSnapshot.docs
    .map(item => ({ id: item.id, ...item.data() } as CarePackageBalance))
    .find(item =>
      (!data.patientId || item.patientId === data.patientId) &&
      (!data.professionalId || !item.professionalId || item.professionalId === data.professionalId)
    );

  if (match) return match;

  const createdId = await createCarePackage(managerId, data);
  if (!createdId) throw new Error('Nao foi possivel criar o pacote deste paciente.');
  return {
    id: createdId,
    ...data,
    usedSessions: 0,
    remainingSessions: data.totalSessions,
    active: data.totalSessions > 0
  };
};

export const consumeCarePackageSession = async (
  managerId: string,
  packageId: string,
  usedAt: string
): Promise<CarePackageBalance> => {
  const ref = doc(db, 'users', managerId, 'care_packages', packageId);
  return runTransaction(db, async firestoreTransaction => {
    const snapshot = await firestoreTransaction.get(ref);
    if (!snapshot.exists()) throw new Error('Pacote nao encontrado.');

    const current = { id: snapshot.id, ...snapshot.data() } as CarePackageBalance;
    if (!current.active || current.remainingSessions <= 0) {
      throw new Error('Este pacote nao possui sessoes disponiveis.');
    }

    const usedSessions = (current.usedSessions || 0) + 1;
    const remainingSessions = Math.max(0, (current.totalSessions || 0) - usedSessions);
    const nextState = {
      usedSessions,
      remainingSessions,
      active: remainingSessions > 0,
      lastUsedAt: usedAt,
      updatedAt: serverTimestamp()
    };

    firestoreTransaction.update(ref, nextState);
    return { ...current, ...nextState };
  });
};
