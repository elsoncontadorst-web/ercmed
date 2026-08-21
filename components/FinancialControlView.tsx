import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileSpreadsheet, Plus, Filter, Download, Trash2, CheckCircle, XCircle, Calendar, DollarSign, TrendingUp, TrendingDown, Save, Loader2, X, Pencil, Search, Archive, Users, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { auth } from '../services/firebase';
import { getTransactions, SavedTransaction, saveCustomCategories, getCustomCategories, syncTransactions } from '../services/userDataService';
import { getAllBillingRecords, deleteBillingRecord, updateBillingPaymentStatus, getAllProfessionals } from '../services/repasseService';
import { useUser } from '../contexts/UserContext';
import { ConsultationBilling } from '../types/finance';
import { getClinics } from '../services/clinicService';
import { detectXmlFinancialDirection, indexFiscalCounterpartiesFromDraft, parseFiscalPdf, parseFiscalXml } from '../services/clinicErpService';
import { getManagerIdForUser } from '../services/accessControlService';
import { ACTIVE_CLINIC_CHANGED_EVENT, getActiveClinicScopeId } from '../services/activeClinicStorage';
import { recordMatchesClinicScope } from '../services/clinicScopeService';
import { archiveFiscalXml, downloadAllFiscalXml, updateFiscalFileProfessional } from '../services/fiscalFileArchiveService';
import { Professional } from '../types/finance';
import { getClients, saveClient, saveClientFromFiscalDraft } from '../services/clientService';
import type { Client } from '../types/client';
import { getDelegatedCompanyContext } from '../services/delegatedCompanyContext';
import { AppView } from '../types';
import { BankAccount, getBankingData } from '../services/bankingService';

// Reusing the interface from service or defining compatible one
interface Transaction extends SavedTransaction { }

type FinancialTab = 'transactions' | 'payable' | 'receivable' | 'billing' | 'laboratoryBilling';

type SpreadsheetPaymentMethod = SavedTransaction['paymentMethod'];

interface ParsedSpreadsheetRow {
    date: string;
    description: string;
    category: string;
    amount: number;
    status: SavedTransaction['status'];
    paymentMethod?: SpreadsheetPaymentMethod;
}

interface SpreadsheetSheetAnalysis {
    layout: 'daily_movement' | 'list' | 'monthly_grid' | 'invalid';
    layoutLabel: string;
    rows: ParsedSpreadsheetRow[];
    skippedRows: number;
    total: number;
    paidCount: number;
    paidTotal: number;
    pendingCount: number;
    pendingTotal: number;
    suspiciousDates: Array<{ date: string; description: string }>;
    blockingDateCount: number;
    error?: string;
}

const normalizeXmlValue = (value?: string | null) =>
    String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const normalizeAccessKey = (value?: string | null) =>
    String(value || '').replace(/^NFe|^CTe/i, '').replace(/[^a-z0-9]/gi, '').toUpperCase();

const extractClientFromDescription = (description: string) => {
    const documentMatch = description.match(/\b(CPF|CNPJ)\s*:?\s*([\d.\-/]+)/i);
    if (!documentMatch) return null;
    const taxId = documentMatch[2].replace(/\D/g, '');
    if (taxId.length !== 11 && taxId.length !== 14) return null;
    const name = description
        .slice(0, documentMatch.index)
        .replace(/^NF:\s*/i, '')
        .replace(/[\s\-–—:]+$/g, '')
        .trim();
    return name ? { name, taxId } : null;
};

const transactionFingerprint = (transaction: Pick<Transaction, 'date' | 'description' | 'amount' | 'type' | 'sourceAccessKey' | 'sourceFingerprint'>) =>
    transaction.sourceAccessKey
        ? `key:${normalizeAccessKey(transaction.sourceAccessKey)}`
        : transaction.sourceFingerprint ||
          `xml:${transaction.date}|${normalizeXmlValue(transaction.description.replace(/^NF:\s*/i, ''))}|${Number(transaction.amount || 0).toFixed(2)}|${transaction.type}`;

const removeDuplicateFiscalImports = (items: Transaction[]) => {
    const seen = new Set<string>();
    let removed = 0;
    const unique = items.filter(item => {
        if (item.sourceType !== 'fiscal_import' && !item.sourceAccessKey && !item.sourceFingerprint) return true;
        const fingerprint = transactionFingerprint(item);
        if (seen.has(fingerprint)) {
            removed += 1;
            return false;
        }
        seen.add(fingerprint);
        return true;
    });
    return { unique, removed };
};

