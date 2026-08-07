import React, { useEffect, useState } from 'react';
import {
    Building2, Check, ChevronDown, Crown, DollarSign, Headphones,
    Infinity, Save, Settings2, Shield, Sparkles, Star, Zap
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { AccountTier } from '../types/accountTiers';
import { openMercadoPagoCheckout, openSalesContact } from '../services/mercadoPagoCheckoutService';
import { DEFAULT_PLAN_PRICING, PlanPricing, subscribeToPlanPricing, updatePlanPricing } from '../services/planPricingService';
import { AppView } from '../types';

interface PlansViewProps {
    setView?: (view: AppView) => void;
}

type Plan = {
    id: AccountTier;
    name: string;
    price: string;
    description: string;
    icon: React.ElementType;
    tone: 'emerald' | 'blue' | 'indigo' | 'purple';
    features: string[];
};

const tierOrder: AccountTier[] = [
    AccountTier.TRIAL,
    AccountTier.SILVER,
    AccountTier.GOLD,
    AccountTier.ENTERPRISE,
    AccountTier.UNLIMITED
];

const tones = {
    emerald: { border: 'border-emerald-200', soft: 'bg-emerald-50', text: 'text-emerald-600', button: 'bg-emerald-600 hover:bg-emerald-700' },
    blue: { border: 'border-blue-200', soft: 'bg-blue-50', text: 'text-blue-600', button: 'bg-blue-600 hover:bg-blue-700' },
    indigo: { border: 'border-indigo-200', soft: 'bg-indigo-50', text: 'text-indigo-600', button: 'bg-indigo-600 hover:bg-indigo-700' },
    purple: { border: 'border-purple-200', soft: 'bg-purple-50', text: 'text-purple-600', button: 'bg-purple-600 hover:bg-purple-700' }
};

const comparison = [
    ['Agenda e atendimentos', true, true, true, true],
    ['Prontuário eletrônico', true, true, true, true],
    ['Financeiro completo', 'Básico', true, true, true],
    ['Contas a pagar e receber', false, true, true, true],
    ['Contratos e repasses', false, true, true, true],
    ['Dashboard executivo', false, true, true, true],
    ['Fator R e painel fiscal', false, false, true, true],
    ['Gestão de unidades', false, false, true, true],
    ['Relatórios consolidados', false, false, false, true],
    ['Suporte prioritário', false, false, false, true]
] as const;

const PlansView: React.FC<PlansViewProps> = ({ setView }) => {
    const { user, userTier, trialDaysRemaining, isTrialExpired } = useUser();
    const [pricing, setPricing] = useState<PlanPricing>(DEFAULT_PLAN_PRICING);
    const [pricingDraft, setPricingDraft] = useState<PlanPricing>(DEFAULT_PLAN_PRICING);
    const [savingPricing, setSavingPricing] = useState(false);
    const [pricingMessage, setPricingMessage] = useState('');
    const [showComparison, setShowComparison] = useState(true);
    const isMasterAdmin = user?.email === 'elsoncontador.st@gmail.com';

    useEffect(() => subscribeToPlanPricing(value => {
        setPricing(value);
        setPricingDraft(value);
    }), []);

    const plans: Plan[] = [
        {
            id: AccountTier.TRIAL,
            name: 'Start Free',
            price: '0,00',
            description: 'Teste grátis por 15 dias para conhecer o ERCMED.',
            icon: Star,
            tone: 'emerald',
            features: ['Até 3 profissionais', 'Até 10 pacientes', 'Agenda e atendimentos', 'Financeiro essencial', 'Produção e faturamento', 'Sem necessidade de cartão']
        },
        {
            id: AccountTier.SILVER,
            name: 'Professional',
            price: pricing.silver.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            description: 'Rotina clínica, financeira e profissional organizada.',
            icon: Shield,
            tone: 'blue',
            features: ['Até 10 profissionais', 'Tudo do Start Free', 'Dashboard executivo', 'Contas a pagar e receber', 'Contratos e repasses', 'Suporte por e-mail']
        },
        {
            id: AccountTier.GOLD,
            name: 'Advanced',
            price: pricing.gold.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            description: 'Gestão completa, visão fiscal e controle por unidade.',
            icon: Crown,
            tone: 'indigo',
            features: ['Até 20 profissionais', 'Tudo do Professional', 'Dashboard mensal e anual', 'Fator R e painel fiscal', 'Gestão de unidades', 'Relatórios gerenciais']
        },
        {
            id: AccountTier.ENTERPRISE,
            name: 'Enterprise',
            price: pricing.enterprise.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            description: 'Recursos avançados para operações de maior complexidade.',
            icon: Zap,
            tone: 'purple',
            features: ['Até 20 profissionais', 'Tudo do Advanced', 'Fluxos operacionais avançados', 'Relatórios consolidados', 'Suporte prioritário', 'Onboarding assistido']
        }
    ];

    const currentTier = userTier || AccountTier.TRIAL;
    const currentPlan = plans.find(plan => plan.id === currentTier);
    const currentPrice = currentPlan?.price || 'Sob consulta';

    const savePricing = async () => {
        if (!user?.email || !isMasterAdmin) return;
        setSavingPricing(true);
        setPricingMessage('');
        try {
            await updatePlanPricing(pricingDraft, pricing, user.email);
            setPricingMessage('Preços atualizados em todos os canais.');
        } catch (error) {
            console.error('Erro ao atualizar preços:', error);
            setPricingMessage('Não foi possível salvar os preços.');
        } finally {
            setSavingPricing(false);
        }
    };

    const handleAction = (planId: AccountTier) => {
        if (planId === currentTier && !isTrialExpired) return;
        if (planId === AccountTier.TRIAL) {
            setView?.(AppView.HEALTH_DASHBOARD);
            return;
        }
        if (planId === AccountTier.UNLIMITED) {
            openSalesContact();
            return;
        }
        openMercadoPagoCheckout(planId);
    };

    const actionLabel = (planId: AccountTier) => {
        if (planId === currentTier && !isTrialExpired) return 'Plano atual';
        if (planId === AccountTier.TRIAL) return currentTier === AccountTier.TRIAL ? 'Continuar teste' : 'Teste já utilizado';
        return tierOrder.indexOf(planId) > tierOrder.indexOf(currentTier) ? 'Fazer upgrade' : 'Alterar plano';
    };

    return (
        <div className="min-h-full bg-slate-50/60 pb-16">
            <main className="mx-auto max-w-[1540px] space-y-7 px-4 py-7 sm:px-6 lg:px-8">
                <header>
                    <h1 className="text-3xl font-black tracking-tight text-slate-950">Assinatura e Faturamento</h1>
                    <p className="mt-1 text-slate-600">Gerencie seu plano, cobrança e recursos contratados.</p>
                </header>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid divide-y divide-slate-200 lg:grid-cols-[1.1fr_1fr] lg:divide-x lg:divide-y-0">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-100"><Crown className="h-8 w-8" /></span>
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">Seu plano atual</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-3">
                                        <h2 className="text-2xl font-black text-blue-700">{currentPlan?.name || 'Unlimited'}</h2>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${isTrialExpired ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{isTrialExpired ? 'Expirado' : 'Ativo'}</span>
                                    </div>
                                    <p className="mt-1 font-black text-slate-950">{currentTier === AccountTier.TRIAL ? 'Teste gratuito por 15 dias' : currentTier === AccountTier.UNLIMITED ? 'Valor personalizado' : `R$ ${currentPrice}/mês`}</p>
                                    <p className="mt-2 max-w-xl text-sm text-slate-600">{currentPlan?.description || 'Plano personalizado para redes e grandes operações.'}</p>
                                    {currentTier === AccountTier.TRIAL && trialDaysRemaining !== undefined && <p className="mt-2 text-sm font-bold text-emerald-700">{trialDaysRemaining} dia(s) restante(s) no teste</p>}
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-sm font-black text-slate-900">Recursos contratados</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {(currentPlan?.features || ['Profissionais e unidades sob medida', 'Gestão consolidada', 'Integrações personalizadas', 'Suporte dedicado']).slice(0, 6).map(feature => (
                                    <span key={feature} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{feature}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {isMasterAdmin && (
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-950 px-6 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3"><Settings2 className="h-5 w-5 text-teal-300" /><div><h2 className="font-black">Gestão comercial dos planos</h2><p className="text-xs text-slate-400">Acesso exclusivo do usuário master</p></div></div>
                            <span className="rounded-full bg-teal-400/10 px-3 py-1 text-xs font-bold text-teal-300">Valores mensais</span>
                        </div>
                        <div className="grid gap-4 p-5 md:grid-cols-3">
                            {([['silver', 'Professional'], ['gold', 'Advanced'], ['enterprise', 'Enterprise']] as const).map(([key, label]) => (
                                <label key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <span className="text-sm font-bold text-slate-700">{label}</span>
                                    <span className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-teal-500"><DollarSign className="h-4 w-4 text-teal-600" /><b className="text-sm text-slate-500">R$</b><input type="number" min="1" step="0.01" value={pricingDraft[key]} onChange={event => setPricingDraft(current => ({ ...current, [key]: Number(event.target.value) }))} className="min-w-0 flex-1 bg-transparent font-black outline-none" /></span>
                                </label>
                            ))}
                        </div>
                        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-semibold text-slate-500">{pricingMessage || 'O checkout usa sempre o preço salvo no servidor.'}</p><button onClick={savePricing} disabled={savingPricing} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-black text-white hover:bg-teal-700 disabled:opacity-60"><Save className="h-4 w-4" />{savingPricing ? 'Salvando...' : 'Salvar preços'}</button></div>
                    </section>
                )}

                <section>
                    <div className="mb-5 text-center"><h2 className="text-2xl font-black text-slate-950">Compare os planos</h2><p className="mt-1 text-sm text-slate-600">Encontre o plano ideal conforme sua clínica cresce.</p><span className="mt-3 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">Cobrança mensal</span></div>
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        {plans.map(plan => {
                            const tone = tones[plan.tone];
                            const isCurrent = plan.id === currentTier && !isTrialExpired;
                            const Icon = plan.icon;
                            return (
                                <article key={plan.id} className={`relative flex min-h-[520px] flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${isCurrent ? 'border-blue-600 ring-4 ring-blue-50' : tone.border}`}>
                                    {isCurrent && <span className="absolute right-3 top-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-black uppercase text-white">✓ Plano atual</span>}
                                    <div className={`border-b p-5 ${tone.soft}`}><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm"><Icon className={`h-6 w-6 ${tone.text}`} /></span><h3 className={`mt-4 text-xl font-black ${isCurrent ? 'text-blue-700' : 'text-slate-950'}`}>{plan.name}</h3><p className="mt-2 min-h-[42px] text-sm leading-5 text-slate-600">{plan.description}</p></div>
                                    <div className="flex flex-1 flex-col p-5">
                                        <div>{plan.id === AccountTier.TRIAL ? <><p className="text-2xl font-black text-slate-950">Teste grátis</p><p className="text-sm font-semibold text-slate-500">R$ 0 durante 15 dias</p></> : <p><span className="text-sm font-semibold text-slate-500">R$</span> <span className="text-3xl font-black text-slate-950">{plan.price}</span><span className="text-sm text-slate-500">/mês</span></p>}</div>
                                        <ul className="my-6 flex-1 space-y-3">{plan.features.map(feature => <li key={feature} className="flex gap-2 text-sm text-slate-700"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${tone.soft}`}><Check className={`h-3.5 w-3.5 ${tone.text}`} /></span>{feature}</li>)}</ul>
                                        <button onClick={() => handleAction(plan.id)} disabled={isCurrent || (plan.id === AccountTier.TRIAL && currentTier !== AccountTier.TRIAL)} className={`w-full rounded-xl py-3 text-sm font-black transition ${isCurrent ? 'cursor-default bg-blue-600 text-white' : plan.id === AccountTier.TRIAL && currentTier !== AccountTier.TRIAL ? 'cursor-not-allowed bg-slate-100 text-slate-400' : `${tone.button} text-white`}`}>{actionLabel(plan.id)}</button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-white p-6 sm:flex-row sm:items-center">
                    <div className="flex gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white"><Infinity className="h-7 w-7" /></span><div><h2 className="font-black text-purple-800">Precisa de uma solução para grandes redes?</h2><p className="mt-1 text-sm text-slate-600">Profissionais, unidades e recursos ilimitados com gestão consolidada.</p></div></div>
                    <button onClick={openSalesContact} className="w-full rounded-xl bg-purple-600 px-6 py-3 text-sm font-black text-white hover:bg-purple-700 sm:w-auto">Conhecer o ERCMED Unlimited</button>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <button onClick={() => setShowComparison(value => !value)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"><div><h2 className="text-xl font-black text-slate-950">Compare todos os recursos</h2><p className="mt-1 text-sm text-slate-500">Veja em detalhes o que cada plano oferece.</p></div><span className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-blue-700">{showComparison ? 'Recolher' : 'Expandir'}<ChevronDown className={`h-4 w-4 transition ${showComparison ? 'rotate-180' : ''}`} /></span></button>
                    {showComparison && <div className="overflow-x-auto border-t border-slate-200"><table className="min-w-[760px] w-full text-sm"><thead className="bg-slate-50"><tr>{['Recurso', 'Start Free', 'Professional', 'Advanced', 'Enterprise'].map(label => <th key={label} className="px-4 py-3 text-left text-xs font-black text-slate-600">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{comparison.map(row => <tr key={row[0]}>{row.map((cell, index) => <td key={`${row[0]}-${index}`} className={`px-4 py-3 ${index === 0 ? 'font-semibold text-slate-800' : 'text-center text-slate-600'}`}>{cell === true ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : cell === false ? '—' : cell}</td>)}</tr>)}</tbody></table></div>}
                </section>

                <section className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-blue-200 bg-blue-50/50 p-6 sm:flex-row sm:items-center"><div className="flex gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm"><Headphones className="h-6 w-6" /></span><div><h2 className="font-black text-blue-950">Dúvidas sobre planos ou cobrança?</h2><p className="mt-1 text-sm text-slate-600">Nossa equipe está pronta para ajudar você.</p></div></div><button onClick={openSalesContact} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-6 py-3 text-sm font-black text-blue-700 shadow-sm hover:bg-blue-50 sm:w-auto"><Sparkles className="h-4 w-4" />Falar com o suporte</button></section>
            </main>
        </div>
    );
};

export default PlansView;
