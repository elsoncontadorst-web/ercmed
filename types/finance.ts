// Financial Repasse Management Type Definitions for Easymed

// Custom deduction category for flexible repasse calculations
export interface CustomDeduction {
    id: string;
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
}

// Professional configuration for repasse calculations
export interface Professional {
    id: string;
    userId?: string; // Link to user account
    name: string;
    specialty: string;
    email: string;
    phone?: string;

    // Role definition
    role: 'Médico' | 'Terapeuta Ocupacional' | 'Psicólogo' | 'Fonoaudiólogo' | 'Nutricionista' | string;

    // Repasse configuration
    repasseConfig: {
        // Tax configuration (percentage)
        taxRate: number; // Percentage (0-100)

        // Split configuration
        splitPercentage: number; // Percentage going to the professional (0-100)
        clinicPercentage?: number; // Percentage kept by the clinic (optional, usually 100 - splitPercentage)

        // Room rental (fixed amount)
        roomRentalAmount: number;

        // Custom deductions (outras taxas)
        customDeductions: CustomDeduction[];

        // Payment details
        bankAccount?: {
            bank: string;
            agency: string;
            account: string;
            accountType: 'checking' | 'savings';
        };
    };

    active: boolean;
    createdAt: any;
    updatedAt: any;
}

// Individual consultation billing record
export interface ConsultationBilling {
    id: string;
    professionalId: string;
    professionalName: string;
    patientName?: string;
    consultationDate: string;

    // Financial details
    grossAmount: number; // Total charged to patient/insurance (Faturamento)

    // Calculation fields
    taxPercentage?: number; // Tax percentage (0-100)
    repassePercentage?: number; // Repasse percentage for professional (0-100)

    // Calculated amounts
    taxAmount?: number; // Calculated tax amount
    repasseAmount?: number; // Calculated repasse amount for professional
    clinicAmount?: number; // Amount kept by clinic

    paymentMethod: 'insurance' | 'private' | 'cash' | 'card';
    paymentStatus: 'pending' | 'received' | 'cancelled';
    paymentDate?: string;

    notes?: string;
    createdAt: any;
    updatedAt: any;
}

// Deduction details for repasse statement
export interface RepasseDeductions {
    // Tax deduction (percentage of gross)
    taxPercentage: number;
    taxAmount: number;

    // Room rental (fixed amount)
    roomRental: number;

    // Custom deductions (outras taxas)
    customDeductions: Array<{
        name: string;
        amount: number;
    }>;
}

// Final repasse statement for a professional in a period
export interface RepasseStatement {
    id: string;
    professionalId: string;
    professionalName: string;
    periodStart: string;
    periodEnd: string;

    // Calculations
    totalGross: number; // Sum of all consultations (Faturamento Total)
    totalConsultations: number;

    // Deductions breakdown
    deductions: RepasseDeductions;

    totalDeductions: number;
    netAmount: number; // Amount to be paid to professional (Valor Líquido a Repassar)

    status: 'draft' | 'approved' | 'paid';
    paymentDate?: string;

    createdAt: any;
    updatedAt: any;
}

// Contract Management
export interface Contract {
    id: string;
    providerName: string;
    personType: 'PF' | 'PJ';
    cpf?: string;
    cnpj?: string;
    councilNumber?: string;
    professionalType?: string; // Type of professional (e.g., Médico, Enfermeiro)
    serviceType: string; // Acts as "Role/Specialty" (e.g., Cardiologista, Dermatologista)

    // Contact & User Link
    email?: string;
    phone?: string;
    userId?: string; // Link to system user
    userType?: 'professional' | 'biller' | 'autonomous_provider'; // Type of user created for this contract
    managerId?: string; // ID of the manager who created/manages this contract

    startDate: string;
    endDate: string;
    paymentModel: 'fixed' | 'commission';

    // Financial Config
    value: number; // Fixed value or base value
    commissionPercentage?: number;
    taxRate?: number; // Imposto %
    roomRentalAmount?: number; // Aluguel Sala
    customDeductions?: CustomDeduction[]; // Outras taxas

    // Bank Account
    bankAccount?: {
        bank: string;
        agency: string;
        account: string;
        accountType: 'checking' | 'savings';
        pixKey?: string;
    };

    status: 'active' | 'expired' | 'pending';
    description?: string;
    createdAt: any;
    updatedAt: any;
}
