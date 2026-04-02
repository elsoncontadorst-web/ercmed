import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Building2, TrendingUp, AlertCircle, Info, Save } from 'lucide-react';
import { ActivityCategory, MonthlyRecord, SimulationConfig, AnnualResult } from '../types';
import { calculateAnnualTax } from '../services/taxCalculator';

const ComparisonView: React.FC = () => {
    const [activity, setActivity] = useState<ActivityCategory>('SERVICOS_GERAL');
    const [monthlyData, setMonthlyData] = useState<MonthlyRecord[]>(
        Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            revenue: 0,
            expenses: 0,
            payroll: 0
        }))
    );
    const [result, setResult] = useState<AnnualResult | null>(null);
    const [activeTab, setActiveTab] = useState<'input' | 'results'>('input');

    // Helper to update all months with average
    const [averageRevenue, setAverageRevenue] = useState<string>('');
    const [averageExpenses, setAverageExpenses] = useState<string>('');
    const [averagePayroll, setAveragePayroll] = useState<string>('');

    const handleApplyAverage = () => {
        const rev = Number(averageRevenue) || 0;
        const exp = Number(averageExpenses) || 0;
        const pay = Number(averagePayroll) || 0;

        setMonthlyData(prev => prev.map(m => ({
            ...m,
            revenue: rev,
            expenses: exp,
            payroll: pay
        })));
    };

    const handleCalculate = () => {
        const config: SimulationConfig = {
            activity,
            months: monthlyData
        };
        const res = calculateAnnualTax(config);
        setResult(res);
        setActiveTab('results');

        // Save to localStorage for persistence (simple version)
        localStorage.setItem('lancamentosAppContador', JSON.stringify(config));
    };

    const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const updateMonth = (index: number, field: keyof MonthlyRecord, value: number) => {
        setMonthlyData(prev => {
            const newData = [...prev];
            newData[index] = { ...newData[index], [field]: value };
            return newData;
        });
    };

    // Load saved data on mount
    useEffect(() => {
        const saved = localStorage.getItem('lancamentosAppContador');
        if (saved) {
            try {
                const config: SimulationConfig = JSON.parse(saved);
                setActivity(config.activity);
                setMonthlyData(config.months);
                // Auto calculate
                const res = calculateAnnualTax(config);
                setResult(res);
            } catch (e) {
                console.error("Error loading saved simulation", e);
            }
        }
    }, []);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-8 h-8 text-brand-600" />
                        Simulador de Comparação Tributária
                    </h1>
                    <p className="text-slate-500">Compare Simples Nacional, Lucro Presumido e MEI</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('input')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'input' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-gray-50'}`}
                    >
                        Dados Financeiros
                    </button>
                    <button
                        onClick={() => setActiveTab('results')}
                        disabled={!result}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'results' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-gray-50 disabled:opacity-50'}`}
                    >
                        Resultados
                    </button>
                </div>
            </div>

            {activeTab === 'input' && (
                <div className="space-y-6">
                    {/* Activity Selection */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Atividade Principal</label>
                        <select
                            value={activity}
                            onChange={(e) => setActivity(e.target.value as ActivityCategory)}
                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="COMERCIO">Comércio (Anexo I)</option>
                            <option value="INDUSTRIA">Indústria (Anexo II)</option>
                            <option value="SERVICOS_GERAL">Serviços Gerais (Anexo III)</option>
                            <option value="ADVOCACIA">Advocacia / Limpeza / Obras (Anexo IV)</option>
                            <option value="SERVICOS_FATOR_R">Serviços Intelectuais / Saúde / Eng. (Anexo III ou V)</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Selecione a atividade que melhor descreve sua empresa para determinar os anexos corretos.
                        </p>
                    </div>

                    {/* Quick Fill */}
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                        <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Preenchimento Rápido (Média Mensal)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-medium text-blue-700 mb-1">Receita Média</label>
                                <input
                                    type="number"
                                    value={averageRevenue}
                                    onChange={(e) => setAverageRevenue(e.target.value)}
                                    className="w-full p-2 border border-blue-200 rounded-lg"
                                    placeholder="0,00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-blue-700 mb-1">Despesas Média</label>
                                <input
                                    type="number"
                                    value={averageExpenses}
                                    onChange={(e) => setAverageExpenses(e.target.value)}
                                    className="w-full p-2 border border-blue-200 rounded-lg"
                                    placeholder="0,00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-blue-700 mb-1">Folha/Pro-labore Média</label>
                                <input
                                    type="number"
                                    value={averagePayroll}
                                    onChange={(e) => setAveragePayroll(e.target.value)}
                                    className="w-full p-2 border border-blue-200 rounded-lg"
                                    placeholder="0,00"
                                />
                            </div>
                            <button
                                onClick={handleApplyAverage}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                Aplicar a Todos
                            </button>
                        </div>
                    </div>

                    {/* Monthly Grid */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-slate-600 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3">Mês</th>
                                        <th className="px-4 py-3">Receita (R$)</th>
                                        <th className="px-4 py-3">Despesas (R$)</th>
                                        <th className="px-4 py-3">Folha/Pro-labore (R$)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {monthlyData.map((record, idx) => (
                                        <tr key={record.month} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 font-medium text-slate-700">
                                                {new Date(2024, idx, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={record.revenue}
                                                    onChange={(e) => updateMonth(idx, 'revenue', Number(e.target.value))}
                                                    className="w-full p-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-brand-500 outline-none"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={record.expenses}
                                                    onChange={(e) => updateMonth(idx, 'expenses', Number(e.target.value))}
                                                    className="w-full p-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-brand-500 outline-none"
                                                />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={record.payroll}
                                                    onChange={(e) => updateMonth(idx, 'payroll', Number(e.target.value))}
                                                    className="w-full p-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-brand-500 outline-none"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold text-slate-700 border-t border-gray-200">
                                    <tr>
                                        <td className="px-4 py-3">Total Anual</td>
                                        <td className="px-4 py-3">{formatMoney(monthlyData.reduce((acc, curr) => acc + curr.revenue, 0))}</td>
                                        <td className="px-4 py-3">{formatMoney(monthlyData.reduce((acc, curr) => acc + curr.expenses, 0))}</td>
                                        <td className="px-4 py-3">{formatMoney(monthlyData.reduce((acc, curr) => acc + curr.payroll, 0))}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleCalculate}
                            className="px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-bold shadow-lg shadow-brand-500/20 flex items-center gap-2"
                        >
                            <Calculator className="w-5 h-5" />
                            Calcular e Comparar
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'results' && result && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* MEI */}
                        <div className={`p-6 rounded-xl border-2 transition-all ${result.scenarios.mei.isViable ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-75'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-slate-800">MEI</h3>
                                {result.scenarios.mei.isViable ? (
                                    <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full">VIÁVEL</span>
                                ) : (
                                    <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">INVIÁVEL</span>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Imposto Anual:</span>
                                    <span className="font-bold">{formatMoney(result.scenarios.mei.totalTax)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Lucro Líquido:</span>
                                    <span className="font-bold text-green-700">{formatMoney(result.scenarios.mei.netProfit)}</span>
                                </div>
                            </div>
                            {!result.scenarios.mei.isViable && (
                                <div className="mt-4 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                    {result.scenarios.mei.notes[0]}
                                </div>
                            )}
                        </div>

                        {/* Simples Nacional */}
                        <div className={`p-6 rounded-xl border-2 transition-all ${result.scenarios.simples.isViable ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-gray-200 bg-white'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">Simples Nacional</h3>
                                    <p className="text-xs text-slate-500">{result.scenarios.simples.anexo}</p>
                                </div>
                                {result.scenarios.simples.isViable && (
                                    <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full">RECOMENDADO</span>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Imposto Anual:</span>
                                    <span className="font-bold">{formatMoney(result.scenarios.simples.totalTax)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Alíquota Efetiva:</span>
                                    <span className="font-bold">{result.scenarios.simples.effectiveRate.toFixed(2)}%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Lucro Líquido:</span>
                                    <span className="font-bold text-green-700">{formatMoney(result.scenarios.simples.netProfit)}</span>
                                </div>
                            </div>
                            {result.scenarios.simples.notes.length > 0 && (
                                <div className="mt-4 space-y-1">
                                    {result.scenarios.simples.notes.map((note, idx) => (
                                        <p key={idx} className="text-xs text-slate-500 flex items-start gap-1">
                                            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                            {note}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Lucro Presumido */}
                        <div className="p-6 rounded-xl border border-gray-200 bg-white">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-slate-800">Lucro Presumido</h3>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Imposto Anual:</span>
                                    <span className="font-bold">{formatMoney(result.scenarios.presumido.totalTax)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Alíquota Efetiva:</span>
                                    <span className="font-bold">{result.scenarios.presumido.effectiveRate.toFixed(2)}%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Lucro Líquido:</span>
                                    <span className="font-bold text-green-700">{formatMoney(result.scenarios.presumido.netProfit)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Analysis */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-brand-600" />
                            Análise Detalhada
                        </h3>
                        <div className="prose prose-sm max-w-none text-slate-600">
                            <p>
                                Com base nos dados informados, o regime mais vantajoso é o <strong>{
                                    result.scenarios.mei.isViable && result.scenarios.mei.netProfit > result.scenarios.simples.netProfit ? 'MEI' :
                                        result.scenarios.simples.netProfit >= result.scenarios.presumido.netProfit ? 'Simples Nacional' : 'Lucro Presumido'
                                }</strong>.
                            </p>
                            <p className="mt-2">
                                A economia estimada em relação ao próximo melhor cenário é de <strong>{formatMoney(
                                    Math.abs(result.scenarios.simples.totalTax - result.scenarios.presumido.totalTax)
                                )}</strong> ao ano.
                            </p>
                            {result.globalFatorR > 0 && (
                                <p className="mt-2 text-blue-600 bg-blue-50 p-2 rounded">
                                    <strong>Fator R:</strong> Sua folha de pagamento representa {(result.globalFatorR * 100).toFixed(2)}% do faturamento.
                                    {result.globalFatorR >= 0.28 ? ' Isso permite enquadramento no Anexo III (menor alíquota) para atividades intelectuais.' : ' Para atingir 28% e reduzir o imposto, considere aumentar o Pro-labore.'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComparisonView;
