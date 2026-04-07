import React, { useState, useEffect } from 'react';
import { Crown, Users, Calculator, FileText, Stethoscope, Check, X, Sparkles, Infinity, Shield, Zap } from 'lucide-react';
import { AccountTier, TIER_NAMES, TIER_DESCRIPTIONS, getProfessionalLimitText } from '../types/accountTiers';
import { auth } from '../services/firebase';
import { getUserTierInfo } from '../services/accountTierService';

const AccountPlansView: React.FC = () => {
    const [currentTier, setCurrentTier] = useState<AccountTier | null>(null);
    const [isManager, setIsManager] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUserTier();
    }, []);

    const loadUserTier = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const tierInfo = await getUserTierInfo(user.uid);
            setCurrentTier(tierInfo.tier);
            setIsManager(tierInfo.isManager);
        } catch (error) {
            console.error('Error loading tier:', error);
        } finally {
            setLoading(false);
        }
    };

    const tiers = [
        {
            tier: AccountTier.TRIAL,
            name: 'Start Free',
            description: 'Experiência completa por 15 dias.',
            price: 'R$ 0,00',
            period: '/15 dias',
            icon: Sparkles,
            color: 'from-emerald-400 to-emerald-600',
            borderColor: 'border-emerald-500',
            features: [
                { text: 'Acesso completo por 15 dias', included: true },
                { text: 'Até 3 profissionais', included: true },
                { text: 'Até 10 pacientes', included: true },
                { text: 'Agendamento Online', included: true },
                { text: 'Prontuário Eletrônico', included: true },
                { text: 'Anamnese Mista Avançada', included: true },
                { text: 'Sem necessidade de cartão', included: true }
            ]
        },
        {
            tier: AccountTier.SILVER,
            name: 'Professional',
            description: 'Para organização e controle profissional.',
            price: 'R$ 119,00',
            period: '/mês',
            icon: Shield,
            color: 'from-blue-400 to-blue-600',
            borderColor: 'border-blue-500',
            popular: true,
            features: [
                { text: 'Até 10 profissionais', included: true },
                { text: 'Tudo do Start Free +:', included: true },
                { text: 'Relatórios Financeiros', included: true },
                { text: 'Gestão de Agenda Avançada', included: true }
            ]
        },
        {
            tier: AccountTier.GOLD,
            name: 'Advanced',
            description: 'Para crescimento estruturado e escala.',
            price: 'R$ 190,00',
            period: '/mês',
            icon: Crown,
            color: 'from-indigo-400 to-indigo-600',
            borderColor: 'border-indigo-500',
            features: [
                { text: 'Até 20 profissionais', included: true },
                { text: 'Tudo do Professional +:', included: true },
                { text: 'Gestão Financeira Completa', included: true },
                { text: 'Indicadores estratégicos', included: true },
                { text: 'Simulações avançadas', included: true }
            ]
        },
        {
            tier: AccountTier.ENTERPRISE,
            name: 'Enterprise AI',
            description: 'Máxima performance e inteligência.',
            price: 'R$ 390,00',
            period: '/mês',
            icon: Zap,
            color: 'from-purple-400 to-purple-600',
            borderColor: 'border-purple-500',
            features: [
                { text: 'Até 20 profissionais', included: true },
                { text: 'Tudo do Advanced +:', included: true },
                { text: 'Consultor Clínico com IA', included: true },
                { text: 'Suporte Prioritário', included: true },
                { text: 'Apoio à decisão estratégica', included: true }
            ]
        }
    ];

    const handleContactSales = () => {
        window.open('https://wa.me/5511999999999?text=Olá! Gostaria de fazer upgrade do meu plano ERCMed', '_blank');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-slate-800">
                    Planos e Preços
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Escolha o plano ideal para sua clínica. Todos os planos incluem gestão completa de saúde e agendamento online.
                </p>
                {currentTier && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 border border-brand-200 rounded-lg">
                        <Crown className="w-5 h-5 text-brand-600" />
                        <span className="text-sm font-medium text-brand-700">
                            Plano Atual: <strong>{TIER_NAMES[currentTier]}</strong>
                        </span>
                    </div>
                )}
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tiers.map((plan) => {
                    const Icon = plan.icon;
                    const isCurrent = currentTier === plan.tier;

                    return (
                        <div
                            key={plan.tier}
                            className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl ${plan.popular ? 'border-brand-500 scale-105' : plan.borderColor
                                } ${isCurrent ? 'ring-4 ring-green-200' : ''}`}
                        >
                            {/* Popular Badge */}
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                    <div className="bg-brand-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg">
                                        MAIS POPULAR
                                    </div>
                                </div>
                            )}

                            {/* Current Plan Badge */}
                            {isCurrent && (
                                <div className="absolute -top-4 right-4">
                                    <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        SEU PLANO
                                    </div>
                                </div>
                            )}

                            <div className="p-6 space-y-6">
                                {/* Header */}
                                <div className="text-center space-y-3">
                                    <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-lg`}>
                                        <Icon className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800">{plan.name}</h3>
                                    <p className="text-sm text-slate-500">{plan.description}</p>
                                </div>

                                {/* Price */}
                                <div className="text-center py-4 border-y border-slate-200">
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-4xl font-bold text-slate-800">{plan.price}</span>
                                        <span className="text-slate-500">{plan.period}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">por clínica</p>
                                </div>

                                {/* Features */}
                                <ul className="space-y-3">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            {feature.included ? (
                                                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <X className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />
                                            )}
                                            <span className={`text-sm ${feature.included ? 'text-slate-700' : 'text-slate-400'}`}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <button
                                    onClick={handleContactSales}
                                    disabled={isCurrent}
                                    className={`w-full py-3 rounded-lg font-bold transition-all ${isCurrent
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : plan.popular
                                            ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/30'
                                            : 'bg-slate-800 text-white hover:bg-slate-900'
                                        }`}
                                >
                                    {isCurrent ? 'Plano Atual' : 'Contratar Agora'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Comparison Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 bg-slate-50 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800">Comparação Detalhada</h2>
                    <p className="text-slate-600 mt-1">Veja todos os recursos disponíveis em cada plano</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Recurso</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Start Free</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Professional</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Advanced</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-purple-600">Enterprise AI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            <tr>
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">Limite de Profissionais</td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600">3</td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600">10</td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600">20</td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600 font-bold text-brand-600">Ilimitado</td>
                            </tr>
                            <tr className="bg-slate-50">
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">Gestão de Pacientes</td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-purple-600 mx-auto" /></td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">Prontuário Eletrônico</td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600">Básico</td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600">Básico</td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600 font-bold">Avançado</td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600 font-bold">Avançado</td>
                                <td className="px-6 py-4 text-center text-sm font-bold text-purple-600">Completo</td>
                            </tr>
                            <tr className="bg-slate-50">
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">Anamnese Mista</td>
                                <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-purple-600 mx-auto" /></td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">Módulo IRPF</td>
                                <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-purple-600 mx-auto" /></td>
                            </tr>
                            <tr className="bg-slate-50">
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">Simulador Empresa</td>
                                <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-purple-600 mx-auto" /></td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">Suporte</td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600">Email</td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600">Email</td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600">Email</td>
                                <td className="px-6 py-4 text-center text-sm text-slate-600 font-bold text-brand-600">Prioritário</td>
                                <td className="px-6 py-4 text-center text-sm font-bold text-purple-600">Dedicado MVP</td>
                            </tr>
                            <tr className="bg-slate-50">
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">Exclusão de Registros</td>
                                <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                                <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-purple-600 mx-auto" /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FAQ or Contact */}
            <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl p-8 text-center text-white">
                <h3 className="text-2xl font-bold mb-2">Precisa de ajuda para escolher?</h3>
                <p className="mb-6 opacity-90">
                    Entre em contato conosco e nossa equipe te ajudará a encontrar o plano ideal para sua clínica
                </p>
                <button
                    onClick={handleContactSales}
                    className="bg-white text-brand-600 px-8 py-3 rounded-lg font-bold hover:bg-slate-50 transition-colors shadow-lg"
                >
                    Falar com Vendas
                </button>
            </div>
        </div>
    );
};

export default AccountPlansView;
