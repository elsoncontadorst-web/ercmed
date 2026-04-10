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
    serverTimestamp,
    setDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from './firebase';
import { SystemUser, UserCreationByAdmin, DEFAULT_PERMISSIONS } from '../types/users';
import { addContract } from './contractService';
import { Contract } from '../types/finance';

const MASTER_ADMIN_EMAIL = 'elsoncontador.st@gmail.com';

// ==================== USER MANAGEMENT ====================

export const getAllUsers = async (managerId?: string): Promise<SystemUser[]> => {
    try {
        const usersRef = collection(db, 'system_users');
        let q;
        
        if (managerId) {
            // Filter by managerId for clinical managers
            q = query(usersRef, where('managerId', '==', managerId));
        } else if (auth.currentUser?.email === MASTER_ADMIN_EMAIL) {
            // Master Admin sees all
            q = query(usersRef);
        } else {
            // Safety fallback: Unauthorized or no managerId provided for restricted user
            return [];
        }

        const snapshot = await getDocs(q);
        let users = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as SystemUser));

        // Fallback: if system_users is empty (legacy), try user_profiles
        if (users.length === 0) {
            const profilesRef = collection(db, 'user_profiles');
            let qProfiles;
            if (managerId) {
                qProfiles = query(profilesRef, where('managerId', '==', managerId));
            } else if (auth.currentUser?.email === MASTER_ADMIN_EMAIL) {
                qProfiles = query(profilesRef);
            } else {
                return [];
            }
            
            const snapshotProfiles = await getDocs(qProfiles);
            users = snapshotProfiles.docs.map(doc => {
                const data = doc.data() as any;
                return {
                    id: doc.id,
                    email: data.email || '',
                    name: data.displayName || data.name || 'Sem Nome',
                    role: data.role || 'user',
                    status: data.status || 'active',
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    phone: data.telefone || data.phone,
                    specialty: data.specialty,
                    crm: data.crm,
                    accountTier: data.accountTier,
                    isClinicManager: data.isClinicManager,
                    managerId: data.managerId
                } as SystemUser;
            });
        }

        // Sort client-side: pending first, then by creation date
        return users.sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            const aTime = a.createdAt?.toMillis?.() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const bTime = b.createdAt?.toMillis?.() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return bTime - aTime;
        });
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return [];
    }
};

export const getAllUserProfiles = async (): Promise<SystemUser[]> => {
    try {
        const currentUserEmail = auth.currentUser?.email;
        if (currentUserEmail !== MASTER_ADMIN_EMAIL) {
            console.warn(`[SECURITY] Unauthorized fetch of all user profiles by ${currentUserEmail}`);
            return [];
        }

        const profilesRef = collection(db, 'user_profiles');
        const snapshot = await getDocs(profilesRef);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                email: data.email || '',
                name: data.displayName || data.name || 'Sem Nome',
                role: data.role || 'user',
                status: data.status || 'active',
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                phone: data.phone,
                specialty: data.specialty,
                crm: data.crm,
                accountTier: data.accountTier,
                isClinicManager: data.isClinicManager,
                managerId: data.managerId
            } as SystemUser;
        });
    } catch (error) {
        console.error('Erro ao buscar perfis de usuários:', error);
        return [];
    }
};

export const getPendingUsers = async (managerId?: string): Promise<SystemUser[]> => {
    try {
        const usersRef = collection(db, 'system_users');
        let q;
        if (managerId) {
            q = query(usersRef, where('status', '==', 'pending'), where('managerId', '==', managerId));
        } else if (auth.currentUser?.email === MASTER_ADMIN_EMAIL) {
            q = query(usersRef, where('status', '==', 'pending'));
        } else {
            return [];
        }
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as SystemUser));
        return users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
        console.error('Erro ao buscar usuários pendentes:', error);
        return [];
    }
};

export const getUser = async (userId: string): Promise<SystemUser | null> => {
    try {
        const userRef = doc(db, 'system_users', userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() } as SystemUser;
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        return null;
    }
};