const addMonthsKeepingValidDay = (isoDate: string, monthsToAdd: number) => {
    const [year, month, day] = isoDate.split('-').map(Number);
    const targetMonthStart = new Date(year, month - 1 + monthsToAdd, 1);
    const lastDay = new Date(targetMonthStart.getFullYear(), targetMonthStart.getMonth() + 1, 0).getDate();
    const result = new Date(targetMonthStart.getFullYear(), targetMonthStart.getMonth(), Math.min(day, lastDay));
    return `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;
};

export const FinancialControlView: React.FC<{ initialTab?: FinancialTab; setView?: (view: AppView) => void }> = ({ initialTab = 'transactions', setView }) => {
    const { user, userProfile, userRole, isAdmin: contextIsAdmin, isAdminMaster, loading: userLoading } = useUser();
    const isAccountantView = (userRole as string) === 'accountant';
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const allTransactionsRef = useRef<Transaction[]>([]);
    const loadedScopeTransactionIdsRef = useRef<Set<string>>(new Set());
    const [billingRecords, setBillingRecords] = useState<ConsultationBilling[]>([]);
    const [activeTab, setActiveTab] = useState<FinancialTab>(initialTab);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [settlementTarget, setSettlementTarget] = useState<Transaction | null>(null);
    const [settlementForm, setSettlementForm] = useState({ date: new Date().toISOString().split('T')[0], paymentMethod: 'pix' as NonNullable<Transaction['paymentMethod']>, bankAccountId: '', notes: '' });
    const [isImporting, setIsImporting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [repeatMonthly, setRepeatMonthly] = useState(false);
    const [repeatMonths, setRepeatMonths] = useState(12);
    const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
        type: 'expense',
        status: 'pending',
        paymentMethod: 'pix',
        date: new Date().toISOString().split('T')[0],
        category: 'Geral',
        costCenter: 'Administrativo',
        revenueUnit: 'clinical',
        resultCenter: 'Operação'
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Custom categories state
    const [customExpenseCategories, setCustomExpenseCategories] = useState<string[]>([]);
    const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Selection/Bulk actions
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isGrouped, setIsGrouped] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateOrder, setDateOrder] = useState<'desc' | 'asc'>('desc');
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedYear, setSelectedYear] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [xmlClassMode, setXmlClassMode] = useState<'auto' | 'income' | 'expense'>('auto');
    const [saveXmlClients, setSaveXmlClients] = useState(true);
    const [clientLinkTransaction, setClientLinkTransaction] = useState<Transaction | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [newClientTaxId, setNewClientTaxId] = useState('');
    const [isLinkingClient, setIsLinkingClient] = useState(false);
    const [isBulkLinkingClients, setIsBulkLinkingClients] = useState(false);
    const [xmlProfessionalId, setXmlProfessionalId] = useState('all');
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [isDownloadingXml, setIsDownloadingXml] = useState(false);
    const [knownClinicCnpjs, setKnownClinicCnpjs] = useState<string[]>([]);
    const [activeClinicId, setActiveClinicId] = useState<string | null>(getActiveClinicScopeId());
    const [activeClinicName, setActiveClinicName] = useState('');
    const unassignedFiscalNotesCount = useMemo(() => transactions.filter(item =>
        item.type === 'income' &&
        item.sourceType === 'fiscal_import' &&
        !item.professionalId &&
        !item.professionalName?.trim()
    ).length, [transactions]);

    const availableYears = useMemo(() => Array.from(new Set([
        ...transactions.map(item => String(item.dueDate || item.date || '').slice(0, 4)),
        ...billingRecords.map(item => String(item.consultationDate || '').slice(0, 4))
    ].filter(year => /^\d{4}$/.test(year)))).sort((a, b) => Number(b) - Number(a)), [transactions, billingRecords]);

    const availableCategories = useMemo(() => {
        const scopedTransactions = activeTab === 'receivable'
            ? transactions.filter(item => item.type === 'income')
            : activeTab === 'payable'
                ? transactions.filter(item => item.type === 'expense')
                : activeTab === 'billing'
                    ? transactions.filter(item => item.type === 'income' && item.revenueUnit !== 'laboratory')
                    : activeTab === 'laboratoryBilling'
                        ? transactions.filter(item => item.type === 'income' && item.revenueUnit === 'laboratory')
                        : transactions;
        return Array.from(new Set(scopedTransactions
            .map(item => item.category?.trim())
            .filter((category): category is string => Boolean(category))))
            .sort((first, second) => first.localeCompare(second, 'pt-BR'));
    }, [activeTab, transactions]);

    useEffect(() => {
        if (selectedCategory !== 'all' && selectedCategory !== 'uncategorized' && !availableCategories.includes(selectedCategory)) {
            setSelectedCategory('all');
        }
    }, [availableCategories, selectedCategory]);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        setSelectedIds([]);
    }, [activeTab, activeClinicId]);

    useEffect(() => {
        if (!user) return;
        void (async () => {
            if (isAccountantView) return setProfessionals([]);
            const ownerId = (await getManagerIdForUser(user.uid)) || user.uid;
            setProfessionals(await getAllProfessionals(ownerId, activeClinicId || undefined));
        })();
    }, [user?.uid, activeClinicId, isAccountantView]);

    useEffect(() => {
        const syncClinic = async () => {
            const delegated = getDelegatedCompanyContext();
            if (delegated && isAccountantView) {
                setActiveClinicId(null);
                setActiveClinicName(delegated.companyName);
                return;
            }
            const clinicId = getActiveClinicScopeId();
            setActiveClinicId(clinicId);
            const clinics = await getClinics();
            const activeClinic = clinicId ? clinics.find(clinic => clinic.id === clinicId) : undefined;
            setActiveClinicName(activeClinic?.name || '');
        };

        syncClinic();
        window.addEventListener(ACTIVE_CLINIC_CHANGED_EVENT, syncClinic);
        return () => window.removeEventListener(ACTIVE_CLINIC_CHANGED_EVENT, syncClinic);
    }, [isAccountantView]);

    useEffect(() => {
        const loadData = async () => {
            if (userLoading || !user) return;

            setIsLoading(true);
            try {
                const delegated = isAccountantView ? getDelegatedCompanyContext() : null;
                const managerId = delegated?.ownerId || (isAdminMaster ? undefined : await getManagerIdForUser(user.uid));
                const ownerId = managerId || user.uid;
                const clinics = await getClinics(ownerId);

                // Load Transactions
                const transactionsData = await getTransactions(ownerId, true);
                if (transactionsData) {
                    const { unique: uniqueTransactions, removed } = removeDuplicateFiscalImports(transactionsData);
                    const scopedTransactions = uniqueTransactions.filter(item => recordMatchesClinicScope(item, activeClinicId, clinics));
                    allTransactionsRef.current = uniqueTransactions;
                    loadedScopeTransactionIdsRef.current = new Set(scopedTransactions.map(item => item.id));
                    setTransactions(scopedTransactions);
                    if (removed > 0 && !isAccountantView) {
                        const uniqueIds = new Set(uniqueTransactions.map(item => item.id));
                        const duplicateIds = transactionsData.filter(item => !uniqueIds.has(item.id)).map(item => item.id);
                        const saved = await syncTransactions(ownerId, [], duplicateIds);
                        if (!saved) throw new Error('Não foi possível remover importações duplicadas no Firebase.');
                        console.info(`[FINANCE] ${removed} importação(ões) fiscal(is) duplicada(s) removida(s).`);
                    }
                }

                // Load Custom Categories
                const categoriesData = isAccountantView ? null : await getCustomCategories(ownerId);
                if (categoriesData) {
                    setCustomExpenseCategories(categoriesData.expense);
                    setCustomIncomeCategories(categoriesData.income);
                }
                
                // Load Billing Records
                let billingData: ConsultationBilling[] = [];
                
                // Determine managerId for filtering: Only Master Admins see everything
                billingData = isAccountantView ? [] : await getAllBillingRecords(managerId);

                // Fallback: This usually shouldn't be needed if logic above is correct, 
                // but kept for compatibility with existing professional-level access if any
                if (billingData.length === 0 && !isAdminMaster && !userProfile?.isClinicManager) {
                    const fallbackData = await getAllBillingRecords(undefined, user.uid);
                    if (fallbackData.length > 0) {
                        billingData = fallbackData;
                    }
                }

                setBillingRecords(
                    billingData.filter(item => recordMatchesClinicScope(item, activeClinicId, clinics))
                );

                const normalizedProfileCnpj = String(userProfile?.cnpj || '').replace(/\D/g, '');
                const clinicCnpjs = clinics
                    .map(clinic => String(clinic.cnpj || '').replace(/\D/g, ''))
                    .filter(Boolean);

                setKnownClinicCnpjs(Array.from(new Set([
                    ...clinicCnpjs,
                    normalizedProfileCnpj
                ].filter(Boolean))));
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                alert('Não foi possível carregar os lançamentos do Firebase. Atualize a página ou verifique o acesso deste usuário. Nenhum lançamento novo foi gravado sobre os dados existentes.');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [user, userLoading, contextIsAdmin, userProfile, isAdminMaster, activeClinicId, activeClinicName]);

    const handleDeleteBilling = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este registro de faturamento? Isso removerá o valor do Dashboard Geral.')) {
            const success = await deleteBillingRecord(id);
            if (success) {
                setBillingRecords(prev => prev.filter(b => b.id !== id));
            } else {
                alert('Erro ao excluir registro.');
            }
        }
    };

    useEffect(() => {
        if (!user) return;
        void ((async () => {
            const ownerId = getDelegatedCompanyContext()?.ownerId || (await getManagerIdForUser(user.uid)) || user.uid;
            const data = await getBankingData(ownerId);
            setBankAccounts(data.accounts.filter(item => item.active && (!activeClinicId || !item.clinicId || item.clinicId === activeClinicId)));
        })()).catch(() => setBankAccounts([]));
    }, [user?.uid, activeClinicId]);

    const handleMarkAsReceived = (transactionId: string) => {
        const target = transactions.find(transaction => transaction.id === transactionId);
        if (!target) return;
        setSettlementTarget(target);
        setSettlementForm({ date: new Date().toISOString().split('T')[0], paymentMethod: target.paymentMethod || 'pix', bankAccountId: target.bankAccountId || '', notes: '' });
    };

    const confirmSettlement = async () => {
        if (!user || !settlementTarget || updatingStatusId || !settlementForm.date) return;
        const targetTransaction = settlementTarget;
        setUpdatingStatusId(targetTransaction.id);
        try {
            const ownerId = getDelegatedCompanyContext()?.ownerId || (await getManagerIdForUser(user.uid)) || user.uid;
            const bankAccount = bankAccounts.find(item => item.id === settlementForm.bankAccountId);
            const changed: Transaction = {...targetTransaction, status: 'paid', receivedAt: settlementForm.date, paymentMethod: settlementForm.paymentMethod, bankAccountId: bankAccount?.id, bankAccountName: bankAccount?.name, settlementNotes: settlementForm.notes.trim() || undefined, settlementHistory: [...(targetTransaction.settlementHistory || []), {action: 'settled', date: settlementForm.date, paymentMethod: settlementForm.paymentMethod, bankAccountId: bankAccount?.id, bankAccountName: bankAccount?.name, notes: settlementForm.notes.trim() || undefined, userId: user.uid, recordedAt: new Date().toISOString()}]};
            const success = await syncTransactions(ownerId, [changed]);
            if (!success) {
                alert(targetTransaction?.type === 'expense'
                    ? 'Não foi possível marcar a conta como paga.'
                    : 'Não foi possível marcar a conta como recebida.');
                return;
            }
            if (targetTransaction?.sourceBillingId) {
                await updateBillingPaymentStatus(targetTransaction.sourceBillingId, 'received', settlementForm.date);
                setBillingRecords(prev => prev.map(item =>
                    item.id === targetTransaction.sourceBillingId
                        ? { ...item, paymentStatus: 'received', paymentDate: settlementForm.date }
                        : item
                ));
            }
            setTransactions(prev => prev.map(transaction => transaction.id === changed.id ? changed : transaction));
            setSettlementTarget(null);
            if (targetTransaction?.type === 'income' && !targetTransaction.sourceFiscalDocumentId && window.confirm('Recebimento confirmado. Deseja preparar a NFS-e agora? A nota só será emitida depois da sua revisão.')) {
                prepareNfseFromTransaction(changed);
            }
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const reverseSettlement = async (transaction: Transaction) => {
        if (!user || transaction.status !== 'paid' || !window.confirm(`Estornar a baixa de "${transaction.description}" e retornar o lançamento para pendente?`)) return;
        setUpdatingStatusId(transaction.id);
        try {
            const ownerId = getDelegatedCompanyContext()?.ownerId || (await getManagerIdForUser(user.uid)) || user.uid;
            const changed: Transaction = {...transaction, status: 'pending', receivedAt: undefined, bankAccountId: undefined, bankAccountName: undefined, settlementHistory: [...(transaction.settlementHistory || []), {action: 'reversed', date: new Date().toISOString().split('T')[0], userId: user.uid, recordedAt: new Date().toISOString()}]};
            if (!(await syncTransactions(ownerId, [changed]))) throw new Error('O Firebase recusou o estorno.');
            if (transaction.sourceBillingId) await updateBillingPaymentStatus(transaction.sourceBillingId, 'pending');
            setTransactions(current => current.map(item => item.id === changed.id ? changed : item));
        } catch { alert('Não foi possível estornar a baixa.'); }
        finally { setUpdatingStatusId(null); }
    };

    const prepareNfseFromTransaction = (transaction: Transaction) => {
        if (!setView) return;
        sessionStorage.setItem('ercmed:nfse-financial-draft', JSON.stringify({
            transactionId: transaction.id,
            clinicId: transaction.clinicId || activeClinicId || '',
            customerName: transaction.clientName || '',
            customerDocument: transaction.clientTaxId || '',
            description: transaction.description,
            amount: Number(transaction.amount || 0),
            competenceDate: transaction.date,
        }));
        setView(AppView.NFSE);
    };

    // Helper to save custom categories to Firebase
    const saveCustomCategoriesData = async (type: 'expense' | 'income', categories: string[]) => {
        if (!user) return;

        try {
            // Optimistic update
            if (type === 'expense') {
                setCustomExpenseCategories(categories);
            } else {
                setCustomIncomeCategories(categories);
            }

            // Prepare data for Firebase
            const currentExpense = type === 'expense' ? categories : customExpenseCategories;
            const currentIncome = type === 'income' ? categories : customIncomeCategories;

            const ownerId = (await getManagerIdForUser(user.uid)) || user.uid;
            await saveCustomCategories(ownerId, {
                expense: currentExpense,
                income: currentIncome
            });
        } catch (error) {
            console.error("Erro ao salvar categorias:", error);
            // Revert on error could be added here
        }
    };

    const handleAddCustomCategory = () => {
        if (!newCategoryName.trim()) {
            alert('Digite um nome para a categoria!');
            return;
        }

        const type = newTransaction.type as 'expense' | 'income';
        const currentCategories = type === 'expense' ? customExpenseCategories : customIncomeCategories;

        if (currentCategories.includes(newCategoryName.trim())) {
            alert('Esta categoria já existe!');
            return;
        }

        const updatedCategories = [...currentCategories, newCategoryName.trim()];
        saveCustomCategoriesData(type, updatedCategories);

        setNewTransaction({ ...newTransaction, category: newCategoryName.trim() });
        setNewCategoryName('');
        setIsAddingCategory(false);
    };

    const persistScopedTransactions = async (ownerId: string, scopedTransactions: Transaction[]) => {
        const previousScopeIds = loadedScopeTransactionIdsRef.current;
        const nextScopeIds = new Set(scopedTransactions.map(transaction => transaction.id));
        const removedIds = Array.from(previousScopeIds).filter(id => !nextScopeIds.has(id));
        const saved = await syncTransactions(ownerId, scopedTransactions, removedIds);
        if (!saved) throw new Error('Firebase recusou a gravação dos lançamentos.');
        const preservedTransactions = allTransactionsRef.current.filter(transaction => !previousScopeIds.has(transaction.id));
        const mergedTransactions = [...preservedTransactions, ...scopedTransactions];
        allTransactionsRef.current = mergedTransactions;
        loadedScopeTransactionIdsRef.current = new Set(scopedTransactions.map(transaction => transaction.id));
    };

    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheetSelection, setSheetSelection] = useState<Array<{
        name: string;
        type: 'income' | 'expense';
        revenueUnit: 'clinical' | 'laboratory';
        selected: boolean;
    }>>([]);
    const xmlInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
            setWorkbook(wb);
            const normalizedFileName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
            const looksLikeRevenueReport = /MOVIMENTO.*CAIXA|CLINICA|LABORATOR|\bLAB\b/.test(normalizedFileName);
            setSheetSelection(wb.SheetNames.map(name => ({
                name,
                type: looksLikeRevenueReport ? 'income' : 'expense',
                revenueUnit: /LABORATOR|\bLAB\b/.test(normalizedFileName) ? 'laboratory' : 'clinical',
                selected: true
            })));
            setIsExcelModalOpen(true);
        };
        reader.readAsBinaryString(file);
    };

    const MONTHS_PT = [
        "JANEIRO", "FEVEREIRO", "MARCO", "ABRIL", "MAIO", "JUNHO",
        "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
    ];

    const normalizeSpreadsheetHeader = (value: unknown) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, ' ')
        .trim();

    const parseSpreadsheetAmount = (value: unknown) => {
        if (typeof value === 'number') return Number.isFinite(value) ? Math.abs(value) : null;
        const original = String(value ?? '').trim();
        if (!original) return null;
        let normalized = original.replace(/[R$\s()]/g, '').replace(/[^0-9,.-]/g, '');
        if (normalized.includes(',') && normalized.includes('.')) {
            normalized = normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
                ? normalized.replace(/\./g, '').replace(',', '.')
                : normalized.replace(/,/g, '');
        } else if (normalized.includes(',')) {
            normalized = normalized.replace(/\./g, '').replace(',', '.');
        }
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? Math.abs(parsed) : null;
    };

    const parseSpreadsheetDate = (value: unknown) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return new Date((value - 25569) * 86400 * 1000).toISOString().split('T')[0];
        }
        if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().split('T')[0];
        const text = String(value || '').trim();
        const brazilianDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (brazilianDate) {
            const day = Number(brazilianDate[1]);
            const month = Number(brazilianDate[2]);
            const year = Number(brazilianDate[3]);
            if (year < 2000 || year > 2100) return null;
            const candidate = new Date(Date.UTC(year, month - 1, day));
            if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return null;
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        const parsed = new Date(text);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
    };

    const detectRevenueUnit = (description: unknown, category: unknown): 'clinical' | 'laboratory' => {
        const text = normalizeSpreadsheetHeader(`${description || ''} ${category || ''}`);
        return /LABORATOR|EXAME|ANALISE CLINICA/.test(text) ? 'laboratory' : 'clinical';
    };

    const parsePaymentMethod = (value: unknown): SpreadsheetPaymentMethod => {
        const normalized = normalizeSpreadsheetHeader(value);
        if (normalized.includes('PIX')) return 'pix';
        if (normalized.includes('DINHEIRO')) return 'cash';
        if (normalized.includes('CREDITO')) return 'credit_card';
        if (normalized.includes('DEBITO')) return 'debit_card';
        if (normalized.includes('TRANSFER')) return 'bank_transfer';
        if (normalized.includes('BOLETO')) return 'boleto';
        return 'other';
    };

    const analyzeSpreadsheetSheet = (ws: XLSX.WorkSheet, sheetName: string): SpreadsheetSheetAnalysis => {
        // Legacy XLS may store 210,55 as 21055. The formatted cell value preserves the correct decimal scale.
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }) as unknown[][];
        const invalid = (error: string): SpreadsheetSheetAnalysis => ({
            layout: 'invalid', layoutLabel: 'Layout não reconhecido', rows: [], skippedRows: 0, total: 0,
            paidCount: 0, paidTotal: 0, pendingCount: 0, pendingTotal: 0,
            suspiciousDates: [], blockingDateCount: 0, error
        });
        if (!data.length) return invalid('A aba está vazia.');

        const normalizedRows = data.map(row => row.map(normalizeSpreadsheetHeader));
        const findColumn = (headers: string[], aliases: string[]) => headers.findIndex(header => aliases.includes(header));
        const headerCandidates = normalizedRows.slice(0, 30);
        let headerRowIndex = headerCandidates.findIndex(headers =>
            findColumn(headers, ['CADASTRO']) >= 0 &&
            findColumn(headers, ['PACIENTE']) >= 0 &&
            findColumn(headers, ['PAGO R', 'VALOR PAGO']) >= 0
        );

        let layout: SpreadsheetSheetAnalysis['layout'] = 'daily_movement';
        let layoutLabel = 'Movimento diário (Cadastro/Paciente/Pago R$)';
        if (headerRowIndex < 0) {
            headerRowIndex = headerCandidates.findIndex(headers =>
                findColumn(headers, ['DATA', 'DATE', 'VENCIMENTO']) >= 0 &&
                findColumn(headers, ['DESCRICAO', 'HISTORICO', 'NOME', 'PACIENTE']) >= 0 &&
                findColumn(headers, ['VALOR', 'VALUE', 'AMOUNT', 'TOTAL', 'PAGO R', 'VALOR PAGO']) >= 0
            );
            layout = 'list';
            layoutLabel = 'Lista de lançamentos';
        }

        if (headerRowIndex < 0) {
            headerRowIndex = headerCandidates.findIndex(headers => {
                const firstColumnIsDescription = ['DESCRICAO', 'HISTORICO', 'CONTA', 'CATEGORIA'].includes(headers[0]);
                return firstColumnIsDescription && headers.filter(header => MONTHS_PT.includes(header)).length >= 1;
            });
            layout = 'monthly_grid';
            layoutLabel = 'Grade mensal';
        }

        if (headerRowIndex < 0) return invalid('Não encontramos um cabeçalho válido. Nenhum dado será importado.');

        const headers = normalizedRows[headerRowIndex];
        const rows: ParsedSpreadsheetRow[] = [];
        const invalidDateRows: Array<{ date: string; description: string }> = [];
        let skippedRows = 0;
        if (layout === 'monthly_grid') {
            const monthColumns = headers
                .map((header, index) => ({ index, month: MONTHS_PT.indexOf(header) + 1 }))
                .filter(item => item.month > 0);
            data.slice(headerRowIndex + 1).forEach(row => {
                const description = String(row[0] || '').trim();
                if (!description || normalizeSpreadsheetHeader(description) === 'TOTAL') return;
                monthColumns.forEach(({ index, month }) => {
                    const amount = parseSpreadsheetAmount(row[index]);
                    if (amount !== null && amount > 0) {
                        rows.push({
                            date: `${new Date().getFullYear()}-${String(month).padStart(2, '0')}-01`,
                            description,
                            category: 'Geral',
                            amount,
                            status: 'paid'
                        });
                    } else if (String(row[index] ?? '').trim()) skippedRows += 1;
                });
            });
        } else {
            const dateColumn = findColumn(headers, layout === 'daily_movement' ? ['CADASTRO'] : ['DATA', 'DATE', 'VENCIMENTO']);
            const descriptionColumn = findColumn(headers, layout === 'daily_movement' ? ['PACIENTE'] : ['DESCRICAO', 'HISTORICO', 'NOME', 'PACIENTE']);
            const amountColumn = findColumn(headers, layout === 'daily_movement' ? ['PAGO R', 'VALOR PAGO'] : ['VALOR', 'VALUE', 'AMOUNT', 'TOTAL', 'PAGO R', 'VALOR PAGO']);
            const categoryColumn = findColumn(headers, ['CATEGORIA', 'CATEGORY', 'CONVENIO']);
            const paymentColumn = findColumn(headers, ['FORM PAG', 'FORMA PAGAMENTO', 'FORMA DE PAGAMENTO']);
            const statusColumn = findColumn(headers, ['STATUS', 'SITUACAO']);
            data.slice(headerRowIndex + 1).forEach(row => {
                if (!row.some(cell => String(cell ?? '').trim())) return;
                const date = parseSpreadsheetDate(row[dateColumn]);
                const description = String(row[descriptionColumn] || '').trim();
                const category = categoryColumn >= 0 ? String(row[categoryColumn] || 'Geral').trim() || 'Geral' : 'Geral';
                const amount = parseSpreadsheetAmount(row[amountColumn]);
                if (date && description && amount !== null && amount > 0) {
                    const normalizedStatus = statusColumn >= 0 ? normalizeSpreadsheetHeader(row[statusColumn]) : '';
                    const status: SavedTransaction['status'] = normalizedStatus.includes('PENDENTE') || normalizedStatus.includes('A PAGAR')
                        ? 'pending'
                        : normalizedStatus.includes('PAGO') || normalizedStatus.includes('PAGA')
                            ? 'paid'
                            : statusColumn >= 0 ? 'pending' : 'paid';
                    rows.push({
                        date,
                        description,
                        category,
                        amount,
                        status,
                        paymentMethod: paymentColumn >= 0 ? parsePaymentMethod(row[paymentColumn]) : undefined
                    });
                } else {
                    if (!date && description && amount !== null && amount > 0) {
                        invalidDateRows.push({ date: String(row[dateColumn] || '').trim() || 'Data vazia', description });
                    }
                    skippedRows += 1;
                }
            });
        }

        if (!rows.length) return invalid('O cabeçalho foi reconhecido, mas nenhuma linha possui data, descrição e valor positivo válidos.');
        const expectedYear = sheetName.match(/\b(20\d{2})\b/)?.[1];
        const yearMismatchDates = expectedYear
            ? rows
                .filter(row => row.date.slice(0, 4) !== expectedYear)
                .map(row => ({ date: row.date, description: row.description }))
            : [];
        const suspiciousDates = [...yearMismatchDates, ...invalidDateRows];
        const blockingDateCount = expectedYear
            ? yearMismatchDates.filter(item => Math.abs(Number(item.date.slice(0, 4)) - Number(expectedYear)) > 1).length + invalidDateRows.length
            : invalidDateRows.length;
        const paidRows = rows.filter(row => row.status === 'paid');
        const pendingRows = rows.filter(row => row.status === 'pending');
        return {
            layout,
            layoutLabel,
            rows,
            skippedRows,
            total: rows.reduce((sum, row) => sum + row.amount, 0),
            paidCount: paidRows.length,
            paidTotal: paidRows.reduce((sum, row) => sum + row.amount, 0),
            pendingCount: pendingRows.length,
            pendingTotal: pendingRows.reduce((sum, row) => sum + row.amount, 0),
            suspiciousDates,
            blockingDateCount
        };
    };

    const excelSheetAnalyses = useMemo(() => {
        const analyses = new Map<string, SpreadsheetSheetAnalysis>();
        if (!workbook) return analyses;
        workbook.SheetNames.forEach(name => analyses.set(name, analyzeSpreadsheetSheet(workbook.Sheets[name], name)));
        return analyses;
    }, [workbook]);

    const confirmExcelImport = async () => {
        if (!workbook) return;
        if (!activeClinicId) {
            alert('Selecione uma empresa específica antes de importar a planilha. A importação não pode ser feita no Grupo consolidado.');
            return;
        }

        const allNewTransactions: Transaction[] = [];
        const timestamp = Date.now();
        let skippedRows = 0;
        const selectedSheets = sheetSelection.filter(config => config.selected);
        const invalidSheets = selectedSheets.filter(config => {
            const analysis = excelSheetAnalyses.get(config.name);
            return analysis?.layout === 'invalid' || Boolean(analysis?.blockingDateCount);
        });
        if (!selectedSheets.length) {
            alert('Selecione ao menos uma aba para importar.');
            return;
        }
        if (invalidSheets.length) {
            alert(`Importação bloqueada por segurança. Revise: ${invalidSheets.map(sheet => sheet.name).join(', ')}.`);
            return;
        }

        selectedSheets.forEach((config, sheetIdx) => {
            const analysis = excelSheetAnalyses.get(config.name);
            if (!analysis) return;
            skippedRows += analysis.skippedRows;
            analysis.rows.forEach((row, rowIndex) => {
                allNewTransactions.push({
                    id: `import-${timestamp}-${sheetIdx}-${rowIndex}`,
                    ...row,
                    type: config.type,
                    revenueUnit: config.type === 'income' ? config.revenueUnit : undefined,
                    clinicId: activeClinicId,
                    unitName: activeClinicName || undefined
                });
            });
        });

        const transactionImportKey = (transaction: Transaction) => [
            transaction.clinicId || '',
            transaction.date,
            normalizeSpreadsheetHeader(transaction.description),
            Number(transaction.amount || 0).toFixed(2),
            transaction.type,
            transaction.paymentMethod || ''
        ].join('|');
        const transactionBaseKey = (transaction: Transaction) => [
            transaction.clinicId || '',
            transaction.date,
            normalizeSpreadsheetHeader(transaction.description),
            transaction.type
        ].join('|');
        const existingTransactionsByImportKey = new Map(
            transactions.map(transaction => [transactionImportKey(transaction), transaction] as const)
        );
        const knownImportKeys = new Set(existingTransactionsByImportKey.keys());
        const existingZeroTransactions = new Map(
            transactions
                .filter(transaction => !Number.isFinite(Number(transaction.amount)) || Number(transaction.amount || 0) <= 0)
                .map(transaction => [transactionBaseKey(transaction), transaction] as const)
        );
        const correctedTransactions = new Map<string, Transaction>();
        let duplicateRows = 0;
        const uniqueTransactions = allNewTransactions.filter(transaction => {
            const zeroTransaction = existingZeroTransactions.get(transactionBaseKey(transaction));
            if (zeroTransaction) {
                correctedTransactions.set(zeroTransaction.id, { ...zeroTransaction, ...transaction, id: zeroTransaction.id });
                existingZeroTransactions.delete(transactionBaseKey(transaction));
                return false;
            }
            const key = transactionImportKey(transaction);
            const existingTransaction = existingTransactionsByImportKey.get(key);
            if (existingTransaction) {
                if (existingTransaction.status !== transaction.status ||
                    existingTransaction.category !== transaction.category ||
                    existingTransaction.paymentMethod !== transaction.paymentMethod) {
                    correctedTransactions.set(existingTransaction.id, {
                        ...existingTransaction,
                        status: transaction.status,
                        category: transaction.category,
                        paymentMethod: transaction.paymentMethod
                    });
                } else {
                    duplicateRows += 1;
                }
                existingTransactionsByImportKey.delete(key);
                return false;
            }
            if (knownImportKeys.has(key)) {
                duplicateRows += 1;
                return false;
            }
            knownImportKeys.add(key);
            return true;
        });

        if (uniqueTransactions.length > 0 || correctedTransactions.size > 0) {
            const currentUser = auth.currentUser;
            const ownerId = currentUser ? ((await getManagerIdForUser(currentUser.uid)) || currentUser.uid) : undefined;
            if (ownerId) {
                const candidates = [...uniqueTransactions, ...correctedTransactions.values()];
                await Promise.all(candidates.map(async transaction => {
                    if (transaction.type !== 'income' || transaction.clientId) return;
                    const extracted = extractClientFromDescription(transaction.description);
                    if (!extracted) return;
                    const id = await saveClient(ownerId, {
                        ...extracted,
                        clinicId: activeClinicId || undefined,
                        unitName: activeClinicName || undefined,
                        source: 'manual',
                        active: true
                    });
                    transaction.clientId = id;
                    transaction.clientName = extracted.name;
                    transaction.clientTaxId = extracted.taxId;
                }));
            }
            const nextTransactions = [
                ...uniqueTransactions,
                ...transactions.map(transaction => correctedTransactions.get(transaction.id) || transaction)
            ];
            setTransactions(nextTransactions);
            if (currentUser) {
                setIsSaving(true);
                try {
                    await persistScopedTransactions(ownerId!, nextTransactions);
                } finally {
                    setIsSaving(false);
                }
            }
            alert(`${uniqueTransactions.length} lançamentos novos importados e ${correctedTransactions.size} registro(s) existente(s) atualizado(s).${skippedRows > 0 ? ` ${skippedRows} linha(s) inválida(s) ou com valor zerado foram ignoradas.` : ''}${duplicateRows > 0 ? ` ${duplicateRows} duplicidade(s) foram desconsideradas.` : ''}`);
        } else {
            alert(duplicateRows > 0
                ? `Nenhum lançamento novo foi importado. ${duplicateRows} registro(s) já existiam no sistema.`
                : 'Nenhum lançamento válido foi encontrado. Confira as colunas Data, Descrição, Categoria e Valor.');
        }

        setIsExcelModalOpen(false);
        setWorkbook(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleXmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsImporting(true);
        const allNewTransactions: Transaction[] = [];
        const currentUser = auth.currentUser;
        const ownerId = currentUser ? ((await getManagerIdForUser(currentUser.uid)) || currentUser.uid) : undefined;
        const persistedTransactions = ownerId ? await getTransactions(ownerId) : transactions;
        const knownFingerprints = new Set(persistedTransactions.map(transactionFingerprint));
        let duplicateCount = 0;
        let archiveFailureCount = 0;
        const selectedProfessional = professionals.find(item => item.id === xmlProfessionalId);

        const readFile = (file: File): Promise<void> => {
            if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
                return (async () => {
                    try {
                        const draft = await parseFiscalPdf(file);
                        if (!draft.totalValue || draft.totalValue <= 0) {
                            alert(`Não foi possível identificar o valor no PDF "${file.name}". Use Documentos Fiscais para revisar os dados manualmente.`);
                            return;
                        }

                        const detectedType = xmlClassMode === 'income' ? 'income' : 'expense';
                        const fingerprint = draft.documentFingerprint ||
                            `pdf:${draft.issuedAt}|${normalizeXmlValue(draft.issuerName)}|${Number(draft.totalValue).toFixed(2)}|${detectedType}`;
                        if (knownFingerprints.has(fingerprint)) {
                            duplicateCount += 1;
                            return;
                        }

                        knownFingerprints.add(fingerprint);
                        const pdfTransaction: Transaction = {
                            id: `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                            date: draft.issuedAt,
                            description: `NF: ${detectedType === 'income' ? (draft.recipientName || draft.issuerName || file.name) : (draft.issuerName || draft.recipientName || file.name)}`,
                            category: detectedType === 'income' ? 'Geral' : 'Impostos e Tributos',
                            amount: Math.abs(draft.totalValue),
                            type: detectedType,
                            status: 'pending',
                            sourceType: 'fiscal_import',
                            sourceFingerprint: fingerprint
                        };
                        if (ownerId) {
                            await indexFiscalCounterpartiesFromDraft(
                                ownerId,
                                fingerprint,
                                draft,
                                detectedType,
                                { clinicId: activeClinicId || undefined, unitName: activeClinicName || undefined }
                            );
                            if (saveXmlClients) {
                                const clientId = await saveClientFromFiscalDraft(ownerId, draft, detectedType, { clinicId: activeClinicId || undefined, unitName: activeClinicName || undefined }, fingerprint);
                                if (clientId) {
                                    pdfTransaction.clientId = clientId;
                                    pdfTransaction.clientName = draft.recipientName;
                                    pdfTransaction.clientTaxId = String(draft.recipientCnpj || '').replace(/\D/g, '');
                                }
                            }
                        }
                        allNewTransactions.push(pdfTransaction);
                    } catch (error) {
                        console.error('Erro ao ler PDF:', file.name, error);
                        alert(`O PDF "${file.name}" precisa de conferência assistida em Documentos Fiscais.`);
                    }
                })();
            }

            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    try {
                        const xmlText = evt.target?.result as string;
                        const parser = new DOMParser();
                        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

                        // NF-e / NFS-e extraction with fallback support for different city patterns
                        const getVal = (tags: string[]) => {
                            for (const tag of tags) {
                                const el = xmlDoc.getElementsByTagName(tag)[0];
                                if (el?.textContent) return el.textContent;
                            }
                            return null;
                        };

                        const dateStr = getVal(["dhEmi", "dEmi", "DataEmissao", "dhEmis"]) || new Date().toISOString();
                        const valStr = getVal(["vNF", "vServ", "vServicos", "ValorServicos"]) || "0";
                        const issuerStr = getVal(["xNome", "RazaoSocial", "NomeRazaoSocial"]) || "Fornecedor";
                        const rawAccessKey =
                            xmlDoc.getElementsByTagName('infNFe')[0]?.getAttribute('Id') ||
                            xmlDoc.getElementsByTagName('infCte')[0]?.getAttribute('Id') ||
                            getVal(["chNFe", "ChaveAcesso", "CodigoVerificacao"]);

                        let detectedType: 'income' | 'expense' = 'expense';

                        if (xmlClassMode === 'income') {
                            detectedType = 'income';
                        } else if (xmlClassMode === 'expense') {
                            detectedType = 'expense';
                        } else {
                            const direction = detectXmlFinancialDirection(xmlText, knownClinicCnpjs);

                            if (direction === 'income') {
                                detectedType = 'income';
                            } else if (direction === 'expense') {
                                detectedType = 'expense';
                            } else {
                                const fallbackByTag = getVal(["tpNF"]);
                                detectedType = fallbackByTag === "1" ? 'income' : 'expense';
                            }
                        }

                        const normalizedAccessKey = normalizeAccessKey(rawAccessKey);
                        const transactionDate = dateStr.split('T')[0];
                        const transactionAmount = Math.abs(parseFloat(valStr.replace(',', '.')));
                        const fingerprint = normalizedAccessKey
                            ? `key:${normalizedAccessKey}`
                            : `xml:${transactionDate}|${normalizeXmlValue(issuerStr)}|${transactionAmount.toFixed(2)}|${detectedType}`;

                        const newTransaction: Transaction = {
                            id: `xml-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            date: transactionDate,
                            fiscalIssuedAt: transactionDate,
                            description: `NF: ${issuerStr}`,
                            category: detectedType === 'income' ? 'Geral' : 'Impostos e Tributos',
                            amount: transactionAmount,
                            type: detectedType,
                            status: 'paid',
                            sourceType: 'fiscal_import',
                            sourceAccessKey: normalizedAccessKey || undefined,
                            sourceFingerprint: fingerprint,
                            professionalId: selectedProfessional?.id,
                            professionalName: selectedProfessional?.name
                        };

                        if (newTransaction.amount > 0) {
                            if (knownFingerprints.has(fingerprint)) {
                                duplicateCount += 1;
                            } else {
                                knownFingerprints.add(fingerprint);
                                if (ownerId && currentUser) {
                                    try {
                                        newTransaction.sourceFiscalFileId = await archiveFiscalXml(ownerId, currentUser.uid, file, {
                                            accessKey: normalizedAccessKey || undefined,
                                            issuedAt: transactionDate,
                                            clinicId: activeClinicId || undefined,
                                            unitName: activeClinicName || undefined,
                                            professionalId: selectedProfessional?.id,
                                            professionalName: selectedProfessional?.name
                                        });
                                    } catch (archiveError) {
                                        archiveFailureCount += 1;
                                        console.error('Erro ao arquivar XML original:', file.name, archiveError);
                                    }
                                }
                                allNewTransactions.push(newTransaction);
                                if (ownerId) {
                                    const fiscalDraft = parseFiscalXml(xmlText, file.name);
                                    await indexFiscalCounterpartiesFromDraft(
                                        ownerId,
                                        fingerprint,
                                        { ...fiscalDraft, suggestedEntryType: detectedType },
                                        detectedType,
                                        { clinicId: activeClinicId || undefined, unitName: activeClinicName || undefined }
                                    );
                                    if (saveXmlClients) {
                                        const clientId = await saveClientFromFiscalDraft(ownerId, { ...fiscalDraft, suggestedEntryType: detectedType }, detectedType, { clinicId: activeClinicId || undefined, unitName: activeClinicName || undefined }, fingerprint);
                                        if (clientId) {
                                            newTransaction.clientId = clientId;
                                            newTransaction.clientName = fiscalDraft.recipientName;
                                            newTransaction.clientTaxId = String(fiscalDraft.recipientCnpj || '').replace(/\D/g, '');
                                        }
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        console.error("Erro ao ler XML:", file.name, err);
                    }
                    resolve();
                };
                reader.onerror = () => {
                    console.error("Erro no FileReader ao ler:", file.name);
                    resolve();
                };
                reader.readAsText(file);
            });
        };

        try {
            await Promise.all(Array.from(files).map(file => readFile(file)));
            
            if (allNewTransactions.length > 0) {
                if (ownerId) {
                    const saved = await syncTransactions(ownerId, allNewTransactions);
                    if (!saved) throw new Error('O Firebase recusou a gravação das notas importadas.');
                }
                // Exiba somente depois de confirmar a persistência.
                setTransactions(prev => [...allNewTransactions, ...prev]);
                alert(`${allNewTransactions.length} notas importadas. ${duplicateCount} duplicadas foram ignoradas.${archiveFailureCount ? ` Atenção: ${archiveFailureCount} XML(s) foram lançados, mas não puderam ser arquivados para download.` : ''}`);
            } else if (duplicateCount > 0) {
                alert(`Nenhuma nota nova foi importada. ${duplicateCount} arquivos já existiam no financeiro.`);
            } else {
                alert("Nenhuma nota fiscal válida encontrada nos arquivos XML selecionados.");
            }
        } catch (err) {
            console.error("Erro geral na importação batch:", err);
            alert("Ocorreu um erro ao processar o lote de arquivos.");
        } finally {
            setIsImporting(false);
            if (xmlInputRef.current) xmlInputRef.current.value = '';
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            setIsSaving(true);
            try {
                const ownerId = (await getManagerIdForUser(currentUser.uid)) || currentUser.uid;
                const saved = await syncTransactions(ownerId, [], [id]);
                if (!saved) throw new Error('Falha ao excluir no Firebase.');
                setTransactions(prev => prev.filter(t => t.id !== id));
                setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
                loadedScopeTransactionIdsRef.current.delete(id);
                allTransactionsRef.current = allTransactionsRef.current.filter(item => item.id !== id);
            } catch (error) {
                console.error('Erro ao excluir lançamento:', error);
                alert('Não foi possível excluir o lançamento. Nenhum dado foi removido da tela.');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleEdit = (transaction: Transaction) => {
        setRepeatMonthly(false);
        setRepeatMonths(12);
        setNewTransaction({
            ...transaction,
            fiscalIssuedAt: transaction.sourceType === 'fiscal_import'
                ? (transaction.fiscalIssuedAt || transaction.date)
                : transaction.fiscalIssuedAt
        });
        setIsModalOpen(true);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Tem certeza que deseja excluir os ${selectedIds.length} lançamentos selecionados?`)) {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            const idsToDelete = [...selectedIds];
            setIsSaving(true);
            try {
                const ownerId = (await getManagerIdForUser(currentUser.uid)) || currentUser.uid;
                const saved = await syncTransactions(ownerId, [], idsToDelete);
                if (!saved) throw new Error('Falha ao excluir no Firebase.');
                const removed = new Set(idsToDelete);
                setTransactions(prev => prev.filter(t => !removed.has(t.id)));
                setSelectedIds([]);
                idsToDelete.forEach(id => loadedScopeTransactionIdsRef.current.delete(id));
                allTransactionsRef.current = allTransactionsRef.current.filter(item => !removed.has(item.id));
            } catch (error) {
                console.error('Erro ao excluir lançamentos:', error);
                alert('Não foi possível excluir os lançamentos. Nenhum dado foi removido da tela.');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(selectedId => selectedId !== id)
                : [...prev, id]
        );
    };

    const toggleSelectAll = (filteredTransactions: Transaction[]) => {
        const visibleIds = filteredTransactions.map(transaction => transaction.id);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
        setSelectedIds(previous => allVisibleSelected
            ? previous.filter(id => !visibleIds.includes(id))
            : Array.from(new Set([...previous, ...visibleIds]))
        );
    };

    const handleSaveTransaction = async () => {
        if (!newTransaction.description || !newTransaction.amount || !newTransaction.date) {
            alert("Preencha todos os campos obrigatórios!");
            return;
        }
        const isTaxExpense = newTransaction.type === 'expense' && /imposto|tributo|simples|\bdas\b/i.test(`${newTransaction.category || ''} ${newTransaction.description || ''}`);
        if (isTaxExpense && !newTransaction.competence) {
            alert('Informe a competência do imposto. Ela deve corresponder ao mês do faturamento apurado, não ao mês do pagamento.');
            return;
        }

        const transactionData: Transaction = {
            ...(newTransaction as Transaction),
            id: newTransaction.id || `manual-${Date.now()}`,
            date: newTransaction.date!,
            description: newTransaction.description!,
            category: newTransaction.category || 'Geral',
            costCenter: newTransaction.costCenter || (newTransaction.type === 'expense' ? 'Administrativo' : 'Assistencial'),
            resultCenter: newTransaction.resultCenter || (newTransaction.type === 'income' ? 'Receita Assistencial' : 'Operação'),
            revenueUnit: newTransaction.type === 'income' ? (newTransaction.revenueUnit || 'clinical') : undefined,
            amount: Number(newTransaction.amount),
            type: newTransaction.type as 'income' | 'expense',
            status: newTransaction.status as 'paid' | 'pending',
            clinicId: newTransaction.clinicId || activeClinicId || undefined,
            unitName: newTransaction.unitName || activeClinicName || undefined
        };

        let updatedTransactions: Transaction[];
        if (newTransaction.id) {
            // Update existing
            updatedTransactions = transactions.map(t => t.id === newTransaction.id ? transactionData : t);
        } else if (repeatMonthly && transactionData.type === 'expense') {
            const total = Math.max(2, Math.min(60, Math.trunc(repeatMonths || 12)));
            const seriesId = `recurring-${Date.now()}`;
            const recurringTransactions = Array.from({ length: total }, (_, index): Transaction => {
                const date = addMonthsKeepingValidDay(transactionData.date, index);
                const competence = date.slice(0, 7);
                return {
                    ...transactionData,
                    id: `${seriesId}-${competence}`,
                    date,
                    dueDate: date,
                    status: index === 0 ? transactionData.status : 'pending',
                    sourceType: 'manual',
                    sourceFingerprint: `${seriesId}:${competence}`,
                    recurrenceSeriesId: seriesId,
                    recurrenceIndex: index + 1,
                    recurrenceTotal: total
                };
            });
            updatedTransactions = [...recurringTransactions.reverse(), ...transactions];
        } else {
            // Create new
            updatedTransactions = [transactionData, ...transactions];
        }

        // Atualize a tela somente depois da confirmação do Firebase.
        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                setIsSaving(true);
                const ownerId = (await getManagerIdForUser(currentUser.uid)) || currentUser.uid;
                await persistScopedTransactions(ownerId, updatedTransactions);
            } catch (error) {
                console.error('Erro ao salvar lançamento:', error);
                alert('Não foi possível salvar o lançamento. Tente novamente.');
                return;
            } finally {
                setIsSaving(false);
            }
        }
        setTransactions(updatedTransactions);
        
        setIsModalOpen(false);
        setRepeatMonthly(false);
        setRepeatMonths(12);
        setNewTransaction({
            type: 'expense',
            status: 'pending',
            paymentMethod: 'pix',
            date: new Date().toISOString().split('T')[0],
            category: 'Geral',
            costCenter: 'Administrativo',
            revenueUnit: 'clinical',
            resultCenter: 'Operação',
            description: '',
            amount: 0
        });
    };

    const formatMoney = (value: number) => {
        return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const openClientLink = async (transaction: Transaction) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        setClientLinkTransaction(transaction);
        setClientSearch(transaction.clientName || transaction.description.replace(/^NF:\s*/i, ''));
        setSelectedClientId(transaction.clientId || '');
        setNewClientTaxId(transaction.clientTaxId || '');
        try {
            const ownerId = (await getManagerIdForUser(currentUser.uid)) || currentUser.uid;
            setClients(await getClients(ownerId, activeClinicId || undefined));
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            alert('Não foi possível carregar os clientes cadastrados.');
        }
    };

    const linkClientToTransaction = async (createNew = false) => {
        if (!clientLinkTransaction) return;
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const typedName = clientSearch.trim();
        const selectedClient = clients.find(item => item.id === selectedClientId);
        if (createNew && !typedName) {
            alert('Informe o nome do cliente.');
            return;
        }
        if (!createNew && !selectedClient) {
            alert('Selecione um cliente cadastrado.');
            return;
        }
        setIsLinkingClient(true);
        try {
            const ownerId = (await getManagerIdForUser(currentUser.uid)) || currentUser.uid;
            let client = selectedClient;
            let id = selectedClient?.id;
            if (createNew) {
                id = await saveClient(ownerId, {
                    name: typedName,
                    taxId: newClientTaxId,
                    clinicId: activeClinicId || undefined,
                    unitName: activeClinicName || undefined,
                    source: 'manual',
                    active: true
                });
                client = { id, name: typedName, taxId: newClientTaxId.replace(/\D/g, ''), source: 'manual', active: true };
            }
            if (!client || !id) return;
            const changed: Transaction = {
                ...clientLinkTransaction,
                clientId: id,
                clientName: client.name,
                clientTaxId: client.taxId || ''
            };
            const saved = await syncTransactions(ownerId, [changed]);
            if (!saved) throw new Error('O Firebase recusou o vínculo do cliente.');
            setTransactions(previous => previous.map(item => item.id === changed.id ? changed : item));
            allTransactionsRef.current = allTransactionsRef.current.map(item => item.id === changed.id ? changed : item);
            setClientLinkTransaction(null);
            alert(`Cliente ${client.name} vinculado com sucesso.`);
        } catch (error) {
            console.error('Erro ao vincular cliente:', error);
            alert('Não foi possível vincular o cliente ao lançamento.');
        } finally {
            setIsLinkingClient(false);
        }
    };

    const handleBulkClientLink = async () => {
        const eligible = transactions.filter(item => selectedIds.includes(item.id) && item.type === 'income' && !item.clientId);
        if (!eligible.length) {
            alert('Nenhum dos lançamentos selecionados está disponível para vínculo.');
            return;
        }
        const recognized = eligible
            .map(transaction => ({ transaction, client: extractClientFromDescription(transaction.description) }))
            .filter((item): item is { transaction: Transaction; client: { name: string; taxId: string } } => Boolean(item.client));
        if (!recognized.length) {
            alert('Não encontrei nome acompanhado de CPF ou CNPJ nas descrições selecionadas.');
            return;
        }
        if (!window.confirm(`Cadastrar ou localizar e vincular ${recognized.length} cliente(s) automaticamente?`)) return;
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        setIsBulkLinkingClients(true);
        try {
            const ownerId = (await getManagerIdForUser(currentUser.uid)) || currentUser.uid;
            const changed = await Promise.all(recognized.map(async ({ transaction, client }) => {
                const id = await saveClient(ownerId, {
                    ...client,
                    clinicId: transaction.clinicId || activeClinicId || undefined,
                    unitName: transaction.unitName || activeClinicName || undefined,
                    source: 'manual',
                    active: true
                });
                return { ...transaction, clientId: id, clientName: client.name, clientTaxId: client.taxId };
            }));
            const saved = await syncTransactions(ownerId, changed);
            if (!saved) throw new Error('O Firebase recusou os vínculos.');
            const changes = new Map(changed.map(item => [item.id, item]));
            setTransactions(previous => previous.map(item => changes.get(item.id) || item));
            allTransactionsRef.current = allTransactionsRef.current.map(item => changes.get(item.id) || item);
            setSelectedIds([]);
            const ignored = eligible.length - recognized.length;
            alert(`${changed.length} cliente(s) vinculado(s) com sucesso.${ignored ? ` ${ignored} lançamento(s) sem CPF/CNPJ foram ignorados.` : ''}`);
        } catch (error) {
            console.error('Erro ao vincular clientes em lote:', error);
            alert('Não foi possível concluir todos os vínculos. Tente novamente.');
        } finally {
            setIsBulkLinkingClients(false);
        }
    };

    const handleBulkProfessionalAssignment = async () => {
        const selectedProfessional = professionals.find(item => item.id === xmlProfessionalId);
        if (!selectedProfessional) {
            alert('Escolha o sócio ou profissional que será responsável pelas notas selecionadas.');
            return;
        }
        const eligible = transactions.filter(item =>
            selectedIds.includes(item.id) && item.type === 'income' && item.sourceType === 'fiscal_import'
        );
        if (!eligible.length) {
            alert('Selecione ao menos uma nota fiscal de receita para realizar o vínculo.');
            return;
        }
        setIsSaving(true);
        try {
            const currentUser = auth.currentUser;
            const ownerId = currentUser ? ((await getManagerIdForUser(currentUser.uid)) || currentUser.uid) : undefined;
            const updatedTransactions = transactions.map(item => eligible.some(note => note.id === item.id)
                ? { ...item, professionalId: selectedProfessional.id, professionalName: selectedProfessional.name }
                : item
            );
            if (ownerId) {
                const changedTransactions = updatedTransactions.filter(item => eligible.some(note => note.id === item.id));
                const saved = await syncTransactions(ownerId, changedTransactions);
                if (!saved) throw new Error('O Firebase recusou o vínculo das notas.');
                await Promise.all(eligible
                    .filter(item => item.sourceFiscalFileId)
                    .map(item => updateFiscalFileProfessional(ownerId, item.sourceFiscalFileId!, {
                        id: selectedProfessional.id,
                        name: selectedProfessional.name
                    }))
                );
            }
            setTransactions(updatedTransactions);
            const skipped = selectedIds.length - eligible.length;
            const remainingIds = updatedTransactions
                .filter(item => item.type === 'income' && item.sourceType === 'fiscal_import' && !item.professionalId && !item.professionalName?.trim())
                .map(item => item.id);
            const completionMessage = `${eligible.length} nota(s) vinculada(s) a ${selectedProfessional.name}.${skipped > 0 ? ` ${skipped} item(ns) não fiscal(is) foram ignorados.` : ''}`;
            if (remainingIds.length > 0) {
                const continueAssignment = window.confirm(`${completionMessage}\n\nAinda faltam vincular ${remainingIds.length} nota(s). Deseja selecionar as notas restantes e escolher o próximo profissional agora?`);
                if (continueAssignment) {
                    setSelectedIds(remainingIds);
                    setXmlProfessionalId('');
                } else {
                    setSelectedIds([]);
                }
            } else {
                setSelectedIds([]);
                alert(`${completionMessage}\n\nTodas as notas fiscais de receita já possuem responsável.`);
            }
        } catch (error) {
            console.error('Erro ao vincular profissional às notas:', error);
            alert('Não foi possível concluir o vínculo das notas.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadAllXml = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        setIsDownloadingXml(true);
        try {
            const ownerId = (await getManagerIdForUser(currentUser.uid)) || currentUser.uid;
            const count = await downloadAllFiscalXml(ownerId, activeClinicId || undefined);
            alert(`${count} XML(s) incluídos no arquivo compactado.`);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Não foi possível baixar os XMLs.');
        } finally {
            setIsDownloadingXml(false);
        }
    };

    const matchesSelectedPeriod = (value?: string) => {
        const normalizedDate = String(value || '');
        return (selectedYear === 'all' || normalizedDate.slice(0, 4) === selectedYear) &&
            (selectedMonth === 'all' || normalizedDate.slice(5, 7) === selectedMonth);
    };

    const periodTransactions = transactions.filter(transaction => matchesSelectedPeriod(transaction.dueDate || transaction.date));
    const periodBillingRecords = billingRecords.filter(record => matchesSelectedPeriod(record.consultationDate));
    const representedBillingIds = new Set(periodTransactions.map(item => item.sourceBillingId).filter(Boolean));
    const unmatchedBillingIncome = periodBillingRecords
        .filter(record => !representedBillingIds.has(record.id))
        .reduce((acc, record) => acc + (record.grossAmount || 0), 0);

    const getBalance = () => {
        const transactionBalance = periodTransactions.reduce((acc, t) => {
            return t.type === 'income' ? acc + (t.amount || 0) : acc - (t.amount || 0);
        }, 0);
        return transactionBalance + unmatchedBillingIncome;
    };

    const getIncome = () => {
        const transactionIncome = periodTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
        return transactionIncome + unmatchedBillingIncome;
    };
    
    const getExpenses = () => periodTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0);

    const taxAllocation = (() => {
        const taxTotal = periodTransactions
            .filter(item => item.type === 'expense' && /imposto|tributo|das\b/i.test(`${item.category} ${item.description}`))
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const revenueByProfessional = new Map<string, { name: string; revenue: number }>();
        periodTransactions.filter(item => item.type === 'income').forEach(item => {
            const id = item.professionalId || 'unassigned';
            const current = revenueByProfessional.get(id) || { name: item.professionalName || 'Profissional não informado', revenue: 0 };
            current.revenue += Number(item.amount || 0);
            revenueByProfessional.set(id, current);
        });
        const attributableRevenue = Array.from(revenueByProfessional.values()).reduce((sum, item) => sum + item.revenue, 0);
        return {
            taxTotal,
            rows: Array.from(revenueByProfessional.values())
                .map(item => ({ ...item, share: attributableRevenue > 0 ? item.revenue / attributableRevenue : 0 }))
                .sort((a, b) => b.revenue - a.revenue)
        };
    })();
    const professionalTotalSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
    const selectedProfessionalPeriodTotal = xmlProfessionalId !== 'all'
        ? periodTransactions
            .filter(item => item.type === 'income')
            .filter(item => xmlProfessionalId === 'unassigned'
                ? !item.professionalId && !item.professionalName?.trim()
                : item.professionalId === xmlProfessionalId)
            .filter(item => selectedCategory === 'all'
                || (selectedCategory === 'uncategorized'
                    ? !item.category?.trim()
                    : item.category === selectedCategory))
            .filter(item => !professionalTotalSearch || [
                item.description,
                item.category,
                item.unitName,
                item.sourceType
            ].some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(professionalTotalSearch)))
            .reduce((sum, item) => sum + Number(item.amount || 0), 0)
        : 0;

    return (
<div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8 animate-fade-in">
            <header className="flex flex-col gap-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-[280px]">
                    <span className="mb-2 inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-700">Gestão financeira</span>
                    <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                        Controle Financeiro
                        {isSaving && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 sm:text-base">Gerencie suas contas, fluxo de caixa e importações.</p>
                </div>
                {isAccountantView ? <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800">Consulta contábil · somente leitura · {activeClinicName || 'empresa selecionada'}</div> : <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:max-w-4xl xl:justify-end">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 font-bold text-emerald-700 transition hover:bg-emerald-100"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Planilha Excel
                    </button>
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                        <select
                            value={xmlClassMode}
                            onChange={(e) => setXmlClassMode(e.target.value as 'auto' | 'income' | 'expense')}
                            className="bg-transparent text-xs text-slate-600 font-medium px-2 py-1 outline-none cursor-pointer border-r border-slate-300"
                        >
                            <option value="auto">NF Auto</option>
                            <option value="income">NF Receita (Saída)</option>
                            <option value="expense">NF Despesa (Entrada)</option>
                        </select>
                        <button
                            onClick={() => xmlInputRef.current?.click()}
                            disabled={isImporting}
                            className={`ml-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors ${isImporting ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {isImporting ? 'Lendo...' : 'Importar XML/PDF'}
                        </button>
                    </div>
                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600" title="Em notas de receita, cadastra o destinatário como cliente"><input type="checkbox" checked={saveXmlClients} onChange={e => setSaveXmlClients(e.target.checked)} className="h-4 w-4"/>Salvar clientes do XML</label>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx, .xls"
                        className="hidden"
                    />
                    <input
                        type="file"
                        ref={xmlInputRef}
                        onChange={handleXmlUpload}
                        accept=".xml,.pdf,text/xml,application/xml,application/pdf"
                        multiple
                        className="hidden"
                    />
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="order-first flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 font-bold text-white shadow-sm transition hover:bg-brand-700 hover:shadow-md"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Lançamento
                    </button>
                </div>}
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <h3 className="text-slate-500 text-sm font-medium">Receitas Totais</h3>
                    <p className="text-2xl font-bold text-slate-800">{formatMoney(getIncome())}</p>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-br from-white to-red-50/40 p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="absolute inset-x-0 top-0 h-1 bg-red-500" />
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <TrendingDown className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                    <h3 className="text-slate-500 text-sm font-medium">Despesas Totais</h3>
                    <p className="text-2xl font-bold text-slate-800">{formatMoney(getExpenses())}</p>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className={`absolute inset-x-0 top-0 h-1 ${getBalance() >= 0 ? 'bg-blue-500' : 'bg-red-500'}`} />
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <h3 className="text-slate-500 text-sm font-medium">Saldo Atual</h3>
                    <p className={`text-2xl font-bold ${getBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatMoney(getBalance())}
                    </p>
                </div>
            </div>

            {taxAllocation.rows.length > 0 && (
                <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="font-bold text-slate-800">Rateio de impostos por faturamento profissional</h2>
                            <p className="text-sm text-slate-500">A participação de cada profissional é aplicada ao total de impostos do período filtrado.</p>
                        </div>
                        <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-sm text-amber-800 sm:mt-0">Impostos identificados: <strong>{formatMoney(taxAllocation.taxTotal)}</strong></div>
                    </div>
                    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full min-w-[620px] text-sm">
                            <thead className="bg-slate-50"><tr className="border-b text-left text-slate-500"><th className="px-3 py-2.5">Profissional</th><th className="px-3 py-2.5 text-right">Faturamento</th><th className="px-3 py-2.5 text-right">Participação</th><th className="px-3 py-2.5 text-right">Imposto atribuído</th></tr></thead>
                            <tbody>{taxAllocation.rows.map(row => (
                                <tr key={row.name} className="border-b border-slate-100">
                                    <td className="px-3 py-3 font-medium text-slate-700">{row.name}</td>
                                    <td className="px-3 py-3 text-right">{formatMoney(row.revenue)}</td>
                                    <td className="px-3 py-3 text-right">{(row.share * 100).toFixed(1)}%</td>
                                    <td className="px-3 py-3 text-right font-bold text-brand-700">{formatMoney(taxAllocation.taxTotal * row.share)}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* Tabs */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex w-full min-w-0 overflow-x-auto border-b border-slate-200 bg-white px-2 pt-2 [scrollbar-width:thin]">
                        <button
                            onClick={() => setActiveTab('transactions')}
                            className={`shrink-0 rounded-t-lg px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'transactions' ? 'border-b-2 border-brand-600 bg-brand-50/60 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            Todos os Lançamentos
                        </button>
                        <button
                            onClick={() => setActiveTab('receivable')}
                            className={`shrink-0 rounded-t-lg px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'receivable' ? 'border-b-2 border-brand-600 bg-brand-50/60 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            Contas a Receber
                        </button>
                        <button
                            onClick={() => setActiveTab('payable')}
                            className={`shrink-0 rounded-t-lg px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'payable' ? 'border-b-2 border-brand-600 bg-brand-50/60 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            Contas a Pagar
                        </button>
                        <button
                            onClick={() => setActiveTab('billing')}
                            className={`shrink-0 rounded-t-lg px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'billing' ? 'border-b-2 border-brand-600 bg-brand-50/60 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            Faturamento Clínico
                        </button>
                        <button
                            onClick={() => setActiveTab('laboratoryBilling')}
                            className={`shrink-0 rounded-t-lg px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'laboratoryBilling' ? 'border-b-2 border-brand-600 bg-brand-50/60 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                        >
                            Faturamento Laboratorial
                        </button>
                    </div>
                    <div className="flex flex-col gap-1">
                        <select
                            value={xmlProfessionalId}
                            onChange={(event) => setXmlProfessionalId(event.target.value)}
                            title="Filtrar lançamentos por profissional"
                            className="max-w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        >
                            <option value="all">Todos os profissionais</option>
                            <option value="unassigned">Profissional: não informado</option>
                            {professionals.map(professional => <option key={professional.id} value={professional.id}>{professional.name}</option>)}
                        </select>
                        {unassignedFiscalNotesCount > 0 ? (
                            <span className="text-[10px] font-semibold text-amber-700">Falta vincular {unassignedFiscalNotesCount} nota(s)</span>
                        ) : (
                            <span className="text-[10px] font-semibold text-emerald-700">Todas as notas estão vinculadas</span>
                        )}
                        {xmlProfessionalId !== 'all' && (
                            <span className="text-[10px] font-bold text-brand-700">
                                Total no período: {formatMoney(selectedProfessionalPeriodTotal)}
                            </span>
                        )}
                    </div>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkProfessionalAssignment}
                            disabled={isSaving || !professionals.some(item => item.id === xmlProfessionalId)}
                            className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Users className="h-4 w-4" />
                            Vincular selecionadas
                        </button>
                    )}
                    <button
                        onClick={handleDownloadAllXml}
                        disabled={isDownloadingXml}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                    >
                        {isDownloadingXml ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                        {isDownloadingXml ? 'Preparando...' : 'Baixar XMLs'}
                    </button>

                    <div className="px-4">
                        <button
                            onClick={() => setIsGrouped(!isGrouped)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isGrouped
                                ? 'bg-brand-50 border-brand-200 text-brand-700 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            <Filter className="w-3 h-3" />
                            {isGrouped ? 'Desagrupar Nome' : 'Agrupar por Nome'}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Buscar por nome ou descrição..."
                            aria-label="Buscar por nome ou descrição"
                            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(event) => setSelectedCategory(event.target.value)}
                        aria-label="Filtrar por categoria"
                        className="max-w-52 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    >
                        <option value="all">Todas as categorias</option>
                        <option value="uncategorized">Sem categoria</option>
                        {availableCategories.map(category => <option key={category} value={category}>{category}</option>)}
                    </select>
                    <select
                        value={selectedMonth}
                        onChange={(event) => setSelectedMonth(event.target.value)}
                        aria-label="Filtrar por mês"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    >
                        <option value="all">Todos os meses</option>
                        {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((month, index) => (
                            <option key={month} value={String(index + 1).padStart(2, '0')}>{month}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(event) => setSelectedYear(event.target.value)}
                        aria-label="Filtrar por ano"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    >
                        <option value="all">Todos os anos</option>
                        {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                    <select
                        value={dateOrder}
                        onChange={(event) => setDateOrder(event.target.value as 'desc' | 'asc')}
                        aria-label="Ordenar por data"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    >
                        <option value="desc">Mais novas para mais antigas</option>
                        <option value="asc">Mais antigas para mais novas</option>
                    </select>
                </div>

                <div className="p-3 sm:p-5 lg:p-6">
                    {(() => {
                        const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');
                        const compareDates = (firstDate?: string, secondDate?: string) => {
                            const first = firstDate ? new Date(`${firstDate}T00:00:00`).getTime() : 0;
                            const second = secondDate ? new Date(`${secondDate}T00:00:00`).getTime() : 0;
                            return dateOrder === 'asc' ? first - second : second - first;
                        };
                        const matchesPeriod = (value?: string) => {
                            const normalizedDate = String(value || '');
                            const yearMatches = selectedYear === 'all' || normalizedDate.slice(0, 4) === selectedYear;
                            const monthMatches = selectedMonth === 'all' || normalizedDate.slice(5, 7) === selectedMonth;
                            return yearMatches && monthMatches;
                        };

                        // Filter transactions based on active tab
                        let filteredTransactions = activeTab === 'receivable'
                            ? transactions.filter(t => t.type === 'income')
                            : activeTab === 'payable'
                                ? transactions.filter(t => t.type === 'expense')
                                : activeTab === 'billing'
                                    ? transactions.filter(t => t.type === 'income' && t.revenueUnit !== 'laboratory' && !t.sourceBillingId && t.sourceType !== 'billing' && t.sourceType !== 'production_entry')
                                : activeTab === 'laboratoryBilling'
                                    ? transactions.filter(t => t.type === 'income' && t.revenueUnit === 'laboratory')
                                    : transactions;

                        filteredTransactions = filteredTransactions
                            .filter(transaction => matchesPeriod(transaction.dueDate || transaction.date))
                            .filter(transaction => selectedCategory === 'all'
                                || (selectedCategory === 'uncategorized'
                                    ? !transaction.category?.trim()
                                    : transaction.category === selectedCategory))
                            .filter(transaction => xmlProfessionalId === 'all'
                                || (xmlProfessionalId === 'unassigned'
                                    ? !transaction.professionalId && !transaction.professionalName?.trim()
                                    : transaction.professionalId === xmlProfessionalId))
                            .filter(transaction => !normalizedSearch || [
                                transaction.description,
                                transaction.category,
                                transaction.unitName,
                                transaction.sourceType
                            ].some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(normalizedSearch)))
                            .sort((first, second) => compareDates(
                                first.dueDate || first.date,
                                second.dueDate || second.date
                            ));

                        const filteredBillingRecords = billingRecords
                            .filter(record => record.revenueUnit !== 'laboratory')
                            .filter(record => matchesPeriod(record.consultationDate))
                            .filter(record => xmlProfessionalId === 'all'
                                || (xmlProfessionalId === 'unassigned'
                                    ? !record.professionalId && !record.professionalName?.trim()
                                    : record.professionalId === xmlProfessionalId))
                            .filter(record => !normalizedSearch || [
                                record.patientName,
                                record.professionalName,
                                record.serviceName
                            ].some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(normalizedSearch)))
                            .sort((first, second) => compareDates(first.consultationDate, second.consultationDate));

                        // Apply grouping logic
                        if (isGrouped) {
                            const groups: { [key: string]: any } = {};
                            filteredTransactions.forEach(t => {
                                const key = t.description;
                                if (!groups[key]) {
                                    groups[key] = {
                                        ...t,
                                        id: `group-${key}`,
                                        amount: 0,
                                        isGroup: true,
                                        count: 0
                                    };
                                }
                                groups[key].amount += t.amount;
                                groups[key].count++;
                            });
                            filteredTransactions = Object.values(groups).sort((a, b) => compareDates(
                                a.dueDate || a.date,
                                b.dueDate || b.date
                            ));
                        }

                        if (activeTab === 'billing') {
                            return (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-4">
                                        <p className="text-sm text-blue-800">
                                            Estes são os registros automáticos gerados a partir de consultas e atendimentos. 
                                            <strong> Exclua registros aqui se desejar remover valores incorretos do Dashboard Geral.</strong>
                                        </p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-200">
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Data</th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Paciente</th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Profissional</th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-right">Valor Bruto</th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-center">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredBillingRecords.map((b) => (
                                                    <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                        <td className="py-3 px-4 text-sm text-slate-600">{b.consultationDate}</td>
                                                        <td className="py-3 px-4 text-sm text-slate-800 font-medium">{b.patientName}</td>
                                                        <td className="py-3 px-4 text-sm text-slate-600">{b.professionalName}</td>
                                                        <td className="py-3 px-4 text-sm font-bold text-right text-green-600">{formatMoney(b.grossAmount)}</td>
                                                        <td className="py-3 px-4 text-center">
                                                            <button
                                                                onClick={() => handleDeleteBilling(b.id!)}
                                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                                                title="Excluir do faturamento"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredBillingRecords.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="py-12 text-center text-slate-500">Nenhum registro de faturamento encontrado.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="border-t border-slate-200 pt-4">
                                        <h3 className="mb-2 text-sm font-bold text-slate-800">Lançamentos clínicos importados</h3>
                                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                                            <table className="w-full min-w-[760px] border-collapse text-left">
                                                <thead className="bg-slate-50"><tr className="border-b border-slate-200">
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Data</th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Descrição</th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Categoria</th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-right">Valor</th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-center">Ações</th>
                                                </tr></thead>
                                                <tbody>
                                                    {filteredTransactions.map(transaction => (
                                                        <tr key={transaction.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                            <td className="py-3 px-4 text-sm text-slate-600">{transaction.date}</td>
                                                            <td className="py-3 px-4 text-sm font-medium text-slate-800">{transaction.description}</td>
                                                            <td className="py-3 px-4 text-sm text-slate-500">{transaction.category}</td>
                                                            <td className="py-3 px-4 text-right text-sm font-bold text-emerald-700">{formatMoney(transaction.amount)}</td>
                                                            <td className="py-3 px-4 text-center"><button onClick={() => handleDelete(transaction.id)} className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600" title="Excluir lançamento importado"><Trash2 className="h-4 w-4" /></button></td>
                                                        </tr>
                                                    ))}
                                                    {filteredTransactions.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-500">Nenhum lançamento clínico importado encontrado.</td></tr>}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        if (activeTab === 'receivable') {
                            const allVisibleSelected = filteredTransactions.length > 0 &&
                                filteredTransactions.every(transaction => selectedIds.includes(transaction.id));
                            return (
                                <div className="space-y-4">
                                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg mb-4">
                                        <p className="text-sm text-emerald-800">
                                            Estas contas a receber sao geradas automaticamente pelo atendimento, faturamento e portal do profissional.
                                        </p>
                                    </div>
                                    {selectedIds.length > 0 && (
                                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                                            <span className="text-sm font-medium text-blue-800">
                                                {selectedIds.length} {selectedIds.length === 1 ? 'lançamento selecionado' : 'lançamentos selecionados'}
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    disabled={isBulkLinkingClients}
                                                    onClick={() => void handleBulkClientLink()}
                                                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                                                >
                                                    {isBulkLinkingClients ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                                                    {isBulkLinkingClients ? 'Vinculando...' : 'Vincular todos os clientes'}
                                                </button>
                                                <button
                                                    disabled={isBulkLinkingClients}
                                                    onClick={handleBulkDelete}
                                                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Excluir selecionados
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-3 md:hidden">
                                        {filteredTransactions.map(transaction => <article key={transaction.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${selectedIds.includes(transaction.id) ? 'border-brand-300 ring-2 ring-brand-100' : 'border-slate-200'}`}>
                                            <div className="flex items-start gap-3"><input type="checkbox" checked={selectedIds.includes(transaction.id)} onChange={() => toggleSelect(transaction.id)} className="mt-1 h-5 w-5 shrink-0 rounded text-brand-600" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="font-black text-slate-900">{transaction.description}</p><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${transaction.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{transaction.status === 'paid' ? 'Recebido' : 'Pendente'}</span></div><p className="mt-1 text-xs text-slate-500">Vence em {transaction.dueDate || transaction.date}</p><p className="mt-3 text-2xl font-black text-emerald-700">{formatMoney(transaction.amount)}</p><p className="mt-1 text-xs text-slate-500">{transaction.clientName || 'Cliente não vinculado'} · {transaction.professionalName || 'Responsável não informado'}</p></div></div>
                                            <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => void openClientLink(transaction)} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-black text-blue-700">{transaction.clientId ? 'Alterar cliente' : 'Vincular cliente'}</button>{transaction.status === 'pending' ? <button onClick={() => handleMarkAsReceived(transaction.id)} className="rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white">Receber</button> : !transaction.sourceFiscalDocumentId ? <button onClick={() => prepareNfseFromTransaction(transaction)} className="rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white">Preparar NFS-e</button> : <span className="rounded-xl bg-violet-50 px-3 py-2.5 text-center text-xs font-black text-violet-700">Nota vinculada</span>}<button onClick={() => handleEdit(transaction)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Editar</button>{transaction.status === 'paid' ? <button onClick={() => void reverseSettlement(transaction)} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">Estornar</button> : <button onClick={() => handleDelete(transaction.id)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Excluir</button>}</div>
                                        </article>)}
                                        {filteredTransactions.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">Nenhuma conta a receber encontrada.</div>}
                                    </div>
                                    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                                        <table className="w-full min-w-[1080px] border-collapse text-left">
                                            <thead className="bg-slate-50">
                                                <tr className="border-b border-slate-200">
                                                    <th className="w-10 py-3 px-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={allVisibleSelected}
                                                            onChange={() => toggleSelectAll(filteredTransactions)}
                                                            aria-label="Selecionar todas as contas visíveis"
                                                            className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                                                        />
                                                    </th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Vencimento</th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Descricao</th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Origem</th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-right">Valor</th>
                                                    <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-center">Acoes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredTransactions.map((transaction) => (
                                                    <tr key={transaction.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedIds.includes(transaction.id) ? 'bg-brand-50/50' : ''}`}>
                                                        <td className="py-3 px-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.includes(transaction.id)}
                                                                onChange={() => toggleSelect(transaction.id)}
                                                                aria-label={`Selecionar ${transaction.description}`}
                                                                className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-slate-600">
                                                            {transaction.dueDate || transaction.date}
                                                            {transaction.sourceType === 'fiscal_import' && transaction.fiscalIssuedAt && transaction.fiscalIssuedAt !== transaction.date && (
                                                                <span className="mt-0.5 block text-[10px] text-slate-400">Emissão: {transaction.fiscalIssuedAt}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-slate-800 font-medium">
                                                            {transaction.description}
                                                            <span className="mt-0.5 block text-xs font-normal text-slate-500">Responsável: {transaction.professionalName || 'não informado'}</span>
                                                            <span className="mt-0.5 block text-xs font-normal text-slate-500">Cliente: {transaction.clientName || 'não vinculado'}</span>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-slate-500">{transaction.sourceType || 'manual'}</td>
                                                        <td className="py-3 px-4 text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${transaction.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {transaction.status === 'paid' ? 'Recebido' : 'Pendente'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-right font-bold text-emerald-700">{formatMoney(transaction.amount)}</td>
                                                        <td className="py-3 px-4 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => void openClientLink(transaction)}
                                                                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${transaction.clientId ? 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                                                                    title={transaction.clientId ? 'Alterar cliente vinculado' : 'Vincular a um cliente'}
                                                                >
                                                                    <Users className="h-3.5 w-3.5" />
                                                                    {transaction.clientId ? 'Cliente vinculado' : 'Vincular cliente'}
                                                                </button>
                                                                {transaction.status === 'pending' ? (
                                                                    <button
                                                                        disabled={updatingStatusId === transaction.id}
                                                                        onClick={() => handleMarkAsReceived(transaction.id)}
                                                                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-50"
                                                                    >
                                                                        {updatingStatusId === transaction.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                                                        {updatingStatusId === transaction.id ? 'Salvando...' : 'Marcar como recebido'}
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        <span className="text-xs text-slate-400">{transaction.receivedAt || 'Baixado'}</span>
                                                                        {!transaction.sourceFiscalDocumentId && <button onClick={() => prepareNfseFromTransaction(transaction)} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"><FileText className="h-3.5 w-3.5" /> NFS-e</button>}
                                                                        {transaction.sourceFiscalDocumentId && <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700"><FileText className="h-3 w-3" /> Nota vinculada</span>}
                                                                        <button onClick={() => void reverseSettlement(transaction)} disabled={updatingStatusId === transaction.id} className="rounded-lg px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50">Estornar</button>
                                                                    </>
                                                                )}
                                                                <button
                                                                    onClick={(event) => { event.stopPropagation(); handleEdit(transaction); }}
                                                                    className="rounded p-1.5 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                                                                    title="Editar data do lançamento"
                                                                    aria-label={`Editar ${transaction.description}`}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(transaction.id)}
                                                                    className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                                                    title="Excluir lançamento financeiro"
                                                                    aria-label={`Excluir ${transaction.description}`}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredTransactions.length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="py-14 text-center">
                                                            <div className="mx-auto flex max-w-sm flex-col items-center">
                                                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                                                                    <DollarSign className="h-6 w-6 text-emerald-600" />
                                                                </div>
                                                                <strong className="text-sm text-slate-800">Nenhuma conta a receber encontrada</strong>
                                                                <span className="mt-1 text-xs text-slate-500">Revise os filtros ou registre um novo lançamento.</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            isLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
                                        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                                    </div>
                                    <strong className="text-sm text-slate-800">Carregando dados financeiros</strong>
                                    <span className="mt-1 text-xs text-slate-500">Aguarde enquanto organizamos seus lançamentos.</span>
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FileSpreadsheet className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhum lançamento manual</h3>
                                    <p className="text-slate-500 mb-2">Sua lista de lançamentos manuais está vazia.</p>
                                    
                                    {billingRecords.length > 0 && (
                                        <div className="bg-blue-50 text-blue-700 p-3 rounded-lg inline-block text-sm border border-blue-100 mb-6">
                                            <strong>Nota:</strong> Existem {billingRecords.length} registros no <strong>Faturamento Clínico</strong>.
                                            <button 
                                                onClick={() => setActiveTab('billing')}
                                                className="ml-2 underline font-bold hover:text-blue-900"
                                            >
                                                Ver faturamento automático
                                            </button>
                                        </div>
                                    )}

                                    <div className="block">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-brand-600 font-medium hover:underline"
                                        >
                                            {billingRecords.length > 0 ? 'Ou importe uma planilha agora' : 'Importar planilha agora'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                <div className="space-y-3 md:hidden">
                                    {selectedIds.length > 0 && <div className="flex items-center justify-between rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700"><span>{selectedIds.length} selecionado(s)</span><button onClick={handleBulkDelete} className="rounded-lg bg-red-600 px-3 py-2 text-white">Excluir</button></div>}
                                    {filteredTransactions.map((t: any) => <article key={t.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${selectedIds.includes(t.id) ? 'border-brand-300 ring-2 ring-brand-100' : 'border-slate-200'}`}>
                                        <div className="flex items-start gap-3">{!isGrouped && <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelect(t.id)} className="mt-1 h-5 w-5 shrink-0 rounded text-brand-600" />}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="font-black text-slate-900">{t.description}</p>{!isGrouped && <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${t.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{t.status === 'paid' ? (t.type === 'income' ? 'Recebido' : 'Pago') : 'Pendente'}</span>}</div><p className="mt-1 text-xs text-slate-500">{isGrouped ? `${t.count} lançamentos` : t.date} · {t.category}</p><p className={`mt-3 text-2xl font-black ${t.type === 'income' ? 'text-emerald-700' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}</p>{t.bankAccountName && <p className="mt-1 text-xs text-slate-500">Conta: {t.bankAccountName}</p>}</div></div>
                                        {!isGrouped && !isAccountantView && <div className="mt-4 grid grid-cols-2 gap-2">{t.status === 'pending' ? <button onClick={() => handleMarkAsReceived(t.id)} className="rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white">{t.type === 'expense' ? 'Pagar' : 'Receber'}</button> : t.type === 'income' && !t.sourceFiscalDocumentId ? <button onClick={() => prepareNfseFromTransaction(t)} className="rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white">Preparar NFS-e</button> : <button onClick={() => void reverseSettlement(t)} className="rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-black text-amber-700">Estornar baixa</button>}<button onClick={() => handleEdit(t)} className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-700">Editar</button></div>}
                                    </article>)}
                                    {filteredTransactions.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">Nenhum lançamento corresponde aos filtros.</div>}
                                </div>
                                <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                                    {selectedIds.length > 0 && (
                                        <div className="mb-4 flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl animate-fade-in">
                                            <span className="text-sm font-medium text-red-700">
                                                {selectedIds.length} {(selectedIds.length === 1) ? 'lançamento selecionado' : 'lançamentos selecionados'}
                                            </span>
                                            <button
                                                onClick={handleBulkDelete}
                                                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm text-sm font-bold"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Excluir Selecionados
                                            </button>
                                        </div>
                                    )}

                                    <table className="w-full min-w-[920px] border-collapse text-left">
                                        <thead className="bg-slate-50">
                                            <tr className="border-b border-slate-200">
                                                {!isGrouped && (
                                                    <th className="py-3 px-4 w-10">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.length > 0 && selectedIds.length === filteredTransactions.length}
                                                            onChange={() => toggleSelectAll(filteredTransactions)}
                                                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                                                        />
                                                    </th>
                                                )}
                                                <th className="py-3 px-4 text-sm font-semibold text-slate-600">
                                                    {isGrouped ? 'Lançamentos' : 'Data'}
                                                </th>
                                                <th className="py-3 px-4 text-sm font-semibold text-slate-600">Descrição</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-slate-600">Categoria</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-right">Valor Total</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTransactions.map((t: any) => (
                                                <tr key={t.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedIds.includes(t.id) ? 'bg-brand-50/50' : ''}`}>
                                                    {!isGrouped && (
                                                        <td className="py-3 px-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.includes(t.id)}
                                                                onChange={() => toggleSelect(t.id)}
                                                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="py-3 px-4 text-sm text-slate-600">
                                                        {isGrouped ? (
                                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold border border-blue-100">
                                                                {t.count}x
                                                            </span>
                                                        ) : (
                                                            <div>
                                                                <div>{t.date}</div>
                                                                {t.competence && (
                                                                    <div className="mt-0.5 text-[10px] font-medium text-brand-700">Competência: {t.competence}</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-slate-800 font-medium">{t.description}</td>
                                                    <td className="py-3 px-4 text-sm text-slate-500">
                                                        <span className="bg-slate-100 px-2 py-1 rounded text-xs">{t.category}</span>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm">
                                                        {isGrouped ? (
                                                            <span className="text-slate-400 text-xs">-</span>
                                                        ) : t.status === 'paid' ? (
                                                            <span className="flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full w-fit">
                                                                <CheckCircle className="w-3 h-3" /> Pago
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-orange-600 text-xs font-medium bg-orange-50 px-2 py-1 rounded-full w-fit">
                                                                <Calendar className="w-3 h-3" /> Pendente
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className={`py-3 px-4 text-sm font-bold text-right ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {!isGrouped && !isAccountantView && (
                                                            <div className="flex items-center justify-center gap-2">
                                                                {t.status === 'pending' && (
                                                                    <button
                                                                        disabled={updatingStatusId === t.id}
                                                                        onClick={(e) => { e.stopPropagation(); handleMarkAsReceived(t.id); }}
                                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-50"
                                                                        title={t.type === 'expense' ? 'Marcar como pago' : 'Marcar como recebido'}
                                                                    >
                                                                        {updatingStatusId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                                                        {updatingStatusId === t.id ? 'Salvando...' : t.type === 'expense' ? 'Marcar como pago' : 'Marcar como recebido'}
                                                                    </button>
                                                                )}
                                                                {t.type === 'income' && t.status === 'paid' && !t.sourceFiscalDocumentId && (
                                                                    <button onClick={(e) => { e.stopPropagation(); prepareNfseFromTransaction(t); }} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"><FileText className="h-3.5 w-3.5" /> NFS-e</button>
                                                                )}
                                                                {t.status === 'paid' && <button onClick={(e) => { e.stopPropagation(); void reverseSettlement(t); }} disabled={updatingStatusId === t.id} className="rounded-lg px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50">Estornar</button>}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleEdit(t); }}
                                                                    className="text-slate-400 hover:text-brand-600 transition-colors"
                                                                    title="Editar"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                                    title="Excluir"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        {isGrouped && (
                                                            <span className="text-slate-300 text-xs">Total Agrupado</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredTransactions.length === 0 && (
                                                <tr>
                                                    <td colSpan={isGrouped ? 6 : 7} className="py-14 text-center">
                                                        <div className="mx-auto flex max-w-sm flex-col items-center">
                                                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                                                <Search className="h-6 w-6 text-slate-400" />
                                                            </div>
                                                            <strong className="text-sm text-slate-800">Nenhum lançamento corresponde aos filtros</strong>
                                                            <span className="mt-1 text-xs text-slate-500">Altere a busca, o período ou a categoria para visualizar outros resultados.</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                </>
                            )
                        );
                    })()}
                </div>
            </div>


            {/* Modal Novo Lançamento */}
            {settlementTarget && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div><h3 className="text-xl font-black text-slate-950">{settlementTarget.type === 'expense' ? 'Registrar pagamento' : 'Registrar recebimento'}</h3><p className="mt-1 text-sm text-slate-500">{settlementTarget.description} · {formatMoney(settlementTarget.amount)}</p></div>
                            <button onClick={() => setSettlementTarget(null)} disabled={!!updatingStatusId} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-40"><X size={19} /></button>
                        </div>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <label><span className="mb-1 block text-xs font-bold text-slate-600">DATA DA BAIXA</span><input type="date" value={settlementForm.date} onChange={e => setSettlementForm(current => ({...current, date: e.target.value}))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" /></label>
                            <label><span className="mb-1 block text-xs font-bold text-slate-600">FORMA DE PAGAMENTO</span><select value={settlementForm.paymentMethod} onChange={e => setSettlementForm(current => ({...current, paymentMethod: e.target.value as NonNullable<Transaction['paymentMethod']>}))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"><option value="pix">Pix</option><option value="cash">Dinheiro</option><option value="credit_card">Cartão de crédito</option><option value="debit_card">Cartão de débito</option><option value="bank_transfer">Transferência bancária</option><option value="boleto">Boleto</option><option value="other">Outro</option></select></label>
                            <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-600">CONTA BANCÁRIA</span><select value={settlementForm.bankAccountId} onChange={e => setSettlementForm(current => ({...current, bankAccountId: e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"><option value="">Não informar conta</option>{bankAccounts.map(account => <option key={account.id} value={account.id}>{account.name} — {account.bank}</option>)}</select>{bankAccounts.length === 0 && <p className="mt-1 text-xs text-slate-500">Cadastre contas em Financeiro → Bancos para selecioná-las nas baixas.</p>}</label>
                            <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-600">OBSERVAÇÃO (OPCIONAL)</span><textarea value={settlementForm.notes} onChange={e => setSettlementForm(current => ({...current, notes: e.target.value.slice(0, 300)}))} rows={3} placeholder="Ex.: comprovante conferido, pagamento parcial acordado..." className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" /></label>
                        </div>
                        <div className="mt-5 flex justify-end gap-3"><button onClick={() => setSettlementTarget(null)} disabled={!!updatingStatusId} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancelar</button><button onClick={() => void confirmSettlement()} disabled={!!updatingStatusId || !settlementForm.date} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">{updatingStatusId ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />} Confirmar baixa</button></div>
                    </div>
                </div>
            )}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto animate-fade-in">
                            <div className="bg-slate-50 p-4 border-b border-gray-200 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    {newTransaction.id ? <Pencil className="w-5 h-5 text-brand-600" /> : <Plus className="w-5 h-5 text-brand-600" />}
                                    {newTransaction.id ? 'Editar Lançamento' : 'Novo Lançamento'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setNewTransaction({ ...newTransaction, type: 'income' })}
                                            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${newTransaction.type === 'income'
                                                ? 'bg-green-50 border-green-200 text-green-700'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            Receita
                                        </button>
                                        <button
                                            onClick={() => setNewTransaction({ ...newTransaction, type: 'expense' })}
                                            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${newTransaction.type === 'expense'
                                                ? 'bg-red-50 border-red-200 text-red-700'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            Despesa
                                        </button>
                                    </div>
                                </div>

                                {newTransaction.type === 'income' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Unidade de faturamento</label>
                                        <select
                                            value={newTransaction.revenueUnit || 'clinical'}
                                            onChange={e => setNewTransaction({
                                                ...newTransaction,
                                                revenueUnit: e.target.value as 'clinical' | 'laboratory',
                                                resultCenter: e.target.value === 'laboratory' ? 'Laboratório' : 'Receita Assistencial'
                                            })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                                        >
                                            <option value="clinical">Clínico</option>
                                            <option value="laboratory">Laboratório</option>
                                        </select>
                                        <p className="mt-1 text-xs text-slate-500">Define em qual faturamento e card do dashboard esta receita será contabilizada.</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                                    <input
                                        type="text"
                                        value={newTransaction.description || ''}
                                        onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                        placeholder="Ex: Aluguel, Venda de Serviço..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                                        <input
                                            type="number"
                                            value={newTransaction.amount || ''}
                                            onChange={e => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                            placeholder="0,00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">{newTransaction.sourceType === 'fiscal_import' ? 'Data do lançamento / competência' : 'Data'}</label>
                                        <input
                                            type="date"
                                            value={newTransaction.date}
                                            onChange={e => setNewTransaction({ ...newTransaction, date: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                        />
                                        {newTransaction.sourceType === 'fiscal_import' && (
                                            <p className="mt-1 text-xs text-slate-500">Emissão original do XML: {newTransaction.fiscalIssuedAt || newTransaction.date}. Esta alteração define o período dos relatórios e do rateio.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                                        {isAddingCategory ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newCategoryName}
                                                    onChange={e => setNewCategoryName(e.target.value)}
                                                    onKeyPress={e => e.key === 'Enter' && handleAddCustomCategory()}
                                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                                    placeholder="Nome da nova categoria"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleAddCustomCategory}
                                                    className="px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                                                >
                                                    <Save className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                                                    className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <select
                                                    value={newTransaction.category}
                                                    onChange={e => {
                                                        if (e.target.value === '__add_new__') {
                                                            setIsAddingCategory(true);
                                                        } else {
                                                            setNewTransaction({ ...newTransaction, category: e.target.value });
                                                        }
                                                    }}
                                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                                                >
                                                    {newTransaction.type === 'expense' ? (
                                                        <>
                                                            <optgroup label="Contas a Pagar (Despesas)">
                                                                <option value="Fornecedores">Fornecedores</option>
                                                                <option value="Água">Água</option>
                                                                <option value="Energia Elétrica">Energia Elétrica</option>
                                                                <option value="Telefone/Internet">Telefone/Internet</option>
                                                                <option value="Aluguel">Aluguel</option>
                                                                <option value="Salários e Encargos">Salários e Encargos</option>
                                                                <option value="Impostos e Tributos">Impostos e Tributos</option>
                                                                <option value="Serviços de Terceiros">Serviços de Terceiros</option>
                                                                <option value="Empréstimos e Financiamentos">Empréstimos e Financiamentos</option>
                                                                <option value="Marketing e Publicidade">Marketing e Publicidade</option>
                                                                <option value="Manutenção">Manutenção</option>
                                                                <option value="Licenças de Software">Licenças de Software</option>
                                                                <option value="Outros">Outros</option>
                                                            </optgroup>
                                                            {customExpenseCategories.length > 0 && (
                                                                <optgroup label="Categorias Personalizadas">
                                                                    {customExpenseCategories.map(cat => (
                                                                        <option key={cat} value={cat}>{cat}</option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <optgroup label="Contas a Receber (Receitas)">
                                                                <option value="Vendas à Vista">Vendas à Vista</option>
                                                                <option value="Vendas a Prazo">Vendas a Prazo</option>
                                                                <option value="Cartões de Crédito/Débito">Cartões de Crédito/Débito</option>
                                                                <option value="Cheques Pré-Datados">Cheques Pré-Datados</option>
                                                                <option value="Juros Recebidos">Juros Recebidos</option>
                                                                <option value="Aluguéis a Receber">Aluguéis a Receber</option>
                                                                <option value="Comissões a Receber">Comissões a Receber</option>
                                                                <option value="Serviços Prestados">Serviços Prestados</option>
                                                                <option value="Outros">Outros</option>
                                                            </optgroup>
                                                            {customIncomeCategories.length > 0 && (
                                                                <optgroup label="Categorias Personalizadas">
                                                                    {customIncomeCategories.map(cat => (
                                                                        <option key={cat} value={cat}>{cat}</option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                        </>
                                                    )}
                                                    <option value="__add_new__" className="text-brand-600 font-medium">+ Criar Nova Categoria</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                        <select
                                            value={newTransaction.status}
                                            onChange={e => setNewTransaction({ ...newTransaction, status: e.target.value as any })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                                        >
                                            <option value="paid">Pago / Recebido</option>
                                            <option value="pending">Pendente</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Forma de pagamento</label>
                                    <select
                                        value={newTransaction.paymentMethod || 'pix'}
                                        onChange={e => setNewTransaction({
                                            ...newTransaction,
                                            paymentMethod: e.target.value as Transaction['paymentMethod']
                                        })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                                    >
                                        <option value="pix">Pix</option>
                                        <option value="cash">Dinheiro</option>
                                        <option value="credit_card">Cartão de crédito</option>
                                        <option value="debit_card">Cartão de débito</option>
                                        <option value="bank_transfer">Transferência bancária</option>
                                        <option value="boleto">Boleto</option>
                                        <option value="other">Outro</option>
                                    </select>
                                </div>

                                {newTransaction.type === 'expense' && /imposto|tributo|simples|\bdas\b/i.test(`${newTransaction.category || ''} ${newTransaction.description || ''}`) && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Competência do imposto</label>
                                        <input
                                            type="month"
                                            value={newTransaction.competence || ''}
                                            onChange={e => setNewTransaction({ ...newTransaction, competence: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                        />
                                        <p className="mt-1 text-xs text-slate-500">Informe o mês apurado no PGDAS. A data acima continua sendo a data de vencimento ou pagamento.</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Centro de custo</label>
                                        <select
                                            value={newTransaction.costCenter || ''}
                                            onChange={e => setNewTransaction({ ...newTransaction, costCenter: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                                        >
                                            <option value="Administrativo">Administrativo</option>
                                            <option value="Assistencial">Assistencial</option>
                                            <option value="Comercial">Comercial</option>
                                            <option value="Financeiro">Financeiro</option>
                                            <option value="Fiscal">Fiscal</option>
                                            <option value="Tecnologia">Tecnologia</option>
                                            <option value="Unidade Matriz">Unidade Matriz</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Centro de resultado</label>
                                        <select
                                            value={newTransaction.resultCenter || ''}
                                            onChange={e => setNewTransaction({ ...newTransaction, resultCenter: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                                        >
                                            <option value="Operação">Operação</option>
                                            <option value="Receita Assistencial">Receita Assistencial</option>
                                            <option value="Convênios">Convênios</option>
                                            <option value="Particular">Particular</option>
                                            <option value="Exames">Exames</option>
                                            <option value="Procedimentos">Procedimentos</option>
                                            <option value="Backoffice">Backoffice</option>
                                        </select>
                                    </div>
                                </div>

                                {!newTransaction.id && newTransaction.type === 'expense' && (
                                    <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-3 space-y-3">
                                        <label className="flex items-start gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={repeatMonthly}
                                                onChange={event => setRepeatMonthly(event.target.checked)}
                                                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                            />
                                            <span>
                                                <span className="block text-sm font-semibold text-slate-800">Repetir esta despesa todo mês</span>
                                                <span className="block text-xs text-slate-500">Ideal para aluguel, internet, energia e outros custos fixos.</span>
                                            </span>
                                        </label>
                                        {repeatMonthly && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade de meses</label>
                                                <input
                                                    type="number"
                                                    min={2}
                                                    max={60}
                                                    value={repeatMonths}
                                                    onChange={event => setRepeatMonths(Math.max(2, Math.min(60, Number(event.target.value) || 2)))}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white"
                                                />
                                                <p className="mt-1 text-xs text-slate-500">Serão criadas {repeatMonths} parcelas mensais, contando a data informada.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-50 p-4 flex justify-end gap-2">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveTransaction}
                                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Salvar Lançamento
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {clientLinkTransaction && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
                            <div>
                                <h3 className="flex items-center gap-2 font-bold"><Users className="h-5 w-5 text-teal-400" />Vincular cliente</h3>
                                <p className="mt-1 text-xs text-slate-300">{clientLinkTransaction.description} · {formatMoney(clientLinkTransaction.amount)}</p>
                            </div>
                            <button onClick={() => setClientLinkTransaction(null)} className="rounded p-1 text-slate-300 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-5 p-5">
                            <section>
                                <label className="mb-2 block text-sm font-bold text-slate-700">Cliente já cadastrado</label>
                                <input
                                    value={clientSearch}
                                    onChange={event => { setClientSearch(event.target.value); setSelectedClientId(''); }}
                                    placeholder="Buscar por nome, CPF ou CNPJ"
                                    className="w-full rounded-xl border border-slate-300 p-3"
                                />
                                <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200">
                                    {clients.filter(client => {
                                        const search = clientSearch.toLocaleLowerCase('pt-BR').replace(/\D/g, '') || clientSearch.toLocaleLowerCase('pt-BR');
                                        return !clientSearch || client.name.toLocaleLowerCase('pt-BR').includes(clientSearch.toLocaleLowerCase('pt-BR')) || String(client.taxId || '').includes(search);
                                    }).map(client => (
                                        <button key={client.id} onClick={() => { setSelectedClientId(client.id); setClientSearch(client.name); }} className={`flex w-full items-center justify-between border-b border-slate-100 p-3 text-left text-sm last:border-0 ${selectedClientId === client.id ? 'bg-teal-50 text-teal-900' : 'hover:bg-slate-50'}`}>
                                            <span className="font-semibold">{client.name}</span><span className="text-xs text-slate-500">{client.taxId || 'Sem CPF/CNPJ'}</span>
                                        </button>
                                    ))}
                                    {!clients.length && <p className="p-4 text-center text-sm text-slate-500">Nenhum cliente cadastrado nesta empresa.</p>}
                                </div>
                                <button disabled={isLinkingClient || !selectedClientId} onClick={() => void linkClientToTransaction(false)} className="mt-3 w-full rounded-xl bg-teal-600 px-4 py-3 font-bold text-white disabled:opacity-50">
                                    {isLinkingClient ? 'Vinculando...' : 'Vincular cliente selecionado'}
                                </button>
                            </section>
                            <div className="flex items-center gap-3 text-xs font-bold uppercase text-slate-400"><span className="h-px flex-1 bg-slate-200" />ou cadastre agora<span className="h-px flex-1 bg-slate-200" /></div>
                            <section className="grid gap-3 sm:grid-cols-2">
                                <input value={clientSearch} onChange={event => { setClientSearch(event.target.value); setSelectedClientId(''); }} placeholder="Nome ou razão social" className="rounded-xl border border-slate-300 p-3" />
                                <input value={newClientTaxId} onChange={event => setNewClientTaxId(event.target.value)} placeholder="CPF ou CNPJ" className="rounded-xl border border-slate-300 p-3" />
                                <button disabled={isLinkingClient || !clientSearch.trim()} onClick={() => void linkClientToTransaction(true)} className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-50 sm:col-span-2">
                                    {isLinkingClient ? 'Salvando...' : 'Cadastrar e vincular novo cliente'}
                                </button>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Seleção de Planilhas Excel */}
            {isExcelModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in border border-slate-200">
                        <div className="bg-slate-900 p-4 flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-green-400" />
                                Configurar Importação Excel
                            </h3>
                            <button onClick={() => setIsExcelModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <p className="text-sm text-slate-600">
                                Identificamos {sheetSelection.length} abas nesta planilha. Selecione quais deseja importar e o tipo de lançamento predominante.
                            </p>

                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700">
                                <h4 className="font-bold text-blue-900">Layouts aceitos pela importação</h4>
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <div className="rounded-lg border border-blue-100 bg-white p-3">
                                        <p className="font-semibold text-slate-900">1. Lista de lançamentos</p>
                                        <p className="mt-1 text-xs text-slate-600">A primeira linha deve conter os títulos. Use uma linha por lançamento:</p>
                                        <div className="mt-2 rounded bg-slate-100 px-2 py-1.5 font-mono text-[11px] text-slate-700">Data | Descrição | Categoria | Valor</div>
                                        <p className="mt-2 text-xs text-slate-500">Ex.: 04/08/2026 | Consulta | Serviços | 250,00</p>
                                    </div>
                                    <div className="rounded-lg border border-blue-100 bg-white p-3">
                                        <p className="font-semibold text-slate-900">2. Grade mensal</p>
                                        <p className="mt-1 text-xs text-slate-600">A primeira coluna contém a descrição e as demais usam os nomes dos meses:</p>
                                        <div className="mt-2 rounded bg-slate-100 px-2 py-1.5 font-mono text-[11px] text-slate-700">Descrição | Janeiro | Fevereiro | Março...</div>
                                        <p className="mt-2 text-xs text-slate-500">Cada valor será lançado no primeiro dia do mês do ano atual.</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-blue-800">Formatos permitidos: XLSX ou XLS. Os valores devem ser numéricos e cada aba pode ser marcada como Receita ou Despesa.</p>
                            </div>

                            <div className="space-y-3">
                                {sheetSelection.map((sheet, index) => {
                                    const analysis = excelSheetAnalyses.get(sheet.name);
                                    return (
                                    <div key={sheet.name} className="flex flex-col gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 md:flex-row md:items-center md:justify-between">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={sheet.selected}
                                                onChange={() => {
                                                    const newSelection = [...sheetSelection];
                                                    newSelection[index].selected = !newSelection[index].selected;
                                                    setSheetSelection(newSelection);
                                                }}
                                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                                            />
                                            <div>
                                                <span className="font-medium text-slate-800">{sheet.name}</span>
                                                {analysis && analysis.layout !== 'invalid' ? (
                                                    <div className="mt-1 space-y-1 text-xs">
                                                        <p className="text-green-700">
                                                            {analysis.layoutLabel}: {analysis.rows.length} lançamento(s), total de {formatMoney(analysis.total)}
                                                            {analysis.skippedRows > 0 ? ` · ${analysis.skippedRows} linha(s) ignorada(s)` : ''}
                                                        </p>
                                                        <p className="text-slate-600">
                                                            Pagos: {analysis.paidCount} ({formatMoney(analysis.paidTotal)}) · Pendentes: {analysis.pendingCount} ({formatMoney(analysis.pendingTotal)})
                                                        </p>
                                                        {analysis.suspiciousDates.length > 0 && (
                                                            <p className={analysis.blockingDateCount > 0 ? 'font-medium text-red-600' : 'font-medium text-amber-700'}>
                                                                {analysis.suspiciousDates.length} data(s) não correspondem ao ano da aba.
                                                                {analysis.blockingDateCount > 0 ? ' Corrija as datas muito distantes antes de importar.' : ' Revise antes de confirmar.'}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="mt-1 text-xs font-medium text-red-600">
                                                        {analysis?.error || 'Não foi possível analisar esta aba.'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
                                            <button
                                                onClick={() => {
                                                    const newSelection = [...sheetSelection];
                                                    newSelection[index].type = 'income';
                                                    setSheetSelection(newSelection);
                                                }}
                                                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${sheet.type === 'income' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Receitas
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newSelection = [...sheetSelection];
                                                    newSelection[index].type = 'expense';
                                                    setSheetSelection(newSelection);
                                                }}
                                                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${sheet.type === 'expense' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Despesas
                                            </button>
                                        </div>
                                        {sheet.type === 'income' && (
                                            <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
                                                <button
                                                    onClick={() => {
                                                        const newSelection = [...sheetSelection];
                                                        newSelection[index].revenueUnit = 'clinical';
                                                        setSheetSelection(newSelection);
                                                    }}
                                                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${sheet.revenueUnit === 'clinical' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    Clínico
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const newSelection = [...sheetSelection];
                                                        newSelection[index].revenueUnit = 'laboratory';
                                                        setSheetSelection(newSelection);
                                                    }}
                                                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${sheet.revenueUnit === 'laboratory' ? 'bg-violet-100 text-violet-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    Laboratório
                                                </button>
                                            </div>
                                        )}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-2 text-sm font-medium">
                            <button
                                onClick={() => setIsExcelModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmExcelImport}
                                disabled={!sheetSelection.some(sheet => sheet.selected) || sheetSelection.some(sheet => {
                                    if (!sheet.selected) return false;
                                    const analysis = excelSheetAnalyses.get(sheet.name);
                                    return analysis?.layout === 'invalid' || Boolean(analysis?.blockingDateCount);
                                })}
                                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Confirmar Importação
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialControlView;
