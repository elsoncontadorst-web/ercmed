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

// Cache for manager IDs to avoid repeated Firestore calls
let managerIdCache: { [userId: string]: { managerId: string | null; timestamp: number } } = {};

export const getManagerIdForUser = async (userId: string): Promise<string | null> => {
    // Check cache
    // Never cache a missing tenant link. During first registration Auth becomes
    // available a moment before user_profiles is written; caching null here
    // would block clinic creation for five minutes.
    if (managerIdCache[userId]?.managerId && Date.now() - managerIdCache[userId].timestamp < CACHE_TTL) {
        return managerIdCache[userId].managerId;
    }

    try {
        let managerId: string | null = null;
        const userRef = doc(db, 'system_users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data() as SystemUser;
            // If user is a manager/admin, they are their own manager
            if (['admin', 'manager', 'admin_gestor', 'admin_master'].includes(userData.role) || userData.isClinicManager || userData.email === 'elsoncontador.st@gmail.com') {
                managerId = userId;
            } else {
                managerId = userData.managerId || null;
            }
        } else {
            // Check user_profiles as fallback
            const profileRef = doc(db, 'user_profiles', userId);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
                const profileData = profileSnap.data();
                if (
                    profileData.isClinicManager ||
                    ['admin', 'manager', 'admin_gestor', 'admin_master'].includes(profileData.role) ||
                    profileData.email === 'elsoncontador.st@gmail.com'
                ) {
                    managerId = userId;
                } else {
                    managerId = profileData.managerId || null;
                }
            } else {
                // Missing tenant linkage must fail closed.
                managerId = null;
            }
        }

        // Update cache
        if (managerId) {
            managerIdCache[userId] = { managerId, timestamp: Date.now() };
        } else {
            delete managerIdCache[userId];
        }
        return managerId;
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
            const snapshot = await getDocs(clinicsRef);
            return snapshot.docs
                .filter(clinic => clinic.data().active !== false)
                .map(clinic => clinic.id);
        }

        // If Professional/Staff, check explicit clinicIds, then fallback to single clinicId
        const explicitLink = userData?.clinicIds || profileData?.clinicIds || [];
        if (explicitLink.length > 0) return explicitLink;

        const singleLink = userData?.clinicId || profileData?.clinicId;
        if (singleLink) return [singleLink];

        // Fail closed: a professional without an explicit unit assignment must
        // not inherit every clinic in the group.
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
                restrictToOwnPatients: data.restrictToOwnPatients === true,
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
