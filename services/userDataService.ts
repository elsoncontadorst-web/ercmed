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
    deleteDoc,
    runTransaction
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
    dueDate?: string;
    receivedAt?: string;
    description: string;
    category: string;
    costCenter?: string;
    resultCenter?: string;
    revenueUnit?: 'clinical' | 'laboratory';
    amount: number;
    type: 'income' | 'expense';
    status: 'paid' | 'pending';
    paymentMethod?: 'pix' | 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'boleto' | 'other';
    bankAccountId?: string;
    bankAccountName?: string;
    settlementNotes?: string;
    settlementHistory?: Array<{ action: 'settled' | 'reversed'; date: string; paymentMethod?: string; bankAccountId?: string; bankAccountName?: string; notes?: string; userId: string; recordedAt: string }>;
    sourceBillingId?: string;
    sourceFiscalDocumentId?: string;
    sourceType?: 'billing' | 'fiscal_import' | 'manual' | 'production_entry' | 'simples_forecast';
    sourceAppointmentId?: string;
    sourceAccessKey?: string;
    sourceFingerprint?: string;
    professionalId?: string;
    professionalName?: string;
    clientId?: string;
    clientName?: string;
    clientTaxId?: string;
    sourceFiscalFileId?: string;
    fiscalIssuedAt?: string;
    competence?: string;
    recurrenceSeriesId?: string;
    recurrenceIndex?: number;
    recurrenceTotal?: number;
    attendanceKind?: 'standard' | 'package' | 'return_free';
    clinicId?: string;
    unitName?: string;
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

export const getTransactions = async (uid: string, throwOnError = false): Promise<SavedTransaction[]> => {
    try {
        const docRef = doc(db, "users", uid, "financial_control", "transactions");
        const snap = await getDoc(docRef);

        if (snap.exists() && snap.data().items) {
            return snap.data().items as SavedTransaction[];
        }
        return [];
    } catch (error) {
        console.error("Erro ao buscar transações:", error);
        if (throwOnError) throw error;
        return [];
    }
};

// Add a single transaction
export const addTransaction = async (uid: string, transaction: Omit<SavedTransaction, 'id'>): Promise<string | null> => {
    try {
        const newId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newTransaction: SavedTransaction = {
            ...transaction,
            id: newId
        };

        const docRef = doc(db, "users", uid, "financial_control", "transactions");
        await runTransaction(db, async (firestoreTransaction) => {
            const snapshot = await firestoreTransaction.get(docRef);
            const existing = snapshot.exists() && Array.isArray(snapshot.data().items)
                ? snapshot.data().items as SavedTransaction[]
                : [];
            firestoreTransaction.set(docRef, {
                items: [...existing, newTransaction],
                updatedAt: serverTimestamp()
            }, { merge: true });
        });

        return newId;
    } catch (error) {
        console.error("Erro ao adicionar transação:", error);
        return null;
    }
};

// Applies changes against the latest Firestore version so an older browser
// session cannot replace entries created by another clinic user.
export const syncTransactions = async (
    uid: string,
    upserts: SavedTransaction[],
    removedIds: string[] = []
): Promise<boolean> => {
    try {
        const docRef = doc(db, "users", uid, "financial_control", "transactions");
        await runTransaction(db, async (firestoreTransaction) => {
            const snapshot = await firestoreTransaction.get(docRef);
            const existing = snapshot.exists() && Array.isArray(snapshot.data().items)
                ? snapshot.data().items as SavedTransaction[]
                : [];
            const removed = new Set(removedIds);
            const changes = new Map(upserts.map(item => [item.id, item]));
            const updated = existing
                .filter(item => !removed.has(item.id))
                .map(item => changes.get(item.id) || item);
            const existingIds = new Set(existing.map(item => item.id));
            upserts.forEach(item => {
                if (!existingIds.has(item.id) && !removed.has(item.id)) updated.unshift(item);
            });
            firestoreTransaction.set(docRef, {
                items: updated,
                updatedAt: serverTimestamp()
            }, { merge: true });
        });
        return true;
    } catch (error) {
        console.error("Erro ao sincronizar transacoes:", error);
        return false;
    }
};

