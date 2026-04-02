import { db, auth } from './firebase';
import { collection, doc, getDoc, setDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { UserRole, UserProfile, ProfessionalProfile } from '../types';

// Determine user role based on email
export const determineUserRole = (email: string): UserRole => {
    // Master admin
    if (email === 'elsoncontador.st@gmail.com') {
        return UserRole.ADMIN_MASTER;
    }

    // Gestor emails have admin access
    if (email.toLowerCase().startsWith('gestor')) {
        return UserRole.ADMIN_GESTOR;
    }

    // Default to health professional
    return UserRole.HEALTH_PROFESSIONAL;
};

// Get user role
export const getUserRole = async (userId: string): Promise<UserRole> => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.role) {
                return data.role as UserRole;
            }
        }

        // If no role set, determine from email
        const user = auth.currentUser;
        if (user?.email) {
            const role = determineUserRole(user.email);
            // Save the determined role
            await saveUserProfile(userId, {
                uid: userId,
                email: user.email,
                role,
                displayName: user.displayName || undefined,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return role;
        }

        return UserRole.HEALTH_PROFESSIONAL; // Default
    } catch (error) {
        console.error('Error getting user role:', error);
        return UserRole.HEALTH_PROFESSIONAL; // Default on error
    }
};

// Save user profile with role
export const saveUserProfile = async (userId: string, profile: Partial<UserProfile>): Promise<void> => {
    try {
        // VALIDATION: Check if CNPJ already exists (if user is updating CNPJ)
        if (profile.cnpj) {
            console.log('[PROFILE] Checking for duplicate CNPJ:', profile.cnpj);

            const profilesRef = collection(db, 'user_profiles');
            const cnpjQuery = query(
                profilesRef,
                where('cnpj', '==', profile.cnpj)
            );

            const existingSnapshot = await getDocs(cnpjQuery);

            // Check if CNPJ exists but belongs to another user
            const duplicateExists = existingSnapshot.docs.some(doc => doc.id !== userId);

            if (duplicateExists) {
                console.error('[PROFILE] CNPJ already registered by another user!');
                throw new Error('Este CNPJ já está cadastrado no sistema. Cada CNPJ pode ser cadastrado apenas uma vez.');
            }
        }

        // Save to 'users' collection (Auth/Basic info)
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            ...profile,
            updatedAt: serverTimestamp()
        }, { merge: true });

        // Save to 'user_profiles' collection (Tier/Modules info & Searchable data)
        // This is critical for findManagerByCnpj to work
        const profileRef = doc(db, 'user_profiles', userId);
        await setDoc(profileRef, {
            ...profile,
            updatedAt: serverTimestamp()
        }, { merge: true });

        console.log('[PROFILE] Profile saved successfully for user:', userId);
    } catch (error) {
        console.error('[PROFILE] Error saving user profile:', error);
        throw error;
    }
};

// Get user profile
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
        // Fetch from 'users' collection (Auth/Basic info)
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        // Fetch from 'user_profiles' collection (Tier/Modules info)
        const profileRef = doc(db, 'user_profiles', userId);
        const profileSnap = await getDoc(profileRef);
        const profileData = profileSnap.exists() ? profileSnap.data() : {};

        if (!userSnap.exists() && !profileSnap.exists()) {
            return null;
        }

        // Merge data, prioritizing user_profiles for tier info
        return {
            ...userData,
            ...profileData,
            uid: userId, // Ensure UID is set
            email: userData.email || profileData.email || '',
            role: userData.role || profileData.role || UserRole.HEALTH_PROFESSIONAL
        } as UserProfile;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
};

// Save professional profile
export const saveProfessionalProfile = async (userId: string, profile: Omit<ProfessionalProfile, 'userId' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    try {
        const profileRef = doc(db, 'users', userId, 'profile', 'professional');
        await setDoc(profileRef, {
            ...profile,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error saving professional profile:', error);
        throw error;
    }
};

// Get professional profile
export const getProfessionalProfile = async (userId: string): Promise<ProfessionalProfile | null> => {
    try {
        const profileRef = doc(db, 'users', userId, 'profile', 'professional');
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
            return profileSnap.data() as ProfessionalProfile;
        }
        return null;
    } catch (error) {
        console.error('Error getting professional profile:', error);
        return null;
    }
};

// Check if user is admin (master or gestor)
export const isAdmin = async (userId: string): Promise<boolean> => {
    const role = await getUserRole(userId);
    return role === UserRole.ADMIN_MASTER || role === UserRole.ADMIN_GESTOR;
};

// Check if user is admin master
export const isAdminMaster = async (userId: string): Promise<boolean> => {
    const role = await getUserRole(userId);
    return role === UserRole.ADMIN_MASTER;
};
