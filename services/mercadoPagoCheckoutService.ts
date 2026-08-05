import { AccountTier } from '../types/accountTiers';
import { httpsCallable } from 'firebase/functions';
import { getCloudFunctions } from './firebase';

const salesWhatsAppUrl = 'https://api.whatsapp.com/send?phone=5579988078887&text=Ol%C3%A1%2C%20quero%20contratar%20um%20plano%20ERCMed%20para%20minha%20cl%C3%ADnica.';

const checkoutUrls: Partial<Record<AccountTier, string | undefined>> = {
    [AccountTier.SILVER]: import.meta.env.VITE_MERCADO_PAGO_PROFESSIONAL_URL,
    [AccountTier.GOLD]: import.meta.env.VITE_MERCADO_PAGO_ADVANCED_URL,
    [AccountTier.ENTERPRISE]: import.meta.env.VITE_MERCADO_PAGO_ENTERPRISE_URL,
};

export const openMercadoPagoCheckout = async (tier: AccountTier): Promise<boolean> => {
    try {
        const createSubscription = httpsCallable<
            { planId: string },
            { checkoutUrl: string; subscriptionId: string }
        >(getCloudFunctions(), 'createMercadoPagoSubscription');
        const result = await createSubscription({ planId: tier });
        window.location.assign(result.data.checkoutUrl);
        return true;
    } catch (error) {
        console.error('Não foi possível abrir o checkout do Mercado Pago:', error);
        const checkoutUrl = checkoutUrls[tier];
        if (checkoutUrl) {
            window.location.assign(checkoutUrl);
            return true;
        }
        window.alert('Não foi possível iniciar o pagamento agora. Tente novamente ou fale com o suporte.');
        return false;
    }
};

export const openSalesContact = () => {
    window.open(salesWhatsAppUrl, '_blank', 'noopener,noreferrer');
};
