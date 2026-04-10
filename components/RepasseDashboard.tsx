import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calculator, Users, FileText, Plus, Calendar } from 'lucide-react';
import {
    getAllProfessionals,
    getAllBillingRecords,
    getRepasseStatements,
    getProfessionalStats
} from '../services/repasseService';
import { Professional, ConsultationBilling, RepasseStatement } from '../types/finance';
import { useUser } from '../contexts/UserContext';
import { auth } from '../services/firebase';

// Only the master admin defined in services can bypass clinic filtering
const MASTER_ADMIN_EMAIL = 'elsoncontador.st@gmail.com';

const RepasseDashboard: React.FC = () => {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [recentBillings, setRecentBillings] = useState<ConsultationBilling[]>([]);
    const [pendingStatements, setPendingStatements] = useState<RepasseStatement[]>([]);
    const [totalStats, setTotalStats] = useState({
        totalRevenue: 0,
        pendingRevenue: 0,
        totalProfessionals: 0,
        pendingRepasse: 0
    });
    const { userProfile, isAdminMaster, isAdmin: isSystemAdmin } = useUser();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, [userProfile]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Determine if user should see everything or just their clinic
            // Only Master Admin sees everything. Others see only their managerId-linked data.
            const managerId = isAdminMaster ? undefined : user.uid;

            const [profsData, billingsData, statementsData] = await Promise.all([
                getAllProfessionals(managerId),
                getAllBillingRecords(managerId),
                getRepasseStatements(managerId)
            ]);

            setProfessionals(profsData);
            setRecentBillings(billingsData.slice(0, 10));

            const pending = statementsData.filter(s => s.status === 'draft' || s.status === 'approved');
            setPendingStatements(pending);

            // Calculate total stats
            const totalRevenue = billingsData
                .filter(b => b.paymentStatus === 'received')
                .reduce((sum, b) => sum + b.grossAmount, 0);

            const pendingRevenue = billingsData
                .filter(b => b.paymentStatus === 'pending')
                .reduce((sum, b) => sum + b.grossAmount, 0);

            const pendingRepasse = pending.reduce((sum, s) => sum + s.netAmount, 0);

            setTotalStats({
                totalRevenue,
                pendingRevenue,
                totalProfessionals: profsData.length,
                pendingRepasse
            });
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700' },
            received: { label: 'Recebido', className: 'bg-green-100 text-green-700' },
            cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
            draft: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700' },
            approved: { label: 'Aprovado', className: 'bg-blue-100 text-blue-700' },
            paid: { label: 'Pago', className: 'bg-green-100 text-green-700' }
        };

        const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
        return (
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}>
                {statusInfo.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <DollarSign className="w-8 h-8 text-green-600" />
                            Dashboard de Repasse
                        </h1>
                        <p className="text-slate-600 mt-1">Gestão financeira e repasse de profissionais</p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 font-medium">Faturamento Total</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    {formatCurrency(totalStats.totalRevenue)}
                                </p>
                            </div>
                            <TrendingUp className="w-10 h-10 text-green-500 opacity-20" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 font-medium">Faturamento Pendente</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    {formatCurrency(totalStats.pendingRevenue)}
                                </p>
                            </div>
                            <Calendar className="w-10 h-10 text-yellow-500 opacity-20" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 font-medium">Profissionais Ativos</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    {totalStats.totalProfessionals}
                                </p>
                            </div>
                            <Users className="w-10 h-10 text-blue-500 opacity-20" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 font-medium">Repasse Pendente</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    {formatCurrency(totalStats.pendingRepasse)}
                                </p>
                            </div>
                            <Calculator className="w-10 h-10 text-purple-500 opacity-20" />
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Billings */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-green-600" />
                                Faturamentos Recentes
                            </h2>
                            <button className="p-2 hover:bg-green-50 rounded-lg transition-colors">
                                <Plus className="w-5 h-5 text-green-600" />
                            </button>
                        </div>

                        {recentBillings.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>Nenhum faturamento registrado</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {recentBillings.map((billing) => (
                                    <div
                                        key={billing.id}
                                        className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-semibold text-slate-900">{billing.professionalName}</p>
                                                {billing.patientName && (
                                                    <p className="text-sm text-slate-600">Paciente: {billing.patientName}</p>
                                                )}
                                            </div>
                                            {getStatusBadge(billing.paymentStatus)}
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-sm text-slate-600">{formatDate(billing.consultationDate)}</span>
                                            <span className="text-lg font-bold text-green-600">
                                                {formatCurrency(billing.grossAmount)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending Repasse Statements */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Calculator className="w-6 h-6 text-purple-600" />
                                Repasses Pendentes
                            </h2>
                            <button className="p-2 hover:bg-purple-50 rounded-lg transition-colors">
                                <Plus className="w-5 h-5 text-purple-600" />
                            </button>
                        </div>

                        {pendingStatements.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>Nenhum repasse pendente</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {pendingStatements.map((statement) => (
                                    <div
                                        key={statement.id}
                                        className="p-4 bg-purple-50 rounded-lg border border-purple-100 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-semibold text-slate-900">{statement.professionalName}</p>
                                                <p className="text-sm text-slate-600">
                                                    {formatDate(statement.periodStart)} - {formatDate(statement.periodEnd)}
                                                </p>
                                            </div>
                                            {getStatusBadge(statement.status)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-purple-200">
                                            <div>
                                                <p className="text-xs text-slate-600">Faturamento Bruto</p>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {formatCurrency(statement.totalGross)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-600">Valor Líquido</p>
                                                <p className="text-sm font-bold text-green-600">
                                                    {formatCurrency(statement.netAmount)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Professionals Overview */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
                        <Users className="w-6 h-6 text-blue-600" />
                        Profissionais Cadastrados
                    </h2>

                    {professionals.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Nenhum profissional cadastrado</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {professionals.map((professional) => (
                                <div
                                    key={professional.id}
                                    className="p-4 bg-blue-50 rounded-lg border border-blue-100 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-semibold text-slate-900">{professional.name}</p>
                                            <p className="text-sm text-slate-600">{professional.specialty}</p>
                                        </div>
                                        <span className={`w-3 h-3 rounded-full ${professional.active ? 'bg-green-500' : 'bg-red-500'}`} />
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-blue-200 space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-600">Imposto:</span>
                                            <span className="font-medium text-slate-900">{professional.repasseConfig.taxRate}%</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-600">Aluguel:</span>
                                            <span className="font-medium text-slate-900">
                                                {formatCurrency(professional.repasseConfig.roomRentalAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RepasseDashboard;
