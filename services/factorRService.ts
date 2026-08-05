import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AnexoSimples, calculateExecutiveSimples, ExecutiveSimplesSnapshot } from './simplesExecutiveService';

export type FactorRSource = 'automatic' | 'manual';

export interface FactorRMonthEntry {
  month: string;
  revenue: number;
  payroll: number;
  revenueSource: FactorRSource;
  payrollSource: FactorRSource;
  justification?: string;
}

export interface FactorRSettings {
  months: FactorRMonthEntry[];
  updatedAt?: unknown;
  updatedBy?: string;
}

export interface FactorRSnapshot {
  revenue12: number;
  payroll12: number;
  factorR: number | null;
  annex: 'III' | 'V' | null;
  payrollGap: number;
  complete: boolean;
  simples: ExecutiveSimplesSnapshot | null;
}

export const getRollingMonthKeys = (reference = new Date()) => {
  const keys: string[] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(reference.getFullYear(), reference.getMonth() - offset, 1);
    keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
};

export const getFactorRSettings = async (managerId: string): Promise<FactorRSettings | null> => {
  const snapshot = await getDoc(doc(db, 'users', managerId, 'settings', 'factorR'));
  return snapshot.exists() ? snapshot.data() as FactorRSettings : null;
};

export const saveFactorRSettings = async (managerId: string, settings: FactorRSettings, userId: string) => {
  await setDoc(doc(db, 'users', managerId, 'settings', 'factorR'), {
    ...settings,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const mergeFactorRMonths = (
  automatic: Array<{ month: string; revenue: number; payroll: number }>,
  saved?: FactorRSettings | null,
): FactorRMonthEntry[] => {
  const savedByMonth = new Map((saved?.months || []).map(item => [item.month, item]));
  return automatic.map(item => {
    const previous = savedByMonth.get(item.month);
    return {
      month: item.month,
      revenue: previous?.revenueSource === 'manual' ? Number(previous.revenue || 0) : item.revenue,
      payroll: previous?.payrollSource === 'manual' ? Number(previous.payroll || 0) : item.payroll,
      revenueSource: previous?.revenueSource === 'manual' ? 'manual' : 'automatic',
      payrollSource: previous?.payrollSource === 'manual' ? 'manual' : 'automatic',
      justification: previous?.justification || '',
    };
  });
};

export const calculateFactorR = (months: FactorRMonthEntry[], currentRevenue = 0): FactorRSnapshot => {
  const revenue12 = months.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const payroll12 = months.reduce((sum, item) => sum + Number(item.payroll || 0), 0);
  const complete = revenue12 > 0 && months.length === 12;
  const factorR = revenue12 > 0 ? payroll12 / revenue12 : null;
  const annex: 'III' | 'V' | null = complete && factorR !== null ? (factorR >= 0.28 ? 'III' : 'V') : null;
  const payrollGap = Math.max(0, revenue12 * 0.28 - payroll12);
  const simples = annex ? calculateExecutiveSimples(currentRevenue, revenue12, annex as AnexoSimples) : null;
  return { revenue12, payroll12, factorR, annex, payrollGap, complete, simples };
};

