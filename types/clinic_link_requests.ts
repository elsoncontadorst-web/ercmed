// Clinic Link Request Types

export interface ClinicLinkRequest {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    userSpecialty?: string;
    userCrm?: string;

    managerId: string;
    managerName: string;
    clinicCnpj: string;
    clinicName: string;

    status: 'pending' | 'approved' | 'rejected';
    requestDate: any;
    responseDate?: any;
    respondedBy?: string;
    rejectionReason?: string;

    createdAt: any;
    updatedAt: any;
}

export interface CreateLinkRequestData {
    userId: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    userSpecialty?: string;
    userCrm?: string;

    managerId: string;
    managerName: string;
    clinicCnpj: string;
    clinicName: string;
}
