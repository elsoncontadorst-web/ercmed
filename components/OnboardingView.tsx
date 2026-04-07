import React, { useState } from 'react';
import { Building2, Users, ArrowRight, ArrowLeft, Check, Plus, Trash2, Heart, Shield, Rocket, Sparkles } from 'lucide-react';
import { ClinicFormData } from '../types/clinic';
import { UserCreationByAdmin } from '../types/users';
import { completeOnboarding } from '../services/onboardingService';
import { AppView } from '../types';
import { useUser } from '../contexts/UserContext';

interface OnboardingViewProps {
    onComplete: () => void;
    setView: (view: AppView) => void;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, setView }) => {
    const { refreshUserData } = useUser();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 1: Clinic Data
    const [clinic, setClinic] = useState<ClinicFormData>({
        name: '',
        phone: '',
        specialty: '',
        cnpj: '',
        address: {
            street: '',
            number: '',
            neighborhood: '',
            city: '',
            state: '',
            zipCode: '',
            complement: ''
        }
    });

    // Step 2: Professionals Data
    const [professionals, setProfessionals] = useState<UserCreationByAdmin[]>([]);
    const [newProf, setNewProf] = useState<UserCreationByAdmin>({
        name: '',
        email: '',
        password: 'Mudar123@', // Default password for onboarding
        role: 'professional',
        specialty: '',
        crm: ''
    });

    const handleClinicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name.includes('address.')) {
            const field = name.split('.')[1];
            setClinic(prev => ({
                ...prev,
                address: { ...prev.address, [field]: value }
            }));
        } else {
            setClinic(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAddProfessional = () => {
        if (!newProf.name || !newProf.email) {
            setError('Nome e e-mail são obrigatórios para o profissional.');
            return;
        }
        setProfessionals([...professionals, { ...newProf }]);
        setNewProf({
            name: '',
            email: '',
            password: 'Mudar123@',
            role: 'professional',
            specialty: '',
            crm: ''
        });
        setError(null);
    };

    const handleRemoveProfessional = (index: number) => {
        setProfessionals(professionals.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!clinic.name || !clinic.phone) {
            setError('Nome da clínica e telefone são obrigatórios.');
            setStep(1);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await completeOnboarding({
                clinic,
                professionals
            });

            if (result.success) {
                await refreshUserData();
                onComplete();
            } else {
                setError(result.error || 'Erro ao processar as informações.');
            }
        } catch (err: any) {
            setError(err.message || 'Erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-100">
                
                {/* Lateral Banner */}
                <div className="md:w-1/3 bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                            <Heart className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-extrabold mb-4 leading-tight">Bem-vindo ao ERCMed</h2>
                        <p className="text-emerald-100 text-lg opacity-90 leading-relaxed">
                            Vamos configurar sua clínica em poucos segundos para que você possa começar a crescer.
                        </p>
                    </div>

                    <div className="relative z-10 mt-12">
                        <div className="space-y-6">
                            <div className={`flex items-center gap-4 transition-all ${step === 1 ? 'scale-105 font-bold' : 'opacity-60'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${step >= 1 ? 'bg-white text-emerald-600' : 'bg-emerald-800'}`}>
                                    {step > 1 ? <Check className="w-5 h-5" /> : '1'}
                                </div>
                                <span>Dados da Clínica</span>
                            </div>
                            <div className={`flex items-center gap-4 transition-all ${step === 2 ? 'scale-105 font-bold' : 'opacity-60'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${step >= 2 ? 'bg-white text-emerald-600' : 'bg-emerald-800'}`}>
                                    {step > 2 ? <Check className="w-5 h-5" /> : '2'}
                                </div>
                                <span>Profissionais</span>
                            </div>
                            <div className={`flex items-center gap-4 transition-all ${step === 3 ? 'scale-105 font-bold' : 'opacity-60'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${step >= 3 ? 'bg-white text-emerald-600' : 'bg-emerald-800'}`}>
                                    {step === 3 ? <Sparkles className="w-5 h-5" /> : '3'}
                                </div>
                                <span>Pronto para Uso</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 pt-12 mt-auto text-xs text-emerald-200/60 font-medium tracking-widest text-center">
                        PODERADO PELA ERC SISTEMAS
                    </div>
                </div>

                {/* Form Area */}
                <div className="md:w-2/3 p-8 md:p-12">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg animate-shake">
                            <div className="font-bold mb-1">Ops! Verifique as informações:</div>
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="animate-fadeIn">
                            <div className="flex items-center gap-3 mb-8">
                                <Building2 className="w-8 h-8 text-emerald-600" />
                                <h3 className="text-2xl font-bold text-slate-800">Dados da Clínica</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Nome da Clínica *</label>
                                    <input 
                                        type="text" name="name" 
                                        value={clinic.name} onChange={handleClinicChange}
                                        placeholder="Ex: Clínica Bem Estar"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Telefone / WhatsApp *</label>
                                    <input 
                                        type="text" name="phone" 
                                        value={clinic.phone} onChange={handleClinicChange}
                                        placeholder="(00) 00000-0000"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-slate-700 ml-1">CNPJ (Opcional)</label>
                                    <input 
                                        type="text" name="cnpj" 
                                        value={clinic.cnpj} onChange={handleClinicChange}
                                        placeholder="00.000.000/0000-00"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Especialidade Principal</label>
                                    <input 
                                        type="text" name="specialty" 
                                        value={clinic.specialty} onChange={handleClinicChange}
                                        placeholder="Ex: Pediatria, Geral"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Endereço (Rua, Nº, Bairro)</label>
                                    <div className="grid grid-cols-6 gap-3">
                                        <input 
                                            type="text" name="address.street" 
                                            value={clinic.address.street} onChange={handleClinicChange}
                                            placeholder="Rua"
                                            className="col-span-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                                        />
                                        <input 
                                            type="text" name="address.number" 
                                            value={clinic.address.number} onChange={handleClinicChange}
                                            placeholder="Nº"
                                            className="col-span-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Cidade</label>
                                    <input 
                                        type="text" name="address.city" 
                                        value={clinic.address.city} onChange={handleClinicChange}
                                        placeholder="Cidade"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Estado (UF)</label>
                                    <input 
                                        type="text" name="address.state" 
                                        value={clinic.address.state} onChange={handleClinicChange}
                                        placeholder="UF"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={() => {
                                    if (clinic.name && clinic.phone) setStep(2);
                                    else setError('Preencha os campos obrigatórios (*)');
                                }}
                                className="mt-12 w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 group"
                            >
                                Próximo: Profissionais
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-fadeIn">
                            <div className="flex items-center gap-3 mb-4">
                                <Users className="w-8 h-8 text-emerald-600" />
                                <h3 className="text-2xl font-bold text-slate-800">Profissionais</h3>
                            </div>
                            <p className="text-slate-500 mb-8 text-sm">
                                Adicione os profissionais que trabalham com você. (Você pode pular e adicionar depois).
                            </p>

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input 
                                        placeholder="Nome do Profissional" 
                                        value={newProf.name}
                                        onChange={e => setNewProf({...newProf, name: e.target.value})}
                                        className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <input 
                                        placeholder="E-mail" 
                                        value={newProf.email}
                                        onChange={e => setNewProf({...newProf, email: e.target.value})}
                                        className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <input 
                                        placeholder="Especialidade" 
                                        value={newProf.specialty}
                                        onChange={e => setNewProf({...newProf, specialty: e.target.value})}
                                        className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <input 
                                        placeholder="CRM / Registro" 
                                        value={newProf.crm}
                                        onChange={e => setNewProf({...newProf, crm: e.target.value})}
                                        className="px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <button 
                                    onClick={handleAddProfessional}
                                    className="mt-4 flex items-center gap-2 text-emerald-600 font-bold hover:text-emerald-700"
                                >
                                    <Plus className="w-5 h-5" />
                                    Adicionar à Lista
                                </button>
                            </div>

                            {professionals.length > 0 && (
                                <div className="space-y-2 mb-8">
                                    <h4 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider">Profissionais Adicionados</h4>
                                    {professionals.map((p, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm group">
                                            <div>
                                                <p className="font-bold text-slate-800">{p.name}</p>
                                                <p className="text-xs text-slate-500">{p.email} • {p.specialty || 'Sem especialidade'}</p>
                                            </div>
                                            <button onClick={() => handleRemoveProfessional(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-4 mt-12">
                                <button 
                                    onClick={() => setStep(1)}
                                    className="flex-1 border-2 border-slate-200 text-slate-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                    Voltar
                                </button>
                                <button 
                                    onClick={() => setStep(3)}
                                    className="flex-[2] bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                >
                                    Revisar e Finalizar
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-fadeIn text-center">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
                                <Rocket className="w-10 h-10 text-emerald-600 animate-bounce" />
                            </div>
                            <h3 className="text-3xl font-extrabold text-slate-800 mb-4">Tudo Pronto!</h3>
                            <p className="text-slate-600 mb-8 max-w-sm mx-auto leading-relaxed">
                                Sua clínica <span className="font-bold text-emerald-600">{clinic.name}</span> foi configurada. 
                                Você adicionou <span className="font-bold text-emerald-600">{professionals.length}</span> profissionais.
                            </p>

                            <div className="bg-teal-50 p-6 rounded-2xl border border-teal-100 text-left mb-8">
                                <h4 className="font-bold text-teal-800 mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    Dicas Importantes:
                                </h4>
                                <ul className="space-y-3 text-sm text-teal-700">
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 mt-0.5" />
                                        <span>A senha provisória dos profissionais é <strong>Mudar123@</strong></span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 mt-0.5" />
                                        <span>Você tem <strong>15 dias</strong> de acesso total para testar todos os módulos.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 mt-0.5" />
                                        <span>Comece cadastrando seu primeiro paciente no menu "Pacientes".</span>
                                    </li>
                                </ul>
                            </div>

                            <button 
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`w-full bg-emerald-600 text-white py-5 rounded-xl font-black text-xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'CONFIGURANDO...' : 'ENTRAR NO SISTEMA'}
                                {!loading && <Sparkles className="w-6 h-6" />}
                            </button>
                            <button 
                                onClick={() => setStep(2)}
                                disabled={loading}
                                className="mt-4 text-slate-400 hover:text-slate-600 text-sm font-medium transition-all"
                            >
                                Notou algo errado? Clique aqui para editar.
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingView;
