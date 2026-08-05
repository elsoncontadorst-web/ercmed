import React, { useEffect, useMemo, useState } from 'react';
import { Receipt, Plus, X, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { auth } from '../services/firebase';
import { getAllBillingRecords, processBilling, getAllProfessionals, deleteBillingRecord, updateBillingPaymentStatus } from '../services/repasseService';
import { ConsultationBilling, Professional } from '../types/finance';
import { addTransaction, updateTransactionStatusByBilling } from '../services/userDataService';
import { useUser } from '../contexts/UserContext';
import { getManagerIdForUser } from '../services/accessControlService';
import { getClinicServices, resolveClinicServicePrice } from '../services/clinicErpService';
import { ClinicService, ServicePayer } from '../types/clinicErp';
import { ACTIVE_CLINIC_CHANGED_EVENT, getActiveClinicScopeId } from '../services/activeClinicStorage';
import { getClinics } from '../services/clinicService';
import { recordMatchesClinicScope } from '../services/clinicScopeService';

const BillingView: React.FC = () => {
    const { userProfile, isAdminMaster } = useUser();
    const [billingRecords, setBillingRecords] = useState<ConsultationBilling[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [services, setServices] = useState<ClinicService[]>([]);
    const [resolvedRule, setResolvedRule] = useState<ClinicService | null>(null);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'received' | 'pending'>('all');
    const [isAdmin, setIsAdmin] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [activeClinicId, setActiveClinicId] = useState<string | null>(getActiveClinicScopeId());
    const [activeClinicName, setActiveClinicName] = useState('');

    const [formData, setFormData] = useState({
        professionalId: '',
        serviceId: '',
        patientName: '',
        consultationDate: new Date().toISOString().split('T')[0],
        grossAmount: '',
        taxPercentage: '0',
        repassePercentage: '70',
        paymentMethod: 'private' as 'private' | 'insurance',
        paymentStatus: 'received' as 'received' | 'pending',
        contractName: '',
        unitName: '',
        notes: ''
    });

    const selectedProfessional = useMemo(
        () => professionals.find(p => p.id === formData.professionalId),
        [professionals, formData.professionalId]
    );

    const payer = (formData.paymentMethod === 'insurance' ? 'insurance' : 'private') as ServicePayer;

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        const adminStatus =
            isAdminMaster ||
            userProfile?.isClinicManager === true ||
            userProfile?.role === 'admin_gestor' ||
            userProfile?.role === 'admin_master';
        setIsAdmin(adminStatus);
        loadData(adminStatus, user.uid);
    }, [userProfile, isAdminMaster, activeClinicId, activeClinicName]);

    useEffect(() => {
        const syncClinic = async () => {
            const clinicId = getActiveClinicScopeId();
            setActiveClinicId(clinicId);
            const clinics = await getClinics();
            const activeClinic = clinicId ? clinics.find(clinic => clinic.id === clinicId) : undefined;
            setActiveClinicName(activeClinic?.name || '');
        };

        syncClinic();
        window.addEventListener(ACTIVE_CLINIC_CHANGED_EVENT, syncClinic);
        return () => window.removeEventListener(ACTIVE_CLINIC_CHANGED_EVENT, syncClinic);
    }, []);

    useEffect(() => {
        const loadRule = async () => {
            const user = auth.currentUser;
            if (!user || !formData.serviceId || !selectedProfessional) {
                setResolvedRule(null);
                return;
            }
            const managerId = isAdminMaster ? undefined : await getManagerIdForUser(user.uid);
                const ownerId = managerId || user.uid;
                const rule = await resolveClinicServicePrice(ownerId, formData.serviceId, {
                    payer,
                    date: formData.consultationDate,
                    professionalId: selectedProfessional.id,
                    specialty: selectedProfessional.specialty,
                    contractName: formData.contractName || undefined,
                    unitName: formData.unitName || activeClinicName || undefined,
                });
            setResolvedRule(rule);

            if (rule) {
                setFormData(current => ({
                    ...current,
                    grossAmount: String(rule.grossPrice),
                    paymentMethod: rule.payer === 'insurance' ? 'insurance' : 'private',
                    unitName: current.unitName || activeClinicName,
                }));
            }
        };

        loadRule();
    }, [
        formData.serviceId,
        formData.consultationDate,
        formData.contractName,
        formData.unitName,
        selectedProfessional?.id,
        selectedProfessional?.specialty,
        payer,
        isAdminMaster,
        activeClinicName,
    ]);

    const loadData = async (admin: boolean, userId: string) => {
        setLoading(true);
        try {
            const managerId = isAdminMaster ? undefined : await getManagerIdForUser(userId);
            if (admin) {
                const ownerId = managerId || userId;
                const [allBillings, allProfs, clinicServices, clinics] = await Promise.all([
                    getAllBillingRecords(managerId),
                    getAllProfessionals(ownerId, activeClinicId || undefined),
                    getClinicServices(ownerId),
                    getClinics(ownerId)
                ]);
                setBillingRecords(
                    allBillings.filter(item => recordMatchesClinicScope(item, activeClinicId, clinics))
                );
                setProfessionals(allProfs);
                setServices(clinicServices.filter(service => service.active && (!activeClinicName || !service.unitName || service.unitName === activeClinicName)));
            } else {
                const [myBillings, clinics] = await Promise.all([
                    getAllBillingRecords(undefined, userId),
                    getClinics(managerId || userId),
                ]);
                setBillingRecords(
                    myBillings.filter(item => recordMatchesClinicScope(item, activeClinicId, clinics))
                );
            }
        } catch (error) {
            console.error('Error loading billing data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setNotification(null);

        try {
            const user = auth.currentUser;
            if (!user || !selectedProfessional) {
                throw new Error('Profissional ou usuário não encontrado.');
            }

            const grossAmount = Number(formData.grossAmount);
            const taxPercentage = Number(formData.taxPercentage);
            const repassePercentage = Number(formData.repassePercentage);
            const taxAmount = (grossAmount * taxPercentage) / 100;
            const amountAfterTax = grossAmount - taxAmount;
            const repasseAmount = (amountAfterTax * repassePercentage) / 100;
            const clinicAmount = amountAfterTax - repasseAmount;

            const managerId = await getManagerIdForUser(user.uid);
            if (!managerId) throw new Error('Não foi possível identificar a clínica responsável pelo faturamento.');
            const resolvedClinicId = activeClinicId || selectedProfessional.clinicId || selectedProfessional.clinicIds?.[0];
            if (!resolvedClinicId) throw new Error('Selecione uma unidade no topo antes de criar o faturamento.');

            const billingId = await processBilling({
                professionalId: selectedProfessional.id,
                professionalName: selectedProfessional.name,
                professionalUserId: selectedProfessional.userId,
                specialty: selectedProfessional.specialty,
                managerId,
                clinicId: resolvedClinicId,
                patientName: formData.patientName,
                consultationDate: formData.consultationDate,
                serviceId: formData.serviceId || undefined,
                serviceName: resolvedRule?.name || services.find(service => service.id === formData.serviceId)?.name,
                serviceRuleName: resolvedRule?.name,
                contractName: formData.contractName || resolvedRule?.contractName,
                unitName: formData.unitName || resolvedRule?.unitName,
                grossAmount,
                taxPercentage,
                repassePercentage,
                taxAmount,
                repasseAmount,
                clinicAmount,
                paymentMethod: formData.paymentMethod,
                paymentStatus: formData.paymentStatus,
                notes: formData.notes
            });

            if (!billingId) throw new Error('Não foi possível salvar o faturamento.');

            const transactionId = await addTransaction(managerId, {
                date: formData.consultationDate,
                description: `Faturamento - ${formData.patientName} (${selectedProfessional.name})`,
                category: 'Faturamento Médico',
                amount: grossAmount,
                type: 'income',
                status: formData.paymentStatus === 'received' ? 'paid' : 'pending',
                sourceBillingId: billingId,
                sourceType: 'billing',
                clinicId: resolvedClinicId,
                unitName: formData.unitName || resolvedRule?.unitName || activeClinicName
            });
            if (!transactionId) throw new Error('Não foi possível lançar a receita no financeiro.');

            setNotification({
                type: 'success',
                message: formData.paymentStatus === 'received'
                    ? 'Faturamento salvo e receita recebida adicionada ao financeiro.'
                    : 'Faturamento salvo e conta a receber criada no financeiro.'
            });

            setShowModal(false);
            setResolvedRule(null);
            loadData(isAdmin, user.uid);
            setFormData({
                professionalId: '',
                serviceId: '',
                patientName: '',
                consultationDate: new Date().toISOString().split('T')[0],
                grossAmount: '',
                taxPercentage: '0',
                repassePercentage: '70',
                paymentMethod: 'private',
                paymentStatus: 'received',
                contractName: '',
                unitName: '',
                notes: ''
            });
        } catch (error) {
            console.error('Error saving billing', error);
            setNotification({ type: 'error', message: error instanceof Error ? error.message : 'Erro ao salvar faturamento.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Excluir este faturamento permanentemente? Esta ação atualizará o dashboard e o financeiro.')) return;
        setLoading(true);
        try {
            const success = await deleteBillingRecord(id);
            setNotification({
                type: success ? 'success' : 'error',
                message: success ? 'Faturamento excluído com sucesso.' : 'Erro ao excluir faturamento.'
            });
            if (success) setBillingRecords(prev => prev.filter(b => b.id !== id));
        } finally {
            setLoading(false);
        }
    };

    const handleMarkReceived = async (billingId: string) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        setLoading(true);
        try {
            const managerId = (await getManagerIdForUser(currentUser.uid)) || currentUser.uid;
            const paymentDate = new Date().toISOString().split('T')[0];
            const billingUpdated = await updateBillingPaymentStatus(billingId, 'received', paymentDate);
            const financeUpdated = await updateTransactionStatusByBilling(managerId, billingId, 'paid', paymentDate);
            if (!billingUpdated || !financeUpdated) throw new Error('A baixa não pôde ser sincronizada integralmente.');
            setBillingRecords(current => current.map(item =>
                item.id === billingId ? { ...item, paymentStatus: 'received', paymentDate } : item
            ));
            setNotification({ type: 'success', message: 'Recebimento baixado e financeiro atualizado.' });
        } catch (error) {
            setNotification({ type: 'error', message: error instanceof Error ? error.message : 'Erro ao baixar recebimento.' });
        } finally {
            setLoading(false);
        }
    };

    const filteredBillings = billingRecords.filter(billing => {
        const patientName = billing.patientName || '';
        const matchesSearch =
            patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            billing.professionalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (billing.serviceName || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || billing.paymentStatus === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const totalRevenue = filteredBillings.reduce((sum, billing) => sum + billing.grossAmount, 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-teal-600" />
                        Gestão de Faturamento
                    </h1>
                    <p className="text-slate-500">Controle da produção faturada, regras comerciais e repasses.</p>
                </div>
                {isAdmin && (
                    <button onClick={() => setShowModal(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" />
                        Novo Faturamento
                    </button>
                )}
            </div>

            {notification && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                    <span className={notification.type === 'success' ? 'text-green-800' : 'text-red-800'}>{notification.message}</span>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-slate-500 block mb-1">Buscar</label>
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Paciente, profissional ou serviço..." className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500">
                        <option value="all">Todos</option>
                        <option value="received">Recebido</option>
                        <option value="pending">Pendente</option>
                    </select>
                </div>
                <div className="ml-auto flex items-center gap-2 bg-teal-50 px-4 py-2 rounded-lg border border-teal-100">
                    <span className="text-sm text-teal-700 font-medium">Total:</span>
                    <span className="text-lg font-bold text-teal-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 font-semibold text-slate-700">Data</th>
                            <th className="p-4 font-semibold text-slate-700">Profissional</th>
                            <th className="p-4 font-semibold text-slate-700">Paciente</th>
                            <th className="p-4 font-semibold text-slate-700">Serviço</th>
                            <th className="p-4 font-semibold text-slate-700">Valor</th>
                            <th className="p-4 font-semibold text-slate-700">Status</th>
                            <th className="p-4 font-semibold text-slate-700 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredBillings.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-500">Nenhum faturamento encontrado</td>
                            </tr>
                        ) : (
                            filteredBillings.map((billing) => (
                                <tr key={billing.id} className="border-b border-gray-100 hover:bg-gray-50 align-top">
                                    <td className="p-4 text-sm text-slate-600">
                                        {new Date(`${billing.consultationDate}T12:00:00`).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="p-4 text-sm text-slate-800 font-medium">
                                        <div>{billing.professionalName}</div>
                                        {billing.specialty && <div className="text-xs text-slate-500">{billing.specialty}</div>}
                                    </td>
                                    <td className="p-4 text-sm text-slate-800">{billing.patientName}</td>
                                    <td className="p-4 text-sm text-slate-600">
                                        <div>{billing.serviceName || '-'}</div>
                                        {(billing.contractName || billing.unitName) && (
                                            <div className="text-xs text-slate-400">
                                                {[billing.contractName, billing.unitName].filter(Boolean).join(' · ')}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm font-bold text-teal-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(billing.grossAmount)}</td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${billing.paymentStatus === 'received' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {billing.paymentStatus === 'received' ? 'Recebido' : 'Pendente'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                            {billing.paymentStatus === 'pending' && (
                                                <button onClick={() => handleMarkReceived(billing.id!)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700" title="Marcar como recebido">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Baixar
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(billing.id!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Excluir Lançamento">
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

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-bold text-slate-800">Novo Faturamento</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <Field label="Profissional">
                                    <select
                                        value={formData.professionalId}
                                        onChange={(e) => {
                                            const professional = professionals.find(item => item.id === e.target.value);
                                            setFormData({
                                                ...formData,
                                                professionalId: e.target.value,
                                                taxPercentage: professional ? String(professional.repasseConfig.taxRate || 0) : formData.taxPercentage,
                                                repassePercentage: professional ? String(professional.repasseConfig.splitPercentage || 70) : formData.repassePercentage
                                            });
                                        }}
                                        className="input"
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        {professionals.map(p => <option key={p.id} value={p.id}>{p.name} · {p.specialty}</option>)}
                                    </select>
                                </Field>

                                <Field label="Paciente">
                                    <input type="text" value={formData.patientName} onChange={(e) => setFormData({ ...formData, patientName: e.target.value })} className="input" required />
                                </Field>

                                <Field label="Serviço ou procedimento">
                                    <select
                                        value={formData.serviceId}
                                        onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                                        className="input"
                                    >
                                        <option value="">Lançamento avulso</option>
                                        {services.filter(service => service.payers?.length ? service.payers.includes(payer) : service.payer === payer).map(service => (
                                            <option key={service.id} value={service.id}>{service.name} · {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.grossPrice)}</option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Data da consulta">
                                    <input type="date" value={formData.consultationDate} onChange={(e) => setFormData({ ...formData, consultationDate: e.target.value })} className="input" required />
                                </Field>

                                <Field label="Contrato ou convênio">
                                    <input type="text" value={formData.contractName} onChange={(e) => setFormData({ ...formData, contractName: e.target.value })} className="input" placeholder="Opcional" />
                                </Field>

                                <Field label="Unidade">
                                    <input type="text" value={formData.unitName} onChange={(e) => setFormData({ ...formData, unitName: e.target.value })} className="input" placeholder="Opcional" />
                                </Field>

                                <Field label="Forma de pagamento">
                                    <select value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as 'private' | 'insurance', serviceId: '' })} className="input">
                                        <option value="private">Particular</option>
                                        <option value="insurance">Convênio</option>
                                    </select>
                                </Field>

                                <Field label="Status do pagamento">
                                    <select value={formData.paymentStatus} onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as 'received' | 'pending' })} className="input">
                                        <option value="received">Recebido</option>
                                        <option value="pending">Pendente</option>
                                    </select>
                                </Field>
                            </div>

                            <Field label="Valor bruto">
                                <input type="number" step="0.01" value={formData.grossAmount} onChange={(e) => setFormData({ ...formData, grossAmount: e.target.value })} className="input" required />
                            </Field>

                            {resolvedRule && (
                                <div className="rounded-lg border border-teal-100 bg-teal-50 p-3 text-sm text-teal-800">
                                    Regra aplicada: <strong>{resolvedRule.name}</strong>
                                    {resolvedRule.professionalName ? ` · ${resolvedRule.professionalName}` : ' · regra geral'}
                                    {resolvedRule.specialty ? ` · ${resolvedRule.specialty}` : ''}
                                    {(resolvedRule.contractName || resolvedRule.unitName) ? ` · ${[resolvedRule.contractName, resolvedRule.unitName].filter(Boolean).join(' · ')}` : ''}
                                </div>
                            )}

                            <div className="bg-teal-50 p-4 rounded-lg border border-teal-100 space-y-3">
                                <h4 className="text-sm font-semibold text-teal-800">Cálculo de Repasse</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Imposto (%)">
                                        <input type="number" step="0.01" min="0" max="100" value={formData.taxPercentage} onChange={(e) => setFormData({ ...formData, taxPercentage: e.target.value })} className="input" />
                                    </Field>
                                    <Field label="Repasse profissional (%)">
                                        <input type="number" step="0.01" min="0" max="100" value={formData.repassePercentage} onChange={(e) => setFormData({ ...formData, repassePercentage: e.target.value })} className="input" />
                                    </Field>
                                </div>
                                {formData.grossAmount && (
                                    <div className="pt-3 border-t border-teal-200 space-y-1 text-xs">
                                        <CalcRow label="Valor Bruto" value={Number(formData.grossAmount)} tone="text-slate-800" />
                                        <CalcRow label={`Imposto (${formData.taxPercentage}%)`} value={-((Number(formData.grossAmount) * Number(formData.taxPercentage)) / 100)} tone="text-red-600" />
                                        <CalcRow label={`Repasse (${formData.repassePercentage}%)`} value={((Number(formData.grossAmount) - (Number(formData.grossAmount) * Number(formData.taxPercentage)) / 100) * Number(formData.repassePercentage)) / 100} tone="text-teal-700" />
                                        <CalcRow label="Valor Clínica" value={(Number(formData.grossAmount) - (Number(formData.grossAmount) * Number(formData.taxPercentage)) / 100) - (((Number(formData.grossAmount) - (Number(formData.grossAmount) * Number(formData.taxPercentage)) / 100) * Number(formData.repassePercentage)) / 100)} tone="text-blue-700" strong />
                                    </div>
                                )}
                            </div>

                            <Field label="Observações">
                                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input min-h-24" rows={3} />
                            </Field>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-slate-700 hover:bg-gray-50">Cancelar</button>
                                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50">
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

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="block">
        <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
        <div className="[&_.input]:w-full [&_.input]:p-2.5 [&_.input]:border [&_.input]:border-gray-300 [&_.input]:rounded-lg [&_.input]:outline-none [&_.input]:focus:ring-2 [&_.input]:focus:ring-teal-500">{children}</div>
    </label>
);

const CalcRow = ({ label, value, tone, strong }: { label: string; value: number; tone: string; strong?: boolean }) => (
    <div className={`flex justify-between ${strong ? 'font-bold' : ''}`}>
        <span className="text-slate-600">{label}</span>
        <span className={tone}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}</span>
    </div>
);

export default BillingView;
