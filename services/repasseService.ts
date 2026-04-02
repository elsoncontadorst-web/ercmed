import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    setDoc,
    updateDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Professional, ConsultationBilling, RepasseStatement, RepasseDeductions, Contract } from '../types/finance';
import { getContracts, getContractsByOwner } from './contractService';

// Helper to map Contract to Professional (for backward compatibility)
const contractToProfessional = (contract: Contract): Professional => {
    // Determine split percentage based on payment model
    let splitPercentage = 0;
    if (contract.paymentModel === 'commission') {
        splitPercentage = contract.commissionPercentage || 0;
    }

    return {
        id: contract.id,
        name: contract.providerName,
        email: contract.email || '',
        specialty: contract.serviceType,
        role: contract.serviceType,
        userId: contract.userId,
        repasseConfig: {
            taxRate: contract.taxRate || 0,
            splitPercentage: splitPercentage,
            clinicPercentage: 100 - splitPercentage,
            roomRentalAmount: contract.roomRentalAmount || 0,
            customDeductions: contract.customDeductions || [],
            bankAccount: contract.bankAccount
        },
        active: contract.status === 'active',
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt
    };
};

export const getProfessionalConfig = async (professionalId: string): Promise<Professional | null> => {
    try {
        // Try to find in contracts first
        const contractRef = doc(db, 'contracts', professionalId);
        const snap = await getDoc(contractRef);

        if (snap.exists()) {
            return contractToProfessional({ id: snap.id, ...snap.data() } as Contract);
        }

        // Fallback to legacy professionals collection (for migration safety)
        const profRef = doc(db, 'professionals', professionalId);
        const profSnap = await getDoc(profRef);
        if (profSnap.exists()) {
            return { id: profSnap.id, ...profSnap.data() } as Professional;
        }

        return null;
    } catch (error) {
        console.error('Erro ao buscar configuração do profissional:', error);
        return null;
    }
};

export const getAllProfessionals = async (): Promise<Professional[]> => {
    try {
        // Fetch from contracts
        const contracts = await getContracts();

        // Map to professionals
        const professionals = contracts
            .filter(c => c.status === 'active')
            .map(contractToProfessional);

        return professionals.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error('Erro ao buscar profissionais:', error);
        return [];
    }
};

export const getProfessionalsByOwner = async (userId: string): Promise<Professional[]> => {
    try {
        // Fetch from contracts specific to this owner
        const contracts = await getContractsByOwner(userId);

        // Map to professionals
        const professionals = contracts
            .filter(c => c.status === 'active')
            .map(contractToProfessional);

        // Fetch the Owner/Manager profile to include them as a professional
        try {
            const userProfileRef = doc(db, 'user_profiles', userId);
            const userProfileSnap = await getDoc(userProfileRef);

            if (userProfileSnap.exists()) {
                const profile = userProfileSnap.data();
                const managerName = profile.name || profile.displayName || 'Gestor';
                const managerEmail = profile.email || '';

                // Check if already in list by name or email to avoid duplicates
                const alreadyIncluded = professionals.some(p =>
                    p.name.toLowerCase() === managerName.toLowerCase() ||
                    (p.email && p.email.toLowerCase() === managerEmail.toLowerCase())
                );

                if (!alreadyIncluded) {
                    // Create a "Professional" object for the manager
                    const managerProfessional: Professional = {
                        id: userId, // Use userId as professional ID for the manager
                        name: managerName,
                        email: managerEmail,
                        specialty: profile.specialty || 'Gestor/Profissional',
                        role: profile.role || 'manager',
                        userId: userId,
                        repasseConfig: {
                            taxRate: 0,
                            splitPercentage: 100,
                            clinicPercentage: 0,
                            roomRentalAmount: 0,
                            customDeductions: [],
                            bankAccount: { bank: '', agency: '', account: '', accountType: 'checking' }
                        },
                        active: true,
                        createdAt: profile.createdAt || serverTimestamp(),
                        updatedAt: profile.updatedAt || serverTimestamp()
                    };
                    professionals.push(managerProfessional);
                }
            }
        } catch (err) {
            console.error('Error fetching manager profile for professionals list:', err);
        }

        // Final Deduplication by name (extra safety)
        const uniqueProfessionals = professionals.filter((prof, index, self) =>
            index === self.findIndex((p) => p.name.toLowerCase() === prof.name.toLowerCase())
        );

        return uniqueProfessionals.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error('Erro ao buscar profissionais por proprietário:', error);
        return [];
    }
};

/**
 * SECURE VERSION: Fetches only public professional data for online booking
 * Excludes banking info and repasse config
 */
