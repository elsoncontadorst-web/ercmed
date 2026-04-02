import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

export interface LGPDConsent {
    userId: string;
    userEmail: string;
    consentDate: any;
    ipAddress?: string;
    userAgent?: string;
    termVersion: string;
    accepted: boolean;
}

export const registerConsent = async (
    userId: string,
    userEmail: string,
    accepted: boolean
): Promise<boolean> => {
    try {
        console.log('[LGPD] Registering consent for user:', userId, 'accepted:', accepted);
        const consentData: Partial<LGPDConsent> = {
            userId,
            userEmail,
            consentDate: serverTimestamp(),
            termVersion: '2.0', // Updated version
            accepted,
            userAgent: navigator.userAgent
        };

        const docRef = await addDoc(collection(db, 'lgpd_consents'), consentData);
        console.log('[LGPD] Consent saved successfully! Doc ID:', docRef.id);
        return true;
    } catch (error) {
        console.error('[LGPD] Error registering LGPD consent:', error);
        return false;
    }
};

export const hasAcceptedLGPD = async (userId: string): Promise<boolean> => {
    try {
        console.log('[LGPD] Checking consent for user:', userId);
        const q = query(
            collection(db, 'lgpd_consents'),
            where('userId', '==', userId),
            where('accepted', '==', true)
        );

        const snapshot = await getDocs(q);
        const hasAccepted = !snapshot.empty;
        console.log('[LGPD] Has accepted:', hasAccepted, '(Found', snapshot.docs.length, 'records)');
        return hasAccepted;
    } catch (error) {
        console.error('[LGPD] Error checking LGPD consent:', error);
        return false;
    }
};

export const getUserConsents = async (userId: string): Promise<LGPDConsent[]> => {
    try {
        const q = query(
            collection(db, 'lgpd_consents'),
            where('userId', '==', userId)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as LGPDConsent));
    } catch (error) {
        console.error('Error fetching user consents:', error);
        return [];
    }
};
