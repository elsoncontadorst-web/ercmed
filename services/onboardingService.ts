import { addClinic } from './clinicService';
import { createUserByAdmin } from './userManagementService';
import { ClinicFormData } from '../types/clinic';
import { UserCreationByAdmin } from '../types/users';
import { auth } from './firebase';

export interface OnboardingData {
    clinic: ClinicFormData;
    professionals: UserCreationByAdmin[];
}

/**
 * Executes the onboarding process: saves the clinic and the initial professionals.
 */
export const completeOnboarding = async (data: OnboardingData): Promise<{ success: boolean; error?: string }> => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');

        // 1. Save Clinic
        const clinicId = await addClinic(data.clinic);
        if (!clinicId) throw new Error('Erro ao salvar os dados da clínica.');

        // 2. Save Professionals (if any)
        for (const prof of data.professionals) {
            const result = await createUserByAdmin(user.uid, {
                ...prof,
                managerId: user.uid,
                isClinicManager: false
            });
            
            if (!result.success) {
                console.warn(`Erro ao cadastrar profissional ${prof.email}:`, result.error);
                // We continue even if one professional fails, or we could rollback? 
                // Firestore doesn't easily rollback cross-collection without transactions.
                // For now, let's just report the error if it's the first one.
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error('[ONBOARDING] Error:', error);
        return { 
            success: false, 
            error: error.message || 'Ocorreu um erro ao processar o onboarding.' 
        };
    }
};
