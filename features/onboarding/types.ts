
export enum OnboardingStepId {
    CONSULTORIOS = 'consultorios',
    PACIENTES = 'pacientes',
    AGENDAMENTO = 'agendamento',
    RECIBOS = 'recibos',
    CONTRATOS = 'contratos',
    REPASSE = 'repasse',
    CLINICA = 'clinica',
}

export enum OnboardingStepStatus {
    LOCKED = 'locked',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    SKIPPED = 'skipped',
}

export interface OnboardingStep {
    id: OnboardingStepId;
    title: string;
    description: string;
    status: OnboardingStepStatus;
    isOptional: boolean;
    completedAt?: string; // ISO Date string
}

export interface OnboardingState {
    currentStepId: OnboardingStepId;
    steps: OnboardingStep[];
    isCompleted: boolean;
    progressPercentage: number;
}

export const INITIAL_STEPS: OnboardingStep[] = [
    {
        id: OnboardingStepId.CONSULTORIOS,
        title: 'Consultórios',
        description: 'Cadastre suas unidades de atendimento ou salas.',
        status: OnboardingStepStatus.ACTIVE, // First one starts active
        isOptional: false,
    },
    {
        id: OnboardingStepId.PACIENTES,
        title: 'Gestão de Pacientes',
        description: 'Cadastre seu primeiro paciente.',
        status: OnboardingStepStatus.LOCKED,
        isOptional: false,
    },
    {
        id: OnboardingStepId.AGENDAMENTO,
        title: 'Agendamento de Consultas',
        description: 'Agende uma consulta para seu paciente.',
        status: OnboardingStepStatus.LOCKED,
        isOptional: false,
    },
    {
        id: OnboardingStepId.RECIBOS,
        title: 'Recibos de Pacientes',
        description: 'Gere um recibo para a consulta realizada.',
        status: OnboardingStepStatus.LOCKED,
        isOptional: false,
    },
    {
        id: OnboardingStepId.CONTRATOS,
        title: 'Contratos de Prestadores',
        description: 'Cadastre um contrato para um profissional.',
        status: OnboardingStepStatus.LOCKED,
        isOptional: true, // Maybe optional?
    },
    {
        id: OnboardingStepId.REPASSE,
        title: 'Cálculo de Repasse',
        description: 'Simule e calcule o repasse médico.',
        status: OnboardingStepStatus.LOCKED,
        isOptional: false,
    },
    {
        id: OnboardingStepId.CLINICA,
        title: 'Clínica',
        description: 'Configure os dados básicos da sua clínica.',
        status: OnboardingStepStatus.LOCKED,
        isOptional: false,
    },
];
