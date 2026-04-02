import { Timestamp } from 'firebase/firestore';

export interface InvoiceRecipient {
    name: string;
    document: string; // CPF or CNPJ
    type: 'PF' | 'PJ';
}

export interface InvoiceRequest {
    id: string;
    userId: string;
    managerId: string;
    value: number;
    description: string;
    recipient: InvoiceRecipient;
    issueDate: string;
    notes?: string;
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export type InvoiceRequestFormData = Omit<InvoiceRequest, 'id' | 'userId' | 'managerId' | 'status' | 'createdAt' | 'updatedAt'>;

export type DocumentType = 'cnpj' | 'municipal' | 'cnes' | 'simples' | 'contract';

export interface AccountingDocument {
    id: string;
    managerId: string;
    type: DocumentType;
    fileName: string;
    fileUrl: string; // Storage URL
    uploadedBy: string; // Master user ID
    uploadedAt: Timestamp;
    // For Contrato Social
    contractVersion?: string; // "Última alteração", "Alteração 1", etc.
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
    cnpj: 'Cartão CNPJ',
    municipal: 'Inscrição Municipal',
    cnes: 'CNES',
    simples: 'Extrato Simples Nacional',
    contract: 'Contrato Social'
};
