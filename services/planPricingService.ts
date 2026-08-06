import { addDoc, collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AccountTier } from '../types/accountTiers';

export type PaidPlanTier = AccountTier.SILVER | AccountTier.GOLD | AccountTier.ENTERPRISE;

export interface PlanPricing {
    silver: number;
    gold: number;
    enterprise: number;
}

export const DEFAULT_PLAN_PRICING: PlanPricing = {
    silver: 119,
    gold: 190,
    enterprise: 390
};

const pricingRef = doc(db, 'public_config', 'subscription_plans');

const normalizePrice = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.round(parsed * 100) / 100 : fallback;
};

export const normalizePlanPricing = (data?: Partial<Record<keyof PlanPricing, unknown>>): PlanPricing => ({
    silver: normalizePrice(data?.silver, DEFAULT_PLAN_PRICING.silver),
    gold: normalizePrice(data?.gold, DEFAULT_PLAN_PRICING.gold),
    enterprise: normalizePrice(data?.enterprise, DEFAULT_PLAN_PRICING.enterprise)
});

export const subscribeToPlanPricing = (
    onChange: (pricing: PlanPricing) => void,
    onError?: (error: Error) => void
) => onSnapshot(
    pricingRef,
    snapshot => onChange(normalizePlanPricing(snapshot.data())),
    error => {
        console.error('Erro ao carregar preços dos planos:', error);
        onChange(DEFAULT_PLAN_PRICING);
        onError?.(error);
    }
);

export const updatePlanPricing = async (pricing: PlanPricing, previous: PlanPricing, updatedBy: string): Promise<void> => {
    const normalized = normalizePlanPricing(pricing);
    await setDoc(pricingRef, {
        ...normalized,
        updatedBy,
        updatedAt: serverTimestamp()
    }, { merge: true });
    await addDoc(collection(db, 'pricing_audit'), {
        previous,
        next: normalized,
        updatedBy,
        createdAt: serverTimestamp()
    });
};
