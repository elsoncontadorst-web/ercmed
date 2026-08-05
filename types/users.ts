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
    role: 'admin' | 'manager' | 'professional' | 'health_professional' | 'admin_gestor' | 'admin_master' | 'receptionist' | 'user' | 'biller' | 'autonomous_provider';
    status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive';
    createdAt: any;
    updatedAt: any;
    approvedBy?: string;
    approvedAt?: any;
    rejectedBy?: string;
    rejectedAt?: any;
    rejectionReason?: string;
    phone?: string;
    specialty?: string;
    crm?: string;
    professionalId?: string;
    professionalName?: string;
    permissions?: UserPermissions;
    customModuleAccess?: CustomModuleAccess;
    managerId?: string;
    clinicId?: string;
    clinicIds?: string[];
    accountTier?: string;
    isClinicManager?: boolean;
    restrictToOwnPatients?: boolean;
    blockedModules?: string[];
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
    role: 'admin' | 'manager' | 'professional' | 'health_professional' | 'admin_gestor' | 'admin_master' | 'receptionist' | 'user' | 'biller' | 'autonomous_provider';
    phone?: string;
    specialty?: string;
    crm?: string;
    professionalId?: string;
    permissions?: UserPermissions;
    accountTier?: string;
    isClinicManager?: boolean;
    managerId?: string;
    clinicId?: string;
}

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
    health_professional: {
        canManageUsers: false,
        canManagePatients: true,
        canManageAppointments: true,
        canManageBilling: false,
        canManageInventory: false,
        canManageContracts: false,
        canViewReports: true,
        canManageSettings: false
    },
    admin_gestor: {
        canManageUsers: true,
        canManagePatients: true,
        canManageAppointments: true,
        canManageBilling: true,
        canManageInventory: true,
        canManageContracts: true,
        canViewReports: true,
        canManageSettings: false
    },
    admin_master: {
        canManageUsers: true,
        canManagePatients: true,
        canManageAppointments: true,
        canManageBilling: true,
        canManageInventory: true,
        canManageContracts: true,
        canViewReports: true,
        canManageSettings: true
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
