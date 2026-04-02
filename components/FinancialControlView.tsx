import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, Plus, Filter, Download, Trash2, CheckCircle, XCircle, Calendar, DollarSign, TrendingUp, TrendingDown, Save, Loader2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { auth } from '../services/firebase';
import { saveTransactions, getTransactions, SavedTransaction, saveCustomCategories, getCustomCategories } from '../services/userDataService';

// Reusing the interface from service or defining compatible one
interface Transaction extends SavedTransaction { }

export const FinancialControlView: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [activeTab, setActiveTab] = useState<'transactions' | 'payable' | 'receivable' | 'reports'>('transactions');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
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

    // Load data on mount/auth change
    useEffect(() => {
        const loadData = async () => {
            const user = auth.currentUser;
            if (!user) return;

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
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            } finally {
                setIsLoading(false);
                setDataLoaded(true);
            }
        };

        loadData();
    }, []);

    // Helper to save custom categories to Firebase
    const saveCustomCategoriesData = async (type: 'expense' | 'income', categories: string[]) => {
        const user = auth.currentUser;
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            // Basic parsing logic - assumes columns: Date, Description, Category, Amount, Type
            // This is a simplified example. Real-world import needs column mapping.
            const newTransactions: Transaction[] = [];

            // Skip header row
            data.slice(1).forEach((row: any, index) => {
                if (row[0] && row[3]) { // Ensure date and amount exist
                    newTransactions.push({
                        id: `import-${Date.now()}-${index}`,
                        date: row[0], // Assuming date string or excel date
                        description: row[1] || 'Importado',
                        category: row[2] || 'Geral',
                        amount: parseFloat(row[3]),
                        type: row[4] === 'Despesa' ? 'expense' : 'income',
                        status: 'paid' // Default to paid for imported past data
                    });
                }
            });

            setTransactions(prev => [...prev, ...newTransactions]);
            alert(`${newTransactions.length} lançamentos importados com sucesso!`);
        };
        reader.readAsBinaryString(file);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
            setTransactions(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleSaveTransaction = () => {
        if (!newTransaction.description || !newTransaction.amount || !newTransaction.date) {
            alert("Preencha todos os campos obrigatórios!");
            return;
        }

        const transaction: Transaction = {
            id: `manual-${Date.now()}`,
            date: newTransaction.date,
            description: newTransaction.description,
            category: newTransaction.category || 'Geral',
            amount: Number(newTransaction.amount),
            type: newTransaction.type as 'income' | 'expense',
            status: newTransaction.status as 'paid' | 'pending'
        };

        setTransactions(prev => [transaction, ...prev]);
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
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getBalance = () => {
        return transactions.reduce((acc, t) => {
            return t.type === 'income' ? acc + t.amount : acc - t.amount;
        }, 0);
    };

    const getIncome = () => transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const getExpenses = () => transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

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
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Importar Excel
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx, .xls"
                        className="hidden"
                    />
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
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
                <div className="flex border-b border-slate-200">
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
                </div>

                <div className="p-6">
                    {(() => {
                        // Filter transactions based on active tab
                        const filteredTransactions = activeTab === 'receivable'
                            ? transactions.filter(t => t.type === 'income')
                            : activeTab === 'payable'
                                ? transactions.filter(t => t.type === 'expense')
                                : transactions;

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
                                    <h3 className="text-lg font-medium text-slate-800 mb-2">Nenhum lançamento encontrado</h3>
                                    <p className="text-slate-500 mb-6">Comece importando uma planilha ou adicione um lançamento manual.</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-brand-600 font-medium hover:underline"
                                    >
                                        Importar planilha agora
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="py-3 px-4 text-sm font-semibold text-slate-600">Data</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-slate-600">Descrição</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-slate-600">Categoria</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-right">Valor</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-slate-600 text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTransactions.map((t) => (
                                                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="py-3 px-4 text-sm text-slate-600">{t.date}</td>
                                                    <td className="py-3 px-4 text-sm text-slate-800 font-medium">{t.description}</td>
                                                    <td className="py-3 px-4 text-sm text-slate-500">
                                                        <span className="bg-slate-100 px-2 py-1 rounded text-xs">{t.category}</span>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm">
                                                        {t.status === 'paid' ? (
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
                                                        <button
                                                            onClick={() => handleDelete(t.id)}
                                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
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
                                    <Plus className="w-5 h-5 text-brand-600" />
                                    Novo Lançamento
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
        </div >
    );
};

export default FinancialControlView;
