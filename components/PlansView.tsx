import React, { useState } from 'react';
import { Check, Info, Crown, Star, Shield, Zap, Building2, HelpCircle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { AccountTier, TIER_DESCRIPTIONS } from '../types/accountTiers';

import { AppView } from '../types';

interface PlansViewProps {
    setView?: (view: AppView) => void;
}

const PlansView: React.FC<PlansViewProps> = ({ setView }) => {
    const { user } = useUser();
    const [copiedTier, setCopiedTier] = useState<string | null>(null);

    // MasterAdmin functionality (keep existing)
    const isMasterAdmin = user?.email === 'elsoncontador.st@gmail.com';

    const handleCopyLink = (tierId: string) => {
        const link = `${window.location.origin}/register?plan=${tierId}`;
        navigator.clipboard.writeText(link);
        setCopiedTier(tierId);
        setTimeout(() => setCopiedTier(null), 2000);
    };

    const handleAction = (planId: string) => {
        if (setView) {
            setView(AppView.DASHBOARD);
        }
    };

    const plans = [
        {
            id: AccountTier.TRIAL, // Start Free
            name: 'Start Free',
            price: '0,00',
            description: 'Experiência completa por 15 dias.',
            icon: Star,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200',
            buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
            popular: false,
            features: [
                'Acesso completo por 15 dias',
                'Até 3 profissionais',
                'Até 10 pacientes',
                'Agendamento Online',
                'Prontuário Eletrônico',
                'Anamnese Mista Avançada',
                'Sem necessidade de cartão'
            ],
            footerText: 'Após 15 dias, escolha seu plano para continuar.'
        },
        {
            id: AccountTier.SILVER, // Professional
            name: 'Professional',
            price: '119,00',
            description: 'Para organização e controle profissional.',
            icon: Shield,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            buttonColor: 'bg-blue-600 hover:bg-blue-700',
            popular: true,
            features: [
                'Até 10 profissionais',
                'Tudo do Start Free +:',
                'Relatórios Financeiros',
                'Gestão de Agenda Avançada'
            ]
        },
        {
            id: AccountTier.GOLD, // Advanced
            name: 'Advanced',
            price: '190,00',
            description: 'Para crescimento estruturado e escala.',
            icon: Crown,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            borderColor: 'border-indigo-200',
            buttonColor: 'bg-indigo-600 hover:bg-indigo-700',
            popular: false,
            features: [
                'Até 20 profissionais',
                'Tudo do Professional +:',
                'Gestão Financeira Completa',
                'Indicadores estratégicos',
                'Simulações avançadas'
            ]
        },
        {
            id: AccountTier.ENTERPRISE, // Enterprise AI
            name: 'Enterprise AI',
            price: '390,00',
            description: 'Máxima performance e inteligência.',
            icon: Zap,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200',
            buttonColor: 'bg-purple-600 hover:bg-purple-700',
            popular: false,
            features: [
                'Até 20 profissionais',
                'Tudo do Advanced +:',
                'Consultor Clínico com IA',
                'Suporte Prioritário',
                'Apoio à decisão estratégica'
            ]
        },
        {
            id: AccountTier.UNLIMITED, // Unlimited
            name: 'Unlimited',
            price: 'Sob Consulta',
            description: 'Para grandes redes e franquias.',
            icon: Building2,
            color: 'text-slate-600',
            bgColor: 'bg-slate-50',
            borderColor: 'border-slate-300',
            buttonColor: 'bg-slate-800 hover:bg-slate-900',
            popular: false,
            features: [
                'Profissionais ilimitados',
                'Tudo do Enterprise +:',
                'Customizações exclusivas',
                'SLA garantido',
                'Treinamento personalizado'
            ]
        }
    ];

    return (
        <div className="min-h-full bg-slate-50/50 pb-20">
            {/* Header Section */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold mb-6">
                        Planos Flexíveis
                    </span>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                        Gestão inteligente para clínicas que<br />
                        querem <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">crescer com segurança</span>
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Escolha o plano ideal para o seu momento. Comece gratuitamente e evolua suas ferramentas conforme sua clínica expande.
                    </p>

                    <button 
                        onClick={() => handleAction(AccountTier.TRIAL)}
                        className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:-translate-y-1"
                    >
                        Começar Gratuitamente
                    </button>
                    <p className="mt-4 text-sm text-slate-500 flex items-center justify-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" /> Sem cartão de crédito necessário
                        <span className="mx-2">•</span>
                        <Check className="w-4 h-4 text-emerald-500" /> Cancelamento a qualquer momento
                    </p>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="max-w-[95rem] mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`
                                relative flex flex-col bg-white rounded-2xl border transition-all duration-300
                                ${plan.borderColor}
                                ${plan.popular ? 'shadow-xl scale-105 z-10 border-2' : 'shadow-lg hover:shadow-xl hover:-translate-y-1'}
                            `}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md uppercase tracking-wide whitespace-nowrap">
                                    Mais Popular
                                </div>
                            )}

                            <div className={`p-6 ${plan.bgColor} rounded-t-2xl border-b ${plan.borderColor}`}>
                                <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm ${plan.color}`}>
                                    <plan.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                                <p className="text-sm text-slate-500 mt-2 h-10 leading-snug">{plan.description}</p>
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <div className="mb-6">
                                    <div className="flex items-baseline gap-1">
                                        {plan.price !== 'Sob Consulta' && <span className="text-sm text-slate-500 font-medium">R$</span>}
                                        <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{plan.price}</span>
                                        {plan.price !== 'Sob Consulta' && <span className="text-slate-500 font-medium self-end mb-1">/mês</span>}
                                    </div>
                                </div>

                                <ul className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                                            <div className={`mt-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center ${plan.color.replace('text-', 'bg-').replace('600', '100')}`}>
                                                <Check className={`w-3 h-3 ${plan.color}`} strokeWidth={3} />
                                            </div>
                                            <span className="leading-snug">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-auto space-y-3">
                                    {plan.footerText && (
                                        <p className="text-xs text-slate-500 text-center italic border-t border-slate-100 pt-3 mb-3">
                                            {plan.footerText}
                                        </p>
                                    )}
                                    <button 
                                        onClick={() => handleAction(plan.id)}
                                        className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-95 ${plan.buttonColor}`}
                                    >
                                        {plan.id === AccountTier.UNLIMITED ? 'Solicitar Proposta' : 'Começar Agora'}
                                    </button>

                                    {isMasterAdmin && (
                                        <button
                                            onClick={() => handleCopyLink(plan.id)}
                                            className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors"
                                        >
                                            {copiedTier === plan.id ? 'Copiado!' : 'Copiar Link'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Rules Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
                <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="grid md:grid-cols-2">
                        <div className="p-10 md:p-14 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <Crown className="w-6 h-6 text-blue-400" />
                                </div>
                                <h3 className="text-2xl font-bold">Gestor da Clínica</h3>
                            </div>
                            <p className="text-slate-300 mb-8 leading-relaxed">
                                Todo usuário que se cadastra no plano Start Free é automaticamente definido como Gestor.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    'Cadastrar novos usuários',
                                    'Gerenciar profissionais',
                                    'Controlar configurações financeiras',
                                    'Acesso a relatórios gerenciais'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-200">
                                        <Check className="w-5 h-5 text-blue-400" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="p-10 md:p-14 bg-white">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <UserIcon />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">Profissional da Clínica</h3>
                            </div>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                Usuários adicionados pelo gestor para atuar no atendimento.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 text-slate-700">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                    </div>
                                    Foco total no atendimento clínico
                                </li>
                                <li className="flex items-center gap-3 text-slate-700">
                                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                                        <span className="text-red-600 font-bold text-xs">✕</span>
                                    </div>
                                    Não podem cadastrar novos usuários
                                </li>
                                <li className="flex items-center gap-3 text-slate-700">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                    </div>
                                    Acesso restrito às suas funções
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Differentiators Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-slate-900">Por que o ERCMed é diferente?</h2>
                    <p className="text-slate-600 mt-4">Gestão clínica pensada como negócio.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { title: 'ERP Integrado', desc: 'Gestão clínica e financeira em uma única plataforma.', icon: Building2 },
                        { title: 'Inteligência Fiscal', desc: 'Simuladores PJ vs CLT e IRPF integrados.', icon: Calculator },
                        { title: 'IA Estratégica', desc: 'Consultoria inteligente aplicada à gestão clínica.', icon: Zap },
                        { title: 'Feito por Especialistas', desc: 'Desenvolvido por quem entende de clínicas.', icon: Crown }
                    ].map((item, i) => (
                        <div key={i} className="p-6 bg-white rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 text-blue-600">
                                <item.icon className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                            <p className="text-sm text-slate-600">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trust Signals */}
            <div className="bg-white border-t border-slate-200 mt-24 py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            'Sem taxa de implantação',
                            'Sem fidelidade obrigatória',
                            'Suporte humano especializado',
                            'Conformidade LGPD'
                        ].map((text, i) => (
                            <div key={i} className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                                    <Check className="w-5 h-5 text-green-600" />
                                </div>
                                <span className="font-medium text-slate-700">{text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 text-center">
                        <p className="text-2xl font-medium text-slate-800 italic">
                            "Menos improviso, mais previsibilidade."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Icons
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-emerald-600"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);

const Calculator = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>
);

export default PlansView;
