import React, { useState, useEffect } from 'react';
import { Receipt as ReceiptIcon, Plus, Search, Printer, Trash2, FileText, Calendar, DollarSign, User, X } from 'lucide-react';
import { auth } from '../services/firebase';
import { Receipt, ReceiptFormData } from '../types/receipts';
import { getReceipts, addReceipt, deleteReceipt, numberToWords } from '../services/receiptsService';
import { getAllPatients, getAppointments } from '../services/healthService';
import { getAllProfessionals } from '../services/repasseService';
import { Patient, Appointment } from '../types/health';
import { Professional } from '../types/finance';
import { useUser } from '../contexts/UserContext';
import jsPDF from 'jspdf';

const ReceiptsView: React.FC = () => {
    const { user, userProfile, isAdminMaster, isAdmin } = useUser();
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState<ReceiptFormData>({
        patientName: '',
        patientCpf: '',
        amount: '',
        description: '',
        paymentMethod: 'cash',
        referenceDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, [user, userProfile, isAdminMaster]);

    useEffect(() => {
        loadProfessionals();
    }, [user, userProfile, isAdminMaster]);

    useEffect(() => {
        if (selectedProfessionalId) {
            loadAppointments(selectedProfessionalId);
        } else {
            setAppointments([]);
            setSelectedAppointment(null);
        }
    }, [selectedProfessionalId]);

    useEffect(() => {
        if (selectedAppointment) {
            setFormData({
                ...formData,
                patientId: selectedAppointment.patientId,
                patientName: selectedAppointment.patientName,
                patientCpf: selectedAppointment.patientCpf || '',
                amount: selectedAppointment.amount?.toString() || '',
                description: `Consulta realizada em ${new Date(selectedAppointment.date).toLocaleDateString('pt-BR')}`,
                referenceDate: selectedAppointment.date
            });
        }
    }, [selectedAppointment]);

    const loadProfessionals = async () => {
        if (!user) return;

        try {
            const isClinicManager = userProfile?.isClinicManager === true;
            
            // SECURITY: Only Master Admin can bypass the clinic filter
            const managerId = (isClinicManager && !isAdminMaster) ? user.uid : undefined;

            if (isAdmin) {
                // Admin/Manager vê os profissionais da sua clínica
                const profs = await getAllProfessionals(managerId);
                setProfessionals(profs);
                
                // If there's only one professional and it's the current user, select it
                if (profs.length === 1) {
                    setSelectedProfessionalId(profs[0].id);
                }
            } else {
                // Profissional vê apenas ele mesmo
                const profs = await getAllProfessionals(managerId);
                const userProf = profs.find(p => p.userId === user.uid);
                if (userProf) {
                    setProfessionals([userProf]);
                    setSelectedProfessionalId(userProf.id);
                }
            }
        } catch (error) {
            console.error('Error loading professionals:', error);
        }
    };

    const loadAppointments = async (professionalId: string) => {
        if (!user) return;

        try {
            // Buscar atendimentos vinculados ao profissional selecionado
            // Nota: Se for clinic manager, user.uid é o managerId.
            // Precisamos garantir que a busca seja segura.
            const allAppointments = await getAppointments(user.uid);

            // Filtrar por profissional e status concluído/confirmado
            const filtered = allAppointments.filter(apt =>
                apt.professionalId === professionalId &&
                (apt.status === 'completed' || apt.status === 'confirmed')
            );

            setAppointments(filtered);
        } catch (error) {
            console.error('Error loading appointments:', error);
        }
    };

    const loadData = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const isClinicManager = userProfile?.isClinicManager === true;
            const managerId = (isClinicManager && !isAdminMaster) ? user.uid : undefined;

            const [receiptsData, patientsData] = await Promise.all([
                getReceipts(user.uid, isAdminMaster),
                getAllPatients(managerId)
            ]);
            setReceipts(receiptsData);
            setPatients(patientsData);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Erro ao carregar dados.');
        } finally {
            setLoading(false);
        }
    };

    const handlePatientSelect = (patientId: string) => {
        const patient = patients.find(p => p.id === patientId);
        if (patient) {
            setFormData({
                ...formData,
                patientId: patient.id,
                patientName: patient.name,
                patientCpf: patient.cpf || ''
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        if (!formData.patientName || !formData.amount || !formData.description) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            alert('Por favor, insira um valor válido.');
            return;
        }

        setLoading(true);
        try {
            await addReceipt(user.uid, {
                userId: user.uid,
                patientId: formData.patientId,
                patientName: formData.patientName,
                patientCpf: formData.patientCpf,
                amount,
                description: formData.description,
                paymentMethod: formData.paymentMethod,
                referenceDate: formData.referenceDate,
                issueDate: new Date().toISOString().split('T')[0],
                notes: formData.notes
            });

            alert('Recibo criado com sucesso!');
            setShowModal(false);
            resetForm();
            loadData();
        } catch (error) {
            console.error('Error creating receipt:', error);
            alert('Erro ao criar recibo.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (receiptId: string) => {
        if (!confirm('Tem certeza que deseja excluir este recibo?')) return;

        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        try {
            await deleteReceipt(user.uid, receiptId);
            alert('Recibo excluído com sucesso!');
            loadData();
        } catch (error) {
            console.error('Error deleting receipt:', error);
            alert('Erro ao excluir recibo.');
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = async (receipt: Receipt) => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            // Header
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('RECIBO DE PAGAMENTO', pageWidth / 2, 20, { align: 'center' });

            // Receipt number
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Nº ${receipt.receiptNumber}`, pageWidth - 20, 20, { align: 'right' });

            // Amount box
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`R$ ${receipt.amount.toFixed(2).replace('.', ',')}`, pageWidth / 2, 40, { align: 'center' });

            // Amount in words
            doc.setFontSize(11);
            doc.setFont('helvetica', 'italic');
            const amountInWords = numberToWords(receipt.amount);
            doc.text(`(${amountInWords})`, pageWidth / 2, 50, { align: 'center' });

            // Content
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            let yPos = 70;

            doc.text(`Recebi de: ${receipt.patientName}`, 20, yPos);
            yPos += 10;

            if (receipt.patientCpf) {
                doc.text(`CPF: ${receipt.patientCpf}`, 20, yPos);
                yPos += 10;
            }

            yPos += 5;
            doc.text(`Referente a: ${receipt.description}`, 20, yPos);
            yPos += 10;

            doc.text(`Forma de pagamento: ${getPaymentMethodLabel(receipt.paymentMethod)}`, 20, yPos);
            yPos += 10;

            doc.text(`Data do serviço: ${new Date(receipt.referenceDate).toLocaleDateString('pt-BR')}`, 20, yPos);
            yPos += 10;

            if (receipt.notes) {
                yPos += 5;
                doc.setFontSize(10);
                doc.text(`Observações: ${receipt.notes}`, 20, yPos);
                yPos += 10;
            }

            // Footer
            yPos = doc.internal.pageSize.getHeight() - 60;
            doc.text(`${user.displayName || 'Profissional'}`, pageWidth / 2, yPos, { align: 'center' });
            yPos += 5;
            doc.line(pageWidth / 2 - 40, yPos, pageWidth / 2 + 40, yPos);
            yPos += 5;
            doc.setFontSize(10);
            doc.text('Assinatura', pageWidth / 2, yPos, { align: 'center' });

            yPos += 15;
            doc.setFontSize(9);
            doc.text(`Emitido em: ${new Date(receipt.issueDate).toLocaleDateString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });

            // Save
            doc.save(`recibo-${receipt.receiptNumber.replace('/', '-')}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Erro ao gerar PDF.');
        }
    };

    const resetForm = () => {
        setFormData({
            patientName: '',
            patientCpf: '',
            amount: '',
            description: '',
            paymentMethod: 'cash',
            referenceDate: new Date().toISOString().split('T')[0],
            notes: ''
        });
    };

    const getPaymentMethodLabel = (method: string): string => {
        const labels: Record<string, string> = {
            cash: 'Dinheiro',
            pix: 'PIX',
            card: 'Cartão',
            transfer: 'Transferência',
            insurance: 'Convênio'
        };
        return labels[method] || method;
    };

    const filteredReceipts = receipts.filter(receipt =>
        receipt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.receiptNumber.includes(searchTerm) ||
        receipt.patientCpf?.includes(searchTerm)
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ReceiptIcon className="w-6 h-6 text-teal-600" />
                        Recibos de Pacientes
                    </h1>
                    <p className="text-slate-500">Gestão de recibos de pagamento</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2 font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Novo Recibo
                </button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, CPF ou número do recibo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>
            </div>

            {/* Receipts List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nº Recibo</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Paciente</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Descrição</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Valor</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Pagamento</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        Carregando...
                                    </td>
                                </tr>
                            ) : filteredReceipts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        Nenhum recibo encontrado
                                    </td>
                                </tr>
                            ) : (
                                filteredReceipts.map((receipt) => (
                                    <tr key={receipt.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{receipt.receiptNumber}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(receipt.issueDate).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-800">{receipt.patientName}</div>
                                            {receipt.patientCpf && (
                                                <div className="text-xs text-slate-500">CPF: {receipt.patientCpf}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                                            {receipt.description}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-teal-600">
                                            R$ {receipt.amount.toFixed(2).replace('.', ',')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {getPaymentMethodLabel(receipt.paymentMethod)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => generatePDF(receipt)}
                                                    className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                                    title="Imprimir PDF"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(receipt.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Receipt Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-teal-50">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <FileText className="w-5 h-5 text-teal-600" />
                                Novo Recibo de Paciente
                            </h3>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    resetForm();
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Appointment Selection Section */}
                            <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                                <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Vincular a Atendimento (Opcional)
                                </h4>
                                <p className="text-xs text-blue-700 mb-3">
                                    Selecione um atendimento para preencher automaticamente os dados do recibo
                                </p>

                                {/* Professional selector - only for admin */}
                                {isAdmin && (
                                    <div className="mb-3">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Profissional
                                        </label>
                                        <select
                                            value={selectedProfessionalId}
                                            onChange={(e) => setSelectedProfessionalId(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Selecione um profissional</option>
                                            {professionals.map(prof => (
                                                <option key={prof.id} value={prof.id}>{prof.name} - {prof.specialty}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Appointment selector */}
                                {(selectedProfessionalId || !isAdmin) && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Atendimento
                                        </label>
                                        <select
                                            value={selectedAppointment?.id || ''}
                                            onChange={(e) => {
                                                const apt = appointments.find(a => a.id === e.target.value);
                                                setSelectedAppointment(apt || null);
                                            }}
                                            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Selecione um atendimento</option>
                                            {appointments.map(apt => (
                                                <option key={apt.id} value={apt.id}>
                                                    {apt.patientName} - {new Date(apt.date).toLocaleDateString('pt-BR')} às {apt.time}
                                                    {apt.amount && ` - R$ ${apt.amount.toFixed(2)}`}
                                                </option>
                                            ))}
                                        </select>
                                        {appointments.length === 0 && selectedProfessionalId && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Nenhum atendimento concluído encontrado para este profissional
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <p className="text-xs text-slate-500 mb-4">Ou selecione um paciente cadastrado:</p>
                            </div>

                            {/* Patient Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Selecionar Paciente Cadastrado
                                </label>
                                <select
                                    onChange={(e) => handlePatientSelect(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Selecione um paciente ou preencha manualmente</option>
                                    {patients.map((patient) => (
                                        <option key={patient.id} value={patient.id}>
                                            {patient.name} {patient.cpf && `- CPF: ${patient.cpf}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <p className="text-xs text-slate-500 mb-4">Ou preencha os dados manualmente:</p>
                            </div>

                            {/* Patient Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Nome do Paciente *
                                </label>
                                <input
                                    type="text"
                                    value={formData.patientName}
                                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* Patient CPF */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    CPF do Paciente
                                </label>
                                <input
                                    type="text"
                                    value={formData.patientCpf}
                                    onChange={(e) => setFormData({ ...formData, patientCpf: e.target.value })}
                                    placeholder="000.000.000-00"
                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Valor (R$) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Descrição do Serviço *
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    placeholder="Ex: Consulta médica, Sessão de fisioterapia, etc."
                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                    required
                                />
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Forma de Pagamento *
                                </label>
                                <select
                                    value={formData.paymentMethod}
                                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="cash">Dinheiro</option>
                                    <option value="pix">PIX</option>
                                    <option value="card">Cartão</option>
                                    <option value="transfer">Transferência</option>
                                    <option value="insurance">Convênio</option>
                                </select>
                            </div>

                            {/* Reference Date */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Data do Serviço *
                                </label>
                                <input
                                    type="date"
                                    value={formData.referenceDate}
                                    onChange={(e) => setFormData({ ...formData, referenceDate: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                                    required
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Observações
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={2}
                                    placeholder="Informações adicionais (opcional)"
                                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="flex-1 py-3 border border-gray-300 rounded-lg text-slate-600 hover:bg-gray-50 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
                                >
                                    {loading ? 'Salvando...' : 'Criar Recibo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceiptsView;
