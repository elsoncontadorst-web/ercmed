export type NfseEnvironment = "homologacao" | "producao";

export interface NfseParty {
  cpfCnpj: string;
  name?: string;
  municipalRegistration?: string;
  email?: string;
}

export interface NfseDraft {
  environment: NfseEnvironment;
  series: string;
  number: number;
  competenceDate: string;
  issuerCityCode: string;
  provider: NfseParty & {
    simpleNationalOption: 1 | 2 | 3;
    simpleNationalTaxRegime?: 1 | 2 | 3;
    specialTaxRegime: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 9;
  };
  customer?: NfseParty;
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

export interface NfseValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
