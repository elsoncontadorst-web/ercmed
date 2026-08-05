import { addDoc, collection, getDocs, orderBy, query, runTransaction, serverTimestamp, doc } from 'firebase/firestore';
import { db } from './firebase';
import { InventoryItem } from '../types/clinicErp';

export const getInventoryItems = async (managerId: string): Promise<InventoryItem[]> => {
  const snapshot = await getDocs(query(collection(db, 'users', managerId, 'inventory_items'), orderBy('name')));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as InventoryItem));
};

export const saveInventoryItem = async (managerId: string, item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
  const reference = await addDoc(collection(db, 'users', managerId, 'inventory_items'), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return reference.id;
};

export const consumeInventoryItems = async (
  managerId: string,
  appointmentId: string,
  registeredBy: string,
  items: Array<{ itemId: string; itemName: string; quantity: number }>
) => {
  for (const item of items) {
    const itemRef = doc(db, 'users', managerId, 'inventory_items', item.itemId);
    await runTransaction(db, async tx => {
      const snapshot = await tx.get(itemRef);
      if (!snapshot.exists()) throw new Error(`Item ${item.itemName} não encontrado no estoque.`);
      const current = snapshot.data() as InventoryItem;
      const nextQuantity = (current.quantity || 0) - item.quantity;
      if (nextQuantity < 0) throw new Error(`Estoque insuficiente para ${item.itemName}.`);
      tx.update(itemRef, { quantity: nextQuantity, updatedAt: serverTimestamp() });
    });

    await addDoc(collection(db, 'users', managerId, 'stock_movements'), {
      itemId: item.itemId,
      itemName: item.itemName,
      type: 'consumption',
      quantity: item.quantity,
      appointmentId,
      registeredBy,
      createdAt: serverTimestamp()
    });
  }
};
