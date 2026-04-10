import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Contract } from '../types/finance';

const MASTER_ADMIN_EMAIL = 'elsoncontador.st@gmail.com';

export const addContract = async (
    contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const contractsRef = collection(db, 'contracts');
        const docRef = await addDoc(contractsRef, {
            ...contract,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao adicionar contrato:', error);
        return null;
    }
};

export const getContracts = async (managerId?: string): Promise<Contract[]> => {
    try {
        const currentUserEmail = auth.currentUser?.email;
        const isMasterAdmin = currentUserEmail === MASTER_ADMIN_EMAIL;
        
        const contractsRef = collection(db, 'contracts');
        let q;

        if (managerId) {
            q = query(contractsRef, where('managerId', '==', managerId), orderBy('createdAt', 'desc'));
        } else if (isMasterAdmin) {
            // Only Master Admin can fetch ALL contracts
            q = query(contractsRef, orderBy('createdAt', 'desc'));
        } else {
            // Safety: return empty if unauthorized
            console.warn(`[SECURITY] Unauthorized fetch by ${currentUserEmail}`);
            return [];
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Contract));
    } catch (error) {
        console.error('Erro ao buscar contratos:', error);
        return [];
    }
};

export const getContractsByOwner = async (userId: string): Promise<Contract[]> => {
    try {
        const contractsRef = collection(db, 'contracts');
        // Assuming contracts have a 'userId' field referring to the clinic owner
        // If they don't, we might have a problem. Checking repasseService...
        // repasseService mapper uses contract.userId.
        const q = query(contractsRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Contract));
    } catch (error) {
        console.error('Erro ao buscar contratos por proprietário:', error);
        return [];
    }
};

export const updateContract = async (
    contractId: string,
    data: Partial<Omit<Contract, 'id' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const contractRef = doc(db, 'contracts', contractId);
        await updateDoc(contractRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar contrato:', error);
        return false;
    }
};

export const deleteContract = async (contractId: string): Promise<boolean> => {
    try {
        const contractRef = doc(db, 'contracts', contractId);
        await deleteDoc(contractRef);
        return true;
    } catch (error) {
        console.error('Erro ao deletar contrato:', error);
        return false;
    }
};
