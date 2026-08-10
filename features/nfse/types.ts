export type NfseEnvironment = 'homologacao' | 'producao';

export interface NfseDraft {
    environment: NfseEnvironment;
    series: string;
    number: number;
    competenceDate: string;
    issuerCityCode: string;
    provider: {
        cpfCnpj: string;
        municipalRegistration?: string;
        simpleNationalOption: 1 | 2 | 3;
        simpleNationalTaxRegime?: 1 | 2 | 3;
        specialTaxRegime: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 9;
    };
    customer?: { cpfCnpj: string; name: string; email?: string };
    service: {
        locationCityCode: string;
        locationCountryCode?: string;
        nationalTaxCode: string;
        municipalTaxCode?: string;
        description: string;
        nbsCode?: string;
        amount: number;
        issTaxation: 1 | 2 | 3 | 4;
        issWithholding: 1 | 2 | 3;
        issRate?: number;
        irrfWithholdingAmount?: number;
        inssWithholdingAmount?: number;
    };
}

export interface NfsePreparationResult {
    validation: { valid: boolean; errors: string[]; warnings: string[] };
    xml: string | null;
    schemaVersion?: string;
    transmissionReady?: boolean;
    nextRequirement?: string;
}

export interface NfseCertificateStatus {
    configured: boolean;
    environment: 'producao_restrita' | 'producao';
    subject?: string;
    expiresAt?: string;
}

export interface NfseEmissionResult {
    id: string;
    status: 'autorizada' | 'recebida';
    authorizedXml?: string;
    response?: unknown;
}

export interface NfseHistoryItem {
    id: string;
    status: string;
    series: string;
    number: number;
    amount: number;
    customerDocument?: string;
    accessKey?: string;
    error?: string;
    createdAt?: string;
    environment?: 'producao_restrita' | 'producao';
}

export interface NfseFiscalProfile {
    regime: 'mei' | 'simples';
    providerDocument: string;
    municipalRegistration?: string;
    issuerCityCode: string;
    defaultServiceCityCode: string;
    nationalTaxCode: string;
    municipalTaxCode?: string;
    simpleNationalTaxRegime?: 1 | 2 | 3;
    issRate?: number;
    competence: string;
}
