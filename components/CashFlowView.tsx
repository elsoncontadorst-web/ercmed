import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, TrendingUp, TrendingDown, Download, Loader2, BarChart3, FileText, LayoutDashboard, Calculator } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getTransactions, SavedTransaction } from '../services/userDataService';

interface MonthlyData {
    monthIndex: number;
    monthName: string;
    revenue: number;
    expenses: number;
    payroll: number;
    taxes: number;
    balance: number;
    accumulatedBalance: number;
}

export const CashFlowView: React.FC = () => {
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
    const [showForecast, setShowForecast] = useState(false);
    const [activeTab, setActiveTab] = useState<'mensal' | 'dre' | 'graficos'>('mensal');
    
    // Summary States for DRE
    const [dreData, setDreData] = useState({
        grossRevenue: 0,
        taxes: 0,
        netRevenue: 0,
        payroll: 0,
        operatingExpenses: 0,
        totalCosts: 0,
        netProfit: 0,
        profitMargin: 0
    });

    const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const getMonthName = (month: number) => {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return months[month];
    };

    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const transactions = await getTransactions(user.uid);
                
                // Initialize 12 months array
                let currentAccumulated = 0;
                const months: MonthlyData[] = Array.from({ length: 12 }, (_, i) => ({
                    monthIndex: i,
                    monthName: getMonthName(i),
                    revenue: 0,
                    expenses: 0,
                    payroll: 0,
                    taxes: 0,
                    balance: 0,
                    accumulatedBalance: 0
                }));

                // Process Transactions
                transactions.forEach(t => {
                    const date = new Date(t.date);
                    // Ensure we consider UTC to avoid timezone shift pushing it to prev month if midnight
                    const monthIndex = parseInt(t.date.split('-')[1]) - 1; 

                    if (monthIndex >= 0 && monthIndex <= 11) {
                        const amount = Number(t.amount);
                        const categoryStr = String(t.category).toUpperCase();
                        const descStr = String(t.description).toUpperCase();

                        if (t.type === 'income') {
                            months[monthIndex].revenue += amount;
                        } else if (t.type === 'expense') {
                            months[monthIndex].expenses += amount;
                            
                            // Categorize specifically for DRE/Payroll checking both category and description
                            if (categoryStr.includes('FOLHA') || categoryStr.includes('PRÓ-LABORE') || categoryStr.includes('PRO-LABORE') ||
                                descStr.includes('FOLHA') || descStr.includes('PRÓ-LABORE') || descStr.includes('PRO-LABORE')) {
                                months[monthIndex].payroll += amount;
                            } else if (categoryStr.includes('IMPOSTOS') || categoryStr.includes('TRIBUTOS') || categoryStr.includes('TAXA') ||
                                       descStr.includes('IMPOSTO') || descStr.includes('TRIBUTO') || descStr.includes('TAXA') || descStr.includes('GPS') || descStr.includes('DARF')) {
                                months[monthIndex].taxes += amount;
                            }
                        }
                    }
                });

                // Calculate balances and accumulated
                months.forEach(m => {
                    m.balance = m.revenue - m.expenses;
                    currentAccumulated += m.balance;
                    m.accumulatedBalance = currentAccumulated;
                });

                setMonthlyData(months);

                // Calculate DRE Totals
                const grossRev = months.reduce((acc, m) => acc + m.revenue, 0);
                const totalTaxes = months.reduce((acc, m) => acc + m.taxes, 0);
                const netRev = grossRev - totalTaxes;
                
                const totalPayroll = months.reduce((acc, m) => acc + m.payroll, 0);
                const totalExpenses = months.reduce((acc, m) => acc + m.expenses, 0);
                const operatingExp = totalExpenses - totalPayroll - totalTaxes;
                
                const netProfit = netRev - totalPayroll - operatingExp;
                const margin = grossRev > 0 ? (netProfit / grossRev) * 100 : 0;

                setDreData({
                    grossRevenue: grossRev,
                    taxes: totalTaxes,
                    netRevenue: netRev,
                    payroll: totalPayroll,
                    operatingExpenses: operatingExp,
                    totalCosts: totalPayroll + operatingExp,
                    netProfit: netProfit,
                    profitMargin: margin
                });

            } catch (error) {
                console.error("Erro ao carregar transações para Fluxo de Caixa:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [user]);

    // Derived Projected Data
    const getProjectedData = () => {
        if (!showForecast) return monthlyData;

        // Find months with data to calculate averages
        const monthsWithData = monthlyData.filter(m => m.revenue > 0 || m.expenses > 0);
        if (monthsWithData.length === 0) return monthlyData;

        const avgRevenue = monthsWithData.reduce((acc, m) => acc + m.revenue, 0) / monthsWithData.length;
        const avgExpenses = monthsWithData.reduce((acc, m) => acc + m.expenses, 0) / monthsWithData.length;
        const avgPayroll = monthsWithData.reduce((acc, m) => acc + m.payroll, 0) / monthsWithData.length;
        const avgTaxes = monthsWithData.reduce((acc, m) => acc + m.taxes, 0) / monthsWithData.length;

        // Create projected array
        let currentAccumulated = 0;
        return monthlyData.map((m, idx) => {
            // If month is empty (future or no data), project it
            const isFuture = m.revenue === 0 && m.expenses === 0;
            const res = isFuture ? {
                ...m,
                revenue: avgRevenue * 1.05, // +5% Growth projection
                expenses: avgExpenses,
                payroll: avgPayroll,
                taxes: avgTaxes,
                isProjected: true
            } : { ...m, isProjected: false };

            res.balance = res.revenue - res.expenses;
            currentAccumulated += res.balance;
            res.accumulatedBalance = currentAccumulated;
            return res;
        });
    };

    const displayData = getProjectedData();

    // Max value for chart scaling (moved outside loop)
    const maxVal = Math.max(...displayData.map(md => Math.max(md.revenue, md.expenses)), 1);
    const scaleMultiplier = 100 / maxVal;

    const exportToPDF = () => {
        // Simple alert for now, the user can use standard browser print or future jsPDF update
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-brand-600 p-8">
                <Loader2 className="w-12 h-12 animate-spin" />
                <p className="font-medium text-slate-600">Sincronizando com Lançamentos Financeiros e Calculando DRE...</p>
            </div>
        );
    }

    const { grossRevenue, totalCosts, netProfit, profitMargin } = dreData;

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden animate-fade-in print:bg-white">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-6 shadow-sm print:shadow-none">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Calculator className="w-6 h-6 text-brand-600" />
                            Fluxo de Caixa & DRE
                        </h2>
                        <p className="text-sm text-slate-500">
                            Sincronizado automaticamente com o Controle Financeiro. Dados consolidados do ano corrente.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportToPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors text-sm font-bold shadow-sm print:hidden"
                        >
                            <Download className="w-4 h-4" />
                            Imprimir PDF
                        </button>
                        <button
                            onClick={() => setShowForecast(!showForecast)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-bold shadow-sm border print:hidden ${showForecast ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                            <Calculator className="w-4 h-4" />
                            {showForecast ? 'Ocultar Previsão' : 'Simular Previsão'}
                        </button>
                    </div>
                </div>
            </div>

            {/* View Selection Tabs */}
            <div className="max-w-7xl mx-auto w-full px-6 pt-6 print:hidden">
                <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white inline-flex shadow-sm">
                    <button
                        onClick={() => setActiveTab('mensal')}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold transition-colors ${activeTab === 'mensal' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Fluxo Mensal
                    </button>
                    <button
                        onClick={() => setActiveTab('dre')}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold transition-colors border-l border-slate-200 ${activeTab === 'dre' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <FileText className="w-4 h-4" />
                        DRE Analítico
                    </button>
                    <button
                        onClick={() => setActiveTab('graficos')}
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold transition-colors border-l border-slate-200 ${activeTab === 'graficos' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Gráficos Visuais
                    </button>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* --- TAB: FLUXO MENSAL --- */}
                    {activeTab === 'mensal' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-green-100 text-green-700 rounded-lg">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Receita Anual</p>
                                        <p className="text-xl font-black text-slate-800">{formatMoney(grossRevenue)}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                                        <TrendingDown className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Saídas Anuais</p>
                                        <p className="text-xl font-black text-slate-800">{formatMoney(dreData.totalCosts + dreData.taxes)}</p>
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Período</p>
                                        <p className="text-xl font-black text-slate-800">12 Meses</p>
                                    </div>
                                </div>
                                <div className={`p-4 rounded-xl shadow-sm flex items-center gap-4 border ${netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className={`p-3 rounded-lg ${netProfit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        <DollarSign className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className={`text-xs font-bold uppercase ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>Saldo Anual Acumulado</p>
                                        <p className={`text-xl font-black ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatMoney(netProfit)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Main Table */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Mês</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Receitas</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">(-) Despesas Gerais</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">(-) Folha/Impos.</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Saldo do Mês</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Caixa Acumulado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {monthlyData.map((m) => (
                                                <tr key={m.monthIndex} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                                                            <span className="text-sm font-bold text-slate-700">{m.monthName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span className="text-sm font-medium text-green-600">{formatMoney(m.revenue)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span className="text-sm font-medium text-red-600">{formatMoney(m.expenses - m.payroll - m.taxes)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span className="text-sm font-medium text-orange-600">{formatMoney(m.payroll + m.taxes)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right bg-slate-50/50">
                                                        <span className={`text-sm font-bold ${m.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {formatMoney(m.balance)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right bg-slate-50">
                                                        <span className={`text-sm font-black ${m.accumulatedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {formatMoney(m.accumulatedBalance)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-100 border-t border-slate-200">
                                            <tr>
                                                <td className="px-6 py-4 whitespace-nowrap font-black text-slate-800">TOTAIS NO ANO</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-black text-green-700">{formatMoney(grossRevenue)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-black text-red-700">{formatMoney(dreData.operatingExpenses)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-black text-orange-700">{formatMoney(dreData.payroll + dreData.taxes)}</td>
                                                <td className="px-6 py-4 font-black"></td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-black text-brand-700 text-lg">{formatMoney(netProfit)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: DRE --- */}
                    {activeTab === 'dre' && (
                        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                                <div className="text-center mb-8 border-b border-slate-200 pb-6">
                                    <h3 className="text-3xl font-black text-slate-800 font-serif">DRE</h3>
                                    <p className="text-slate-500 mt-1 uppercase tracking-widest text-sm font-bold">Demonstrativo do Resultado do Exercício</p>
                                    <p className="text-slate-400 mt-1 text-xs">Ano consolidado calculado pelas transações do Controle Financeiro</p>
                                </div>

                                <div className="space-y-4 font-mono text-sm">
                                    {/* Receitas */}
                                    <div className="flex justify-between items-center py-2 text-green-700">
                                        <span className="font-bold">1. RECEITA OPERACIONAL BRUTA</span>
                                        <span className="font-black text-lg">{formatMoney(dreData.grossRevenue)}</span>
                                    </div>
                                    <div className="pl-6 flex justify-between items-center py-1 text-slate-600 border-l-2 border-slate-200">
                                        <span>(-) Impostos e Deduções Incidentes</span>
                                        <span className="text-red-500 font-medium">-{formatMoney(dreData.taxes)}</span>
                                    </div>

                                    {/* Receita Líquida */}
                                    <div className="flex justify-between items-center py-3 border-t border-slate-200 mt-2 text-brand-700 bg-brand-50 px-4 -mx-4 rounded">
                                        <span className="font-bold">2. RECEITA OPERACIONAL LÍQUIDA (ROL)</span>
                                        <span className="font-black">{formatMoney(dreData.netRevenue)}</span>
                                    </div>

                                    {/* Custos OPs */}
                                    <div className="flex justify-between items-center py-2 mt-4 text-slate-800">
                                        <span className="font-bold">3. CUSTOS E DESPESAS OPERACIONAIS</span>
                                        <span className="font-black text-red-600">-{formatMoney(dreData.totalCosts)}</span>
                                    </div>
                                    <div className="pl-6 flex justify-between items-center py-1 text-slate-600 border-l-2 border-slate-200">
                                        <span>(-) Despesas com Folha e Pró-labore</span>
                                        <span className="text-red-500 font-medium">-{formatMoney(dreData.payroll)}</span>
                                    </div>
                                    <div className="pl-6 flex justify-between items-center py-1 text-slate-600 border-l-2 border-slate-200">
                                        <span>(-) Despesas com Fornecedores, Gerais, Taxas bancárias</span>
                                        <span className="text-red-500 font-medium">-{formatMoney(dreData.operatingExpenses)}</span>
                                    </div>

                                    {/* Lucro Líquido */}
                                    <div className={`flex justify-between items-center py-4 border-t-2 border-slate-800 mt-6 px-4 -mx-4 rounded-b-xl ${dreData.netProfit >= 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                        <div>
                                            <span className="font-bold text-lg">4. RESULTADO LÍQUIDO DO EXERCÍCIO (LUCRO)</span>
                                        </div>
                                        <span className="font-black text-2xl">{formatMoney(dreData.netProfit)}</span>
                                    </div>
                                    
                                    {/* Margem */}
                                    <div className="text-center pt-8">
                                        <span className="text-slate-500 text-xs uppercase font-bold tracking-widest">Margem de Lucro:</span>
                                        <div className={`text-3xl font-black mt-1 ${dreData.profitMargin >= 20 ? 'text-green-500' : dreData.profitMargin >= 10 ? 'text-yellow-500' : 'text-red-500'}`}>
                                            {dreData.profitMargin.toFixed(1)}%
                                        </div>
                                    </div>

                                    {/* Forecast Note */}
                                    {showForecast && (
                                        <div className="mt-8 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                                            <div className="flex items-center gap-2 text-orange-800 font-bold text-sm mb-1">
                                                <TrendingUp className="w-4 h-4" />
                                                Previsão de Fechamento Anual
                                            </div>
                                            <p className="text-xs text-orange-700 mb-3">Estimativa baseada na média dos meses lançados + 5% de crescimento projetado.</p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] text-orange-600 uppercase font-bold">Receita Total Prevista</p>
                                                    <p className="text-lg font-black text-orange-900">{formatMoney(displayData.reduce((acc, m) => acc + m.revenue, 0))}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-orange-600 uppercase font-bold">Lucro Líquido Esperado</p>
                                                    <p className="text-lg font-black text-orange-900">{formatMoney(displayData.reduce((acc, m) => acc + m.balance, 0))}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: GRÁFICOS --- */}
                    {activeTab === 'graficos' && (
                        <div className="space-y-6 animate-fade-in">
                             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-6">Receitas vs Despesas Formato Anual</h3>
                                
                                {/* CSS Bar Chart Container */}
                                <div className="h-72 w-full flex items-end justify-between gap-2 pb-6 border-b border-slate-200 relative pt-10">
                                    {/* Y-Axis scale lines (approximated background lines) */}
                                    <div className="absolute inset-0 flex flex-col justify-between pb-6 pointer-events-none">
                                        {[4, 3, 2, 1].map(lvl => (
                                            <div key={lvl} className="w-full border-t border-slate-100 flex-1 relative">
                                                <span className="absolute -top-3 -left-2 text-[10px] text-slate-300 font-medium bg-white px-1">Lvl {lvl}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {displayData.map((m) => {
                                        const heightR = Math.min(Math.max((m.revenue * scaleMultiplier), 1), 100);
                                        const heightE = Math.min(Math.max((m.expenses * scaleMultiplier), 1), 100);
                                        const isProj = (m as any).isProjected;

                                        return (
                                            <div key={m.monthIndex} className="flex-1 flex flex-col items-center gap-1 group z-10 h-full relative">
                                                {/* Tooltip on Hover */}
                                                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] p-2 rounded pointer-events-none whitespace-nowrap z-50 shadow-xl">
                                                    <p className="font-bold border-b border-slate-700 mb-1 pb-1">{m.monthName} {isProj ? '(Projeção)' : ''}</p>
                                                    <div className="space-y-0.5">
                                                        <p className="flex justify-between gap-4"><span>Rec:</span> <span className="text-green-400 font-bold">{formatMoney(m.revenue)}</span></p>
                                                        <p className="flex justify-between gap-4"><span>Des:</span> <span className="text-red-400 font-bold">{formatMoney(m.expenses)}</span></p>
                                                        <p className="flex justify-between gap-4 border-t border-slate-700 pt-1 mt-1"><span>Saldo:</span> <span className={m.balance >= 0 ? 'text-green-400' : 'text-red-400'}>{formatMoney(m.balance)}</span></p>
                                                    </div>
                                                </div>

                                                <div className="w-full flex items-end justify-center gap-0.5 h-full relative" style={{ minHeight: '180px' }}>
                                                    <div 
                                                        className={`w-1/2 rounded-t-sm transition-all duration-700 ease-out hover:brightness-110 ${isProj ? 'bg-green-300 border-t-2 border-x-2 border-dashed border-green-500' : 'bg-green-500'}`}
                                                        style={{ height: `${heightR}%`, minHeight: m.revenue > 0 ? '3px' : '0px' }}
                                                    ></div>
                                                    <div 
                                                        className={`w-1/2 rounded-t-sm transition-all duration-700 ease-out hover:brightness-110 ${isProj ? 'bg-red-300 border-t-2 border-x-2 border-dashed border-red-500' : 'bg-red-500'}`}
                                                        style={{ height: `${heightE}%`, minHeight: m.expenses > 0 ? '3px' : '0px' }}
                                                    ></div>
                                                </div>
                                                <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase mt-2 block w-full text-center">{m.monthName.substring(0,3)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-center gap-6 mt-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                                        <span className="text-sm font-bold text-slate-600">Receitas</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                                        <span className="text-sm font-bold text-slate-600">Despesas</span>
                                    </div>
                                    {showForecast && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-slate-200 border border-dashed border-slate-400 rounded-sm"></div>
                                            <span className="text-sm font-bold text-slate-400">Projeção</span>
                                        </div>
                                    )}
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Profit Gauge Apporximation */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">Saúde Financeira (Margem)</h3>
                                    <div className="relative w-48 h-48 mt-4 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                            {/* Background circle */}
                                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-100" />
                                            {/* Foreground circle */}
                                            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" 
                                                className={`${dreData.profitMargin > 30 ? 'text-green-500' : dreData.profitMargin > 10 ? 'text-brand-500' : 'text-red-500'} transition-all duration-1000`}
                                                strokeDasharray={`${Math.min(Math.max(dreData.profitMargin, 0), 100) * 2.51} 251`} 
                                            />
                                        </svg>
                                        <div className="absolute flex flex-col items-center justify-center inset-0">
                                            <span className="text-3xl font-black text-slate-800">{dreData.profitMargin.toFixed(1)}%</span>
                                            <span className="text-xs font-bold text-slate-500">LUCRO</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-4 max-w-[80%] mx-auto">
                                        {dreData.profitMargin > 30 ? 'Excelente! Sua operação é altamente rentável.' : dreData.profitMargin > 10 ? 'Aceitável. A operação gera lucros.' : dreData.profitMargin > 0 ? 'Atenção. Margem de lucro perigosamente baixa.' : 'Crítico! Operação acumulando prejuízos.'}
                                    </p>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">Distribuição de Saídas</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-sm font-bold text-slate-600">Custos Operacionais</span>
                                                <span className="text-sm font-bold text-slate-800">{formatMoney(dreData.operatingExpenses)}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5">
                                                <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: `${dreData.totalCosts > 0 ? (dreData.operatingExpenses / dreData.totalCosts)*100 : 0}%` }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-sm font-bold text-slate-600">Folha de Pagamento / Pró-labore</span>
                                                <span className="text-sm font-bold text-slate-800">{formatMoney(dreData.payroll)}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5">
                                                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${dreData.totalCosts > 0 ? (dreData.payroll / dreData.totalCosts)*100 : 0}%` }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-sm font-bold text-slate-600">Impostos e Tributos</span>
                                                <span className="text-sm font-bold text-slate-800">{formatMoney(dreData.taxes)}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5">
                                                <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${dreData.totalCosts > 0 ? (dreData.taxes / dreData.totalCosts)*100 : 0}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CashFlowView;
