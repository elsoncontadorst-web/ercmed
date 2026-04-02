import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { UserRole, UserProfile } from '../types';
import { getUserRole, getUserProfile } from '../services/userRoleService';
import { AccountTier, TIER_CONFIG } from '../types/accountTiers';

interface ModulePermissions {
    IRPF: boolean;
    SIMULATOR: boolean;
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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | undefined>(undefined);
    const [modulePermissions, setModulePermissions] = useState<ModulePermissions>({
        IRPF: true,
        SIMULATOR: true,
        ADVANCED_EMR: true
    });

    // Calculate module permissions based on tier and custom overrides
    const calculateModulePermissions = (profile: UserProfile | null, effectiveTier: AccountTier | undefined): ModulePermissions => {
        // Default: all modules enabled (for admin or users without tier)
        const defaultPermissions: ModulePermissions = {
            IRPF: true,
            SIMULATOR: true,
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
            IRPF: tierLimits.hasIRPFAccess,
            SIMULATOR: tierLimits.hasSimulatorAccess,
            ADVANCED_EMR: tierLimits.hasAdvancedEMR
        };

        // Apply custom overrides if they exist
        if (profile.customModuleAccess) {
            if (profile.customModuleAccess.IRPF !== undefined) {
                permissions.IRPF = profile.customModuleAccess.IRPF;
            }
            if (profile.customModuleAccess.SIMULATOR !== undefined) {
                permissions.SIMULATOR = profile.customModuleAccess.SIMULATOR;
            }
            if (profile.customModuleAccess.ADVANCED_EMR !== undefined) {
                permissions.ADVANCED_EMR = profile.customModuleAccess.ADVANCED_EMR;
            }
        }

        return permissions;
    };

    const processUserTier = (profile: UserProfile | null, currentUser: User | null) => {
        if (!profile || !currentUser) return { tier: undefined, daysRemaining: undefined };

        let tier = profile.accountTier as AccountTier;
        let daysRemaining: number | undefined = undefined;

        // Check for 15-day Trial Boost
        if (tier === AccountTier.TRIAL) {
            // Use creationTime from Firebase Auth (more reliable for "user age") or profile.createdAt
            const createdAtStr = currentUser.metadata.creationTime || profile.createdAt;
            if (createdAtStr) {
                const createdDate = new Date(createdAtStr);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - createdDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // 15 Days full access
                if (diffDays <= 15) {
                    tier = AccountTier.UNLIMITED;
                    daysRemaining = 15 - diffDays;
                }
            }
        }

        // Master Admin Override
        if (currentUser.email === 'elsoncontador.st@gmail.com') {
            tier = AccountTier.UNLIMITED;
        }

        return { tier, daysRemaining };
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

                const { tier, daysRemaining } = processUserTier(profile, currentUser);

                // We create a "virtual" profile access context, but keep original profile tier data?
                // Actually, consumers usually check `useUser().userTier`. We should override that return value.
                // But for `modulePermissions`, we need to use the computed tier.

                setTrialDaysRemaining(daysRemaining);
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

                    const { tier, daysRemaining } = processUserTier(profile, currentUser);
                    setTrialDaysRemaining(daysRemaining);
                    setModulePermissions(calculateModulePermissions(profile, tier));
                } catch (error) {
                    console.error('Error loading user data:', error);
                }
            } else {
                setUserRole(null);
                setUserProfile(null);
                setTrialDaysRemaining(undefined);
                setModulePermissions({
                    IRPF: true,
                    SIMULATOR: true,
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
            trialDaysRemaining // New exposed prop
        } as any}>
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
