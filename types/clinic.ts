import { Timestamp } from 'firebase/firestore';

export interface ClinicAddress {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
}

export interface Clinic {
    id: string;
    name: string;
    address: ClinicAddress;
    phone: string;
    email?: string;
    specialty: string;
    cnpj?: string;
    taxRegime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
    cnes?: string;
    managerId: string; // Owner/Manager ID
    createdAt: Timestamp;
    updatedAt: Timestamp;
    active: boolean;
}

export type ClinicFormData = Omit<Clinic, 'id' | 'managerId' | 'createdAt' | 'updatedAt' | 'active'>;
