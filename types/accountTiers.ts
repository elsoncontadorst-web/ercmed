export enum AccountTier {
    TRIAL = 'trial',
    BRONZE = 'bronze',
    SILVER = 'silver',
    GOLD = 'gold',
    ENTERPRISE = 'enterprise',
    UNLIMITED = 'unlimited'
}

export interface TierLimits {
    maxProfessionals: number | null;
    maxPatients?: number | null;
    hasIRPFAccess: boolean;
    hasSimulatorAccess: boolean;
    hasAdvancedEMR: boolean;
    hasClinicManagement: boolean;
    hasClinicSync: boolean;
    hasAccountantModule: boolean;
    allowedModules?: string[];
}

export const TIER_CONFIG: Record<AccountTier, TierLimits> = {
    [AccountTier.TRIAL]: {
        maxProfessionals: 3,
        maxPatients: 10,
        hasIRPFAccess: false,
        hasSimulatorAccess: false,
        hasAdvancedEMR: false,
        hasClinicManagement: true, // Now enabled for basic Trial
        hasClinicSync: false,
        hasAccountantModule: false,
        allowedModules: [
            'healthManagement', 'patients', 'appointments', 'emr', 'receipts',
            'clinicHours', 'bookingSettings', 'medications', 'healthMetrics',
            'clinics', 'contracts', 'tiss_billing', 'clinic_teams' // Added modules
        ]
    },
    [AccountTier.BRONZE]: {
        maxProfessionals: 3,
        hasIRPFAccess: false,
        hasSimulatorAccess: false,
        hasAdvancedEMR: false, // Basic EMR
        hasClinicManagement: false,
        hasClinicSync: false,
        hasAccountantModule: false,
        allowedModules: ['healthManagement', 'patients', 'appointments', 'emr', 'receipts', 'clinicHours', 'bookingSettings', 'medications', 'healthMetrics']
    },
    [AccountTier.SILVER]: {
        maxProfessionals: 10,
        hasIRPFAccess: true,
        hasSimulatorAccess: false,
        hasAdvancedEMR: false, // Basic EMR
        hasClinicManagement: false,
        hasClinicSync: false,
        hasAccountantModule: false
    },
    [AccountTier.GOLD]: {
        maxProfessionals: 20,
        hasIRPFAccess: true,
        hasSimulatorAccess: true,
        hasAdvancedEMR: true, // Advanced EMR + Mixed Anamnesis
        hasClinicManagement: true,
        hasClinicSync: true,
        hasAccountantModule: false
    },
    [AccountTier.ENTERPRISE]: {
        maxProfessionals: 20,
        hasIRPFAccess: true,
        hasSimulatorAccess: true,
        hasAdvancedEMR: true,
        hasClinicManagement: true,
        hasClinicSync: true,
        hasAccountantModule: true // Includes AI Consultant logic/support implicitly via tier check
    },
    [AccountTier.UNLIMITED]: {
        maxProfessionals: null, // Unlimited
        hasIRPFAccess: true,
        hasSimulatorAccess: true,
        hasAdvancedEMR: true,
        hasClinicManagement: true,
        hasClinicSync: true,
        hasAccountantModule: true
    }
};

export const TIER_NAMES: Record<AccountTier, string> = {
    [AccountTier.TRIAL]: 'Trial',
    [AccountTier.BRONZE]: 'Start Free',
    [AccountTier.SILVER]: 'Professional',
    [AccountTier.GOLD]: 'Advanced',
    [AccountTier.ENTERPRISE]: 'Enterprise AI',
    [AccountTier.UNLIMITED]: 'Unlimited'
};

export const TIER_COLORS: Record<AccountTier, string> = {
    [AccountTier.TRIAL]: 'bg-blue-100 text-blue-700 border-blue-300',
    [AccountTier.BRONZE]: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    [AccountTier.SILVER]: 'bg-blue-100 text-blue-700 border-blue-300',
    [AccountTier.GOLD]: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    [AccountTier.ENTERPRISE]: 'bg-purple-100 text-purple-700 border-purple-300',
    [AccountTier.UNLIMITED]: 'bg-slate-200 text-slate-700 border-slate-300'
};


export const TIER_DESCRIPTIONS: Record<AccountTier, string> = {
    [AccountTier.TRIAL]: 'Período de testes gratuito com acesso à Gestão de Saúde',
    [AccountTier.BRONZE]: 'Experimentação e validação',
    [AccountTier.SILVER]: 'Organização e controle',
    [AccountTier.GOLD]: 'Crescimento estruturado',
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
    if (normalized.includes('bronze')) return AccountTier.BRONZE;
    if (normalized.includes('prata') || normalized.includes('silver') || normalized.includes('evolution')) return AccountTier.SILVER;
    if (normalized.includes('ouro') || normalized.includes('gold') || normalized.includes('premium')) return AccountTier.GOLD;
    if (normalized.includes('enterprise')) return AccountTier.ENTERPRISE;
    if (normalized.includes('unlimited') || normalized.includes('ilimitado')) return AccountTier.UNLIMITED;
    return AccountTier.TRIAL;
};

export const tierAllowsModule = (tier: AccountTier, module: string): boolean => {
    const config = TIER_CONFIG[tier];
    if (!config) return false;

    // Check specific module access
    switch (module.toLowerCase()) {
        case 'irpf':
            return config.hasIRPFAccess;
        case 'simulator':
            return config.hasSimulatorAccess;
        case 'advanced_emr':
        case 'advancedemr':
            return config.hasAdvancedEMR;
        case 'clinic_management':
        case 'clinicmanagement':
            return config.hasClinicManagement;
        case 'accountant':
            return config.hasAccountantModule;
        default:
            // Check in allowedModules array if it exists
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
    irpf: 'Atualize para o plano Prata ou superior para acessar o Simulador IRPF.',
    simulator: 'Atualize para o plano Ouro ou superior para acessar o Simulador Previdenciário.',
    advanced_emr: 'Atualize para o plano Ouro ou superior para acessar o Prontuário Avançado.',
    clinic_sync: 'Atualize para o plano Ouro ou superior para sincronizar clínicas.',
    accountant: 'Atualize para o plano Diamante para acessar o Módulo Contador.'
};

export const canAccessClinicManagement = (tier: AccountTier): boolean => {
    const config = TIER_CONFIG[tier];
    return config?.hasClinicManagement ?? false;
};

export const canAccessAccountantModule = (tier: AccountTier): boolean => {
    const config = TIER_CONFIG[tier];
    return config?.hasAccountantModule ?? false;
};

export const isMasterUser = (email: string): boolean => {
    return email === 'elsoncontador.st@gmail.com';
};



