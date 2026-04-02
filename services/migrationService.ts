import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Professional, Contract } from '../types/finance';

export const migrateProfessionalsToContracts = async (): Promise<{ success: number; failed: number; errors: any[] }> => {
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    try {
        // 1. Fetch all professionals
        const professionalsRef = collection(db, 'professionals');
        const snapshot = await getDocs(professionalsRef);
        const professionals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Professional));

        console.log(`Found ${professionals.length} professionals to migrate.`);

        // 2. Fetch existing contracts to avoid duplicates (optional, but good practice)
        // We can check by providerName or email
        const contractsRef = collection(db, 'contracts');
        const contractsSnapshot = await getDocs(contractsRef);
        const existingContracts = contractsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
        const existingNames = new Set(existingContracts.map(c => c.providerName.toLowerCase()));

        // 3. Migrate each professional
        for (const prof of professionals) {
            try {
                if (existingNames.has(prof.name.toLowerCase())) {
                    console.log(`Skipping ${prof.name} - already exists in contracts.`);
                    continue;
                }

                const newContract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> = {
                    providerName: prof.name,
                    personType: 'PF', // Default to PF for professionals
                    serviceType: prof.specialty || 'Outro',
                    email: prof.email,
                    phone: prof.phone,
                    userId: prof.userId,

                    // Default dates (start today, end in 1 year)
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],

                    paymentModel: 'commission',
                    value: 0, // Not used for commission
                    commissionPercentage: prof.repasseConfig?.splitPercentage || 0,
                    taxRate: prof.repasseConfig?.taxRate || 0,
                    roomRentalAmount: prof.repasseConfig?.roomRentalAmount || 0,
                    customDeductions: prof.repasseConfig?.customDeductions || [],

                    bankAccount: prof.repasseConfig?.bankAccount ? {
                        bank: prof.repasseConfig.bankAccount.bank,
                        agency: prof.repasseConfig.bankAccount.agency,
                        account: prof.repasseConfig.bankAccount.account,
                        accountType: prof.repasseConfig.bankAccount.accountType,
                        pixKey: '' // Not in professional config usually
                    } : undefined,

                    status: prof.active ? 'active' : 'expired',
                    description: `Migrado automaticamente de Gestão de Profissionais. Role: ${prof.role}`
                };

                await addDoc(contractsRef, {
                    ...newContract,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                success++;
                console.log(`Migrated ${prof.name} successfully.`);

            } catch (err) {
                console.error(`Failed to migrate ${prof.name}:`, err);
                failed++;
                errors.push({ name: prof.name, error: err });
            }
        }

    } catch (error) {
        console.error('Migration failed:', error);
        errors.push({ error });
    }

    return { success, failed, errors };
};
