import React, { useEffect, useState } from 'react';
import {
    Building2, Check, ChevronDown, Crown, Headphones, Infinity,
    Shield, Star, Zap
} from 'lucide-react';
import { AccountTier, TIER_NAMES } from '../types/accountTiers';
import { auth } from '../services/firebase';
import { getUserTierInfo } from '../services/accountTierService';
import { openMercadoPagoCheckout, openSalesContact } from '../services/mercadoPagoCheckoutService';

type Plan = {
    tier: AccountTier;
    name: string;
    tagline: string;
    description: string;
    price?: number;
    limit: string;
    icon: React.ElementType;
    tone: string;
    features: string[];
    recommended?: boolean;
    ai?: boolean;
};

const plans: Plan[] = [
    {
        tier: AccountTier.TRIAL,
        name: 'Start',
        tagline: 'Para começar',
        description: 'Experimente a operação integrada do ERCMED antes de contratar.',
        price: 0,
        limit: 'Até 3 profissionais e 10 pacientes',
        icon: Star,
        tone: 'emerald',
        features: ['Agenda e atendimentos', 'Financeiro essencial', 'Produção e faturamento', 'Até 10 pacientes', '15 dias sem cartão']
    },
    {
        tier: AccountTier.SILVER,
        name: 'Professional',
        tagline: 'Para a maioria das clínicas',
        description: 'Organize a rotina clínica, financeira e profissional em um só lugar.',
        price: 119,
        limit: 'Até 10 profissionais',
        icon: Shield,
        tone: 'blue',
        recommended: true,
        features: ['Tudo do Start', 'Dashboard executivo', 'Contas a pagar e receber', 'Contratos e repasses', 'Suporte por e-mail']
    },
    {
        tier: AccountTier.GOLD,
        name: 'Advanced',
        tagline: 'Para clínicas em crescimento',
        description: 'Gestão completa, visão fiscal e controle por unidade para operações em expansão.',
        price: 190,
        limit: 'Até 20 profissionais',
        icon: Crown,
        tone: 'indigo',
        features: ['Tudo do Professional', 'Dashboard mensal e anual', 'Fator R e painel fiscal', 'Gestão de unidades', 'Relatórios executivos']
    },
    {
        tier: AccountTier.ENTERPRISE,
        name: 'Enterprise AI',
        tagline: 'Inteligência e automação',
        description: 'Automação, inteligência gerencial e atendimento prioritário para a operação.',
        price: 390,
        limit: 'Até 20 profissionais',
        icon: Zap,
        tone: 'purple',
        ai: true,
        features: ['Tudo do Advanced', 'Recursos de IA do ERP', 'Automação de processos', 'Análises gerenciais avançadas', 'Suporte prioritário']
    },
    {
        tier: AccountTier.UNLIMITED,
        name: 'Unlimited',
        tagline: 'Redes e franquias',
        description: 'Solução personalizada para redes, franquias e grandes operações.',
        limit: 'Profissionais ilimitados',
        icon: Building2,
        tone: 'slate',
        features: ['Tudo do Enterprise AI', 'Gestão consolidada do grupo', 'Integrações personalizadas', 'Operação sem limite de profissionais', 'SLA e onboarding dedicados']
    }
];

const toneClasses: Record<string, {border: string; icon: string; soft: string; button: string}> = {
    emerald: {border: 'border-emerald-200', icon: 'text-emerald-600', soft: 'bg-emerald-50', button: 'bg-emerald-600 hover:bg-emerald-700'},
    blue: {border: 'border-blue-500', icon: 'text-blue-600', soft: 'bg-blue-50', button: 'bg-blue-600 hover:bg-blue-700'},
    indigo: {border: 'border-indigo-200', icon: 'text-indigo-600', soft: 'bg-indigo-50', button: 'bg-indigo-600 hover:bg-indigo-700'},
    purple: {border: 'border-purple-200', icon: 'text-purple-600', soft: 'bg-purple-50', button: 'bg-purple-600 hover:bg-purple-700'},
    slate: {border: 'border-slate-300', icon: 'text-slate-700', soft: 'bg-slate-50', button: 'bg-slate-800 hover:bg-slate-900'}
};

