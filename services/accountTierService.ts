// Account Tier Management Service

import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { AccountTier, getTierLimits } from '../types/accountTiers';
import { UserProfile } from '../types';

const MASTER_ADMIN_EMAIL = 'elsoncontador.st@gmail.com';

/**
 * Assign account tier to a user (only master admin can do this)
 */
export const assignTier = async (userId: string, tier: AccountTier, currentUserEmail: string): Promise<void> => {
    // Update user_profiles (use setDoc with merge to ensure doc exists)
    const userRef = doc(db, 'user_profiles', userId);
    await setDoc(userRef, {
        accountTier: tier,
        updatedAt: Timestamp.now()
    }, { merge: true });

    // Also update system_users for the admin view
    try {
        const systemUserRef = doc(db, 'system_users', userId);
        await setDoc(systemUserRef, {
            accountTier: tier,
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (error) {
        console.warn('Could not update system_users (might not exist):', error);
    }
};

/**
 * Set user as clinic manager
 */
export const setClinicManager = async (userId: string, isManager: boolean, currentUserEmail: string): Promise<void> => {
    // Update user_profiles (use setDoc with merge to ensure doc exists)
    const userRef = doc(db, 'user_profiles', userId);
    await setDoc(userRef, {
        isClinicManager: isManager,
        updatedAt: Timestamp.now()
    }, { merge: true });

    // Also update system_users for the admin view
    try {
        const systemUserRef = doc(db, 'system_users', userId);
        await setDoc(systemUserRef, {
            isClinicManager: isManager,
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (error) {
        console.warn('Could not update system_users (might not exist):', error);
    }
};

/**
 * Get count of professionals registered by a manager
 */
export const getProfessionalCount = async (managerId: string): Promise<number> => {
    try {
        // Count in contracts collection where managerId matches
        const contractsRef = collection(db, 'contracts');
        const q = query(contractsRef, where('managerId', '==', managerId));
        const snapshot = await getDocs(q);

        return snapshot.size;
    } catch (error) {
        console.error('Error counting professionals:', error);
        return 0;
    }
};

/**
 * Check if manager can add more professionals based on their tier
 */
export const canAddProfessional = async (managerId: string): Promise<{ canAdd: boolean; current: number; limit: number | null; message?: string }> => {
    try {
        // Get manager's profile
        const managerRef = doc(db, 'user_profiles', managerId);
        const managerSnap = await getDoc(managerRef);

        if (!managerSnap.exists()) {
            return { canAdd: false, current: 0, limit: null, message: 'Perfil não encontrado' };
        }

        const managerProfile = managerSnap.data() as UserProfile;

        // If not a clinic manager or no tier set, allow (admin case)
        if (!managerProfile.isClinicManager || !managerProfile.accountTier) {
            return { canAdd: true, current: 0, limit: null };
        }

        // Master Admin Override
        if (managerProfile.email === MASTER_ADMIN_EMAIL) {
            return { canAdd: true, current: 0, limit: null };
        }

        const tier = managerProfile.accountTier as AccountTier;
        const limits = getTierLimits(tier);
        const currentCount = await getProfessionalCount(managerId);

        // If unlimited (Diamond)
        if (limits.maxProfessionals === null) {
            return { canAdd: true, current: currentCount, limit: null };
        }

        // Check if within limit
        const canAdd = currentCount < limits.maxProfessionals;

        return {
            canAdd,
            current: currentCount,
            limit: limits.maxProfessionals,
            message: canAdd ? undefined : `Limite de ${limits.maxProfessionals} profissionais atingido. Faça upgrade para cadastrar mais.`
        };
    } catch (error) {
        console.error('Error checking professional limit:', error);
        return { canAdd: false, current: 0, limit: null, message: 'Erro ao verificar limite' };
    }
};

/**
 * Check if user has access to a specific module based on their tier
 */
export const checkModuleAccess = async (userId: string, module: 'IRPF' | 'SIMULATOR' | 'ADVANCED_EMR'): Promise<boolean> => {
    try {
        const userRef = doc(db, 'user_profiles', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return false;

        const userProfile = userSnap.data() as UserProfile;

        // Check for custom overrides first
        if (userProfile.customModuleAccess && userProfile.customModuleAccess[module] !== undefined) {
            return userProfile.customModuleAccess[module]!;
        }

        // Master Admin Override
        if (userProfile.email === MASTER_ADMIN_EMAIL) {
            return true;
        }

        // If no tier set or is admin, allow access
        if (!userProfile.accountTier) return true;

        const tier = userProfile.accountTier as AccountTier;
        const limits = getTierLimits(tier);

        switch (module) {
            case 'IRPF':
                return limits.hasIRPFAccess;
            case 'SIMULATOR':
                return limits.hasSimulatorAccess;
            case 'ADVANCED_EMR':
                return limits.hasAdvancedEMR;
            default:
                return true;
        }
    } catch (error) {
        console.error('Error checking module access:', error);
        return false;
    }
};

/**
 * Update user module access overrides
 */
export const updateUserModuleAccess = async (userId: string, moduleAccess: { IRPF?: boolean; SIMULATOR?: boolean; ADVANCED_EMR?: boolean }): Promise<void> => {
    // Update user_profiles (upsert)
    const userRef = doc(db, 'user_profiles', userId);
    await setDoc(userRef, {
        customModuleAccess: moduleAccess,
        updatedAt: Timestamp.now()
    }, { merge: true });

    // Also update system_users for the admin view
    try {
        const systemUserRef = doc(db, 'system_users', userId);
        await setDoc(systemUserRef, {
            customModuleAccess: moduleAccess,
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (error) {
        console.warn('Could not update system_users (might not exist):', error);
    }
};

/**
 * Get user's tier information
 */
export const getUserTierInfo = async (userId: string): Promise<{
    tier: AccountTier | null;
    isManager: boolean;
    professionalCount: number;
    limits: ReturnType<typeof getTierLimits> | null;
}> => {
    try {
        const userRef = doc(db, 'user_profiles', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            return { tier: null, isManager: false, professionalCount: 0, limits: null };
        }

        const userProfile = userSnap.data() as UserProfile;
        const tier = userProfile.accountTier as AccountTier | null;
        const isManager = userProfile.isClinicManager || false;

        let professionalCount = 0;
        if (isManager) {
            professionalCount = await getProfessionalCount(userId);
        }

        // Master Admin Override
        if (userProfile.email === MASTER_ADMIN_EMAIL) {
            return {
                tier: AccountTier.UNLIMITED,
                isManager: true,
                professionalCount,
                limits: getTierLimits(AccountTier.UNLIMITED)
            };
        }

        return {
            tier,
            isManager,
            professionalCount,
            limits: tier ? getTierLimits(tier) : null
        };
    } catch (error) {
        console.error('Error getting user tier info:', error);
        return { tier: null, isManager: false, professionalCount: 0, limits: null };
    }
};
