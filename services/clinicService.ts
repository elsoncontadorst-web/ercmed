import { collection, collectionGroup, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Clinic, ClinicFormData } from '../types/clinic';
import { getManagerIdForUser } from './accessControlService';

/**
 * Add a new clinic
 */
export const addClinic = async (clinicData: ClinicFormData): Promise<string | null> => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        const managerId = await getManagerIdForUser(user.uid);
        if (!managerId) {
            throw new Error('Manager ID not found');
        }

        // VALIDATION: Check if CNPJ already exists globally
        if (clinicData.cnpj) {
            console.log('[CLINIC] Checking for duplicate CNPJ:', clinicData.cnpj);
            const clinicsRef = collectionGroup(db, 'clinics');
            const cnpjQuery = query(
                clinicsRef,
                where('cnpj', '==', clinicData.cnpj),
                where('active', '==', true)
            );

            const existingSnapshot = await getDocs(cnpjQuery);

            if (!existingSnapshot.empty) {
                console.error('[CLINIC] CNPJ already registered!');
                throw new Error('Este CNPJ já está cadastrado no sistema. Cada CNPJ pode ser cadastrado apenas uma vez.');
            }
        }

        const clinicsRef = collection(db, 'users', managerId, 'clinics');

        const docRef = await addDoc(clinicsRef, {
            ...clinicData,
            managerId,
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        console.log('[CLINIC] Clinic added successfully! ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('[CLINIC] Error adding clinic:', error);
        // Re-throw the error so the UI can display it
        throw error;
    }
};

/**
 * Get all clinics for the current user's manager OR specific manager
 */
export const getClinics = async (targetManagerId?: string): Promise<Clinic[]> => {
    try {
        const user = auth.currentUser;
        if (!user) return [];

        let managerId = targetManagerId;
        if (!managerId) {
            managerId = await getManagerIdForUser(user.uid);
        }

        if (!managerId) return [];

        const clinicsRef = collection(db, 'users', managerId, 'clinics');
        const q = query(clinicsRef, where('active', '==', true));

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Clinic));
    } catch (error) {
        console.error('Error getting clinics:', error);
        return [];
    }
};

/**
 * Update a clinic
 */
export const updateClinic = async (clinicId: string, clinicData: Partial<ClinicFormData>): Promise<boolean> => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        const managerId = await getManagerIdForUser(user.uid);
        if (!managerId) {
            throw new Error('Manager ID not found');
        }

        const clinicRef = doc(db, 'users', managerId, 'clinics', clinicId);

        await updateDoc(clinicRef, {
            ...clinicData,
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error updating clinic:', error);
        return false;
    }
};

/**
 * Delete a clinic (soft delete - sets active to false)
 */
export const deleteClinic = async (clinicId: string): Promise<boolean> => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        const managerId = await getManagerIdForUser(user.uid);
        if (!managerId) {
            throw new Error('Manager ID not found');
        }

        const clinicRef = doc(db, 'users', managerId, 'clinics', clinicId);

        await updateDoc(clinicRef, {
            active: false,
            updatedAt: serverTimestamp()
        });

        return true;
    } catch (error) {
        console.error('Error deleting clinic:', error);
        return false;
    }
};

/**
 * Permanently delete a clinic
 */
export const permanentlyDeleteClinic = async (clinicId: string): Promise<boolean> => {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User not authenticated');
        }

        const managerId = await getManagerIdForUser(user.uid);
        if (!managerId) {
            throw new Error('Manager ID not found');
        }

        const clinicRef = doc(db, 'users', managerId, 'clinics', clinicId);
        await deleteDoc(clinicRef);

        return true;
    } catch (error) {
        console.error('Error permanently deleting clinic:', error);
        return false;
    }
};
