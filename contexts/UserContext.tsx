import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { UserRole, UserProfile } from '../types';
import { getUserRole, getUserProfile } from '../services/userRoleService';
import { AccountTier, TIER_CONFIG, migrateTierName } from '../types/accountTiers';

interface ModulePermissions {
    ADVANCED_EMR: boolean;
}

interface UserContextType {
    user: User | null;
    userRole: UserRole | null;
    userProfile: UserProfile | null;
    userTier?: AccountTier;
    isAdmin: boolean;
    isAdminMaster: boolean;
    loading: boolean;
    modulePermissions: ModulePermissions;
    refreshUserData: () => Promise<void>;
    trialDaysRemaining?: number;
    isTrialExpired: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | undefined>(undefined);
    const [isTrialExpired, setIsTrialExpired] = useState<boolean>(false);
    const [modulePermissions, setModulePermissions] = useState<ModulePermissions>({
        ADVANCED_EMR: true
    });

    // Calculate module permissions based on tier and custom overrides
    const calculateModulePermissions = (profile: UserProfile | null, effectiveTier: AccountTier | undefined): ModulePermissions => {
        // Default: all modules enabled (for admin or users without tier)
        const defaultPermissions: ModulePermissions = {
            ADVANCED_EMR: true
        };

        if (!profile || !profile.accountTier) {
            return defaultPermissions;
        }

        const tier = effectiveTier || profile.accountTier as AccountTier;
        const tierLimits = TIER_CONFIG[tier];

        if (!tierLimits) {
            return defaultPermissions;
        }

        // Start with tier-based permissions
        const permissions: ModulePermissions = {
            ADVANCED_EMR: tierLimits.hasAdvancedEMR
        };

        // Apply custom overrides if they exist
        if (profile.customModuleAccess) {
            if (profile.customModuleAccess.ADVANCED_EMR !== undefined) {
                permissions.ADVANCED_EMR = profile.customModuleAccess.ADVANCED_EMR;
            }
        }

        return permissions;
    };

    const processUserTier = (profile: UserProfile | null, currentUser: User | null) => {
        if (!profile || !currentUser) return { tier: undefined, daysRemaining: undefined, isExpired: false };

        let tier = profile.accountTier ? migrateTierName(profile.accountTier) : AccountTier.TRIAL;
        let daysRemaining: number | undefined = undefined;
        let isExpired = false;

        // Only TRIAL tier has a 15-day expiration. Paid plans never expire.
        if (tier === AccountTier.TRIAL) {
            const createdAtStr = profile.createdAt || currentUser.metadata.creationTime;
            if (createdAtStr) {
                const createdDate = new Date(createdAtStr);
                const now = new Date();
                const diffTime = now.getTime() - createdDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                daysRemaining = Math.max(0, 15 - diffDays);
                
                if (diffDays >= 15) {
                    isExpired = true;
                }
            }
        }

        // Master Admin Override
        if (currentUser.email === 'elsoncontador.st@gmail.com') {
            tier = AccountTier.UNLIMITED;
            isExpired = false;
            daysRemaining = 999;
        }

        return { tier, daysRemaining, isExpired };
    };

    const refreshUserData = async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                const role = await getUserRole(currentUser.uid);
                const profile = await getUserProfile(currentUser.uid);

                // Master Admin Override (Profile level)
                if (currentUser.email === 'elsoncontador.st@gmail.com' && profile) {
                    profile.isClinicManager = true;
                }

                setUserRole(role);
                setUserProfile(profile);

                const { tier, daysRemaining, isExpired } = processUserTier(profile, currentUser);

                setTrialDaysRemaining(daysRemaining);
                setIsTrialExpired(isExpired);
                setModulePermissions(calculateModulePermissions(profile, tier));
            } catch (error) {
                console.error('Error refreshing user data:', error);
            }
        }
    };

    // Helper to get effective tier for exposing in context
    const getEffectiveTier = (): AccountTier | undefined => {
        if (!user || !userProfile) return undefined;
        return processUserTier(userProfile, user).tier;
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                try {
                    const role = await getUserRole(currentUser.uid);
                    const profile = await getUserProfile(currentUser.uid);

                    if (currentUser.email === 'elsoncontador.st@gmail.com' && profile) {
                        profile.isClinicManager = true;
                    }

                    setUserRole(role);
                    setUserProfile(profile);

                    const { tier, daysRemaining, isExpired } = processUserTier(profile, currentUser);
                    setTrialDaysRemaining(daysRemaining);
                    setIsTrialExpired(isExpired);
                    setModulePermissions(calculateModulePermissions(profile, tier));
                } catch (error) {
                    console.error('Error loading user data:', error);
                }
            } else {
                setUserRole(null);
                setUserProfile(null);
                setTrialDaysRemaining(undefined);
                setModulePermissions({
                    ADVANCED_EMR: true
                });
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Master admin email always has full access, regardless of database role
    const isMasterAdminEmail = user?.email === 'elsoncontador.st@gmail.com';
    const isAdmin = isMasterAdminEmail || userRole === UserRole.ADMIN_MASTER || userRole === UserRole.ADMIN_GESTOR;
    const isAdminMaster = isMasterAdminEmail || userRole === UserRole.ADMIN_MASTER;

    return (
        <UserContext.Provider value={{
            user,
            userRole,
            userProfile,
            userTier: getEffectiveTier(), // Expose computed tier
            isAdmin,
            isAdminMaster,
            loading,
            modulePermissions,
            refreshUserData,
            trialDaysRemaining,
            isTrialExpired
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
