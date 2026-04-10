import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, Plus, Filter, Download, Trash2, CheckCircle, XCircle, Calendar, DollarSign, TrendingUp, TrendingDown, Save, Loader2, X, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';
import { auth } from '../services/firebase';
import { saveTransactions, getTransactions, SavedTransaction, saveCustomCategories, getCustomCategories } from '../services/userDataService';
import { getAllBillingRecords, deleteBillingRecord } from '../services/repasseService';
import { useUser } from '../contexts/UserContext';
import { ConsultationBilling } from '../types/finance';

// Reusing the interface from service or defining compatible one
interface Transaction extends SavedTransaction { }

export const FinancialControlView: React.FC = () => {
    const { user, userProfile, isAdmin: contextIsAdmin, isAdminMaster, loading: userLoading } = useUser();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [billingRecords, setBillingRecords] = useState<ConsultationBilling[]>([]);
    const [activeTab, setActiveTab] = useState<'transactions' | 'payable' | 'receivable' | 'billing'>('transactions');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
        type: 'expense',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        category: 'Geral'
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
    const [xmlClassMode, setXmlClassMode] = useState<'auto' | 'income' | 'expense'>('auto');

    useEffect(() => {
        const loadData = async () => {
            if (userLoading || !user) return;

            setIsLoading(true);
            try {
                // Load Transactions
                const transactionsData = await getTransactions(user.uid);
                if (transactionsData) {
                    setTransactions(transactionsData);
                }

                // Load Custom Categories
                const categoriesData = await getCustomCategories(user.uid);
                if (categoriesData) {
                    setCustomExpenseCategories(categoriesData.expense);
                    setCustomIncomeCategories(categoriesData.income);
                }
                
                // Load Billing Records
                let billingData: ConsultationBilling[] = [];
                
                // Determine managerId for filtering: Only Master Admins see everything
                const managerId = (userProfile?.isClinicManager && !isAdminMaster) ? user.uid : undefined;
                billingData = await getAllBillingRecords(managerId);

                // Fallback: This usually shouldn't be needed if logic above is correct, 
                // but kept for compatibility with existing professional-level access if any
                if (billingData.length === 0 && !isAdminMaster && !userProfile?.isClinicManager) {
                    const fallbackData = await getAllBillingRecords(undefined, user.uid);
                    if (fallbackData.length > 0) {
                        billingData = fallbackData;
                    }
                }

                setBillingRecords(billingData);
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            } finally {
                setIsLoading(false);
                setDataLoaded(true);
            }
        };

        loadData();
    }, [user, userLoading, contextIsAdmin, userProfile]);

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

            await saveCustomCategories(user.uid, {
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

    // Save transactions whenever they change (with debounce)
    useEffect(() => {
        const user = auth.currentUser;
        if (!user || !dataLoaded) return;

        const timeoutId = setTimeout(async () => {
            setIsSaving(true);
            try {
                await saveTransactions(user.uid, transactions);
            } catch (error) {
                console.error("Erro ao salvar transações:", error);
            } finally {
                setIsSaving(false);
            }
        }, 1500);

        return () => clearTimeout(timeoutId);
    }, [transactions]);

    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheetSelection, setSheetSelection] = useState<{ name: string; type: 'income' | 'expense'; selected: boolean }[]>([]);
    const xmlInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            setWorkbook(wb);
            setSheetSelection(wb.SheetNames.map(name => ({ name, type: 'expense', selected: true })));
            setIsExcelModalOpen(true);
        };
        reader.readAsBinaryString(file);
    };

    const MONTHS_PT = [
        "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", 
        "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
    ];

    const confirmExcelImport = () => {
        if (!workbook) return;

        const allNewTransactions: Transaction[] = [];
        const timestamp = Date.now();
        const currentYear = 2025; // As per the user's file name or standard

        sheetSelection.forEach((config, sheetIdx) => {
            if (!config.selected) return;

            const ws = workbook.Sheets[config.name];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (data.length < 1) return;

            const headerRow = (data[0] as any[]).map(c => String(c || '').toUpperCase());
            
            // Detect if this is a Grid import (Months in columns)
            const isGrid = headerRow.some(cell => MONTHS_PT.includes(cell));

            if (isGrid) {
                // Find column indices for months
                const monthIndices: { [key: number]: number } = {}; // Column Index -> Month (1-12)
                headerRow.forEach((cell, idx) => {
                    const monthIdx = MONTHS_PT.indexOf(cell);
                    if (monthIdx !== -1) {
                        monthIndices[idx] = monthIdx + 1;
                    }
                });

                // Parse Grid Rows
                data.slice(1).forEach((row: any, rowIndex) => {
                    const description = String(row[0] || '').trim();
                    if (!description || description === 'TOTAL') return;

                    Object.keys(monthIndices).forEach(colIdxKey => {
                        const colIdx = Number(colIdxKey);
                        const month = monthIndices[colIdx];
                        const val = row[colIdx];
                        
                        if (val !== undefined && val !== null && !isNaN(parseFloat(String(val)))) {
                            allNewTransactions.push({
                                id: `import-${timestamp}-${sheetIdx}-${rowIndex}-${month}`,
                                date: `${currentYear}-${String(month).padStart(2, '0')}-01`,
                                description: description,
                                category: 'Geral',
                                amount: Math.abs(parseFloat(String(val))),
                                type: config.type,
                                status: 'paid'
                            });
                        }
                    });
                });
            } else {
                // Standard List Parsing
                data.slice(1).forEach((row: any, index) => {
                    if (row[0] && row[3]) {
                        allNewTransactions.push({
                            id: `import-${timestamp}-${sheetIdx}-${index}`,
                            date: typeof row[0] === 'number' ? new Date((row[0] - 25569) * 86400 * 1000).toISOString().split('T')[0] : row[0],
                            description: row[1] || `Importado (${config.name})`,
                            category: row[2] || 'Geral',
                            amount: Math.abs(parseFloat(row[3])),
                            type: config.type,
                            status: 'paid'
                        });
                    }
                });
            }
        });

        if (allNewTransactions.length > 0) {
            setTransactions(prev => [...allNewTransactions, ...prev]);
            alert(`${allNewTransactions.length} lançamentos importados das planilhas selecionadas!`);
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

        const readFile = (file: File): Promise<void> => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (evt) => {
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

                        let detectedType: 'income' | 'expense' = 'expense';

                        if (xmlClassMode === 'income') {
                            detectedType = 'income';
                        } else if (xmlClassMode === 'expense') {
                            detectedType = 'expense';
                        } else {
                            // "auto" mode logic
                            const tpNF = getVal(["tpNF"]);
                            const emitNode = xmlDoc.getElementsByTagName("emit")[0] || xmlDoc.getElementsByTagName("PrestadorServico")[0];
                            const destNode = xmlDoc.getElementsByTagName("dest")[0] || xmlDoc.getElementsByTagName("TomadorServico")[0];
                            
                            const emitCnpj = emitNode?.getElementsByTagName("CNPJ")[0]?.textContent || emitNode?.getElementsByTagName("Cnpj")[0]?.textContent || "";
                            const destCnpj = destNode?.getElementsByTagName("CNPJ")[0]?.textContent || destNode?.getElementsByTagName("Cnpj")[0]?.textContent || "";
                            
                            const myCnpj = userProfile?.cnpj?.replace(/\D/g, '') || "";

                            if (tpNF === "1" || (myCnpj && myCnpj === emitCnpj)) {
                                detectedType = 'income';
                            } else if (tpNF === "0" || (myCnpj && myCnpj === destCnpj)) {
                                detectedType = 'expense';
                            } else {
                                // Default fallback if no match
                                detectedType = 'expense';
                            }
                        }

                        const newTransaction: Transaction = {
                            id: `xml-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            date: dateStr.split('T')[0],
                            description: `NF: ${issuerStr}`,
                            category: detectedType === 'income' ? 'Geral' : 'Impostos e Tributos',
                            amount: Math.abs(parseFloat(valStr.replace(',', '.'))),
                            type: detectedType,
                            status: 'paid'
                        };

                        if (newTransaction.amount > 0) {
                            allNewTransactions.push(newTransaction);
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
                // Prepend so they appear at the top
                setTransactions(prev => [...allNewTransactions, ...prev]);
                alert(`${allNewTransactions.length} notas de um total de ${files.length} importadas com sucesso!`);
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

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
            setTransactions(prev => prev.filter(t => t.id !== id));
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        }
    };

    const handleEdit = (transaction: Transaction) => {
        setNewTransaction({
            ...transaction
        });
        setIsModalOpen(true);
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Tem certeza que deseja excluir os ${selectedIds.length} lançamentos selecionados?`)) {
            setTransactions(prev => prev.filter(t => !selectedIds.includes(t.id)));
            setSelectedIds([]);
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
        if (selectedIds.length === filteredTransactions.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredTransactions.map(t => t.id));
        }
    };

    const handleSaveTransaction = () => {
        if (!newTransaction.description || !newTransaction.amount || !newTransaction.date) {
            alert("Preencha todos os campos obrigatórios!");
            return;
        }

        const transactionData: Transaction = {
            id: newTransaction.id || `manual-${Date.now()}`,
            date: newTransaction.date!,
            description: newTransaction.description!,
            category: newTransaction.category || 'Geral',
            amount: Number(newTransaction.amount),
            type: newTransaction.type as 'income' | 'expense',
            status: newTransaction.status as 'paid' | 'pending'
        };

        if (newTransaction.id) {
            // Update existing
            setTransactions(prev => prev.map(t => t.id === newTransaction.id ? transactionData : t));
        } else {
            // Create new
            setTransactions(prev => [transactionData, ...prev]);
        }
        
        setIsModalOpen(false);
        setNewTransaction({
            type: 'expense',
            status: 'pending',
            date: new Date().toISOString().split('T')[0],
            category: 'Geral',
            description: '',
            amount: 0
        });
    };

    const formatMoney = (value: number) => {
        return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getBalance = () => {
        const transactionBalance = transactions.reduce((acc, t) => {
            return t.type === 'income' ? acc + (t.amount || 0) : acc - (t.amount || 0);
        }, 0);
        const billingBalance = billingRecords.reduce((acc, b) => acc + (b.grossAmount || 0), 0);
        return transactionBalance + billingBalance;
    };

    const getIncome = () => {
        const transactionIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + (t.amount || 0), 0);
        const billingIncome = billingRecords.reduce((acc, b) => acc + (b.grossAmount || 0), 0);
        return transactionIncome + billingIncome;
    };
    
    const getExpenses = () => transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        Controle Financeiro
                        {isSaving && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
                    </h1>
                    <p className="text-slate-600">Gerencie suas contas, fluxo de caixa e importações.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Planilha Excel
                    </button>
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
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
                            className={`flex items-center gap-2 ${isImporting ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'} text-white px-3 py-1.5 rounded transition-colors shadow-sm text-sm ml-1`}
                        >
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {isImporting ? 'Lendo...' : 'Importar XML'}
                        </button>
                    </div>
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
                        accept=".xml"
                        multiple
                        className="hidden"
                    />
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Lançamento
                    </button>
                </div>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span>
                    </div>
                    <h3 className="text-slate-500 text-sm font-medium">Receitas Totais</h3>
                    <p className="text-2xl font-bold text-slate-800">{formatMoney(getIncome())}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <TrendingDown className="w-6 h-6 text-red-600" />
                        </div>
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">+5%</span>
                    </div>
                    <h3 className="text-slate-500 text-sm font-medium">Despesas Totais</h3>
                    <p className="text-2xl font-bold text-slate-800">{formatMoney(getExpenses())}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
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

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('transactions')}
                            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Todos os Lançamentos
                        </button>
                        <button
                            onClick={() => setActiveTab('receivable')}
                            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'receivable' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Contas a Receber
                        </button>
                        <button
                            onClick={() => setActiveTab('payable')}
                            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'payable' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Contas a Pagar
                        </button>
                        <button
                            onClick={() => setActiveTab('billing')}
                            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'billing' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Faturamento Clínico
                        </button>
                    </div>

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

                <div className="p-6">
                    {(() => {
                        // Filter transactions based on active tab
                        let filteredTransactions = activeTab === 'receivable'
                            ? transactions.filter(t => t.type === 'income')
                            : activeTab === 'payable'
                                ? transactions.filter(t => t.type === 'expense')
                                : transactions;

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
                            filteredTransactions = Object.values(groups).sort((a, b) => b.amount - a.amount);
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
                                                {billingRecords.map((b) => (
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
                                                {billingRecords.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="py-12 text-center text-slate-500">Nenhum registro de faturamento encontrado.</td>
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
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
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
                                <div className="overflow-x-auto">
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

                                    <table className="w-full text-left border-collapse">
                                        <thead>
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
                                                        ) : t.date}
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
                                                        {!isGrouped && (
                                                            <div className="flex items-center justify-center gap-2">
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
                                        </tbody>
                                    </table>
                                </div>
                            )
                        );
                    })()}
                </div>
            </div>


            {/* Modal Novo Lançamento */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
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
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                                        <input
                                            type="date"
                                            value={newTransaction.date}
                                            onChange={e => setNewTransaction({ ...newTransaction, date: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                                        />
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

            {/* Modal de Seleção de Planilhas Excel */}
            {isExcelModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in border border-slate-200">
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

                            <div className="space-y-3">
                                {sheetSelection.map((sheet, index) => (
                                    <div key={sheet.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
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
                                            <span className="font-medium text-slate-800">{sheet.name}</span>
                                        </div>

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
                                    </div>
                                ))}
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
                                className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2"
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
