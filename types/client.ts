export interface Client {
  id: string;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  postalCode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cityCode?: string;
  patientId?: string;
  clinicId?: string;
  unitName?: string;
  source: 'manual' | 'xml' | 'nfse';
  lastDocumentAt?: string;
  lastDocumentId?: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>;
