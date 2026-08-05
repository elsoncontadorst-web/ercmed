import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, serverTimestamp, getDoc } from 'firebase/firestore';
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
            throw new Error('Seu perfil de gestor ainda está sendo preparado. Aguarde alguns segundos e tente novamente.');
        }

        // Validate duplicates only inside the authenticated tenant. A global
        // collection-group query would require exposing other clinics' data.
        if (clinicData.cnpj) {
            const clinicsRef = collection(db, 'users', managerId, 'clinics');
            const cnpjQuery = query(
                clinicsRef,
                where('cnpj', '==', clinicData.cnpj),
                where('active', '==', true)
            );

            const existingSnapshot = await getDocs(cnpjQuery);

            if (!existingSnapshot.empty) {
                throw new Error('Este CNPJ já está cadastrado nesta empresa.');
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

        const resolvedManagerId = targetManagerId || await getManagerIdForUser(user.uid);
        const candidates = new Set<string>();
        if (resolvedManagerId) candidates.add(resolvedManagerId);
        candidates.add(user.uid);

        // Some older manager profiles kept the tenant owner in managerId. Read
        // that explicit linkage as a safe fallback so changing the active unit
        // never makes the tenant's clinics appear to disappear.
        for (const rootCollection of ['system_users', 'user_profiles']) {
            try {
                const profile = await getDoc(doc(db, rootCollection, user.uid));
                const linkedManagerId = profile.exists() ? profile.data().managerId : null;
                if (linkedManagerId) candidates.add(linkedManagerId);
            } catch {
                // Continue with the tenant IDs already resolved.
            }
        }

        for (const managerId of candidates) {
            try {
                // Do not require active == true in the query: legacy clinics may
                // not have that field. Only explicitly inactive records are hidden.
                const snapshot = await getDocs(collection(db, 'users', managerId, 'clinics'));
                const clinics = snapshot.docs
                    .map(item => ({ id: item.id, ...item.data() } as Clinic))
                    .filter(clinic => clinic.active !== false);
                if (clinics.length > 0) return clinics;
            } catch (error) {
                console.warn('[CLINIC] Tenant candidate unavailable:', managerId, error);
            }
        }

        return [];
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
