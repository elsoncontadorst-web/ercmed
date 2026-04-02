// Receipt Management Type Definitions for Easymed

export interface Receipt {
    id: string;
    userId: string; // Clinic/professional who issued

    // Patient information
    patientId?: string; // Link to patient record if available
    patientName: string;
    patientCpf?: string;

    // Financial details
    amount: number;
    description: string;
    paymentMethod: 'cash' | 'pix' | 'card' | 'transfer' | 'insurance';

    // Reference
    referenceDate: string; // Date of service/payment (YYYY-MM-DD)
    issueDate: string; // Date receipt was issued (YYYY-MM-DD)
    receiptNumber: string; // Sequential number for tracking

    // Optional fields
    notes?: string;
    relatedAppointmentId?: string; // Link to appointment if applicable

    createdAt: any;
    updatedAt: any;
}

export interface ReceiptFormData {
    patientId?: string;
    patientName: string;
    patientCpf?: string;
    amount: string;
    description: string;
    paymentMethod: 'cash' | 'pix' | 'card' | 'transfer' | 'insurance';
    referenceDate: string;
    notes?: string;
}
