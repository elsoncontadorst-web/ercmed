// TISS Billing Module Types

export interface HealthInsurance {
    id: string;
    professionalId: string; // ID do profissional que cadastrou
    name: string; // Nome do Convênio (ex: Unimed, Bradesco Saúde)
    cnpj: string;
    registrationCode: string; // Código de Registro ANS
    contactPhone?: string;
    contactEmail?: string;
    active: boolean;
    createdAt: any;
    updatedAt: any;
}

export interface TissTable {
    id: string;
    professionalId: string; // ID do profissional que cadastrou
    insuranceId: string; // Referência ao Convênio
    insuranceName: string;
    tableName: string; // Nome da Tabela (ex: CBHPM, AMB, TUSS)
    version?: string; // Versão da Tabela
    procedures: TissProcedure[];
    active: boolean;
    createdAt: any;
    updatedAt: any;
}

export interface TissProcedure {
    code: string; // Código do Procedimento
    description: string; // Descrição
    price: number; // Valor
}

export interface TissGuide {
    id: string;
    guideNumber: string; // Número da Guia
    guideType: 'CONSULTA' | 'SADT' | 'SP/SADT' | 'INTERNACAO' | 'HONORARIOS'; // Tipo de Guia
    insuranceId: string;
    insuranceName: string;
    patientId: string;
    patientName: string;
    patientCardNumber?: string; // Número da Carteirinha
    professionalId: string; // ID do profissional que atendeu (já existia, mas agora usado para filtro)
    professionalName: string;
    professionalCrm?: string;
    serviceDate: string; // Data do Atendimento
    procedures: TissGuideProcedure[];
    totalValue: number;
    status: 'PENDENTE' | 'EM_LOTE' | 'ENVIADO' | 'PAGO' | 'GLOSADO';
    batchId?: string; // ID do Lote (se já foi adicionado a um lote)
    observations?: string;
    createdAt: any;
    updatedAt: any;
}

export interface TissGuideProcedure {
    code: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface TissBatch {
    id: string;
    professionalId: string; // ID do profissional que criou o lote
    batchNumber: string; // Número do Lote
    insuranceId: string;
    insuranceName: string;
    guideIds: string[]; // IDs das Guias no Lote
    guideCount: number;
    totalValue: number;
    status: 'ABERTO' | 'FECHADO' | 'ENVIADO' | 'PROCESSADO';
    createdAt: any;
    closedAt?: any;
    sentAt?: any;
    xmlGenerated: boolean;
}

export interface TissGlosa {
    id: string;
    professionalId: string; // ID do profissional relacionado
    guideId: string;
    guideNumber: string;
    batchId?: string;
    insuranceId: string;
    insuranceName: string;
    procedureCode: string;
    procedureDescription: string;
    glosaType: 'TOTAL' | 'PARCIAL'; // Glosa Total ou Parcial
    originalValue: number;
    glosedValue: number; // Valor Glosado
    glosaReason: string; // Motivo da Glosa
    glosaDate: string;
    status: 'PENDENTE' | 'RECURSO_ENVIADO' | 'DEFERIDO' | 'INDEFERIDO';
    resourceDate?: string; // Data do Recurso
    resourceJustification?: string;
    resolutionDate?: string;
    resolutionNotes?: string;
    createdAt: any;
    updatedAt: any;
}