export const getPublicProfessionalsByOwner = async (userId: string): Promise<Partial<Professional>[]> => {
    try {
        const professionals = await getProfessionalsByOwner(userId);
        return professionals.map(p => ({
            id: p.id,
            name: p.name,
            specialty: p.specialty,
            userId: p.userId
        }));
    } catch (error) {
        console.error('Erro ao buscar profissionais públicos:', error);
        return [];
    }
};



// ==================== BILLING MANAGEMENT ====================

export const processBilling = async (
    billing: Omit<ConsultationBilling, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> => {
    try {
        const billingRef = collection(db, 'consultation_billing');
        const docRef = await addDoc(billingRef, {
            ...billing,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Erro ao processar faturamento:', error);
        return null;
    }
};

export const getBillingRecords = async (
    professionalId: string,
    startDate: string,
    endDate: string
): Promise<ConsultationBilling[]> => {
    try {
        const billingRef = collection(db, 'consultation_billing');
        const q = query(
            billingRef,
            where('professionalId', '==', professionalId),
            where('consultationDate', '>=', startDate),
            where('consultationDate', '<=', endDate),
            where('paymentStatus', '==', 'received'),
            orderBy('consultationDate', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConsultationBilling));
    } catch (error) {
        console.error('Erro ao buscar registros de faturamento:', error);
        return [];
    }
};

export const getAllBillingRecords = async (professionalId?: string): Promise<ConsultationBilling[]> => {
    try {
        const billingRef = collection(db, 'consultation_billing');
        let q;
        if (professionalId) {
            q = query(billingRef, where('professionalId', '==', professionalId), orderBy('consultationDate', 'desc'));
        } else {
            q = query(billingRef, orderBy('consultationDate', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as ConsultationBilling));
    } catch (error) {
        console.error('Erro ao buscar todos os registros de faturamento:', error);
        return [];
    }
};

export const updateBillingRecord = async (
    billingId: string,
    data: Partial<Omit<ConsultationBilling, 'id' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const billingRef = doc(db, 'consultation_billing', billingId);
        await updateDoc(billingRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar registro de faturamento:', error);
        return false;
    }
};

// ==================== REPASSE CALCULATION ====================

/**
 * Calculate repasse for a professional in a given period
 * Calculation order: Faturamento - Imposto - Aluguel - Outras Taxas
 */
export const calculateRepasse = async (
    professionalId: string,
    startDate: string,
    endDate: string
): Promise<RepasseStatement | null> => {
    try {
        // 1. Get professional configuration
        const professional = await getProfessionalConfig(professionalId);
        if (!professional) {
            throw new Error('Configuração do profissional não encontrada');
        }

        // 2. Get all paid consultations in period
        const billings = await getBillingRecords(professionalId, startDate, endDate);

        // 3. Calculate total gross (Faturamento Total)
        const totalGross = billings.reduce((sum, billing) => sum + billing.grossAmount, 0);
        const totalConsultations = billings.length;

        // 4. Calculate deductions and Split
        // Logic: Gross -> Deduct Tax -> Split remaining between Prof and Clinic

        // 4. Calculate deductions and Split

        // Get Contract to check payment model
        const contractRef = doc(db, 'contracts', professionalId);
        const contractSnap = await getDoc(contractRef);
        const contract = contractSnap.exists() ? ({ id: contractSnap.id, ...contractSnap.data() } as Contract) : null;

        const taxAmount = totalGross * (professional.repasseConfig.taxRate / 100);
        const netAfterTax = totalGross - taxAmount;

        let professionalShare = 0;

        if (contract && contract.paymentModel === 'fixed') {
            // Fixed Payment Model: Professional gets fixed value, regardless of production
            // BUT, usually fixed payment is monthly. If this calculation is for a period, we might need to adjust?
            // For now, let's assume the fixed value is for the period if it matches a month, or just use the value.
            // Ideally, fixed value is per month. If period is < 1 month, should we pro-rate?
            // Let's keep it simple: If fixed, use the value defined in contract.
            professionalShare = contract.value;
        } else {
            // Commission Model (Default)
            const splitPercentage = professional.repasseConfig.splitPercentage || 0;
            professionalShare = netAfterTax * (splitPercentage / 100);
        }

        // Clinic Share (Residual)
        const clinicShare = netAfterTax - professionalShare;

        // Deductions
        const roomRental = professional.repasseConfig.roomRentalAmount || 0;
        const customDeductionsList = professional.repasseConfig.customDeductions.map(deduction => {
            let amount = 0;
            if (deduction.type === 'percentage') {
                amount = totalGross * (deduction.value / 100);
            } else {
                amount = deduction.value;
            }
            return {
                name: deduction.name,
                amount
            };
        });

        const customDeductionsTotal = customDeductionsList.reduce((sum, d) => sum + d.amount, 0);

        // Final Net Amount
        // If fixed, do we still deduct rental? Usually fixed implies "salary" or "service fee".
        // If commission, we deduct costs.
        // Let's assume:
        // Fixed: Receives Fixed Value. Deductions might apply if explicitly set.
        // Commission: Receives % - Deductions.

        const netAmount = professionalShare - roomRental - customDeductionsTotal;

        const deductions: RepasseDeductions = {
            taxPercentage: professional.repasseConfig.taxRate,
            taxAmount: taxAmount,
            roomRental: roomRental,
            customDeductions: customDeductionsList
        };

        const totalDeductions = taxAmount + roomRental + customDeductionsTotal + clinicShare; // Total deducted from Gross to get Net

        // 7. Create statement
        const statement: Omit<RepasseStatement, 'id'> = {
            professionalId,
            professionalName: professional.name,
            periodStart: startDate,
            periodEnd: endDate,
            totalGross,
            totalConsultations,
            deductions,
            totalDeductions,
            netAmount, // This is what the professional receives
            status: 'draft',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // 8. Save statement to Firestore
        const statementsRef = collection(db, 'repasse_statements');
        const docRef = await addDoc(statementsRef, statement);

        return {
            id: docRef.id,
            ...statement
        } as RepasseStatement;
    } catch (error) {
        console.error('Erro ao calcular repasse:', error);
        return null;
    }
};

export const getRepasseStatements = async (professionalId?: string): Promise<RepasseStatement[]> => {
    try {
        const statementsRef = collection(db, 'repasse_statements');
        let q;
        if (professionalId) {
            q = query(
                statementsRef,
                where('professionalId', '==', professionalId),
                orderBy('periodStart', 'desc')
            );
        } else {
            q = query(statementsRef, orderBy('periodStart', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as RepasseStatement));
    } catch (error) {
        console.error('Erro ao buscar demonstrativos de repasse:', error);
        return [];
    }
};

export const updateRepasseStatement = async (
    statementId: string,
    data: Partial<Omit<RepasseStatement, 'id' | 'createdAt'>>
): Promise<boolean> => {
    try {
        const statementRef = doc(db, 'repasse_statements', statementId);
        await updateDoc(statementRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Erro ao atualizar demonstrativo de repasse:', error);
        return false;
    }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get summary statistics for a professional
 */
export const getProfessionalStats = async (professionalId: string) => {
    try {
        const billings = await getAllBillingRecords(professionalId);
        const statements = await getRepasseStatements(professionalId);

        const totalRevenue = billings
            .filter(b => b.paymentStatus === 'received')
            .reduce((sum, b) => sum + b.grossAmount, 0);

        const pendingRevenue = billings
            .filter(b => b.paymentStatus === 'pending')
            .reduce((sum, b) => sum + b.grossAmount, 0);

        const totalPaid = statements
            .filter(s => s.status === 'paid')
            .reduce((sum, s) => sum + s.netAmount, 0);

        const pendingRepasse = statements
            .filter(s => s.status === 'approved')
            .reduce((sum, s) => sum + s.netAmount, 0);

        return {
            totalRevenue,
            pendingRevenue,
            totalPaid,
            pendingRepasse,
            totalConsultations: billings.length,
            totalStatements: statements.length
        };
    } catch (error) {
        console.error('Erro ao buscar estatísticas do profissional:', error);
        return null;
    }
};
/**
 * Save professional profile (Adapter for UserProfileView)
 */
export const saveProfessional = async (data: any): Promise<boolean> => {
    try {
        if (!data.userId) return false;

        // 1. Check if exists in contracts (new system)
        const contractsRef = collection(db, 'contracts');
        const q = query(contractsRef, where('userId', '==', data.userId));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // Update existing contract
            const contractDoc = snapshot.docs[0];
            await updateDoc(contractDoc.ref, {
                providerName: data.name,
                serviceType: data.specialty,
                email: data.email,
                phone: data.phone || '',
                councilNumber: data.crm || '', // Map CRM to councilNumber
                updatedAt: serverTimestamp()
            });
            return true;
        }

        // 2. If not in contracts, try legacy professionals collection
        // Or create in professionals if we want to support legacy
        // For now, let's update professionals collection if it exists there, or create it
        // But wait, UserProfileView passes 'userId' as the ID? No, it passes userId in the object.

        // Let's try to find by userId in professionals
        const profRef = collection(db, 'professionals');
        const qProf = query(profRef, where('userId', '==', data.userId));
        const snapProf = await getDocs(qProf);

        if (!snapProf.empty) {
            const docRef = snapProf.docs[0].ref;
            await setDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp()
            }, { merge: true });
            return true;
        }

        // If nowhere, create in professionals (legacy fallback)
        await addDoc(profRef, {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        return true;

    } catch (error) {
        console.error('Erro ao salvar profissional:', error);
        return false;
    }
};
