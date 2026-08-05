import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { AssetItem } from '../types/clinicErp';

const calculateMonthlyDepreciation = (acquisitionValue: number, usefulLifeMonths: number) =>
  usefulLifeMonths > 0 ? acquisitionValue / usefulLifeMonths : 0;

export const getAssetItems = async (managerId: string): Promise<AssetItem[]> => {
  try {
    const ref = collection(db, 'users', managerId, 'asset_items');
    const snapshot = await getDocs(query(ref, orderBy('acquisitionDate', 'desc')));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AssetItem));
  } catch (error) {
    console.error('Erro ao buscar ativos patrimoniais:', error);
    return [];
  }
};

export const saveAssetItem = async (
  managerId: string,
  item: Omit<AssetItem, 'id' | 'monthlyDepreciation' | 'accumulatedDepreciation' | 'bookValue' | 'createdAt' | 'updatedAt'>
) => {
  const monthlyDepreciation = calculateMonthlyDepreciation(item.acquisitionValue, item.usefulLifeMonths);
  const now = new Date();
  const acquisition = new Date(`${item.acquisitionDate}T00:00:00`);
  const elapsedMonths = Math.max(0, (now.getFullYear() - acquisition.getFullYear()) * 12 + (now.getMonth() - acquisition.getMonth()));
  const accumulatedDepreciation = Math.min(item.acquisitionValue, monthlyDepreciation * elapsedMonths);
  const bookValue = Math.max(0, item.acquisitionValue - accumulatedDepreciation);

  const created = await addDoc(collection(db, 'users', managerId, 'asset_items'), {
    ...item,
    monthlyDepreciation,
    accumulatedDepreciation,
    bookValue,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return created.id;
};
