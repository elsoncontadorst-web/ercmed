import { db } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Receipt } from '../types/receipts';

// Generate sequential receipt number
const generateReceiptNumber = async (userId: string): Promise<string> => {
    const receiptsRef = collection(db, 'users', userId, 'receipts');
    const q = query(receiptsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const currentYear = new Date().getFullYear();
    const count = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.issueDate?.startsWith(currentYear.toString());
    }).length;

    return `${currentYear}/${String(count + 1).padStart(4, '0')}`;
};

// Add new receipt
export const addReceipt = async (
    userId: string,
    receipt: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'receiptNumber'>
): Promise<string> => {
    const receiptsRef = collection(db, 'users', userId, 'receipts');
    const receiptNumber = await generateReceiptNumber(userId);

    const docRef = await addDoc(receiptsRef, {
        ...receipt,
        userId,
        receiptNumber,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    });

    return docRef.id;
};

// Get all receipts for a user
export const getReceipts = async (userId: string): Promise<Receipt[]> => {
    const receiptsRef = collection(db, 'users', userId, 'receipts');
    const q = query(receiptsRef, orderBy('issueDate', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Receipt));
};

// Get receipts by date range
export const getReceiptsByDateRange = async (
    userId: string,
    startDate: string,
    endDate: string
): Promise<Receipt[]> => {
    const receiptsRef = collection(db, 'users', userId, 'receipts');
    const q = query(
        receiptsRef,
        where('issueDate', '>=', startDate),
        where('issueDate', '<=', endDate),
        orderBy('issueDate', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Receipt));
};

// Get single receipt by ID
export const getReceiptById = async (userId: string, receiptId: string): Promise<Receipt | null> => {
    const receiptRef = doc(db, 'users', userId, 'receipts', receiptId);
    const snapshot = await getDoc(receiptRef);

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data()
    } as Receipt;
};

// Update receipt
export const updateReceipt = async (
    userId: string,
    receiptId: string,
    updates: Partial<Receipt>
): Promise<void> => {
    const receiptRef = doc(db, 'users', userId, 'receipts', receiptId);
    await updateDoc(receiptRef, {
        ...updates,
        updatedAt: Timestamp.now()
    });
};

// Delete receipt
export const deleteReceipt = async (userId: string, receiptId: string): Promise<void> => {
    const receiptRef = doc(db, 'users', userId, 'receipts', receiptId);
    await deleteDoc(receiptRef);
};

// Helper function to convert number to words (Brazilian Portuguese)
export const numberToWords = (num: number): string => {
    if (num === 0) return 'zero reais';

    const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    const convertLessThanThousand = (n: number): string => {
        if (n === 0) return '';
        if (n === 100) return 'cem';

        let result = '';

        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (h > 0) {
            result += hundreds[h];
            if (t > 0 || u > 0) result += ' e ';
        }

        if (t === 1) {
            result += teens[u];
        } else {
            if (t > 0) {
                result += tens[t];
                if (u > 0) result += ' e ';
            }
            if (u > 0 && t !== 1) {
                result += units[u];
            }
        }

        return result;
    };

    const reais = Math.floor(num);
    const centavos = Math.round((num - reais) * 100);

    let result = '';

    if (reais >= 1000000) {
        const millions = Math.floor(reais / 1000000);
        result += convertLessThanThousand(millions);
        result += millions === 1 ? ' milhão' : ' milhões';
        const remainder = reais % 1000000;
        if (remainder > 0) {
            result += remainder < 100 ? ' e ' : ', ';
        }
    }

    const thousands = Math.floor((reais % 1000000) / 1000);
    if (thousands > 0) {
        result += convertLessThanThousand(thousands);
        result += ' mil';
        const remainder = reais % 1000;
        if (remainder > 0) {
            result += remainder < 100 ? ' e ' : ', ';
        }
    }

    const lastThree = reais % 1000;
    if (lastThree > 0) {
        result += convertLessThanThousand(lastThree);
    }

    result += reais === 1 ? ' real' : ' reais';

    if (centavos > 0) {
        result += ' e ' + convertLessThanThousand(centavos);
        result += centavos === 1 ? ' centavo' : ' centavos';
    }

    return result;
};
