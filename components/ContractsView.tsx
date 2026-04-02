import React, { useState, useEffect } from 'react';
import { FileSignature, Plus, Search, Calendar, User, DollarSign, FileText, Trash2, Edit2, X, AlertCircle, Crown, Users } from 'lucide-react';
import { addContract, getContracts, updateContract, deleteContract } from '../services/contractService';
import { migrateProfessionalsToContracts } from '../services/migrationService';
import { Contract } from '../types/finance';
import { auth } from '../services/firebase';
import { canAddProfessional, getUserTierInfo } from '../services/accountTierService';
import { AccountTier, TIER_NAMES, getProfessionalLimitText } from '../types/accountTiers';
import { UserRole } from '../types';
import { createUserByAdmin, linkUserToManager, getUserByEmail } from '../services/userManagementService';
import { Lock, Copy, Check } from 'lucide-react';
import { getPendingRequestsForManager, approveLinkRequest, rejectLinkRequest } from '../services/clinicLinkService';
import { ClinicLinkRequest } from '../types/clinic_link_requests';
import { useUser } from '../contexts/UserContext';
import { RefreshCw } from 'lucide-react';

const ContractsView: React.FC = () => {
    const { user } = useUser();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);
    const [credentialsCopied, setCredentialsCopied] = useState(false);

    // Clinic Link Requests State
    const [linkRequests, setLinkRequests] = useState<ClinicLinkRequest[]>([]);

    // Tier info
    const [tierInfo, setTierInfo] = useState<{
        tier: AccountTier | null;
        isManager: boolean;
        professionalCount: number;
        limit: number | null;
    }>({ tier: null, isManager: false, professionalCount: 0, limit: null });

    // Form State
    const [formData, setFormData] = useState({
        providerName: '',
        personType: 'PJ' as 'PF' | 'PJ',
        cpf: '',
        cnpj: '',
        councilNumber: '',
        professionalType: '',
        serviceType: '',
        email: '',
        phone: '',
        startDate: '',
        endDate: '',
        paymentModel: 'fixed' as 'fixed' | 'commission',
        value: 0,
        commissionPercentage: 0,
        taxRate: 0,
        roomRentalAmount: 0,
        status: 'active' as Contract['status'],
        description: '',
        bankAccount: {
            bank: '',
            agency: '',
            account: '',
            accountType: 'checking' as 'checking' | 'savings',
            pixKey: ''
        },
        userCreation: {
            createUser: false,
            email: '',
            password: '',
            userType: 'health_professional' as 'health_professional' | 'biller' | 'autonomous_provider'
        }
    });

    const [activeTab, setActiveTab] = useState<'general' | 'financial' | 'bank' | 'credentials'>('general');
    const [activeView, setActiveView] = useState<'contracts' | 'requests'>('contracts');

    const professionalTypes = [
        'Médico',
        'Enfermeiro',
        'Fisioterapeuta',
        'Psicólogo',
        'Nutricionista',
        'Fonoaudiólogo',
        'Terapeuta Ocupacional',
        'Dentista',
        'Farmacêutico',
        'Outro'
    ];

    const specialties = [
        'Cardiologista',
        'Dermatologista',
        'Ortopedista',
        'Pediatra',
        'Ginecologista',
        'Neurologista',
        'Psiquiatra',
        'Clínico Geral',
        'Outro'
    ];

    useEffect(() => {
        if (user) {
            loadContracts();
            loadLinkRequests();
        }
    }, [user]);

    const loadContracts = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getContracts(user.uid);
            setContracts(data);

            // Load tier info
            const info = await getUserTierInfo(user.uid);
            setTierInfo({
                tier: info.tier,
                isManager: info.isManager,
                professionalCount: info.professionalCount,
                limit: info.limits?.maxProfessionals || null
            });
        } catch (error) {
            console.error("Error loading contracts", error);
        } finally {
            setLoading(false);
        }
    };

    const loadLinkRequests = async () => {
        try {
            if (user) {
                const requests = await getPendingRequestsForManager(user.uid);
                setLinkRequests(requests);
            }
        } catch (error) {
            console.error("Error loading link requests", error);
        }
    };

    const handleApproveLink = async (requestId: string) => {
        const user = auth.currentUser;
        if (!user) return;

        if (!confirm('Deseja aprovar este vínculo? Um contrato será criado automaticamente.')) return;

        setLoading(true);
        try {
            const result = await approveLinkRequest(requestId, user.uid);
            if (result.success) {
                alert('Vínculo aprovado e contrato criado com sucesso!');
                await loadLinkRequests();
                await loadContracts();
            } else {
                alert(`Erro ao aprovar vínculo: ${result.error}`);
            }
        } catch (error) {
            console.error('Error approving link:', error);
            alert('Erro ao aprovar vínculo');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectLink = async (requestId: string) => {
        const reason = prompt('Motivo da rejeição:');
        if (!reason) return;

        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        try {
            const result = await rejectLinkRequest(requestId, user.uid, reason);
            if (result.success) {
                alert('Solicitação rejeitada');
                await loadLinkRequests();
            } else {
                alert(`Erro ao rejeitar: ${result.error}`);
            }
        } catch (error) {
            console.error('Error rejecting link:', error);
            alert('Erro ao rejeitar solicitação');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            providerName: '',
            personType: 'PJ',
            cpf: '',
            cnpj: '',
            councilNumber: '',
            professionalType: '',
            serviceType: '',
            email: '',
            phone: '',
            startDate: '',
            endDate: '',
            paymentModel: 'fixed',
            value: 0,
            commissionPercentage: 0,
            taxRate: 0,
            roomRentalAmount: 0,
            status: 'active',
            description: '',
            bankAccount: {
                bank: '',
                agency: '',
                account: '',
                accountType: 'checking',
                pixKey: ''
            },
            userCreation: {
                createUser: false,
                email: '',
                password: '',
                userType: 'health_professional'
            }
        });
        setActiveTab('general');
        setEditingContract(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check professional limit if adding new contract
        if (!editingContract) {
            const user = auth.currentUser;
            if (user) {
                const limitCheck = await canAddProfessional(user.uid);
                if (!limitCheck.canAdd) {
                    alert(limitCheck.message || 'Limite de profissionais atingido');
                    return;
                }
            }
        }

        setLoading(true);

        try {
            let createdUserId: string | undefined;

            // Handle User Creation
            if (formData.userCreation.createUser && !editingContract) {
                if (!formData.userCreation.email || !formData.userCreation.password) {
                    alert("Email e senha são obrigatórios para criar um usuário.");
                    setLoading(false);
                    return;
                }

                if (!auth.currentUser) {
                    alert("Você precisa estar logado para criar usuários.");
                    setLoading(false);
                    return;
                }

                // Map userType to UserRole
                const roleMap: Record<string, UserRole> = {
                    'health_professional': UserRole.HEALTH_PROFESSIONAL,
                    'biller': UserRole.BILLER,
                    'autonomous_provider': UserRole.HEALTH_PROFESSIONAL // Map to health_professional as closest match
                };

                const result = await createUserByAdmin(auth.currentUser.uid, {
                    email: formData.userCreation.email,
                    password: formData.userCreation.password,
                    name: formData.providerName,
                    role: roleMap[formData.userCreation.userType] === UserRole.HEALTH_PROFESSIONAL ? 'professional' : 'biller',
                    phone: formData.phone,
                    specialty: formData.serviceType,
                    crm: formData.councilNumber,
                    accountTier: AccountTier.TRIAL, // Always assign Trial plan to contract users
                    isClinicManager: false,
                    managerId: auth.currentUser.uid
                });

                if (!result.success) {
                    // Check if error is due to email mismatch
                    const isEmailInUse = result.error && (
                        result.error.includes('email-already-in-use') ||
                        result.error.includes('já está em uso')
                    );

                    if (isEmailInUse) {
                        const shouldLink = confirm(
                            'Este e-mail já está cadastrado no sistema. Deseja vincular este novo contrato ao usuário existente?'
                        );

                        if (shouldLink) {
                            try {
                                const existingUser = await getUserByEmail(formData.userCreation.email);
                                if (existingUser) {
                                    createdUserId = existingUser.id;
                                    // Make sure we update their role/manager info if needed (optional, but good practice)
                                    // For now, we assume linking logic will handle the manager link later.
                                    console.log('Linking to existing user:', createdUserId);
                                } else {
                                    alert('Erro: Usuário não encontrado no banco de dados, apesar do e-mail constar como em uso.');
                                    setLoading(false);
                                    return;
                                }
                            } catch (err) {
                                console.error('Error fetching existing user:', err);
                                alert('Erro ao buscar dados do usuário existente.');
                                setLoading(false);
                                return;
                            }
                        } else {
                            // User chose not to link
                            setLoading(false);
                            return;
                        }
                    } else {
                        // Generic error
                        alert(`Erro ao criar usuário: ${result.error}`);
                        setLoading(false);
                        return;
                    }
                } else {
                    createdUserId = result.userId;
                }
            }

            const contractData: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> = {
                providerName: formData.providerName,
                personType: formData.personType,
                cpf: formData.personType === 'PF' ? formData.cpf : undefined,
                cnpj: formData.personType === 'PJ' ? formData.cnpj : undefined,
                councilNumber: formData.councilNumber,
                professionalType: formData.professionalType,
                serviceType: formData.serviceType,
                email: formData.email,
                phone: formData.phone,
                startDate: formData.startDate,
                endDate: formData.endDate,
                paymentModel: formData.paymentModel,
                value: Number(formData.value),
                commissionPercentage: formData.paymentModel === 'commission' ? Number(formData.commissionPercentage) : undefined,
                taxRate: Number(formData.taxRate),
                roomRentalAmount: Number(formData.roomRentalAmount),
                bankAccount: formData.bankAccount,
                status: formData.status,
                description: formData.description,
                managerId: auth.currentUser?.uid, // Add manager ID
                userId: createdUserId,
                userType: formData.userCreation.createUser ?
                    (formData.userCreation.userType === 'health_professional' ? 'professional' : formData.userCreation.userType)
                    : undefined
            };

            if (editingContract) {
                await updateContract(editingContract.id, contractData);
            } else {
                await addContract(contractData);
            }

            // If contract is active and has a user, ensure they are linked to the manager
            if (contractData.status === 'active' && contractData.userId && auth.currentUser) {
                await linkUserToManager(contractData.userId, auth.currentUser.uid);
            }

            setShowModal(false);
            resetForm();
            loadContracts();
        } catch (error) {
            console.error("Error saving contract", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este contrato?')) {
            await deleteContract(id);
            loadContracts();
        }
    };


    const handleMigration = async () => {
        if (!confirm('Deseja migrar os profissionais existentes para contratos? Isso pode gerar duplicatas se já houver contratos manuais.')) return;

        setLoading(true);
        try {
            const result = await migrateProfessionalsToContracts();
            alert(`Migração concluída!\nSucesso: ${result.success}\nFalhas: ${result.failed}`);
            loadContracts();
        } catch (error) {
            console.error('Migration error:', error);
            alert('Erro na migração. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };



    const handleEdit = (contract: Contract) => {
        setEditingContract(contract);
        setFormData({
            providerName: contract.providerName,
            personType: contract.personType || 'PJ',
            cpf: contract.cpf || '',
            cnpj: contract.cnpj || '',
            councilNumber: contract.councilNumber || '',
            professionalType: contract.professionalType || '',
            serviceType: contract.serviceType,
            email: contract.email || '',
            phone: contract.phone || '',
            startDate: contract.startDate,
            endDate: contract.endDate,
            paymentModel: contract.paymentModel || 'fixed',
            value: contract.value,
            commissionPercentage: contract.commissionPercentage || 0,
            taxRate: contract.taxRate || 0,
            roomRentalAmount: contract.roomRentalAmount || 0,
            status: contract.status,
            description: contract.description || '',
            bankAccount: {
                bank: contract.bankAccount?.bank || '',
                agency: contract.bankAccount?.agency || '',
                account: contract.bankAccount?.account || '',
                accountType: contract.bankAccount?.accountType || 'checking',
                pixKey: contract.bankAccount?.pixKey || ''
            },
            userCreation: {
                createUser: false,
                email: '',
                password: '',
                userType: 'health_professional'
            }
        });
        setActiveTab('general');
        setShowModal(true);
    };

    const filteredContracts = contracts.filter(c =>
        c.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.serviceType.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalValue = contracts.reduce((sum, c) => sum + (c.status === 'active' ? c.value : 0), 0);
    const expiringContracts = contracts.filter(c => {
        if (c.status !== 'active') return false;
        const end = new Date(c.endDate);
        const today = new Date();
        const diffTime = Math.abs(end.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && end > today;
    }).length;

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <FileSignature className="w-8 h-8 text-blue-600" />
                            Contratos de Prestadores
                        </h1>
                        <p className="text-slate-600 mt-1">Gerencie contratos de prestadores de serviço</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        {/* Tier Usage Indicator */}
                        {tierInfo.isManager && tierInfo.tier && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200">
                                <Crown className="w-5 h-5 text-purple-600" />
                                <div className="text-sm">
                                    <span className="font-bold text-slate-800">
                                        {tierInfo.professionalCount}
                                        {tierInfo.limit !== null && `/${tierInfo.limit}`}
                                    </span>
                                    <span className="text-slate-500 ml-1">profissionais</span>
                                </div>
                                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                                    {TIER_NAMES[tierInfo.tier]}
                                </span>
                            </div>
                        )}
                        {auth.currentUser?.email === 'elsoncontador.st@gmail.com' && (
                            <button
                                onClick={handleMigration}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-lg"
                            >
                                <FileText className="w-5 h-5" />
                                Migrar Legado
                            </button>
                        )}
                        <button
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Contrato
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 font-medium">Contratos Ativos</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">
                                    {contracts.filter(c => c.status === 'active').length}
                                </p>
                            </div>
                            <FileSignature className="w-10 h-10 text-blue-500 opacity-20" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 font-medium">Prestadores</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">{contracts.length}</p>
                            </div>
                            <User className="w-10 h-10 text-green-500 opacity-20" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 font-medium">Vencendo em 30 dias</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">{expiringContracts}</p>
                            </div>
                            <Calendar className="w-10 h-10 text-yellow-500 opacity-20" />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 font-medium">Valor Total Mensal</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                                </p>
                            </div>
                            <DollarSign className="w-10 h-10 text-purple-500 opacity-20" />
                        </div>
                    </div>
                </div>

                {/* Main View Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveView('contracts')}
                        className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeView === 'contracts'
                            ? 'text-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Contratos Ativos
                        {activeView === 'contracts' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveView('requests')}
                        className={`px-6 py-3 font-medium text-sm transition-colors relative flex items-center gap-2 ${activeView === 'requests'
                            ? 'text-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Usuários Pendentes
                        {linkRequests.length > 0 && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-bold">
                                {linkRequests.length}
                            </span>
                        )}
                        {activeView === 'requests' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* Content based on Active View */}
                {activeView === 'requests' ? (
                    /* Clinic Link Requests Section */
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                            <Users className="w-5 h-5 text-slate-600" />
                            <h3 className="font-bold text-slate-800">
                                Solicitações de Vínculo ({linkRequests.length})
                            </h3>
                            <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded ml-2" title="Seu ID de Gestor">
                                ID: {user?.uid.slice(0, 8)}...
                            </span>
                            <button
                                onClick={loadLinkRequests}
                                className="ml-auto p-1 text-blue-600 hover:bg-blue-100 rounded-full"
                                title="Atualizar solicitações"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                        {linkRequests.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                Nenhuma solicitação pendente.
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="p-4 font-semibold text-slate-700">Profissional</th>
                                        <th className="p-4 font-semibold text-slate-700">Especialidade</th>
                                        <th className="p-4 font-semibold text-slate-700">Contato</th>
                                        <th className="p-4 font-semibold text-slate-700">Data</th>
                                        <th className="p-4 font-semibold text-slate-700 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/50">
                                    {linkRequests.map(request => (
                                        <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <p className="font-medium text-slate-900">{request.userName}</p>
                                                {request.userCrm && <p className="text-xs text-slate-500">CRM: {request.userCrm}</p>}
                                            </td>
                                            <td className="p-4 text-slate-700">{request.userSpecialty || 'Não informado'}</td>
                                            <td className="p-4 text-slate-700">
                                                <div className="text-sm">
                                                    {request.userEmail && <div className="flex items-center gap-1"><span className="text-xs">✉️</span> {request.userEmail}</div>}
                                                    {request.userPhone && <div className="flex items-center gap-1"><span className="text-xs">📞</span> {request.userPhone}</div>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600 text-sm">
                                                {request.requestDate?.toDate ? new Date(request.requestDate.toDate()).toLocaleDateString('pt-BR') : 'N/A'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleApproveLink(request.id)}
                                                        disabled={loading}
                                                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm disabled:opacity-50"
                                                    >
                                                        Aprovar
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectLink(request.id)}
                                                        disabled={loading}
                                                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium disabled:opacity-50"
                                                    >
                                                        Rejeitar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : (
                    /* Contracts List Section */
                    <>

                        {/* Pending Requests Section */}
                        {contracts.some(c => c.status === 'pending') && (
                            <div className="bg-orange-50 rounded-xl shadow-lg overflow-hidden border border-orange-200">
                                <div className="p-4 border-b border-orange-200 bg-orange-100 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-orange-600" />
                                    <h3 className="font-bold text-orange-800">Solicitações Pendentes</h3>
                                </div>
                                <table className="w-full text-left">
                                    <thead className="bg-orange-50/50">
                                        <tr>
                                            <th className="p-4 font-semibold text-orange-900">Prestador</th>
                                            <th className="p-4 font-semibold text-orange-900">Especialidade</th>
                                            <th className="p-4 font-semibold text-orange-900">Contato</th>
                                            <th className="p-4 font-semibold text-orange-900 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-orange-200/50">
                                        {contracts.filter(c => c.status === 'pending').map(contract => (
                                            <tr key={contract.id} className="hover:bg-orange-100/50 transition-colors">
                                                <td className="p-4">
                                                    <p className="font-medium text-slate-900">{contract.providerName}</p>
                                                    {contract.councilNumber && <p className="text-xs text-slate-500">CRM: {contract.councilNumber}</p>}
                                                </td>
                                                <td className="p-4 text-slate-700">{contract.serviceType}</td>
                                                <td className="p-4 text-slate-700">
                                                    <div className="text-sm">
                                                        {contract.email && <div className="flex items-center gap-1"><span className="text-xs">✉️</span> {contract.email}</div>}
                                                        {contract.phone && <div className="flex items-center gap-1"><span className="text-xs">📞</span> {contract.phone}</div>}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEdit(contract)}
                                                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm"
                                                        >
                                                            Analisar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(contract.id)}
                                                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                                                        >
                                                            Rejeitar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Search Bar */}
                        <div className="bg-white rounded-xl shadow-lg p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome do prestador ou serviço..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Contracts List */}
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-semibold text-slate-700">Prestador</th>
                                        <th className="p-4 font-semibold text-slate-700">Serviço</th>
                                        <th className="p-4 font-semibold text-slate-700">Vigência</th>
                                        <th className="p-4 font-semibold text-slate-700">Valor</th>
                                        <th className="p-4 font-semibold text-slate-700">Status</th>
                                        <th className="p-4 font-semibold text-slate-700 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredContracts.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-500">
                                                Nenhum contrato encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredContracts.map(contract => (
                                            <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4">
                                                    <p className="font-medium text-slate-900">{contract.providerName}</p>
                                                    <div className="text-xs text-slate-500 flex flex-col">
                                                        <span>{contract.personType === 'PF' ? `CPF: ${contract.cpf}` : `CNPJ: ${contract.cnpj}`}</span>
                                                        {contract.councilNumber && <span>Conselho: {contract.councilNumber}</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-slate-600">{contract.serviceType}</td>
                                                <td className="p-4 text-slate-600 text-sm">
                                                    {new Date(contract.startDate).toLocaleDateString('pt-BR')} - {new Date(contract.endDate).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="p-4 font-medium text-slate-900">
                                                    {contract.paymentModel === 'commission' ? (
                                                        <span>{contract.commissionPercentage}% Comissão</span>
                                                    ) : (
                                                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${contract.status === 'active' ? 'bg-green-100 text-green-700' :
                                                        contract.status === 'expired' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {contract.status === 'active' ? 'Ativo' : contract.status === 'expired' ? 'Vencido' : 'Pendente'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEdit(contract)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(contract.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
                    </>
                )}


                {/* Modal */}
                {
                    showModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                                    <h2 className="text-xl font-bold text-slate-800">
                                        {editingContract ? 'Editar Contrato' : 'Novo Contrato'}
                                    </h2>
                                    <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-700">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex border-b border-gray-200 mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('general')}
                                        className={`px-4 py-2 font-medium text-sm ${activeTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Dados Gerais
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('financial')}
                                        className={`px-4 py-2 font-medium text-sm ${activeTab === 'financial' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Financeiro e Repasse
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('bank')}
                                        className={`px-4 py-2 font-medium text-sm ${activeTab === 'bank' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Dados Bancários
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('credentials')}
                                        className={`px-4 py-2 font-medium text-sm ${activeTab === 'credentials' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Credenciais de Acesso
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                    {activeTab === 'general' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium text-slate-700">Tipo de Pessoa</label>
                                                    <div className="flex gap-4 mt-1">
                                                        <label className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                checked={formData.personType === 'PF'}
                                                                onChange={() => setFormData({ ...formData, personType: 'PF' })}
                                                                className="text-blue-600"
                                                            />
                                                            <span className="text-sm text-slate-700">Pessoa Física</span>
                                                        </label>
                                                        <label className="flex items-center gap-2">
                                                            <input
                                                                type="radio"
                                                                checked={formData.personType === 'PJ'}
                                                                onChange={() => setFormData({ ...formData, personType: 'PJ' })}
                                                                className="text-blue-600"
                                                            />
                                                            <span className="text-sm text-slate-700">Pessoa Jurídica</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-span-2">
                                                <label className="text-sm font-medium text-slate-700">Prestador *</label>
                                                <input
                                                    type="text"
                                                    value={formData.providerName}
                                                    onChange={e => setFormData({ ...formData, providerName: e.target.value })}
                                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>

                                            {formData.personType === 'PF' ? (
                                                <div>
                                                    <label className="text-sm font-medium text-slate-700">CPF</label>
                                                    <input
                                                        type="text"
                                                        value={formData.cpf}
                                                        onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="000.000.000-00"
                                                    />
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="text-sm font-medium text-slate-700">CNPJ</label>
                                                    <input
                                                        type="text"
                                                        value={formData.cnpj}
                                                        onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="00.000.000/0000-00"
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <label className="text-sm font-medium text-slate-700">Nº Conselho (CRM/CRP...)</label>
                                                <input
                                                    type="text"
                                                    value={formData.councilNumber}
                                                    onChange={e => setFormData({ ...formData, councilNumber: e.target.value })}
                                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium text-slate-700">Tipo *</label>
                                                <select
                                                    value={formData.professionalType}
                                                    onChange={e => setFormData({ ...formData, professionalType: e.target.value })}
                                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                >
                                                    <option value="">Selecione o tipo...</option>
                                                    {professionalTypes.map(type => (
                                                        <option key={type} value={type}>{type}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-slate-700">Especialidade</label>
                                                <select
                                                    value={formData.serviceType}
                                                    onChange={e => setFormData({ ...formData, serviceType: e.target.value })}
                                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Selecione a especialidade...</option>
                                                    {specialties.map(spec => (
                                                        <option key={spec} value={spec}>{spec}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-slate-700">Email</label>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-slate-700">Telefone</label>
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-slate-700">Data Início *</label>
                                                <input
                                                    type="date"
                                                    value={formData.startDate}
                                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-slate-700">Data Fim *</label>
                                                <input
                                                    type="date"
                                                    value={formData.endDate}
                                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-sm font-medium text-slate-700">Descrição/Observações</label>
                                                <textarea
                                                    value={formData.description}
                                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                    rows={3}
                                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    )
                                    }

                                    {
                                        activeTab === 'financial' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium text-slate-700">Modelo de Pagamento</label>
                                                    <select
                                                        value={formData.paymentModel}
                                                        onChange={e => setFormData({ ...formData, paymentModel: e.target.value as any })}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="fixed">Valor Fixo Mensal</option>
                                                        <option value="commission">Por Comissão</option>
                                                    </select>
                                                </div>

                                                {formData.paymentModel === 'fixed' ? (
                                                    <div>
                                                        <label className="text-sm font-medium text-slate-700">Valor Mensal (R$) *</label>
                                                        <input
                                                            type="number"
                                                            value={formData.value}
                                                            onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                            required
                                                        />
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label className="text-sm font-medium text-slate-700">Comissão (%) *</label>
                                                        <input
                                                            type="number"
                                                            value={formData.commissionPercentage}
                                                            onChange={e => setFormData({ ...formData, commissionPercentage: Number(e.target.value) })}
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                            required
                                                            min="0"
                                                            max="100"
                                                            step="0.1"
                                                        />
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="text-sm font-medium text-slate-700">Imposto (%)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.taxRate}
                                                        onChange={e => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                    />
                                                    <p className="text-xs text-slate-500 mt-1">Descontado do valor bruto</p>
                                                </div>

                                                <div>
                                                    <label className="text-sm font-medium text-slate-700">Aluguel Sala (R$)</label>
                                                    <input
                                                        type="number"
                                                        value={formData.roomRentalAmount}
                                                        onChange={e => setFormData({ ...formData, roomRentalAmount: Number(e.target.value) })}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    <p className="text-xs text-slate-500 mt-1">Valor fixo mensal</p>
                                                </div>
                                            </div>
                                        )
                                    }

                                    {
                                        activeTab === 'bank' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium text-slate-700">Banco</label>
                                                    <input
                                                        type="text"
                                                        value={formData.bankAccount.bank}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            bankAccount: { ...formData.bankAccount, bank: e.target.value }
                                                        })}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-slate-700">Tipo de Conta</label>
                                                    <select
                                                        value={formData.bankAccount.accountType}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            bankAccount: { ...formData.bankAccount, accountType: e.target.value as any }
                                                        })}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="checking">Corrente</option>
                                                        <option value="savings">Poupança</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-slate-700">Agência</label>
                                                    <input
                                                        type="text"
                                                        value={formData.bankAccount.agency}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            bankAccount: { ...formData.bankAccount, agency: e.target.value }
                                                        })}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-slate-700">Conta</label>
                                                    <input
                                                        type="text"
                                                        value={formData.bankAccount.account}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            bankAccount: { ...formData.bankAccount, account: e.target.value }
                                                        })}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-sm font-medium text-slate-700">Chave PIX</label>
                                                    <input
                                                        type="text"
                                                        value={formData.bankAccount.pixKey}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            bankAccount: { ...formData.bankAccount, pixKey: e.target.value }
                                                        })}
                                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="CPF, Email, Telefone ou Chave Aleatória"
                                                    />
                                                </div>
                                            </div>
                                        )
                                    }

                                    {activeTab === 'credentials' && (
                                        <div className="space-y-4">
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                                                <div className="text-sm text-blue-800">
                                                    <p className="font-bold mb-1">Criação de Usuário</p>
                                                    <p>Crie um usuário para que este prestador possa acessar o sistema. As credenciais devem ser enviadas manualmente.</p>
                                                </div>
                                            </div>

                                            {!editingContract && (
                                                <div className="flex items-center gap-2 mb-4">
                                                    <input
                                                        type="checkbox"
                                                        id="createUser"
                                                        checked={formData.userCreation.createUser}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            userCreation: { ...formData.userCreation, createUser: e.target.checked }
                                                        })}
                                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                    />
                                                    <label htmlFor="createUser" className="text-sm font-medium text-slate-700">
                                                        Criar usuário de acesso para este contrato
                                                    </label>
                                                </div>
                                            )}

                                            {formData.userCreation.createUser && (
                                                <div className="space-y-4 animate-fade-in">
                                                    <div>
                                                        <label className="text-sm font-medium text-slate-700">Tipo de Usuário</label>
                                                        <select
                                                            value={formData.userCreation.userType}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                userCreation: { ...formData.userCreation, userType: e.target.value as any }
                                                            })}
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                        >
                                                            <option value="health_professional">Profissional de Saúde</option>
                                                            <option value="biller">Faturista</option>
                                                            <option value="autonomous_provider">Prestador Autônomo</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-sm font-medium text-slate-700">E-mail de Login</label>
                                                        <input
                                                            type="email"
                                                            value={formData.userCreation.email}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                userCreation: { ...formData.userCreation, email: e.target.value }
                                                            })}
                                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                            placeholder="email@exemplo.com"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="text-sm font-medium text-slate-700">Senha Inicial</label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={formData.userCreation.password}
                                                                onChange={(e) => setFormData({
                                                                    ...formData,
                                                                    userCreation: { ...formData.userCreation, password: e.target.value }
                                                                })}
                                                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                                                placeholder="Senha forte"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
                                                                    setFormData({
                                                                        ...formData,
                                                                        userCreation: { ...formData.userCreation, password: randomPassword }
                                                                    });
                                                                }}
                                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-slate-100 px-2 py-1 rounded hover:bg-slate-200"
                                                            >
                                                                Gerar
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {formData.userCreation.email && formData.userCreation.password && (
                                                        <div className="bg-slate-50 p-3 rounded border border-slate-200 mt-2">
                                                            <p className="text-xs text-slate-500 mb-1">Credenciais para envio:</p>
                                                            <div className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                                                                <code className="text-xs">
                                                                    Login: {formData.userCreation.email}<br />
                                                                    Senha: {formData.userCreation.password}
                                                                </code>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(`Login: ${formData.userCreation.email}\nSenha: ${formData.userCreation.password}`);
                                                                        setCredentialsCopied(true);
                                                                        setTimeout(() => setCredentialsCopied(false), 2000);
                                                                    }}
                                                                    className="p-1 text-slate-400 hover:text-blue-600"
                                                                    title="Copiar"
                                                                >
                                                                    {credentialsCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-gray-100">
                                        <div className="mb-4">
                                            <label className="text-sm font-medium text-slate-700">Status</label>
                                            <select
                                                value={formData.status}
                                                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="active">Ativo</option>
                                                <option value="pending">Pendente</option>
                                                <option value="expired">Vencido</option>
                                            </select>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
                                        >
                                            {loading ? 'Salvando...' : editingContract ? 'Atualizar Contrato' : 'Salvar Contrato'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
};

export default ContractsView;