const comparison = [
    ['Profissionais', 'Até 3', 'Até 10', 'Até 20', 'Até 20', 'Ilimitados'],
    ['Pacientes', 'Até 10', 'Ilimitados', 'Ilimitados', 'Ilimitados', 'Ilimitados'],
    ['Agenda avançada', 'Básica', 'Incluída', 'Incluída', 'Incluída', 'Incluída'],
    ['Prontuário eletrônico', 'Incluído', 'Completo', 'Completo', 'Completo', 'Completo'],
    ['Gestão financeira', 'Essencial', 'Relatórios', 'Completa', 'Completa', 'Personalizada'],
    ['Indicadores estratégicos', '—', '—', 'Incluídos', 'Incluídos', 'Incluídos'],
    ['Consultor com IA', '—', '—', '—', 'Incluído', 'Sob medida'],
    ['Suporte', 'E-mail', 'E-mail', 'Chat', 'Prioritário', 'Dedicado']
];

const faqs = [
    ['Posso trocar de plano?', 'Sim. O gestor pode contratar outro plano quando precisar.'],
    ['O teste precisa de cartão?', 'Não. Os 15 dias de avaliação não exigem cartão.'],
    ['Posso cancelar quando quiser?', 'Sim. A assinatura não possui fidelidade.'],
    ['Meus dados ficam seguros?', 'Os controles de acesso separam gestores, profissionais e unidades da clínica.'],
    ['Como funciona o suporte?', 'O canal e a prioridade dependem do plano contratado.']
];

