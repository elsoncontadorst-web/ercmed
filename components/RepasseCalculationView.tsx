import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, FileText, Download, Calendar, User, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth } from '../services/firebase';
import { getAllBillingRecords, getAllProfessionals } from '../services/repasseService';
import { ConsultationBilling, Professional } from '../types/finance';
import { useUser } from '../contexts/UserContext';
import jsPDF from 'jspdf';

const RepasseCalculationView: React.FC = () => {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [billings, setBillings] = useState<ConsultationBilling[]>([]);
    const [selectedProfessional, setSelectedProfessional] = useState<string>('');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);
    const [calculation, setCalculation] = useState<any>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const { userProfile, isAdmin: isSystemAdmin } = useUser();

    // Editable fields for manual adjustments
    // Allow string to handle empty input (deleting the zero)
    const [adjustments, setAdjustments] = useState<{
        additionalExpenses: number | string;
        additionalRevenue: number | string;
        taxPercentage: number | string;
        repassePercentage: number | string;
        roomRent: number | string;
        notes: string;
    }>({
        additionalExpenses: 0,
        additionalRevenue: 0,
        taxPercentage: 0,
        repassePercentage: 70,
        roomRent: 0,
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, [userProfile]);

    // New Effect: Pre-fill data when professional is selected
    useEffect(() => {
        if (selectedProfessional) {
            const professional = professionals.find(p => p.id === selectedProfessional);
            if (professional) {
                // Pre-fill form with professional's config
                setAdjustments(prev => ({
                    ...prev,
                    taxPercentage: professional.repasseConfig.taxRate || 0,
                    repassePercentage: professional.repasseConfig.splitPercentage || 70,
                    roomRent: professional.repasseConfig.roomRentalAmount || 0
                }));
            }
        }
    }, [selectedProfessional, professionals]);

    useEffect(() => {
        if (selectedProfessional) {
            calculateRepasse();
        } else {
            setCalculation(null);
        }
    }, [selectedProfessional, dateRange, adjustments, billings]);

    const loadData = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            const isClinicManager = userProfile?.isClinicManager === true;
            
            // Only Master Admin can bypass the managerId filter
            const managerId = (isClinicManager && !isAdminMaster) ? user.uid : undefined;

            const [allProfs, allBillings] = await Promise.all([
                getAllProfessionals(managerId),
                getAllBillingRecords(managerId)
            ]);
            setProfessionals(allProfs);
            setBillings(allBillings);
        } catch (error) {
            console.error("Error loading data", error);
            setNotification({ type: 'error', message: 'Erro ao carregar dados' });
        } finally {
            setLoading(false);
        }
    };

    const calculateRepasse = () => {
        if (!selectedProfessional) {
            setNotification({ type: 'error', message: 'Selecione um profissional' });
            return;
        }

        const professional = professionals.find(p => p.id === selectedProfessional);
        if (!professional) return;

        // Filter billings for selected professional and date range
        const filteredBillings = billings.filter(b =>
            b.professionalId === selectedProfessional &&
            b.consultationDate >= dateRange.start &&
            b.consultationDate <= dateRange.end &&
            b.paymentStatus === 'received'
        );

        // Parse inputs (handle empty strings as 0)
        const taxPct = adjustments.taxPercentage === '' ? 0 : Number(adjustments.taxPercentage);
        const repassePct = adjustments.repassePercentage === '' ? 0 : Number(adjustments.repassePercentage);
        const addRevenue = adjustments.additionalRevenue === '' ? 0 : Number(adjustments.additionalRevenue);
        const addExpenses = adjustments.additionalExpenses === '' ? 0 : Number(adjustments.additionalExpenses);
        const roomRent = adjustments.roomRent === '' ? 0 : Number(adjustments.roomRent);

        // Calculate totals
        const grossRevenue = filteredBillings.reduce((sum, b) => sum + b.grossAmount, 0);
        const totalConsultations = filteredBillings.length;

        // Total Revenue (Consultations + Additional)
        const totalRevenue = grossRevenue + addRevenue;

        // Calculate Tax
        // Tax applies to the Total Revenue (Gross + Additional)
        const taxAmount = (totalRevenue * taxPct) / 100;

        // Net After Tax
        const amountAfterTax = totalRevenue - taxAmount;

        // Repasse Amount (Professional Share)
        // Calculated on the Net Amount After Tax
        const repasseAmount = (amountAfterTax * repassePct) / 100;

        // Clinic Amount (The rest)
        const clinicAmount = amountAfterTax - repasseAmount;

        // Net Repasse (Final amount to pay professional)
        // Repasse Amount - Expenses - Room Rent
        const netRepasse = repasseAmount - addExpenses - roomRent;

        setCalculation({
            professional,
            period: {
                start: dateRange.start,
                end: dateRange.end
            },
            consultations: totalConsultations,
            grossRevenue, // Only from consultations
            totalRevenue, // Consultations + Additional
            taxAmount,
            taxPercentage: taxPct,
            repassePercentage: repassePct,
            repasseAmount,
            clinicAmount,
            adjustedRevenue: addRevenue,
            adjustedExpenses: addExpenses,
            roomRent: roomRent,
            netRepasse,
            billings: filteredBillings
        });
    };

    const generatePDF = () => {
        if (!calculation) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(0, 128, 128);
        doc.text('DEMONSTRATIVO DE REPASSE', pageWidth / 2, 20, { align: 'center' });

        // Professional Info
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Profissional: ${calculation.professional.name}`, 20, 35);
        doc.text(`Especialidade: ${calculation.professional.specialty}`, 20, 42);
        doc.text(`CRM: ${calculation.professional.crm || 'N/A'}`, 20, 49);

        // Period
        doc.setFontSize(11);
        doc.text(`Período: ${new Date(calculation.period.start).toLocaleDateString('pt-BR')} a ${new Date(calculation.period.end).toLocaleDateString('pt-BR')}`, 20, 60);

        // Summary Box
        doc.setFillColor(240, 240, 240);
        doc.rect(20, 70, pageWidth - 40, 70, 'F'); // Increased height to accommodate new lines

        doc.setFontSize(10);
        let yPos = 80;
        doc.text(`Total de Consultas: ${calculation.consultations}`, 25, yPos); yPos += 8;
        doc.text(`Receita Consultas: ${formatMoney(calculation.grossRevenue)}`, 25, yPos); yPos += 8;

        if (calculation.adjustedRevenue > 0) {
            doc.text(`Receita Adicional: ${formatMoney(calculation.adjustedRevenue)}`, 25, yPos); yPos += 8;
        }

        doc.text(`Receita Total: ${formatMoney(calculation.totalRevenue)}`, 25, yPos); yPos += 8;
        doc.text(`Imposto (${calculation.taxPercentage}%): -${formatMoney(calculation.taxAmount)}`, 25, yPos); yPos += 8;
        doc.text(`Repasse Profissional (${calculation.repassePercentage}%): ${formatMoney(calculation.repasseAmount)}`, 25, yPos); yPos += 8;

        if (calculation.adjustedExpenses > 0) {
            doc.text(`Despesas a Descontar: -${formatMoney(calculation.adjustedExpenses)}`, 25, yPos); yPos += 8;
        }

        if (calculation.roomRent > 0) {
            doc.text(`Aluguel de Sala: -${formatMoney(calculation.roomRent)}`, 25, yPos); yPos += 8;
        }

        // Net Amount
        doc.setFontSize(14);
        doc.setTextColor(0, 128, 128);
        const netY = 150; // Modified Y position
        doc.text(`VALOR LÍQUIDO A REPASSAR: ${formatMoney(calculation.netRepasse)}`, pageWidth / 2, netY, { align: 'center' });

        // Consultations Detail
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Detalhamento das Consultas:', 20, netY + 15);

        let y = netY + 25;
        doc.setFontSize(9);
        calculation.billings.forEach((billing: ConsultationBilling, index: number) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            doc.text(
                `${index + 1}. ${new Date(billing.consultationDate).toLocaleDateString('pt-BR')} - ${billing.patientName} - ${formatMoney(billing.grossAmount)}`,
                25,
                y
            );
            y += 6;
        });

        // Notes
        if (adjustments.notes) {
            if (y > 250) {
                doc.addPage();
                y = 20;
            }
            doc.setFontSize(10);
            doc.text('Observações:', 20, y + 10);
            doc.setFontSize(9);
            const splitNotes = doc.splitTextToSize(adjustments.notes, pageWidth - 50);
            doc.text(splitNotes, 25, y + 18);
        }

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} - Página ${i} de ${pageCount}`,
                pageWidth / 2,
                285,
                { align: 'center' }
            );
        }

        // Save
        const fileName = `Repasse_${calculation.professional.name.replace(/\s+/g, '_')}_${dateRange.start}_${dateRange.end}.pdf`;
        doc.save(fileName);

        setNotification({ type: 'success', message: 'PDF gerado com sucesso!' });
        setTimeout(() => setNotification(null), 3000);
    };

    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const handleInputChange = (field: keyof typeof adjustments, value: string) => {
        // Allow empty string or parse to number
        setAdjustments(prev => ({
            ...prev,
            [field]: value === '' ? '' : value
        }));
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="w-6 h-6 text-teal-600" />
                        Cálculo de Repasse
                    </h1>
                    <p className="text-slate-500">Gere demonstrativos de repasse para profissionais</p>
                </div>
            </div>

            {/* Notification */}
            {notification && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                    {notification.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                        {notification.message}
                    </span>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-600" />
                    Parâmetros do Cálculo
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Profissional *</label>
                        <select
                            value={selectedProfessional}
                            onChange={(e) => setSelectedProfessional(e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="">Selecione...</option>
                            {professionals.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} - {p.specialty}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Data Início *</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700 block mb-1">Data Fim *</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>

                {/* Tax and Repasse Percentages */}
                <div className="bg-teal-50 p-4 rounded-lg border border-teal-100 space-y-3">
                    <h4 className="text-sm font-semibold text-teal-800 mb-2">Percentuais de Cálculo (Preenchimento Automático)</h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Imposto (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={adjustments.taxPercentage}
                                onChange={(e) => handleInputChange('taxPercentage', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Repasse Profissional (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={adjustments.repassePercentage}
                                onChange={(e) => handleInputChange('repassePercentage', e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Repasse Clínica (%)</label>
                            <input
                                type="number"
                                value={100 - (Number(adjustments.repassePercentage) || 0)}
                                disabled
                                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 text-slate-600 text-sm cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="text-xs text-teal-700 bg-teal-100 p-2 rounded">
                        <strong>Fórmula:</strong> (Receita Total - Imposto) × Repasse% - Despesas
                    </div>
                </div>

                {/* Manual Adjustments */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="font-semibold text-slate-700 mb-3">Ajustes e Descontos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Aluguel de Sala</label>
                            <input
                                type="number"
                                step="0.01"
                                value={adjustments.roomRent}
                                onChange={(e) => handleInputChange('roomRent', e.target.value)}
                                className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Outras Despesas</label>
                            <input
                                type="number"
                                step="0.01"
                                value={adjustments.additionalExpenses}
                                onChange={(e) => handleInputChange('additionalExpenses', e.target.value)}
                                className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-1">Receita Adicional</label>
                            <input
                                type="number"
                                step="0.01"
                                value={adjustments.additionalRevenue}
                                onChange={(e) => handleInputChange('additionalRevenue', e.target.value)}
                                className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="text-sm font-medium text-slate-700 block mb-1">Observações</label>
                            <textarea
                                value={adjustments.notes}
                                onChange={(e) => setAdjustments({ ...adjustments, notes: e.target.value })}
                                className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                rows={2}
                                placeholder="Adicione observações sobre os ajustes..."
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* Results */}
            {calculation && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-teal-600" />
                                Resultado do Cálculo
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {calculation.professional.name} - {new Date(calculation.period.start).toLocaleDateString('pt-BR')} a {new Date(calculation.period.end).toLocaleDateString('pt-BR')}
                            </p>
                        </div>
                        <button
                            onClick={generatePDF}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                        >
                            <Download className="w-4 h-4" />
                            Gerar PDF
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <p className="text-sm text-blue-600 font-medium">Total de Consultas</p>
                            <p className="text-2xl font-bold text-blue-700 mt-1">{calculation.consultations}</p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                            <p className="text-sm text-green-600 font-medium">Receita Total</p>
                            <p className="text-2xl font-bold text-green-700 mt-1">{formatMoney(calculation.totalRevenue)}</p>
                            <p className="text-xs text-green-600 mt-1">
                                (Consultas: {formatMoney(calculation.grossRevenue)} + Adicional: {formatMoney(calculation.adjustedRevenue)})
                            </p>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <p className="text-sm text-purple-600 font-medium">Repasse Profissional</p>
                            <p className="text-2xl font-bold text-purple-700 mt-1">{formatMoney(calculation.repasseAmount)}</p>
                            <p className="text-xs text-purple-600 mt-1">
                                Após imposto ({calculation.taxPercentage}%)
                            </p>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                            <p className="text-sm text-orange-600 font-medium">Valor Clínica</p>
                            <p className="text-2xl font-bold text-orange-700 mt-1">{formatMoney(calculation.clinicAmount)}</p>
                        </div>
                    </div>

                    {/* Net Amount */}
                    <div className="bg-teal-50 p-6 rounded-lg border-2 border-teal-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-teal-600 font-medium">Valor Líquido a Repassar</p>
                                <p className="text-xs text-teal-600 mt-1">
                                    (Repasse Profissional - Despesas - Aluguel)
                                </p>
                                {calculation.adjustedExpenses > 0 && (
                                    <p className="text-xs text-red-500 mt-1">
                                        - Despesas: {formatMoney(calculation.adjustedExpenses)}
                                    </p>
                                )}
                                {calculation.roomRent > 0 && (
                                    <p className="text-xs text-red-500 mt-1">
                                        - Aluguel: {formatMoney(calculation.roomRent)}
                                    </p>
                                )}
                            </div>
                            <p className="text-3xl font-bold text-teal-700">{formatMoney(calculation.netRepasse)}</p>
                        </div>
                    </div>

                    {/* Consultations List */}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-3">Detalhamento das Consultas</h4>
                        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-3 text-left font-semibold text-slate-700">Data</th>
                                        <th className="p-3 text-left font-semibold text-slate-700">Paciente</th>
                                        <th className="p-3 text-right font-semibold text-slate-700">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {calculation.billings.map((billing: ConsultationBilling, index: number) => (
                                        <tr key={index} className="border-t border-gray-100">
                                            <td className="p-3 text-slate-600">
                                                {new Date(billing.consultationDate).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="p-3 text-slate-800">{billing.patientName}</td>
                                            <td className="p-3 text-right font-medium text-teal-600">
                                                {formatMoney(billing.grossAmount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RepasseCalculationView;