export const getUserByEmail = async (email: string): Promise<SystemUser | null> => {
    try {
        const usersRef = collection(db, 'system_users');
        const q = query(usersRef, where('email', '==', email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as SystemUser;
        }

        // Fallback: check user_profiles
        const profilesRef = collection(db, 'user_profiles');
        const qProfiles = query(profilesRef, where('email', '==', email));
        const snapshotProfiles = await getDocs(qProfiles);

        if (!snapshotProfiles.empty) {
            const doc = snapshotProfiles.docs[0];
            // Fetch minimal data needed
            return {
                id: doc.id,
                email: doc.data().email || email,
                name: doc.data().displayName || 'Usuário Existente',
                role: doc.data().role || 'user',
                status: 'active'
            } as SystemUser;
        }

        return null;
    } catch (error) {
        console.error('Erro ao buscar usuário por email:', error);
        return null;
    }
};

export const createUserByAdmin = async (
    adminId: string,
    userData: UserCreationByAdmin
): Promise<{ success: boolean; userId?: string; error?: string }> => {
    try {
        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            userData.email,
            userData.password
        );

        const userId = userCredential.user.uid;

        // Create user document in Firestore
        const userRef = doc(db, 'system_users', userId);
        await setDoc(userRef, {
            email: userData.email,
            name: userData.name,
            role: userData.role,
            status: 'active',
            phone: userData.phone || '',
            specialty: userData.specialty || '',
            crm: userData.crm || '',
            permissions: userData.permissions || DEFAULT_PERMISSIONS[userData.role],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            approvedBy: adminId,
            approvedAt: serverTimestamp(),
            accountTier: userData.accountTier || null,
            isClinicManager: userData.isClinicManager || false,
            // Enforce Group Inheritance:
            // If creator is not master admin, they are a Manager, so new user belongs to their group.
            // If creator IS master admin, we use the passed managerId (if any) or null.
            managerId: userData.managerId || (adminId !== 'elsoncontador.st@gmail.com' ? adminId : null)
        });

        const actualManagerId = userData.managerId || (adminId !== 'elsoncontador.st@gmail.com' ? adminId : null);

        // Also create/update user_profiles for tier management consistency
        const userProfileRef = doc(db, 'user_profiles', userId);
        await setDoc(userProfileRef, {
            email: userData.email,
            accountTier: userData.accountTier || null,
            isClinicManager: userData.isClinicManager || false,
            managerId: actualManagerId,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // CREATE AUTOMATIC CONTRACT FOR PROFESSIONALS
        // This ensures the user appears in the "Contratos" and "Operação Clínica" views
        if (actualManagerId && userData.role === 'professional') {
            try {
                const startDate = new Date().toISOString().split('T')[0];
                const endDate = new Date();
                endDate.setFullYear(endDate.getFullYear() + 1);
                const endDateStr = endDate.toISOString().split('T')[0];

                const contractData: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> = {
                    providerName: userData.name,
                    personType: 'PF', // Default for created professionals
                    serviceType: userData.specialty || 'Profissional de Saúde',
                    email: userData.email,
                    phone: userData.phone || '',
                    userId: userId,
                    managerId: actualManagerId,
                    status: 'active',
                    startDate: startDate,
                    endDate: endDateStr,
                    paymentModel: 'commission',
                    value: 0,
                    commissionPercentage: 70, // Default 70% commission
                    taxRate: 0,
                    roomRentalAmount: 0,
                    description: `Contrato criado automaticamente via Gestão de Usuários em ${new Date().toLocaleDateString('pt-BR')}`,
                    councilNumber: userData.crm || '',
                    userType: 'professional'
                };

                await addContract(contractData);
                console.log('[AUTO-CONTRACT] Contract created for user:', userId);
            } catch (contractError) {
                console.error('[AUTO-CONTRACT] Error creating automatic contract:', contractError);
                // We don't fail the whole user creation if contract fails, but logging is vital
            }
        }

        return { success: true, userId };
    } catch (error: any) {
        console.error('Erro ao criar usuário:', error);
        return {
            success: false,
            error: error.code === 'auth/email-already-in-use'
                ? 'Este e-mail já está em uso'
                : 'Erro ao criar usuário'
        };
    }
};

export const approveUser = async (
    userId: string,
    approverId: string,
    role: SystemUser['role']
): Promise<boolean> => {
    try {
        const userRef = doc(db, 'system_users', userId);
        await updateDoc(userRef, {
            status: 'approved',
            role: role,
            permissions: DEFAULT_PERMISSIONS[role],
            approvedBy: approverId,
            approvedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao aprovar usuário:', error);
        return false;
    }
};

export const rejectUser = async (
    userId: string,
    rejecterId: string,
    reason: string
): Promise<boolean> => {
    try {
        const userRef = doc(db, 'system_users', userId);
        await updateDoc(userRef, {
            status: 'rejected',
            rejectedBy: rejecterId,
            rejectedAt: serverTimestamp(),
            rejectionReason: reason,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao rejeitar usuário:', error);
        return false;
    }
};

export const updateUserStatus = async (
    userId: string,
    status: 'active' | 'inactive'
): Promise<boolean> => {
    try {
        const userRef = doc(db, 'system_users', userId);
        await updateDoc(userRef, {
            status,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar status do usuário:', error);
        return false;
    }
};

export const updateUserRole = async (
    userId: string,
    role: SystemUser['role']
): Promise<boolean> => {
    try {
        const userRef = doc(db, 'system_users', userId);
        await updateDoc(userRef, {
            role,
            permissions: DEFAULT_PERMISSIONS[role],
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar papel do usuário:', error);
        return false;
    }
};

export const updateUserPermissions = async (
    userId: string,
    permissions: Partial<SystemUser['permissions']>
): Promise<boolean> => {
    try {
        const userRef = doc(db, 'system_users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return false;

        const currentPermissions = userSnap.data().permissions || {};

        await updateDoc(userRef, {
            permissions: { ...currentPermissions, ...permissions },
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar permissões do usuário:', error);
        return false;
    }
};

export const deleteUser = async (userId: string): Promise<boolean> => {
    try {
        const userRef = doc(db, 'system_users', userId);
        await deleteDoc(userRef);
        // Note: This only deletes the Firestore document
        // Firebase Auth user deletion requires admin SDK or the user to be signed in
        return true;
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        return false;
    }
};

export const sendPasswordReset = async (email: string): Promise<boolean> => {
    try {
        await sendPasswordResetEmail(auth, email);
        return true;
    } catch (error) {
        console.error('Erro ao enviar e-mail de redefinição de senha:', error);
        return false;
    }
};

export const findManagerByCnpj = async (cnpj: string): Promise<{ managerId: string; name: string } | null> => {
    try {
        console.log('[CLINIC LINK] Searching for manager with CNPJ:', cnpj);

        // 1. Try searching in user_profiles (new standard)
        const profilesRef = collection(db, 'user_profiles');
        const qProfiles = query(
            profilesRef,
            where('cnpj', '==', cnpj)
            // TEMPORARILY removed isClinicManager filter for debugging
        );

        const snapshotProfiles = await getDocs(qProfiles);
        console.log('[CLINIC LINK] Found', snapshotProfiles.docs.length, 'profiles with this CNPJ');

        if (!snapshotProfiles.empty) {
            const docData = snapshotProfiles.docs[0].data();
            console.log('[CLINIC LINK] Profile data:', {
                uid: docData.uid,
                name: docData.nomeFantasia || docData.razaoSocial || docData.displayName,
                isClinicManager: docData.isClinicManager
            });

            return {
                managerId: docData.uid || snapshotProfiles.docs[0].id,
                name: docData.nomeFantasia || docData.razaoSocial || docData.displayName || 'Clínica Encontrada'
            };
        }

        // 2. Fallback: Try searching in users (legacy/previous save location)
        console.log('[CLINIC LINK] Not found in profiles, trying users collection...');
        const usersRef = collection(db, 'users');
        const qUsers = query(
            usersRef,
            where('cnpj', '==', cnpj)
        );

        const snapshotUsers = await getDocs(qUsers);
        console.log('[CLINIC LINK] Found', snapshotUsers.docs.length, 'users with this CNPJ');

        if (!snapshotUsers.empty) {
            const docData = snapshotUsers.docs[0].data();
            console.log('[CLINIC LINK] User data:', {
                uid: docData.uid,
                name: docData.nomeFantasia || docData.razaoSocial || docData.displayName
            });

            return {
                managerId: docData.uid || snapshotUsers.docs[0].id,
                name: docData.nomeFantasia || docData.razaoSocial || docData.displayName || 'Clínica Encontrada'
            };
        }

        console.log('[CLINIC LINK] No clinic found with CNPJ:', cnpj);
        return null;
    } catch (error) {
        console.error('[CLINIC LINK] Error searching for manager:', error);
        return null;
    }
};

export const linkUserToManager = async (userId: string, managerId: string): Promise<boolean> => {
    try {
        // Update user_profiles
        const profileRef = doc(db, 'user_profiles', userId);
        await updateDoc(profileRef, {
            managerId: managerId,
            clinicId: managerId, // Usually same as managerId for now
            updatedAt: serverTimestamp()
        });

        // Update system_users if exists
        const userRef = doc(db, 'system_users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            await updateDoc(userRef, {
                managerId: managerId,
                clinicId: managerId,
                updatedAt: serverTimestamp()
            });
        }

        return true;
    } catch (error) {
        console.error('Erro ao vincular usuário ao gestor:', error);
        return false;
    }
};

export const requestLinkToManager = async (
    userId: string,
    managerId: string,
    userData: { name: string; email: string; phone?: string; specialty?: string; crm?: string }
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Get manager data to include in request
        const managerRef = doc(db, 'user_profiles', managerId);
        const managerSnap = await getDoc(managerRef);

        let managerName = 'Clínica';
        let clinicCnpj = '';

        if (managerSnap.exists()) {
            const managerData = managerSnap.data();
            managerName = managerData.nomeFantasia || managerData.razaoSocial || managerData.displayName || 'Clínica';
            clinicCnpj = managerData.cnpj || '';
        }

        // Create a clinic link request instead of directly creating a contract
        const { createLinkRequest } = await import('./clinicLinkService');

        const result = await createLinkRequest({
            userId,
            userName: userData.name,
            userEmail: userData.email,
            userPhone: userData.phone,
            userSpecialty: userData.specialty,
            userCrm: userData.crm,
            managerId,
            managerName,
            clinicCnpj,
            clinicName: managerName
        });

        return result;
    } catch (error) {
        console.error('Erro ao solicitar vínculo:', error);
        return {
            success: false,
            error: 'Erro ao solicitar vínculo.'
        };
    }
};


export const updateUserAccessSettings = async (
    userId: string,
    settings: { restrictToOwnPatients?: boolean; blockedModules?: string[] }
): Promise<boolean> => {
    try {
        const userRef = doc(db, 'system_users', userId);
        const profileRef = doc(db, 'user_profiles', userId);

        const updates = {
            ...settings,
            updatedAt: serverTimestamp()
        };

        // Update both for consistency
        // We use set with merge because the document might not exist in one of the collections
        await setDoc(userRef, updates, { merge: true });
        await setDoc(profileRef, updates, { merge: true });

        return true;
    } catch (error) {
        console.error('Error updating access settings:', error);
        return false;
    }
};

export const updateUserClinics = async (
    userId: string,
    clinicIds: string[]
): Promise<boolean> => {
    try {
        const userRef = doc(db, 'system_users', userId);
        const profileRef = doc(db, 'user_profiles', userId);

        const updates = {
            clinicIds,
            updatedAt: serverTimestamp()
        };

        await setDoc(userRef, updates, { merge: true });
        await setDoc(profileRef, updates, { merge: true });

        return true;
    } catch (error) {
        console.error('Error updating user clinics:', error);
        return false;
    }
};
