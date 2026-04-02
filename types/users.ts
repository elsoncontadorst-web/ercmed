// User Management Types

// Module access configuration
export interface CustomModuleAccess {
    IRPF?: boolean;
    SIMULATOR?: boolean;
    ADVANCED_EMR?: boolean;
}

export interface SystemUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'manager' | 'professional' | 'receptionist' | 'user' | 'biller' | 'autonomous_provider';
    status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
    createdAt: any;
    updatedAt: any;
    approvedBy?: string; // ID do gestor que aprovou
    approvedAt?: any;
    rejectedBy?: string;
    rejectedAt?: any;
    rejectionReason?: string;
    phone?: string;
    specialty?: string; // Para profissionais de saúde
    crm?: string; // Para médicos
    permissions?: UserPermissions;
    customModuleAccess?: CustomModuleAccess;
    // Team/Clinic association
    managerId?: string; // ID do gestor responsável
    clinicId?: string; // ID da clínica (pode ser o mesmo que managerId)
    clinicIds?: string[]; // IDs das clínicas permitidas para o profissional

    // Account tier and permissions
    accountTier?: string; // Account tier (trial, bronze, silver, gold, unlimited)
    isClinicManager?: boolean; // If true, user can manage clinic settings

    // Access Control
    restrictToOwnPatients?: boolean; // If true, can only see patients they registered
    blockedModules?: string[]; // List of module keys that are blocked for this user
}

export interface UserPermissions {
    canManageUsers: boolean;
    canManagePatients: boolean;
    canManageAppointments: boolean;
    canManageBilling: boolean;
    canManageInventory: boolean;
    canManageContracts: boolean;
    canViewReports: boolean;
    canManageSettings: boolean;
}

export interface UserRegistrationRequest {
    email: string;
    password: string;
    name: string;
    phone?: string;
    specialty?: string;
    crm?: string;
    requestedRole: 'professional' | 'receptionist' | 'user';
}

export interface UserCreationByAdmin {
    email: string;
    password: string;
    name: string;
    role: 'admin' | 'manager' | 'professional' | 'receptionist' | 'user' | 'biller' | 'autonomous_provider';
    phone?: string;
    specialty?: string;
    crm?: string;
    permissions?: UserPermissions;
    accountTier?: string;
    isClinicManager?: boolean;
    managerId?: string; // ID do gestor responsável
    clinicId?: string; // ID da clínica
}

// Default permissions by role
export const DEFAULT_PERMISSIONS: Record<SystemUser['role'], UserPermissions> = {
    admin: {
        canManageUsers: true,
        canManagePatients: true,
        canManageAppointments: true,
        canManageBilling: true,
        canManageInventory: true,
        canManageContracts: true,
        canViewReports: true,
        canManageSettings: true
    },
    manager: {
        canManageUsers: true,
        canManagePatients: true,
        canManageAppointments: true,
        canManageBilling: true,
        canManageInventory: true,
        canManageContracts: true,
        canViewReports: true,
        canManageSettings: false
    },
    professional: {
        canManageUsers: false,
        canManagePatients: true,
        canManageAppointments: true,
        canManageBilling: false,
        canManageInventory: false,
        canManageContracts: false,
        canViewReports: true,
        canManageSettings: false
    },
    receptionist: {
        canManageUsers: false,
        canManagePatients: true,
        canManageAppointments: true,
        canManageBilling: false,
        canManageInventory: false,
        canManageContracts: false,
        canViewReports: false,
        canManageSettings: false
    },
    user: {
        canManageUsers: false,
        canManagePatients: false,
        canManageAppointments: false,
        canManageBilling: false,
        canManageInventory: false,
        canManageContracts: false,
        canViewReports: false,
        canManageSettings: false
    },
    biller: {
        canManageUsers: false,
        canManagePatients: true,
        canManageAppointments: false,
        canManageBilling: true,
        canManageInventory: false,
        canManageContracts: true,
        canViewReports: true,
        canManageSettings: false
    },
    autonomous_provider: {
        canManageUsers: false,
        canManagePatients: false,
        canManageAppointments: true,
        canManageBilling: false,
        canManageInventory: false,
        canManageContracts: false,
        canViewReports: false,
        canManageSettings: false
    }
};
