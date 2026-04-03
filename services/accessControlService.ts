import { auth, db } from './firebase';
import { doc, getDoc, getDocs, collection, Query, query, where, CollectionReference } from 'firebase/firestore';
import { SystemUser, UserPermissions, DEFAULT_PERMISSIONS } from '../types/users';
import { getUserRole } from './userRoleService';

// Cache for user permissions to avoid repeated Firestore calls
let permissionCache: { [userId: string]: { permissions: UserPermissions; timestamp: number } } = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getUserPermissions = async (userId: string): Promise<UserPermissions> => {
    // Check cache
    if (permissionCache[userId] && Date.now() - permissionCache[userId].timestamp < CACHE_TTL) {
        return permissionCache[userId].permissions;
    }

    try {
        const userRef = doc(db, 'system_users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data() as SystemUser;
            const permissions = userData.permissions || DEFAULT_PERMISSIONS[userData.role];

            // Update cache
            permissionCache[userId] = { permissions, timestamp: Date.now() };
            return permissions;
        }

        // Fallback to default role permissions if user doc doesn't exist (e.g. just created in Auth)
        const role = await getUserRole(userId);
        return DEFAULT_PERMISSIONS[role];
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        return DEFAULT_PERMISSIONS['user']; // Safe fallback
    }
};

export const getManagerIdForUser = async (userId: string): Promise<string | null> => {
    try {
        const userRef = doc(db, 'system_users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data() as SystemUser;
            // If user is a manager/admin, they are their own manager
            if (['admin', 'manager'].includes(userData.role) || userData.email === 'elsoncontador.st@gmail.com') {
                return userId;
            }
            return userData.managerId || userId; // Fallback to userId to allow clinic creation
        }

        // Check user_profiles as fallback
        const profileRef = doc(db, 'user_profiles', userId);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
            const profileData = profileSnap.data();
            if (profileData.isClinicManager || profileData.email === 'elsoncontador.st@gmail.com') return userId;
            return profileData.managerId || userId; // Fallback to userId to allow clinic creation
        }

        // Return userId as final fallback to allow any authenticated user to create clinics
        return userId;
    } catch (error) {
        console.error('Error fetching manager ID:', error);
        return null;
    }
};

export const getAllowedClinicsForUser = async (userId: string): Promise<string[]> => {
    try {
        const userRef = doc(db, 'system_users', userId);
        const userSnap = await getDoc(userRef);
        const profileRef = doc(db, 'user_profiles', userId);
        const profileSnap = await getDoc(profileRef);

        const userData = userSnap.exists() ? userSnap.data() as SystemUser : null;
        const profileData = profileSnap.exists() ? profileSnap.data() : null;
        const role = userData?.role || profileData?.role;
        const isClinicManager = profileData?.isClinicManager || false;
        const managerId = await getManagerIdForUser(userId);

        // If Admin/Manager, or if they are their own manager context, they own the clinics
        if (role === 'admin' || role === 'manager' || isClinicManager || managerId === userId) {
            const targetId = managerId || userId;
            const clinicsRef = collection(db, 'users', targetId, 'clinics');
            const q = query(clinicsRef, where('active', '==', true));
            const snapshot = await getDocs(q);
            const clinicIds = snapshot.docs.map(doc => doc.id);
            // Also include their own ID if they are using the default tenant context
            return [...clinicIds, targetId];
        }

        // If Professional/Staff, check explicit clinicIds, then fallback to single clinicId
        const explicitLink = userData?.clinicIds || profileData?.clinicIds || [];
        if (explicitLink.length > 0) return explicitLink;

        const singleLink = userData?.clinicId || profileData?.clinicId;
        if (singleLink) return [singleLink];

        // Fallback: If no clinic linked, verify manager.
        // If linked to a manager, they might see everything from that manager (Legacy behavior) OR nothing.
        // Current requirement: "Linked to a specific Main Clinic". So if no clinicId, they see NOTHING.
        return [];
    } catch (error) {
        console.error('Error fetching allowed clinics:', error);
        return [];
    }
};

export const getUserAccessSettings = async (userId: string): Promise<{ restrictToOwnPatients: boolean; blockedModules: string[] }> => {
    try {
        const userRef = doc(db, 'system_users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data() as SystemUser;
            return {
                restrictToOwnPatients: data.restrictToOwnPatients || false,
                blockedModules: data.blockedModules || []
            };
        }

        // Fallback to user_profiles
        const profileRef = doc(db, 'user_profiles', userId);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
            const data = profileSnap.data();
            return {
                restrictToOwnPatients: data.restrictToOwnPatients || false,
                blockedModules: data.blockedModules || []
            };
        }

        return { restrictToOwnPatients: false, blockedModules: [] };
    } catch (error) {
        console.error("Error fetching access settings", error);
        return { restrictToOwnPatients: false, blockedModules: [] };
    }
};

export const createTeamQuery = async (
    collectionRef: CollectionReference,
    userId: string,
    fieldToFilter: string = 'managerId'
): Promise<Query> => {
    const managerId = await getManagerIdForUser(userId);

    if (!managerId) {
        // If no manager linked, only show own data
        return query(collectionRef, where('userId', '==', userId));
    }

    // Filter by the manager's ID
    // This assumes all shared resources have a 'managerId' field
    return query(collectionRef, where(fieldToFilter, '==', managerId));
};

export const canAccessResource = async (userId: string, resourceManagerId: string): Promise<boolean> => {
    const userManagerId = await getManagerIdForUser(userId);
    return userManagerId === resourceManagerId;
};

export const clearPermissionCache = (userId?: string) => {
    if (userId) {
        delete permissionCache[userId];
    } else {
        permissionCache = {};
    }
};
