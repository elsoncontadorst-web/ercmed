import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, DollarSign, Calendar, TrendingUp, TrendingDown, AlertCircle, Save, Download, X, Edit2 } from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';
import { MonthlyRecord } from '../types';

interface CashFlowEntry extends MonthlyRecord {
    balance: number;
    accumulatedBalance: number;
}

const CashFlowView: React.FC = () => {
    const { config, updateMonth } = useSimulation();
    const [entries, setEntries] = useState<CashFlowEntry[]>([]);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValues, setEditValues] = useState<MonthlyRecord | null>(null);

    useEffect(() => {
        let accumulated = 0;
        const cashFlowEntries: CashFlowEntry[] = config.months.map((record) => {
            const balance = record.revenue - record.expenses - record.payroll;
            accumulated += balance;
            return {
                ...record,
                balance,
                accumulatedBalance: accumulated
            };
        });
        setEntries(cashFlowEntries);
    }, [config.months]);

    const handleEdit = (index: number) => {
        setEditingIndex(index);
        setEditValues({ ...entries[index] });
    };

    const handleSave = async () => {
        if (editingIndex === null || !editValues) return;

        // Update via context
        await updateMonth(editingIndex, {
            revenue: editValues.revenue,
            expenses: editValues.expenses,
            payroll: editValues.payroll
        });

        setEditingIndex(null);
        setEditValues(null);
    };

    const handleCancel = () => {
        setEditingIndex(null);
        setEditValues(null);
    };

    const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const getMonthName = (month: number) => {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return months[month - 1];
    };

    const exportToPDF = () => {
        // Dynamic import to avoid loading jsPDF unless needed
        import('jspdf').then(({ default: jsPDF }) => {
            const doc = new jsPDF();

            // Title
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Fluxo de Caixa - Relatório Anual', 105, 20, { align: 'center' });

            // Date
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const today = new Date().toLocaleDateString('pt-BR');
            doc.text(`Gerado em: ${today}`, 105, 28, { align: 'center' });

            // Summary Section
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Resumo Anual', 14, 40);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            let yPos = 48;

            doc.text(`Receita Total: ${formatMoney(totalRevenue)}`, 14, yPos);
            yPos += 6;
            doc.text(`Despesas Totais: ${formatMoney(totalExpenses)}`, 14, yPos);
            yPos += 6;
            doc.text(`Folha/Pro-labore Total: ${formatMoney(totalPayroll)}`, 14, yPos);
            yPos += 6;
            doc.setFont('helvetica', 'bold');
            doc.text(`Saldo Acumulado: ${formatMoney(finalBalance)}`, 14, yPos);

            // Monthly Data Table
            yPos += 12;
            doc.setFont('helvetica', 'bold');
            doc.text('Detalhamento Mensal', 14, yPos);

            yPos += 8;

            // Table Header
            doc.setFillColor(240, 240, 240);
            doc.rect(14, yPos - 5, 182, 8, 'F');
            doc.setFontSize(9);
            doc.text('Mês', 16, yPos);
            doc.text('Receita', 50, yPos);
            doc.text('Despesas', 85, yPos);
            doc.text('Folha', 120, yPos);
            doc.text('Saldo', 145, yPos);
            doc.text('Acumulado', 170, yPos);

            yPos += 8;

            // Table Rows
            doc.setFont('helvetica', 'normal');
            entries.forEach((entry, index) => {
                // Check if we need a new page
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                // Alternate row colors
                if (index % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(14, yPos - 5, 182, 7, 'F');
                }

                doc.text(getMonthName(entry.month), 16, yPos);
                doc.text(formatMoney(entry.revenue), 50, yPos);
                doc.text(formatMoney(entry.expenses), 85, yPos);
                doc.text(formatMoney(entry.payroll), 120, yPos);

                // Color code the balance
                if (entry.balance >= 0) {
                    doc.setTextColor(0, 128, 0);
                } else {
                    doc.setTextColor(255, 0, 0);
                }
                doc.text(formatMoney(entry.balance), 145, yPos);

                // Color code the accumulated balance
                if (entry.accumulatedBalance >= 0) {
                    doc.setTextColor(0, 128, 0);
                } else {
                    doc.setTextColor(255, 0, 0);
                }
                doc.text(formatMoney(entry.accumulatedBalance), 170, yPos);

                doc.setTextColor(0, 0, 0); // Reset color
                yPos += 7;
            });

            // Save the PDF
            doc.save(`Fluxo_de_Caixa_${new Date().getFullYear()}.pdf`);
        }).catch(error => {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar PDF. Por favor, tente novamente.');
        });
    };

    const totalRevenue = entries.reduce((sum, e) => sum + e.revenue, 0);
    const totalExpenses = entries.reduce((sum, e) => sum + e.expenses, 0);
    const totalPayroll = entries.reduce((sum, e) => sum + e.payroll, 0);
    const finalBalance = entries.length > 0 ? entries[entries.length - 1].accumulatedBalance : 0;

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-brand-600" />
                            Fluxo de Caixa
                        </h2>
                        <p className="text-sm text-slate-500">Acompanhe a evolução financeira mensal (Sincronizado com Painel Fiscal e Gestão de Faturamento)</p>
                    </div>
                    <button
                        onClick={exportToPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
                    >
                        <Download className="w-4 h-4" />
                        Exportar PDF
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="p-6 bg-gray-50">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Receita Total</p>
                                <p className="text-lg font-bold text-slate-800">{formatMoney(totalRevenue)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-50 rounded-lg">
                                <TrendingDown className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Despesas Totais</p>
                                <p className="text-lg font-bold text-slate-800">{formatMoney(totalExpenses)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <DollarSign className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Folha/Pro-labore</p>
                                <p className="text-lg font-bold text-slate-800">{formatMoney(totalPayroll)}</p>
                            </div>
                        </div>
                    </div>

                    <div className={`bg-white p-4 rounded-xl border-2 shadow-sm ${finalBalance >= 0 ? 'border-green-300' : 'border-red-300'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${finalBalance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                <DollarSign className={`w-5 h-5 ${finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold">Saldo Acumulado</p>
                                <p className={`text-lg font-bold ${finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatMoney(finalBalance)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cash Flow Table */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Mês</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Receita</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Despesas</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Folha</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Saldo</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Acumulado</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {entries.map((entry, index) => (
                                        <tr key={entry.month} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    <span className="text-sm font-medium text-slate-700">{getMonthName(entry.month)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {editingIndex === index ? (
                                                    <input
                                                        type="number"
                                                        value={editValues?.revenue || 0}
                                                        onChange={(e) => setEditValues({ ...editValues!, revenue: parseFloat(e.target.value) || 0 })}
                                                        className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 text-right"
                                                    />
                                                ) : (
                                                    <span className="text-sm font-medium text-green-600">{formatMoney(entry.revenue)}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {editingIndex === index ? (
                                                    <input
                                                        type="number"
                                                        value={editValues?.expenses || 0}
                                                        onChange={(e) => setEditValues({ ...editValues!, expenses: parseFloat(e.target.value) || 0 })}
                                                        className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 text-right"
                                                    />
                                                ) : (
                                                    <span className="text-sm font-medium text-red-600">{formatMoney(entry.expenses)}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                {editingIndex === index ? (
                                                    <input
                                                        type="number"
                                                        value={editValues?.payroll || 0}
                                                        onChange={(e) => setEditValues({ ...editValues!, payroll: parseFloat(e.target.value) || 0 })}
                                                        className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 text-right"
                                                    />
                                                ) : (
                                                    <span className="text-sm font-medium text-blue-600">{formatMoney(entry.payroll)}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className={`text-sm font-bold ${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatMoney(entry.balance)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className={`text-sm font-bold ${entry.accumulatedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatMoney(entry.accumulatedBalance)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {editingIndex === index ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={handleSave}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                            title="Salvar"
                                                        >
                                                            <Save className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={handleCancel}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Cancelar"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEdit(index)}
                                                        className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashFlowView;
