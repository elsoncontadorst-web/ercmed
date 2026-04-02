import React, { useState, useEffect } from 'react';
import { Receipt, DollarSign, Plus, Calendar, Search, Filter, FileText, X, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth } from '../services/firebase';
import { getAllBillingRecords, processBilling, getAllProfessionals } from '../services/repasseService';
import { ConsultationBilling, Professional } from '../types/finance';
import { addTransaction } from '../services/userDataService';

const ADMIN_EMAILS = ['usuario020@ercmed.com.br', 'elsoncontador.st@gmail.com'];

const BillingView: React.FC = () => {
    const [billingRecords, setBillingRecords] = useState<ConsultationBilling[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'received' | 'pending'>('all');
    const [isAdmin, setIsAdmin] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const [formData, setFormData] = useState({
        professionalId: '',
        patientName: '',
        consultationDate: new Date().toISOString().split('T')[0],
        grossAmount: '',
        taxPercentage: '0',
        repassePercentage: '70',
        paymentMethod: 'private',
        paymentStatus: 'received',
        notes: ''
    });

    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            const adminStatus = ADMIN_EMAILS.includes(user.email || '');
            setIsAdmin(adminStatus);
            loadData(adminStatus, user.uid);
        }
    }, []);

    const loadData = async (admin: boolean, userId: string) => {
        setLoading(true);
        try {
            if (admin) {
                const [allBillings, allProfs] = await Promise.all([
                    getAllBillingRecords(),
                    getAllProfessionals()
                ]);
                setBillingRecords(allBillings);
                setProfessionals(allProfs);
            } else {
                const myBillings = await getAllBillingRecords(userId);
                setBillingRecords(myBillings);
            }
        } catch (error) {
            console.error("Error loading billing data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setNotification(null);

        try {
            const selectedProf = professionals.find(p => p.id === formData.professionalId);
            if (!selectedProf) {
                setNotification({ type: 'error', message: 'Profissional não encontrado' });
                setLoading(false);
                return;
            }

            const user = auth.currentUser;
            if (!user) {
                setNotification({ type: 'error', message: 'Usuário não autenticado' });
                setLoading(false);
                return;
            }

            // Calculate amounts
            const grossAmount = Number(formData.grossAmount);
            const taxPercentage = Number(formData.taxPercentage);
            const repassePercentage = Number(formData.repassePercentage);

            const taxAmount = (grossAmount * taxPercentage) / 100;
            const amountAfterTax = grossAmount - taxAmount;
            const repasseAmount = (amountAfterTax * repassePercentage) / 100;
            const clinicAmount = amountAfterTax - repasseAmount;

            // Save billing
            await processBilling({
                professionalId: formData.professionalId,
                professionalName: selectedProf.name,
                patientName: formData.patientName,
                consultationDate: formData.consultationDate,
                grossAmount: grossAmount,
                taxPercentage: taxPercentage,
                repassePercentage: repassePercentage,
                taxAmount: taxAmount,
                repasseAmount: repasseAmount,
                clinicAmount: clinicAmount,
                paymentMethod: formData.paymentMethod as any,
                paymentStatus: formData.paymentStatus as any,
                notes: formData.notes
            });

            // Auto-sync to Financial Control if payment is received
            if (formData.paymentStatus === 'received') {
                await addTransaction(user.uid, {
                    date: formData.consultationDate,
                    description: `Faturamento - ${formData.patientName} (${selectedProf.name})`,
                    category: 'Faturamento Médico',
                    amount: grossAmount,
                    type: 'income',
                    status: 'paid'
                });
            }

            setNotification({
                type: 'success',
                message: 'Faturamento salvo com sucesso!' + (formData.paymentStatus === 'received' ? ' Receita adicionada ao Controle Financeiro.' : '')
            });

            setShowModal(false);
            loadData(isAdmin, user.uid);

            // Reset form
            setFormData({
                professionalId: '',
                patientName: '',
                consultationDate: new Date().toISOString().split('T')[0],
                grossAmount: '',
                taxPercentage: '0',
                repassePercentage: '70',
                paymentMethod: 'private',
                paymentStatus: 'received',
                notes: ''
            });

            // Clear notification after 5 seconds
            setTimeout(() => setNotification(null), 5000);
        } catch (error) {
            console.error("Error saving billing", error);
            setNotification({ type: 'error', message: 'Erro ao salvar faturamento. Tente novamente.' });
        } finally {
            setLoading(false);
        }
    };

    const filteredBillings = billingRecords.filter(b => {
        const matchesSearch = b.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.professionalName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || b.paymentStatus === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const totalRevenue = filteredBillings.reduce((sum, b) => sum + b.grossAmount, 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-teal-600" />
                        Gestão de Faturamento
                    </h1>
                    <p className="text-slate-500">Controle de consultas e pagamentos</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Faturamento
                    </button>
                )}
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
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-slate-500 block mb-1">Buscar</label>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Paciente ou profissional..."
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="all">Todos</option>
                        <option value="received">Recebido</option>
                        <option value="pending">Pendente</option>
                    </select>
                </div>
                <div className="ml-auto flex items-center gap-2 bg-teal-50 px-4 py-2 rounded-lg border border-teal-100">
                    <span className="text-sm text-teal-700 font-medium">Total:</span>
                    <span className="text-lg font-bold text-teal-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 font-semibold text-slate-700">Data</th>
                            <th className="p-4 font-semibold text-slate-700">Profissional</th>
                            <th className="p-4 font-semibold text-slate-700">Paciente</th>
                            <th className="p-4 font-semibold text-slate-700">Valor</th>
                            <th className="p-4 font-semibold text-slate-700">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBillings.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500">
                                    Nenhum faturamento encontrado
                                </td>
                            </tr>
                        ) : (
                            filteredBillings.map((billing) => (
                                <tr key={billing.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-4 text-sm text-slate-600">
                                        {new Date(billing.consultationDate).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="p-4 text-sm text-slate-800 font-medium">{billing.professionalName}</td>
                                    <td className="p-4 text-sm text-slate-800">{billing.patientName}</td>
                                    <td className="p-4 text-sm font-bold text-teal-600">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(billing.grossAmount)}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${billing.paymentStatus === 'received'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {billing.paymentStatus === 'received' ? 'Recebido' : 'Pendente'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-bold text-slate-800">Novo Faturamento</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Profissional</label>
                                <select
                                    value={formData.professionalId}
                                    onChange={(e) => setFormData({ ...formData, professionalId: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {professionals.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Paciente</label>
                                <input
                                    type="text"
                                    value={formData.patientName}
                                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Data da Consulta</label>
                                <input
                                    type="date"
                                    value={formData.consultationDate}
                                    onChange={(e) => setFormData({ ...formData, consultationDate: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Valor Bruto</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.grossAmount}
                                    onChange={(e) => setFormData({ ...formData, grossAmount: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* Tax and Repasse Calculation Section */}
                            <div className="bg-teal-50 p-4 rounded-lg border border-teal-100 space-y-3">
                                <h4 className="text-sm font-semibold text-teal-800 mb-2">Cálculo de Repasse</h4>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Imposto (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={formData.taxPercentage}
                                            onChange={(e) => setFormData({ ...formData, taxPercentage: e.target.value })}
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
                                            value={formData.repassePercentage}
                                            onChange={(e) => setFormData({ ...formData, repassePercentage: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Calculation Preview */}
                                {formData.grossAmount && (
                                    <div className="mt-3 pt-3 border-t border-teal-200 space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Valor Bruto:</span>
                                            <span className="font-semibold text-slate-800">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(formData.grossAmount))}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Imposto ({formData.taxPercentage}%):</span>
                                            <span className="font-semibold text-red-600">
                                                - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(formData.grossAmount) * Number(formData.taxPercentage)) / 100)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Após Imposto:</span>
                                            <span className="font-semibold text-slate-800">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(formData.grossAmount) - (Number(formData.grossAmount) * Number(formData.taxPercentage)) / 100)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-teal-200">
                                            <span className="text-slate-600">Repasse Profissional ({formData.repassePercentage}%):</span>
                                            <span className="font-bold text-teal-700">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(((Number(formData.grossAmount) - (Number(formData.grossAmount) * Number(formData.taxPercentage)) / 100) * Number(formData.repassePercentage)) / 100)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Valor Clínica:</span>
                                            <span className="font-bold text-blue-700">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(formData.grossAmount) - (Number(formData.grossAmount) * Number(formData.taxPercentage)) / 100) - (((Number(formData.grossAmount) - (Number(formData.grossAmount) * Number(formData.taxPercentage)) / 100) * Number(formData.repassePercentage)) / 100))}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Forma de Pagamento</label>
                                <select
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="private">Particular</option>
                                    <option value="insurance">Convênio</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Status do Pagamento</label>
                                <select
                                    value={formData.paymentStatus}
                                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="received">Recebido</option>
                                    <option value="pending">Pendente</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-slate-700 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingView;
