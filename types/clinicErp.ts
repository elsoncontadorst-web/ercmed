export type ServicePayer = 'private' | 'insurance' | 'contract';

export interface ClinicService {
  id: string;
  code: string;
  name: string;
  category: string;
  specialty?: string;
  professionalId?: string;
  professionalName?: string;
  unitName?: string;
  contractName?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  durationMinutes: number;
  modality: 'in_person' | 'online' | 'home';
  payer: ServicePayer;
  payers?: ServicePayer[];
  grossPrice: number;
  minimumPrice?: number;
  tussCode?: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ServiceResolutionContext {
  payer: ServicePayer;
  date?: string;
  professionalId?: string;
  specialty?: string;
  unitName?: string;
  contractName?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'material' | 'medication' | 'supply';
  unit: string;
  quantity: number;
  minimumQuantity: number;
  batch?: string;
  expirationDate?: string;
  averageCost?: number;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: 'entry' | 'consumption' | 'adjustment';
  quantity: number;
  appointmentId?: string;
  registeredBy: string;
  reason?: string;
  createdAt?: unknown;
}

export interface CarePackageBalance {
  id: string;
  patientId?: string;
  patientName: string;
  professionalId?: string;
  professionalName?: string;
  serviceId: string;
  serviceName: string;
  packageName: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  unitName?: string;
  contractName?: string;
  active: boolean;
  lastUsedAt?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FiscalDocumentItem {
  description: string;
  code?: string;
  ncm?: string;
  cfop?: string;
  quantity?: number;
  unitValue?: number;
  totalValue: number;
}

export interface FiscalDocumentDraft {
  documentType: string;
  accessKey?: string;
  issuerName?: string;
  issuerCnpj?: string;
  recipientName?: string;
  recipientCnpj?: string;
  number?: string;
  series?: string;
  issuedAt?: string;
  totalValue: number;
  items: FiscalDocumentItem[];
  originalFileName: string;
  sourceFormat?: 'xml' | 'pdf';
  documentFingerprint?: string;
  extractionConfidence?: 'high' | 'medium' | 'low';
  suggestedEntryType?: 'income' | 'expense' | 'review';
}

export interface FiscalDocument extends FiscalDocumentDraft {
  id: string;
  classification: 'inventory' | 'expense' | 'asset' | 'tax';
  costCenter: string;
  status: 'reviewed' | 'cancelled';
  importedBy: string;
  importedAt?: unknown;
  counterpartiesIndexedAt?: unknown;
  clinicId?: string;
  unitName?: string;
  professionalId?: string;
  professionalName?: string;
  storagePath?: string;
  fileSize?: number;
}

export interface FiscalFileArchive {
  id: string;
  originalFileName: string;
  storagePath?: string;
  contentType: string;
  fileSize: number;
  chunkCount?: number;
  accessKey?: string;
  issuedAt?: string;
  clinicId?: string;
  unitName?: string;
  professionalId?: string;
  professionalName?: string;
  importedBy: string;
  importedAt?: unknown;
}

export interface FiscalCounterparty {
  id: string;
  name: string;
  taxId?: string;
  roles: Array<'customer' | 'supplier'>;
  documentCount: number;
  totalValue: number;
  lastDocumentAt?: string;
  lastDocumentId?: string;
  clinicId?: string;
  unitName?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AssetItem {
  id: string;
  name: string;
  category: 'equipment' | 'furniture' | 'technology' | 'vehicle' | 'other';
  acquisitionDate: string;
  acquisitionValue: number;
  usefulLifeMonths: number;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
  supplierName?: string;
  sourceFiscalDocumentId?: string;
  status: 'active' | 'maintenance' | 'disposed';
  lastMaintenanceAt?: string;
  nextMaintenanceAt?: string;
  notes?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
