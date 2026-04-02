import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { ClinicLinkRequest, CreateLinkRequestData } from '../types/clinic_link_requests';
import { addContract } from './contractService';
import { linkUserToManager } from './userManagementService';
import { Contract } from '../types/finance';

/**
 * Create a new clinic link request
 */
export const createLinkRequest = async (
    data: CreateLinkRequestData
): Promise<{ success: boolean; requestId?: string; error?: string }> => {
    try {
        // Check if there's already a pending request for this user and manager
        const requestsRef = collection(db, 'clinic_link_requests');
        const q = query(
            requestsRef,
            where('userId', '==', data.userId),
            where('managerId', '==', data.managerId),
            where('status', '==', 'pending')
        );

        const existingRequests = await getDocs(q);

        if (!existingRequests.empty) {
            return {
                success: false,
                error: 'Já existe uma solicitação pendente para esta clínica.'
            };
        }

        // Create new request
        const requestData: Omit<ClinicLinkRequest, 'id'> = {
            ...data,
            status: 'pending',
            requestDate: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(requestsRef, requestData);

        return {
            success: true,
            requestId: docRef.id
        };
    } catch (error) {
        console.error('Erro ao criar solicitação de vínculo:', error);
        return {
            success: false,
            error: 'Erro ao criar solicitação de vínculo.'
        };
    }
};

/**
 * Get all pending requests for a manager
 */
export const getPendingRequestsForManager = async (
    managerId: string
): Promise<ClinicLinkRequest[]> => {
    try {
        console.log('[getPendingRequestsForManager] Fetching for managerId:', managerId);
        const requestsRef = collection(db, 'clinic_link_requests');
        const q = query(
            requestsRef,
            where('managerId', '==', managerId),
            where('status', '==', 'pending')
            // Removed orderBy to avoid composite index requirement
        );

        const snapshot = await getDocs(q);
        console.log('[getPendingRequestsForManager] Found', snapshot.size, 'documents');

        const requests = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('[getPendingRequestsForManager] Request:', doc.id, data);
            return {
                id: doc.id,
                ...data
            } as ClinicLinkRequest;
        });

        // Sort manually by createdAt descending
        requests.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
        });

        console.log('[getPendingRequestsForManager] Returning', requests.length, 'requests');
        return requests;
    } catch (error) {
        console.error('Erro ao buscar solicitações pendentes:', error);
        return [];
    }
};

/**
 * Get all requests for a manager (all statuses)
 */
export const getAllRequestsForManager = async (
    managerId: string
): Promise<ClinicLinkRequest[]> => {
    try {
        const requestsRef = collection(db, 'clinic_link_requests');
        const q = query(
            requestsRef,
            where('managerId', '==', managerId)
            // Removed orderBy to avoid composite index requirement
        );

        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ClinicLinkRequest));

        // Sort manually by createdAt descending
        requests.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
        });

        return requests;
    } catch (error) {
        console.error('Erro ao buscar solicitações:', error);
        return [];
    }
};

/**
 * Get all requests for a user
 */
export const getUserLinkRequests = async (
    userId: string
): Promise<ClinicLinkRequest[]> => {
    try {
        const requestsRef = collection(db, 'clinic_link_requests');
        const q = query(
            requestsRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ClinicLinkRequest));
    } catch (error) {
        console.error('Erro ao buscar solicitações do usuário:', error);
        return [];
    }
};

/**
 * Approve a link request and create contract
 */
export const approveLinkRequest = async (
    requestId: string,
    approverId: string
): Promise<{ success: boolean; contractId?: string; error?: string }> => {
    try {
        // Get request data
        const requestRef = doc(db, 'clinic_link_requests', requestId);
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists()) {
            return {
                success: false,
                error: 'Solicitação não encontrada.'
            };
        }

        const request = { id: requestSnap.id, ...requestSnap.data() } as ClinicLinkRequest;

        if (request.status !== 'pending') {
            return {
                success: false,
                error: 'Esta solicitação já foi processada.'
            };
        }

        // 1. Link user to manager
        const linkSuccess = await linkUserToManager(request.userId, request.managerId);

        if (!linkSuccess) {
            return {
                success: false,
                error: 'Erro ao vincular usuário ao gestor.'
            };
        }

        // 2. Create contract automatically
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];

        const contractData: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> = {
            providerName: request.userName,
            personType: 'PF',
            serviceType: request.userSpecialty || 'Profissional de Saúde',
            email: request.userEmail,
            phone: request.userPhone,
            userId: request.userId,
            managerId: request.managerId,
            status: 'active',
            startDate: startDate,
            endDate: endDateStr,
            paymentModel: 'commission',
            value: 0,
            commissionPercentage: 70, // Default 70% for professional
            taxRate: 0,
            roomRentalAmount: 0,
            description: `Contrato criado automaticamente a partir de solicitação de vínculo aprovada em ${new Date().toLocaleDateString('pt-BR')}`,
            councilNumber: request.userCrm,
            userType: 'professional'
        };

        const contractId = await addContract(contractData);

        if (!contractId) {
            return {
                success: false,
                error: 'Erro ao criar contrato.'
            };
        }

        // 3. Update request status
        await updateDoc(requestRef, {
            status: 'approved',
            responseDate: serverTimestamp(),
            respondedBy: approverId,
            updatedAt: serverTimestamp()
        });

        return {
            success: true,
            contractId
        };
    } catch (error) {
        console.error('Erro ao aprovar solicitação:', error);
        return {
            success: false,
            error: 'Erro ao aprovar solicitação.'
        };
    }
};

/**
 * Reject a link request
 */
export const rejectLinkRequest = async (
    requestId: string,
    rejecterId: string,
    reason: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const requestRef = doc(db, 'clinic_link_requests', requestId);
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists()) {
            return {
                success: false,
                error: 'Solicitação não encontrada.'
            };
        }

        const request = requestSnap.data() as ClinicLinkRequest;

        if (request.status !== 'pending') {
            return {
                success: false,
                error: 'Esta solicitação já foi processada.'
            };
        }

        await updateDoc(requestRef, {
            status: 'rejected',
            responseDate: serverTimestamp(),
            respondedBy: rejecterId,
            rejectionReason: reason,
            updatedAt: serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        console.error('Erro ao rejeitar solicitação:', error);
        return {
            success: false,
            error: 'Erro ao rejeitar solicitação.'
        };
    }
};

/**
 * Get count of pending requests for a manager
 */
export const getPendingRequestsCount = async (managerId: string): Promise<number> => {
    try {
        const requests = await getPendingRequestsForManager(managerId);
        return requests.length;
    } catch (error) {
        console.error('Erro ao contar solicitações pendentes:', error);
        return 0;
    }
};
