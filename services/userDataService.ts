import {
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    query,
    serverTimestamp,
    addDoc,
    orderBy,
    where,
    deleteDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { CnpjData, SalesOrder } from "../types";

// Tipos para os dados salvos
export interface SavedCompanyData extends CnpjData {
    updatedAt?: any;
}

export interface SavedSimulationRecord {
    month: number;
    year: number;
    revenue: number;
    expenses: number;
    payroll: number;
    updatedAt?: any;
}

export interface SavedTransaction {
    id: string;
    date: string;
    description: string;
    category: string;
    amount: number;
    type: 'income' | 'expense';
    status: 'paid' | 'pending';
    updatedAt?: any;
}

// --- FUNÇÕES DE DADOS DA EMPRESA ---

export const saveCompanyData = async (uid: string, data: CnpjData) => {
    try {
        const companyRef = doc(db, "users", uid, "company_data", "main");
        await setDoc(companyRef, {
            ...data,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Erro ao salvar dados da empresa:", error);
        return false;
    }
};

export const getCompanyData = async (uid: string): Promise<SavedCompanyData | null> => {
    try {
        const companyRef = doc(db, "users", uid, "company_data", "main");
        const snap = await getDoc(companyRef);

        if (snap.exists()) {
            return snap.data() as SavedCompanyData;
        }
        return null;
    } catch (error) {
        console.error("Erro ao buscar dados da empresa:", error);
        return null;
    }
};

// --- FUNÇÕES DE SIMULAÇÕES ---

export const saveSimulationRecord = async (uid: string, record: SavedSimulationRecord) => {
    try {
        // ID composto para facilitar busca única: "year_month" (ex: "2024_1")
        const docId = `${record.year}_${record.month}`;
        const simRef = doc(db, "users", uid, "simulations", docId);

        await setDoc(simRef, {
            ...record,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Erro ao salvar simulação:", error);
        return false;
    }
};

export const getSimulationRecords = async (uid: string): Promise<SavedSimulationRecord[]> => {
    try {
        const simsRef = collection(db, "users", uid, "simulations");
        const q = query(simsRef);

        const querySnapshot = await getDocs(q);
        const records: SavedSimulationRecord[] = [];

        querySnapshot.forEach((doc) => {
            records.push(doc.data() as SavedSimulationRecord);
        });

        return records.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });
    } catch (error) {
        console.error("Erro ao buscar simulações:", error);
        return [];
    }
};

// --- FUNÇÕES GENÉRICAS PARA CALCULADORAS ---

export const saveCalculatorData = async (uid: string, calculatorId: string, data: any) => {
    try {
        const docRef = doc(db, "users", uid, "calculators", calculatorId);
        await setDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error(`Erro ao salvar dados da calculadora ${calculatorId}:`, error);
        return false;
    }
};

export const getCalculatorData = async (uid: string, calculatorId: string) => {
    try {
        const docRef = doc(db, "users", uid, "calculators", calculatorId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            return snap.data();
        }
        return null;
    } catch (error) {
        console.error(`Erro ao buscar dados da calculadora ${calculatorId}:`, error);
        return null;
    }
};

// --- FUNÇÕES DE CONTROLE FINANCEIRO ---

export const saveTransactions = async (uid: string, transactions: SavedTransaction[]) => {
    try {
        const docRef = doc(db, "users", uid, "financial_control", "transactions");
        await setDoc(docRef, {
            items: transactions,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Erro ao salvar transações:", error);
        return false;
    }
};

export const getTransactions = async (uid: string): Promise<SavedTransaction[]> => {
    try {
        const docRef = doc(db, "users", uid, "financial_control", "transactions");
        const snap = await getDoc(docRef);

        if (snap.exists() && snap.data().items) {
            return snap.data().items as SavedTransaction[];
        }
        return [];
    } catch (error) {
        console.error("Erro ao buscar transações:", error);
        return [];
    }
};

// Add a single transaction
export const addTransaction = async (uid: string, transaction: Omit<SavedTransaction, 'id'>): Promise<string | null> => {
    try {
        // Get existing transactions
        const existing = await getTransactions(uid);

        // Generate new ID
        const newId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Add new transaction
        const newTransaction: SavedTransaction = {
            ...transaction,
            id: newId
        };

        // Save updated list
        await saveTransactions(uid, [...existing, newTransaction]);

        return newId;
    } catch (error) {
        console.error("Erro ao adicionar transação:", error);
        return null;
    }
};


// --- FUNÇÕES DE GESTÃO DE VENDAS ---

export const saveSalesOrders = async (uid: string, orders: SalesOrder[]) => {
    try {
        const docRef = doc(db, "users", uid, "sales_management", "orders");
        await setDoc(docRef, {
            items: orders,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Erro ao salvar pedidos de venda:", error);
        return false;
    }
};

export const getSalesOrders = async (uid: string): Promise<SalesOrder[]> => {
    try {
        const docRef = doc(db, "users", uid, "sales_management", "orders");
        const snap = await getDoc(docRef);

        if (snap.exists() && snap.data().items) {
            return snap.data().items as SalesOrder[];
        }
        return [];
    } catch (error) {
        console.error("Erro ao buscar pedidos de venda:", error);
        return [];
    }
};

// --- FUNÇÕES DE CATEGORIAS PERSONALIZADAS ---

export interface CustomCategories {
    expense: string[];
    income: string[];
    updatedAt?: any;
}

export const saveCustomCategories = async (uid: string, categories: CustomCategories) => {
    try {
        const docRef = doc(db, "users", uid, "settings", "custom_categories");
        await setDoc(docRef, {
            ...categories,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Erro ao salvar categorias personalizadas:", error);
        return false;
    }
};

export const getCustomCategories = async (uid: string): Promise<CustomCategories> => {
    try {
        const docRef = doc(db, "users", uid, "settings", "custom_categories");
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            const data = snap.data();
            return {
                expense: data.expense || [],
                income: data.income || []
            };
        }
        return { expense: [], income: [] };
    } catch (error) {
        console.error("Erro ao buscar categorias personalizadas:", error);
        return { expense: [], income: [] };
    }
};

// --- FUNÇÕES DE ADMINISTRAÇÃO E RASTREAMENTO ---

export interface UserActivity {
    uid: string;
    email: string;
    lastLogin: any; // Timestamp
    firstLogin?: any; // Timestamp
    deviceType: 'mobile' | 'desktop' | 'tablet';
    platform: string;
    moduleUsage?: Record<string, number>;
    updatedAt?: any;
}

export const logUserActivity = async (uid: string, email: string, activity: Partial<UserActivity>) => {
    try {
        const userRef = doc(db, "users", uid);

        // Prepare data to update
        const updateData: any = {
            uid,
            email,
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp(),
            ...activity
        };

        // If it's a login, we might want to set firstLogin if it doesn't exist
        // We use setDoc with merge to create the document if it doesn't exist
        await setDoc(userRef, updateData, { merge: true });
        return true;
    } catch (error) {
        console.error("Erro ao registrar atividade do usuário:", error);
        return false;
    }
};

export const incrementModuleUsage = async (uid: string, moduleName: string) => {
    try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            const currentUsage = data.moduleUsage || {};
            const newCount = (currentUsage[moduleName] || 0) + 1;

            await setDoc(userRef, {
                moduleUsage: {
                    ...currentUsage,
                    [moduleName]: newCount
                },
                updatedAt: serverTimestamp()
            }, { merge: true });
        }
        return true;
    } catch (error) {
        console.error("Erro ao incrementar uso do módulo:", error);
        return false;
    }
};

export const getAllUsersData = async (): Promise<UserActivity[]> => {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);

        const users: UserActivity[] = [];
        querySnapshot.forEach((doc) => {
            // We only want the main user documents, not subcollections
            // The main document should have 'email' field if created by logUserActivity
            const data = doc.data();
            if (data.email) {
                users.push(data as UserActivity);
            }
        });

        return users;
    } catch (error) {
        console.error("Erro ao buscar dados de todos os usuários:", error);
        return [];
    }
};

export const deleteUserActivity = async (uid: string): Promise<boolean> => {
    try {
        const userRef = doc(db, "users", uid);
        await deleteDoc(userRef);
        return true;
    } catch (error) {
        console.error("Erro ao deletar tracking do usuário:", error);
        return false;
    }
};

// --- FEEDBACK & BUG REPORTING ---

export interface Feedback {
    id: string;
    userId: string;
    userEmail: string;
    type: 'bug' | 'feedback' | 'suggestion';
    title: string;
    description: string;
    module?: string;
    priority?: 'low' | 'medium' | 'high';
    status: 'new' | 'reviewing' | 'resolved';
    createdAt: any;
    updatedAt: any;
}

export const submitFeedback = async (feedback: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
        const feedbackRef = collection(db, "feedback");
        const newFeedback = {
            ...feedback,
            status: 'new',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        await addDoc(feedbackRef, newFeedback);
        return true;
    } catch (error) {
        console.error("Erro ao enviar feedback:", error);
        return false;
    }
};

export const getAllFeedback = async (): Promise<Feedback[]> => {
    try {
        const feedbackRef = collection(db, "feedback");
        const q = query(feedbackRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        const feedbacks: Feedback[] = [];
        querySnapshot.forEach((doc) => {
            feedbacks.push({
                id: doc.id,
                ...doc.data()
            } as Feedback);
        });

        return feedbacks;
    } catch (error) {
        console.error("Erro ao buscar feedbacks:", error);
        return [];
    }
};

export const getUserFeedback = async (userId: string): Promise<Feedback[]> => {
    try {
        const feedbackRef = collection(db, "feedback");
        const q = query(feedbackRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        const feedbacks: Feedback[] = [];
        querySnapshot.forEach((doc) => {
            feedbacks.push({
                id: doc.id,
                ...doc.data()
            } as Feedback);
        });

        return feedbacks;
    } catch (error) {
        console.error("Erro ao buscar feedbacks do usuário:", error);
        return [];
    }
};

// --- CONFIGURAÇÕES PROFISSIONAIS ---

import { ProfessionalSettings } from "../types";

export const saveProfessionalSettings = async (uid: string, settings: ProfessionalSettings) => {
    try {
        const docRef = doc(db, "users", uid, "settings", "professional_profile");
        await setDoc(docRef, {
            ...settings,
            updatedAt: serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error("Erro ao salvar configurações profissionais:", error);
        return false;
    }
};

export const getProfessionalSettings = async (uid: string): Promise<ProfessionalSettings | null> => {
    try {
        const docRef = doc(db, "users", uid, "settings", "professional_profile");
        const snap = await getDoc(docRef);

        if (snap.exists()) {
            return snap.data() as ProfessionalSettings;
        }
        return null;
    } catch (error) {
        console.error("Erro ao buscar configurações profissionais:", error);
        return null;
    }
};
