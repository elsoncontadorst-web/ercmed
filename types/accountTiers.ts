export enum AccountTier {
    TRIAL = 'trial',
    SILVER = 'silver',
    GOLD = 'gold',
    ENTERPRISE = 'enterprise',
    UNLIMITED = 'unlimited'
}

export interface TierLimits {
    maxProfessionals: number | null;
    maxPatients?: number | null;
    hasAdvancedEMR: boolean;
    hasClinicManagement: boolean;
    hasClinicSync: boolean;
    hasIRPFAccess: boolean;
    hasSimulatorAccess: boolean;
    allowedModules?: string[];
}

export const TIER_CONFIG: Record<AccountTier, TierLimits> = {
    [AccountTier.TRIAL]: {
        maxProfessionals: 3,
        maxPatients: 10,
        hasAdvancedEMR: true,
        hasClinicManagement: true,
        hasClinicSync: true,
        hasIRPFAccess: true,
        hasSimulatorAccess: true,
        allowedModules: [
            'healthManagement', 'patients', 'appointments', 'emr', 'receipts',
            'clinicHours', 'bookingSettings', 'medications', 'healthMetrics',
            'clinics', 'contracts', 'tiss_billing', 'clinic_teams',
            'financial', 'repasse', 'tiss'
        ]
    },
    [AccountTier.SILVER]: {
        maxProfessionals: 10,
        hasAdvancedEMR: false,
        hasClinicManagement: false,
        hasClinicSync: false,
        hasIRPFAccess: true,
        hasSimulatorAccess: false
    },
    [AccountTier.GOLD]: {
        maxProfessionals: 20,
        hasAdvancedEMR: true,
        hasClinicManagement: true,
        hasClinicSync: true,
        hasIRPFAccess: true,
        hasSimulatorAccess: true
    },
    [AccountTier.ENTERPRISE]: {
        maxProfessionals: 20,
        hasAdvancedEMR: true,
        hasClinicManagement: true,
        hasClinicSync: true,
        hasIRPFAccess: true,
        hasSimulatorAccess: true
    },
    [AccountTier.UNLIMITED]: {
        maxProfessionals: null,
        hasAdvancedEMR: true,
        hasClinicManagement: true,
        hasClinicSync: true,
        hasIRPFAccess: true,
        hasSimulatorAccess: true
    }
};

export const TIER_NAMES: Record<AccountTier, string> = {
    [AccountTier.TRIAL]: 'Trial',
    [AccountTier.SILVER]: 'Professional',
    [AccountTier.GOLD]: 'Advanced',
    [AccountTier.ENTERPRISE]: 'Enterprise AI',
    [AccountTier.UNLIMITED]: 'Unlimited'
};

export const TIER_COLORS: Record<AccountTier, string> = {
    [AccountTier.TRIAL]: 'bg-blue-100 text-blue-700 border-blue-300',
    [AccountTier.SILVER]: 'bg-blue-100 text-blue-700 border-blue-300',
    [AccountTier.GOLD]: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    [AccountTier.ENTERPRISE]: 'bg-purple-100 text-purple-700 border-purple-300',
    [AccountTier.UNLIMITED]: 'bg-slate-200 text-slate-700 border-slate-300'
};


export const TIER_DESCRIPTIONS: Record<AccountTier, string> = {
    [AccountTier.TRIAL]: 'Período de testes gratuito com acesso à Gestão de Saúde',
    [AccountTier.SILVER]: 'Organização e controle profissional',
    [AccountTier.GOLD]: 'Crescimento estruturado e escala',
    [AccountTier.ENTERPRISE]: 'Máxima performance e inteligência',
    [AccountTier.UNLIMITED]: 'Zero limites para grandes redes'
};

export const getTierLimits = (tier: AccountTier): TierLimits => {
    return TIER_CONFIG[tier] || TIER_CONFIG[AccountTier.TRIAL];
};

export const getProfessionalLimitText = (tier: AccountTier): string => {
    const limit = TIER_CONFIG[tier]?.maxProfessionals;
    return limit === null ? 'Ilimitado' : limit.toString();
};

export const migrateTierName = (tierName: string): AccountTier => {
    const normalized = tierName.toLowerCase();
    if (normalized.includes('bronze')) return AccountTier.TRIAL;
    if (normalized.includes('prata') || normalized.includes('silver') || normalized.includes('evolution')) return AccountTier.SILVER;
    if (normalized.includes('ouro') || normalized.includes('gold') || normalized.includes('premium')) return AccountTier.GOLD;
    if (normalized.includes('enterprise')) return AccountTier.ENTERPRISE;
    if (normalized.includes('unlimited') || normalized.includes('ilimitado')) return AccountTier.UNLIMITED;
    return AccountTier.TRIAL;
};

export const tierAllowsModule = (tier: AccountTier | string | undefined, module: string): boolean => {
    if (!tier) return false;
    
    // Normalize tier string to AccountTier enum
    const normalizedTier = typeof tier === 'string' ? migrateTierName(tier) : tier;
    const config = TIER_CONFIG[normalizedTier];
    
    if (!config) return false;

    // Check specific module access
    switch (module.toLowerCase()) {
        case 'advanced_emr':
        case 'advancedemr':
            return config.hasAdvancedEMR;
        case 'clinic_management':
        case 'clinicmanagement':
            return config.hasClinicManagement;
        default:
            // Check in allowedModules array if it exists (case-sensitive as per config)
            return config.allowedModules?.includes(module) ?? true;
    }
};

export const isPremiumOrEnterprise = (tier: AccountTier): boolean => {
    return tier === AccountTier.GOLD || tier === AccountTier.ENTERPRISE || tier === AccountTier.UNLIMITED;
};

export const canSyncClinics = (tier: AccountTier): boolean => {
    const config = TIER_CONFIG[tier];
    return config?.hasClinicSync ?? false;
};

export const UPGRADE_MESSAGES: Record<string, string> = {
    advanced_emr: 'Atualize para o plano Ouro ou superior para acessar o Prontuário Avançado.',
    clinic_sync: 'Atualize para o plano Ouro ou superior para sincronizar clínicas.'
};

export const canAccessClinicManagement = (tier: AccountTier): boolean => {
    const config = TIER_CONFIG[tier];
    return config?.hasClinicManagement ?? false;
};

export const isMasterUser = (email: string): boolean => {
    return email === 'elsoncontador.st@gmail.com';
};

export const canAccessAccountantModule = (tier: AccountTier): boolean => {
    // Both Gold and Enterprise (and Unlimited) have access to the accountant module
    return tier === AccountTier.GOLD || tier === AccountTier.ENTERPRISE || tier === AccountTier.UNLIMITED || tier === AccountTier.TRIAL;
};



