
export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  sources?: Array<{
    title: string;
    url: string;
  }>;
  isError?: boolean;
}

// Enums
export enum UserRole {
  ADMIN_MASTER = 'admin_master',
  ADMIN_GESTOR = 'admin_gestor',
  HEALTH_PROFESSIONAL = 'health_professional',
  BILLER = 'biller'
}

export enum AppView {
  DASHBOARD = 'dashboard',
  COMPARISON = 'comparison',
  AI_CONSULTANT = 'ai_consultant',
  UNEMPLOYMENT = 'unemployment',
  ABOUT = 'about',

  // Health Management Views
  HEALTH_DASHBOARD = 'health_dashboard',
  PATIENTS = 'patients',
  APPOINTMENTS = 'appointments',
  MEDICATIONS = 'medications',
  EMR = 'emr',
  INVENTORY = 'inventory',
  MEDICAL_RECORDS = 'medical_records',
  RECEIPTS = 'receipts',
  CLINIC_HOURS = 'clinic_hours',
  BOOKING_SETTINGS = 'booking_settings',
  PROFESSIONAL_REGISTRATION = 'professional_registration',
  CLINICS = 'clinics',
  CLINIC_TEAMS = 'clinic_teams',

  // Clinical Repasse Management Views
  REPASSE_DASHBOARD = 'repasse_dashboard',
  BILLING_MANAGEMENT = 'billing_management',
  REPASSE_CALCULATION = 'repasse_calculation',
  PROFESSIONAL_CONFIG = 'professional_config',

  // Contracts Management
  CONTRACTS = 'contracts',

  // TISS Billing
  TISS_BILLING = 'tiss_billing',

  // User Management
  USERS_MANAGEMENT = 'users_management',
  PERMISSIONS_MANAGEMENT = 'permissions_management',
  DOMESTIC_CALC = 'domestic_calc',
  LOAN_REVISION = 'loan_revision',
  TEAM_INVITATIONS = 'team_invitations',

  // Legacy views (keeping for gradual migration)
  SIMULATOR = 'simulator',
  FINANCIAL_CONTROL = 'financial_control',
  ABOUT_APP = 'about_app',
  CASH_FLOW = 'cash_flow',
  SEVERANCE_CALC = 'severance_calc',
  HOW_TO_USE = 'how_to_use',
  USER_PROFILE = 'user_profile',
  SALES_MANAGEMENT = 'sales_management',
  MANAGER_LOGIN = 'manager_login',
  MANAGER_DASHBOARD = 'manager_dashboard',
  IRPF_CALC = 'irpf_calc',
  FEEDBACK = 'feedback',
  DEBUG = 'debug',
  PLANS = 'plans',
  ACCOUNTANT_MODULE = 'accountant_module'
}

// User Profile
export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  jobTitle?: string; // Cargo
  function?: string; // Função
  cpf?: string; // CPF do usuário
  cnpj?: string; // CNPJ da clínica/empresa
  razaoSocial?: string; // Razão social (se CNPJ)
  nomeFantasia?: string; // Nome fantasia (se CNPJ)
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  createdAt: any;
  updatedAt: any;
  // Account Tier System
  accountTier?: string; // AccountTier enum value
  isClinicManager?: boolean;
  managerId?: string; // ID of the manager if this user is a professional under a clinic
  customModuleAccess?: {
    IRPF?: boolean;
    SIMULATOR?: boolean;
    ADVANCED_EMR?: boolean;
  };
}

export interface ProfessionalProfile {
  userId: string;
  name: string;
  specialty: string;
  registrationNumber: string; // CRM, COREN, CRO, etc.
  phone: string;
  email: string;
  cpf?: string;
  createdAt: any;
  updatedAt: any;
}

export type ActivityCategory =
  | 'COMERCIO'
  | 'INDUSTRIA'
  | 'SERVICOS_FATOR_R' // Sujeito ao Fator R (Ex: Fisioterapia, Engenharia)
  | 'SERVICOS_GERAL'   // Anexo III direto (Ex: Manutenção, Instalação)
  | 'ADVOCACIA';       // Anexo IV

export interface MonthlyRecord {
  month: number; // 1-12
  revenue: number;
  expenses: number;
  payroll: number; // Folha de Salários (Pró-labore + Funcionários + Encargos)
}

export interface SimulationConfig {
  activity: ActivityCategory;
  months: MonthlyRecord[];
}

export interface AnnualResult {
  totalRevenue: number;
  totalExpenses: number;
  totalPayroll: number;
  globalFatorR: number; // Para decisão anual
  scenarios: {
    mei: TaxScenario;
    simples: TaxScenario;
    presumido: TaxScenario;
  };
}

export interface TaxScenario {
  name: string;
  totalTax: number;
  effectiveRate: number;
  netProfit: number;
  isViable: boolean;
  notes: string[];
  anexo?: string; // Específico para Simples
}

export interface CnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  descricao_situacao_cadastral: string;
  cnae_fiscal_descricao: string;
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  qsa?: Array<{ nome_socio: string; qualificacao_socio: string }>;
}

export interface DomesticResult {
  grossSalary: number;
  inssEmployee: number;
  irrf: number;
  netSalary: number;

  // Salário Família
  familySalary: number; // Valor total do benefício

  // Vale Transporte
  transportVoucher: number; // Valor do vale transporte
  transportDeduction: number; // Dedução aplicada (máx 6%)

  // Custos Patrão (DAE)
  inssEmployer: number; // 8%
  fgts: number; // 8%
  fgtsCompensatory: number; // 3.2%
  insurance: number; // 0.8% (Gilrat)
  totalCost: number; // Custo total da guia DAE + Salário Líquido (desembolso total)
  daeValue: number; // Valor da guia a pagar
}

export interface SalesOrder {
  id: string;
  date: string;
  customerName: string;
  customerDoc?: string; // CPF/CNPJ
  items: SalesItem[];
  totalAmount: number;
  status: 'draft' | 'finalized' | 'cancelled';
  paymentMethod?: string;
  notes?: string;
}

export interface SalesItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ProfessionalSettings {
  professionalName: string;
  profession: string; // Deprecated: use role and specialty instead
  role?: string;
  specialty?: string;
  serviceHours: string;
  logoUrl?: string;
  crm?: string;
  phone?: string;
  email?: string;
  updatedAt?: any;
}