export const upsertSimplesForecastTransaction = async (
    uid: string,
    forecast: {
        competence: string;
        amount: number;
        dueDate: string;
        clinicId?: string;
        unitName?: string;
        annex?: string;
        effectiveRate?: number;
    }
): Promise<SavedTransaction | null> => {
    try {
        const scopeKey = forecast.clinicId || 'consolidated';
        const fingerprint = `simples-das:${scopeKey}:${forecast.competence}`;
        const docRef = doc(db, "users", uid, "financial_control", "transactions");
        let saved: SavedTransaction | null = null;

        await runTransaction(db, async (firestoreTransaction) => {
            const snapshot = await firestoreTransaction.get(docRef);
            const existing = snapshot.exists() && Array.isArray(snapshot.data().items)
                ? snapshot.data().items as SavedTransaction[]
                : [];
            const current = existing.find(item => item.sourceFingerprint === fingerprint);
            saved = {
                ...(current || {}),
                id: current?.id || `simples-${scopeKey}-${forecast.competence}`,
                date: forecast.dueDate,
                dueDate: forecast.dueDate,
                description: `DAS Simples Nacional - ${forecast.competence}`,
                category: 'Impostos e Tributos',
                costCenter: 'Administrativo',
                resultCenter: 'Operação',
                amount: Math.max(0, Math.round(forecast.amount * 100) / 100),
                type: 'expense',
                status: current?.status || 'pending',
                sourceType: 'simples_forecast',
                sourceFingerprint: fingerprint,
                competence: forecast.competence,
                clinicId: forecast.clinicId,
                unitName: forecast.unitName,
                simplesAnnex: forecast.annex,
                simplesEffectiveRate: forecast.effectiveRate,
            } as SavedTransaction;

            const updated = current
                ? existing.map(item => item.sourceFingerprint === fingerprint ? saved! : item)
                : [saved!, ...existing];
            firestoreTransaction.set(docRef, { items: updated, updatedAt: serverTimestamp() }, { merge: true });
        });
        return saved;
    } catch (error) {
        console.error('Erro ao gerar previsão do Simples Nacional:', error);
        return null;
    }
};

export const removeTransactionsByBilling = async (uid: string, billingId: string): Promise<void> => {
    const docRef = doc(db, "users", uid, "financial_control", "transactions");
    await runTransaction(db, async (firestoreTransaction) => {
        const snapshot = await firestoreTransaction.get(docRef);
        if (!snapshot.exists()) return;

        const existing = Array.isArray(snapshot.data().items)
            ? snapshot.data().items as SavedTransaction[]
            : [];
        firestoreTransaction.update(docRef, {
            items: existing.filter(transaction => transaction.sourceBillingId !== billingId),
            updatedAt: serverTimestamp()
        });
    });
};

export const updateTransactionStatus = async (
    uid: string,
    transactionId: string,
    status: 'paid' | 'pending',
    receivedAt?: string
): Promise<boolean> => {
    try {
        const docRef = doc(db, "users", uid, "financial_control", "transactions");
        const updated = await runTransaction(db, async (firestoreTransaction) => {
            const snapshot = await firestoreTransaction.get(docRef);
            if (!snapshot.exists()) return false;

            const existing = Array.isArray(snapshot.data().items)
                ? snapshot.data().items as SavedTransaction[]
                : [];

            if (!existing.some(transaction => transaction.id === transactionId)) return false;

            const updatedItems = existing.map(transaction =>
                transaction.id === transactionId
                    ? {
                        ...transaction,
                        status,
                        receivedAt: status === 'paid' ? (receivedAt || new Date().toISOString().split('T')[0]) : undefined
                    }
                    : transaction
            );

            firestoreTransaction.update(docRef, {
                items: updatedItems,
                updatedAt: serverTimestamp()
            });
            return true;
        });
        return updated;
    } catch (error) {
        console.error("Erro ao atualizar status da transação:", error);
        return false;
    }
};

export const updateTransactionStatusByBilling = async (
    uid: string,
    billingId: string,
    status: 'paid' | 'pending',
    receivedAt?: string
): Promise<boolean> => {
    try {
        const docRef = doc(db, "users", uid, "financial_control", "transactions");
        await runTransaction(db, async (firestoreTransaction) => {
            const snapshot = await firestoreTransaction.get(docRef);
            if (!snapshot.exists()) return;
            const existing = Array.isArray(snapshot.data().items)
                ? snapshot.data().items as SavedTransaction[]
                : [];
            firestoreTransaction.update(docRef, {
                items: existing.map(transaction =>
                    transaction.sourceBillingId === billingId
                        ? {
                            ...transaction,
                            status,
                            receivedAt: status === 'paid'
                                ? (receivedAt || new Date().toISOString().split('T')[0])
                                : undefined
                        }
                        : transaction
                ),
                updatedAt: serverTimestamp()
            });
        });
        return true;
    } catch (error) {
        console.error("Erro ao sincronizar status financeiro do faturamento:", error);
        return false;
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
