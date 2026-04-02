import React from 'react';
import { User } from 'firebase/auth';
import { UserSubscription } from '../services/firebase';
import { PROFESSIONAL_ROLES, MEDICAL_SPECIALTIES } from '../utils/professionalConstants';
import { User as UserIcon, Mail, Settings, X, Search, Loader2, Building2, MapPin, Shield } from 'lucide-react';
import { ProfessionalSettings } from '../types';
import { fetchCNPJData, formatCNPJ, formatCPF, validateCNPJ, validateCPF } from '../services/cnpjCnesService';

interface UserProfileViewProps {
    user: User;
    subscription: UserSubscription | null;
    isTrial: boolean;
    trialHoursLeft?: number;
    onSubscriptionActive?: () => Promise<void>;
}

import { useUser } from '../contexts/UserContext';

const UserProfileView: React.FC<UserProfileViewProps> = ({ user, subscription, isTrial, trialHoursLeft, onSubscriptionActive }) => {
    const { refreshUserData, userProfile: contextUserProfile } = useUser();
    const isClinicManager = contextUserProfile?.isClinicManager;

    const [professionalSettings, setProfessionalSettings] = React.useState<ProfessionalSettings>({
        professionalName: '',
        profession: '',
        role: '',
        specialty: '',
        serviceHours: '',
        logoUrl: '',
        crm: '',
        phone: '',
        email: ''
    });
    const [loadingSettings, setLoadingSettings] = React.useState(false);
    const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
    const [isCustomRole, setIsCustomRole] = React.useState(false);
    const [isCustomSpecialty, setIsCustomSpecialty] = React.useState(false);

    // New states for CPF/CNPJ/CNES
    const [cpfCnpj, setCpfCnpj] = React.useState('');
    const [documentType, setDocumentType] = React.useState<'cpf' | 'cnpj' | ''>('');
    const [loadingCNPJ, setLoadingCNPJ] = React.useState(false);
    const [cnpjError, setCnpjError] = React.useState<string | null>(null);
    const [addressData, setAddressData] = React.useState({
        razaoSocial: '',
        nomeFantasia: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        municipio: '',
        uf: '',
        cep: '',
        telefone: ''
    });

    // Clinic Linking State
    const [linkCnpj, setLinkCnpj] = React.useState('');
    const [foundClinic, setFoundClinic] = React.useState<{ managerId: string; name: string } | null>(null);
    const [linkLoading, setLinkLoading] = React.useState(false);
    const [linkMessage, setLinkMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

    React.useEffect(() => {
        if (user) {
            loadSettings();
        }
    }, [user]);

    const loadSettings = async () => {
        try {
            // Dynamically import to avoid circular dependencies if any, though here it's fine
            const { getProfessionalSettings } = await import('../services/userDataService');
            const { getUserProfile } = await import('../services/userRoleService');

            const settings = await getProfessionalSettings(user.uid);
            const userProfile = await getUserProfile(user.uid);

            if (settings) {
                setProfessionalSettings({
                    professionalName: settings.professionalName || '',
                    profession: settings.profession || '',
                    role: settings.role || '',
                    specialty: settings.specialty || '',
                    serviceHours: settings.serviceHours || '',
                    logoUrl: settings.logoUrl || '',
                    crm: settings.crm || '',
                    phone: settings.phone || '',
                    email: settings.email || user.email || ''
                });

                // Check for custom values
                if (settings.role && !PROFESSIONAL_ROLES.includes(settings.role)) {
                    setIsCustomRole(true);
                }
                if (settings.specialty && !MEDICAL_SPECIALTIES.includes(settings.specialty)) {
                    setIsCustomSpecialty(true);
                }
            } else {
                // Pre-fill name from Auth if no settings exist
                setProfessionalSettings(prev => ({
                    ...prev,
                    professionalName: user.displayName || '',
                    role: 'Médico',
                    email: user.email || ''
                }));
            }

            // Load user profile data for CPF/CNPJ/CNES
            if (userProfile) {
                if (userProfile.cpf) {
                    setCpfCnpj(formatCPF(userProfile.cpf));
                    setDocumentType('cpf');
                } else if (userProfile.cnpj) {
                    setCpfCnpj(formatCNPJ(userProfile.cnpj));
                    setDocumentType('cnpj');
                }

                setAddressData({
                    razaoSocial: userProfile.razaoSocial || '',
                    nomeFantasia: userProfile.nomeFantasia || '',
                    logradouro: userProfile.logradouro || '',
                    numero: userProfile.numero || '',
                    complemento: userProfile.complemento || '',
                    bairro: userProfile.bairro || '',
                    municipio: userProfile.municipio || '',
                    uf: userProfile.uf || '',
                    cep: userProfile.cep || '',
                    telefone: userProfile.telefone || professionalSettings.phone || ''
                });
            }
        } catch (error) {
            console.error("Error loading settings", error);
        }
    };

    const handleCpfCnpjChange = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        setCnpjError(null);

        if (cleaned.length === 0) {
            setCpfCnpj('');
            setDocumentType('');
            return;
        }

        if (cleaned.length <= 11) {
            setCpfCnpj(formatCPF(cleaned));
            setDocumentType('cpf');
        } else {
            setCpfCnpj(formatCNPJ(cleaned));
            setDocumentType('cnpj');

            // Auto-fetch CNPJ data when complete
            if (cleaned.length === 14) {
                handleFetchCNPJ(cleaned);
            }
        }
    };

    const handleFetchCNPJ = async (cnpj?: string) => {
        const cnpjToFetch = cnpj || cpfCnpj.replace(/\D/g, '');

        if (!validateCNPJ(cnpjToFetch)) {
            setCnpjError('CNPJ inválido');
            return;
        }

        setLoadingCNPJ(true);
        setCnpjError(null);

        try {
            const data = await fetchCNPJData(cnpjToFetch);

            if (data) {
                setAddressData({
                    razaoSocial: data.razao_social,
                    nomeFantasia: data.nome_fantasia,
                    logradouro: data.logradouro,
                    numero: data.numero,
                    complemento: data.complemento,
                    bairro: data.bairro,
                    municipio: data.municipio,
                    uf: data.uf,
                    cep: data.cep,
                    telefone: data.telefone || addressData.telefone
                });
                setSaveMessage('Dados do CNPJ carregados com sucesso!');
                setTimeout(() => setSaveMessage(null), 3000);
            } else {
                setCnpjError('CNPJ não encontrado na base de dados');
            }
        } catch (error) {
            setCnpjError('Erro ao buscar dados do CNPJ');
            console.error('Error fetching CNPJ:', error);
        } finally {
            setLoadingCNPJ(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingSettings(true);
        setSaveMessage(null);
        try {
            const { saveProfessionalSettings } = await import('../services/userDataService');
            const { saveProfessional } = await import('../services/repasseService');
            const { saveUserProfile } = await import('../services/userRoleService');

            // Save to user settings
            await saveProfessionalSettings(user.uid, professionalSettings);

            // Save user profile with CPF/CNPJ/CNES data
            const cleanedCpfCnpj = cpfCnpj.replace(/\D/g, '');
            await saveUserProfile(user.uid, {
                uid: user.uid,
                email: user.email || '',
                role: 'HEALTH_PROFESSIONAL' as any,
                displayName: professionalSettings.professionalName,
                jobTitle: professionalSettings.role,
                function: professionalSettings.specialty,
                cpf: documentType === 'cpf' ? cleanedCpfCnpj : undefined,
                cnpj: documentType === 'cnpj' ? cleanedCpfCnpj : undefined,
                razaoSocial: addressData.razaoSocial || undefined,
                nomeFantasia: addressData.nomeFantasia || undefined,
                telefone: addressData.telefone || professionalSettings.phone || undefined,
                cep: addressData.cep || undefined,
                logradouro: addressData.logradouro || undefined,
                numero: addressData.numero || undefined,
                complemento: addressData.complemento || undefined,
                bairro: addressData.bairro || undefined,
                municipio: addressData.municipio || undefined,
                uf: addressData.uf || undefined
            });

            // Also save/update in professionals database for appointments
            await saveProfessional({
                userId: user.uid,
                name: professionalSettings.professionalName,
                specialty: professionalSettings.specialty || professionalSettings.role,
                crm: professionalSettings.crm || '',
                phone: professionalSettings.phone || '',
                email: professionalSettings.email || user.email || '',
                active: true
            });

            setSaveMessage("Perfil profissional salvo com sucesso!");
            await refreshUserData();
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (error) {
            console.error("Error saving settings", error);
            setSaveMessage("Erro ao salvar configurações.");
        } finally {
            setLoadingSettings(false);
        }
    };

    const handleSearchClinic = async () => {
        if (!validateCNPJ(linkCnpj.replace(/\D/g, ''))) {
            setLinkMessage({ type: 'error', text: 'CNPJ inválido' });
            return;
        }

        setLinkLoading(true);
        setLinkMessage(null);
        setFoundClinic(null);

        try {
            const { findManagerByCnpj } = await import('../services/userManagementService');
            const clinic = await findManagerByCnpj(linkCnpj.replace(/\D/g, ''));

            if (clinic) {
                setFoundClinic(clinic);
                setLinkMessage(null);
            } else {
                setLinkMessage({ type: 'error', text: 'Nenhuma clínica encontrada com este CNPJ (verifique se o gestor cadastrou o CNPJ)' });
            }
        } catch (error) {
            console.error('Error searching clinic:', error);
            setLinkMessage({ type: 'error', text: 'Erro ao buscar clínica' });
        } finally {
            setLinkLoading(false);
        }
    };

    const handleLinkClinic = async () => {
        if (!foundClinic) return;

        setLinkLoading(true);
        try {
            const { requestLinkToManager } = await import('../services/userManagementService');

            // Prepare user data for the request
            const userData = {
                name: professionalSettings.professionalName || user.displayName || 'Usuário',
                email: user.email || '',
                phone: professionalSettings.phone,
                specialty: professionalSettings.specialty || professionalSettings.role,
                crm: professionalSettings.crm
            };

            const result = await requestLinkToManager(user.uid, foundClinic.managerId, userData);

            if (result.success) {
                setLinkMessage({ type: 'success', text: `Solicitação enviada para ${foundClinic.name}. Aguarde a aprovação do gestor.` });
                setFoundClinic(null);
                setLinkCnpj('');
                // Don't refresh user data yet as the link is not active
            } else {
                setLinkMessage({ type: 'error', text: result.error || 'Erro ao enviar solicitação' });
            }
        } catch (error) {
            console.error('Error linking clinic:', error);
            setLinkMessage({ type: 'error', text: 'Erro ao realizar solicitação' });
        } finally {
            setLinkLoading(false);
        }
    };



    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <UserIcon className="w-8 h-8 text-brand-600" />
                Meus Dados
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Configurações Profissionais */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:col-span-2">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-slate-400" />
                        Configurações Profissionais
                    </h2>

                    <form onSubmit={handleSaveSettings} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nome Profissional</label>
                                <input
                                    type="text"
                                    value={professionalSettings.professionalName}
                                    onChange={(e) => setProfessionalSettings({ ...professionalSettings, professionalName: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Dr. Nome Sobrenome"
                                />
                            </div>

                            {/* Role Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                                {isCustomRole ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={professionalSettings.role || ''}
                                            onChange={(e) => setProfessionalSettings({ ...professionalSettings, role: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="Digite a função"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCustomRole(false);
                                                setProfessionalSettings({ ...professionalSettings, role: 'Médico' });
                                            }}
                                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                                            title="Voltar para lista"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        value={professionalSettings.role || ''}
                                        onChange={(e) => {
                                            if (e.target.value === 'custom') {
                                                setIsCustomRole(true);
                                                setProfessionalSettings({ ...professionalSettings, role: '' });
                                            } else {
                                                setProfessionalSettings({ ...professionalSettings, role: e.target.value });
                                            }
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    >
                                        <option value="">Selecione uma função</option>
                                        {PROFESSIONAL_ROLES.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                        <option value="custom">Adicionar nova função...</option>
                                    </select>
                                )}
                            </div>

                            {/* Specialty Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Especialidade</label>
                                {isCustomSpecialty ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={professionalSettings.specialty || ''}
                                            onChange={(e) => setProfessionalSettings({ ...professionalSettings, specialty: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="Digite a especialidade"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsCustomSpecialty(false);
                                                setProfessionalSettings({ ...professionalSettings, specialty: '' });
                                            }}
                                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                                            title="Voltar para lista"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        value={professionalSettings.specialty || ''}
                                        onChange={(e) => {
                                            if (e.target.value === 'custom') {
                                                setIsCustomSpecialty(true);
                                                setProfessionalSettings({ ...professionalSettings, specialty: '' });
                                            } else {
                                                setProfessionalSettings({ ...professionalSettings, specialty: e.target.value });
                                            }
                                        }}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    >
                                        <option value="">Selecione uma especialidade</option>
                                        {MEDICAL_SPECIALTIES.map(spec => (
                                            <option key={spec} value={spec}>{spec}</option>
                                        ))}
                                        <option value="custom">Adicionar especialidade...</option>
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Horário de Atendimento</label>
                                <input
                                    type="text"
                                    value={professionalSettings.serviceHours}
                                    onChange={(e) => setProfessionalSettings({ ...professionalSettings, serviceHours: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Ex: Seg-Sex, 08:00 - 18:00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">CRM / Registro Profissional</label>
                                <input
                                    type="text"
                                    value={professionalSettings.crm || ''}
                                    onChange={(e) => setProfessionalSettings({ ...professionalSettings, crm: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Ex: CRM 12345/SP"
                                />
                            </div>

                            {/* CPF/CNPJ Field with Auto-lookup */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    CPF / CNPJ {documentType === 'cnpj' && '(Busca automática)'}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={cpfCnpj}
                                        onChange={(e) => handleCpfCnpjChange(e.target.value)}
                                        className={`flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none ${cnpjError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                            }`}
                                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                                        maxLength={18}
                                    />
                                    {documentType === 'cnpj' && (
                                        <button
                                            type="button"
                                            onClick={() => handleFetchCNPJ()}
                                            disabled={loadingCNPJ || !validateCNPJ(cpfCnpj.replace(/\D/g, ''))}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            title="Buscar dados do CNPJ"
                                        >
                                            {loadingCNPJ ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Buscando...
                                                </>
                                            ) : (
                                                <>
                                                    <Search className="w-4 h-4" />
                                                    Buscar
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                                {cnpjError && (
                                    <p className="text-xs text-red-600 mt-1">{cnpjError}</p>
                                )}
                                <p className="text-xs text-slate-500 mt-1">
                                    {documentType === 'cpf' && 'Digite o CPF do profissional'}
                                    {documentType === 'cnpj' && 'Digite o CNPJ da clínica - os dados serão preenchidos automaticamente'}
                                    {!documentType && 'Digite o CPF ou CNPJ'}
                                </p>
                            </div>

                            {/* Company/Clinic Information - Shows when CNPJ is filled */}
                            {documentType === 'cnpj' && addressData.razaoSocial && (
                                <>
                                    <div className="md:col-span-2 pt-4 border-t border-gray-200">
                                        <h3 className="text-md font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <Building2 className="w-5 h-5 text-slate-400" />
                                            Dados da Empresa/Clínica
                                        </h3>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Razão Social</label>
                                        <input
                                            type="text"
                                            value={addressData.razaoSocial}
                                            onChange={(e) => setAddressData({ ...addressData, razaoSocial: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-slate-50"
                                            readOnly
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Fantasia</label>
                                        <input
                                            type="text"
                                            value={addressData.nomeFantasia}
                                            onChange={(e) => setAddressData({ ...addressData, nomeFantasia: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>

                                    <div className="md:col-span-2 pt-2">
                                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-slate-400" />
                                            Endereço
                                        </h4>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Logradouro</label>
                                        <input
                                            type="text"
                                            value={addressData.logradouro}
                                            onChange={(e) => setAddressData({ ...addressData, logradouro: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
                                        <input
                                            type="text"
                                            value={addressData.numero}
                                            onChange={(e) => setAddressData({ ...addressData, numero: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
                                        <input
                                            type="text"
                                            value={addressData.complemento}
                                            onChange={(e) => setAddressData({ ...addressData, complemento: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
                                        <input
                                            type="text"
                                            value={addressData.bairro}
                                            onChange={(e) => setAddressData({ ...addressData, bairro: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Município</label>
                                        <input
                                            type="text"
                                            value={addressData.municipio}
                                            onChange={(e) => setAddressData({ ...addressData, municipio: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">UF</label>
                                        <input
                                            type="text"
                                            value={addressData.uf}
                                            onChange={(e) => setAddressData({ ...addressData, uf: e.target.value.toUpperCase() })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                            maxLength={2}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                                        <input
                                            type="text"
                                            value={addressData.cep}
                                            onChange={(e) => setAddressData({ ...addressData, cep: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone Profissional</label>
                                <input
                                    type="tel"
                                    value={professionalSettings.phone || ''}
                                    onChange={(e) => setProfessionalSettings({ ...professionalSettings, phone: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail Profissional</label>
                                <input
                                    type="email"
                                    value={professionalSettings.email || ''}
                                    onChange={(e) => setProfessionalSettings({ ...professionalSettings, email: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="profissional@email.com"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">URL do Logo (Opcional)</label>
                                <input
                                    type="text"
                                    value={professionalSettings.logoUrl}
                                    onChange={(e) => setProfessionalSettings({ ...professionalSettings, logoUrl: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        {saveMessage && (
                            <div className={`p-3 rounded-lg text-sm ${saveMessage.includes('sucesso') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {saveMessage}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={loadingSettings}
                                className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                            >
                                {loadingSettings ? 'Salvando...' : 'Salvar Configurações'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Cartão de Perfil */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-slate-400" />
                        Informações da Conta
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase">Nome da Conta</label>
                            <div className="flex items-center gap-3 mt-1 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                                    {(user.displayName || professionalSettings.professionalName) ? (user.displayName || professionalSettings.professionalName)[0].toUpperCase() : 'U'}
                                </div>
                                <span className="text-slate-700 font-medium">
                                    {user.displayName || professionalSettings.professionalName || 'Usuário sem nome'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase">Email</label>
                            <div className="flex items-center gap-3 mt-1 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <Mail className="w-5 h-5 text-slate-400" />
                                <span className="text-slate-700">
                                    {user.email}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase">ID do Usuário</label>
                            <div className="mt-1 p-2 bg-slate-50 rounded text-xs text-slate-400 font-mono">
                                {user.uid}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Clinic Linking Section (Only for non-managers) */}
                {!isClinicManager && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-slate-400" />
                            Vincular a uma Clínica
                        </h2>

                        <div className="space-y-4">
                            <p className="text-sm text-slate-600">
                                Se você faz parte de uma clínica, digite o CNPJ dela abaixo para se vincular e compartilhar dados.
                            </p>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={linkCnpj}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 14) setLinkCnpj(formatCNPJ(val));
                                    }}
                                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="CNPJ da Clínica"
                                />
                                <button
                                    onClick={handleSearchClinic}
                                    disabled={linkLoading || linkCnpj.replace(/\D/g, '').length !== 14}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {linkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    Buscar
                                </button>
                            </div>

                            {foundClinic && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 animate-fade-in">
                                    <p className="text-sm text-blue-800 font-medium mb-2">Clínica Encontrada:</p>
                                    <p className="text-lg font-bold text-blue-900 mb-4">{foundClinic.name}</p>
                                    <button
                                        onClick={handleLinkClinic}
                                        disabled={linkLoading}
                                        className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm"
                                    >
                                        {linkLoading ? 'Enviando...' : 'Solicitar Vínculo'}
                                    </button>
                                </div>
                            )}

                            {linkMessage && (
                                <div className={`p-3 rounded-lg text-sm ${linkMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {linkMessage.text}
                                </div>
                            )}

                            {contextUserProfile?.managerId && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <p className="text-xs text-slate-500">
                                        Atualmente vinculado ao gestor ID: {contextUserProfile.managerId}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Manager Info (Only for managers) */}
                {isClinicManager && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-slate-400" />
                            Gestão da Clínica
                        </h2>
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                            <p className="text-sm text-yellow-800">
                                <strong>Atenção:</strong> Mantenha seu CNPJ atualizado nas configurações profissionais.
                                Seus prestadores precisarão dele para se vincular à sua clínica.
                            </p>
                        </div>
                    </div>
                )}


            </div>
        </div>
    );
};

export default UserProfileView;