const AccountPlansView: React.FC = () => {
    const [currentTier, setCurrentTier] = useState<AccountTier | null>(null);
    const [isManager, setIsManager] = useState(false);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<AccountTier | null>(null);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    useEffect(() => {
        const load = async () => {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const tierInfo = await getUserTierInfo(user.uid);
                setCurrentTier(tierInfo.tier);
                setIsManager(tierInfo.isManager);
            } catch (error) {
                console.error('Erro ao carregar o plano:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handlePlanAction = async (tier: AccountTier) => {
        if (tier === AccountTier.TRIAL || tier === currentTier) return;
        if (tier === AccountTier.UNLIMITED) {
            openSalesContact();
            return;
        }
        setProcessing(tier);
        try {
            await openMercadoPagoCheckout(tier);
        } finally {
            setProcessing(null);
        }
    };

    if (loading) {
        return <div className="flex h-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand-600" /></div>;
    }

    return (
        <div className="mx-auto max-w-[1540px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
            <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                        Escolha o <span className="bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent">plano ideal</span> para sua clínica
                    </h1>
                    <p className="mt-2 text-slate-600">Todos os planos incluem 15 dias para testar sem compromisso.</p>
                    {currentTier && <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Plano atual: {TIER_NAMES[currentTier]}</p>}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3"><Shield className="text-emerald-600" /><div><b className="block text-sm">Sem fidelidade</b><span className="text-xs text-slate-500">Cancele quando quiser</span></div></div>
                    <div className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3"><Headphones className="text-purple-600" /><div><b className="block text-sm">Suporte humanizado</b><span className="text-xs text-slate-500">Especialistas em saúde</span></div></div>
                </div>
            </section>

            {!isManager && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Apenas o gestor da clínica pode contratar ou alterar a assinatura.</div>}

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                {plans.map((plan) => {
                    const Icon = plan.icon;
                    const colors = toneClasses[plan.tone];
                    const isCurrent = currentTier === plan.tier;
                    const daily = plan.price ? (plan.price / 30).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : null;
                    return (
                        <article key={plan.tier} className={`relative flex min-h-[540px] flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${colors.border} ${plan.recommended ? 'xl:-mt-3 xl:mb-3' : ''}`}>
                            {plan.recommended && <div className="bg-blue-600 py-1.5 text-center text-xs font-bold text-white">★ RECOMENDADO</div>}
                            {plan.ai && <span className="absolute right-3 top-3 rounded-full bg-purple-100 px-2 py-1 text-[10px] font-bold text-purple-700">IA EXCLUSIVA</span>}
                            <div className={`${colors.soft} border-b p-5`}>
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm"><Icon className={`h-7 w-7 ${colors.icon}`} /></div>
                                <h2 className="text-xl font-black text-slate-900">{plan.name}</h2>
                                <p className="text-xs font-semibold text-slate-600">{plan.tagline}</p>
                                <p className="mt-4 min-h-[60px] text-sm leading-5 text-slate-600">{plan.description}</p>
                            </div>
                            <div className="flex flex-1 flex-col p-5">
                                <div className="min-h-[104px] text-center">
                                    {plan.price !== undefined ? (
                                        <>
                                            <p><span className="text-sm font-semibold">R$</span> <span className="text-3xl font-black">{plan.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span> <span className="text-sm text-slate-500">/mês</span></p>
                                            <p className="mt-2 text-xs font-semibold text-slate-600">{plan.limit}</p>
                                            {daily && plan.price > 0 && <p className="mt-2 text-xs text-slate-400">≈ {daily} por dia</p>}
                                        </>
                                    ) : (
                                        <><p className="text-xl font-black">Vamos montar um plano para você</p><p className="mt-3 text-xs text-slate-500">{plan.limit}</p></>
                                    )}
                                </div>
                                <ul className="my-5 flex-1 space-y-3">
                                    {plan.features.map(feature => <li key={feature} className="flex gap-2 text-sm text-slate-700"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${colors.soft}`}><Check className={`h-3.5 w-3.5 ${colors.icon}`} /></span>{feature}</li>)}
                                </ul>
                                <button
                                    onClick={() => handlePlanAction(plan.tier)}
                                    disabled={isCurrent || plan.tier === AccountTier.TRIAL || processing === plan.tier || !isManager}
                                    className={`w-full rounded-xl py-3 text-sm font-bold transition ${isCurrent ? 'cursor-not-allowed bg-slate-100 text-slate-500' : `${colors.button} text-white disabled:cursor-not-allowed disabled:opacity-50`}`}
                                >
                                    {isCurrent ? 'Plano atual' : plan.tier === AccountTier.TRIAL ? 'Teste incluído no cadastro' : processing === plan.tier ? 'Abrindo pagamento…' : plan.tier === AccountTier.UNLIMITED ? 'Solicitar proposta' : 'Contratar agora'}
                                </button>
                            </div>
                        </article>
                    );
                })}
            </section>

            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="border-b px-5 py-4"><h2 className="text-xl font-black text-slate-900">Compare os principais recursos</h2></div>
                <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Recursos', 'Start', 'Professional', 'Advanced', 'Enterprise AI', 'Unlimited'].map(label => <th key={label} className="px-4 py-3 text-left">{label}</th>)}</tr></thead>
                        <tbody className="divide-y">{comparison.map(row => <tr key={row[0]}>{row.map((cell, index) => <td key={`${row[0]}-${index}`} className={`px-4 py-3 ${index === 0 ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{cell}</td>)}</tr>)}</tbody>
                    </table>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                    <h2 className="mb-3 text-xl font-black">Dúvidas frequentes</h2>
                    <div className="divide-y">
                        {faqs.map(([question, answer], index) => (
                            <button key={question} onClick={() => setOpenFaq(openFaq === index ? null : index)} className="w-full py-4 text-left">
                                <span className="flex items-center justify-between gap-4 font-semibold text-slate-800">{question}<ChevronDown className={`h-4 w-4 transition ${openFaq === index ? 'rotate-180' : ''}`} /></span>
                                {openFaq === index && <span className="mt-2 block text-sm text-slate-600">{answer}</span>}
                            </button>
                        ))}
                    </div>
                </div>
                <aside className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm">
                    <Infinity className="h-8 w-8 text-emerald-400" />
                    <h2 className="mt-4 text-xl font-black">Ainda está em dúvida?</h2>
                    <p className="mt-2 text-sm text-slate-300">Converse com nosso time para escolher o plano adequado ao tamanho e à rotina da sua clínica.</p>
                    <button onClick={openSalesContact} className="mt-6 w-full rounded-xl bg-emerald-500 py-3 font-bold text-slate-950 hover:bg-emerald-400">Falar com um consultor</button>
                </aside>
            </section>
        </div>
    );
};

export default AccountPlansView;
