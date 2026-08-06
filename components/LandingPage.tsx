import React from 'react';
import {
    ArrowRight,
    BarChart3,
    BrainCircuit,
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    Clock3,
    Cloud,
    Landmark,
    Layers3,
    Headphones,
    LockKeyhole,
    LogIn,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
    ReceiptText,
    ShieldCheck,
    Star,
    Crown,
    Zap,
    UsersRound,
    WalletCards
} from 'lucide-react';
import SystemLogo from './SystemLogo';

interface LandingPageProps {
    onLoginClick: () => void;
    onTrialClick: () => void;
}

const publicPlans = [
    {
        name: 'Start',
        subtitle: 'Para começar',
        price: '0,00',
        limit: 'Até 3 profissionais',
        description: 'Experimente a operação integrada do ERCMED antes de contratar.',
        features: ['Até 10 pacientes', 'Agenda e atendimentos', 'Financeiro essencial', 'Produção e faturamento'],
        action: 'Começar grátis',
        icon: Star,
        accent: 'emerald',
        trial: '15 dias de acesso completo'
    },
    {
        name: 'Profissional',
        subtitle: 'Para a maioria das clínicas',
        price: '119,00',
        limit: 'Até 10 profissionais',
        description: 'Para organizar a rotina clínica, financeira e profissional em um só lugar.',
        features: ['Dashboard executivo', 'Contas a pagar e receber', 'Produção e faturamento', 'Contratos e repasses', 'Suporte por e-mail'],
        action: 'Testar 15 dias grátis',
        icon: ShieldCheck,
        accent: 'blue',
        recommended: true
    },
    {
        name: 'Advanced',
        subtitle: 'Para clínicas em crescimento',
        price: '190,00',
        limit: 'Até 20 profissionais',
        description: 'Para clínicas que precisam de gestão completa, visão fiscal e controle por unidade.',
        features: ['Tudo do Professional', 'Dashboard mensal e anual', 'Fator R e painel fiscal', 'Empresas e unidades', 'Relatórios executivos'],
        action: 'Testar 15 dias grátis',
        icon: Crown,
        accent: 'indigo'
    },
    {
        name: 'Enterprise',
        subtitle: 'Automação e performance',
        price: '390,00',
        limit: 'Até 20 profissionais',
        description: 'Para operações que buscam automação, gestão avançada e prioridade no atendimento.',
        features: ['Tudo do Advanced', 'Fluxos operacionais avançados', 'Automação de processos', 'Análises gerenciais avançadas', 'Suporte prioritário'],
        action: 'Testar 15 dias grátis',
        icon: Zap,
        accent: 'purple'
    },
    {
        name: 'Unlimited',
        subtitle: 'Redes e franquias',
        price: null,
        limit: 'Profissionais ilimitados',
        description: 'Solução personalizada para redes, grupos empresariais e operações sem limite.',
        features: ['Profissionais ilimitados', 'Gestão consolidada do grupo', 'Integrações personalizadas', 'Onboarding dedicado', 'Suporte e SLA dedicados'],
        action: 'Solicitar proposta',
        icon: Building2,
        accent: 'slate'
    }
] as const;

const customerCompanies = [
    { name: 'Rede de Clínicas Ana Nery', logo: '/customers/ana-nery.webp' },
    { name: 'Intervir ABA Terapias Comportamentais', logo: '/customers/intervir-aba.jpg' },
    { name: 'Evoluir', logo: '/customers/evoluir.jpg' },
    { name: 'Anniele Matos Studio Pilates', logo: '/customers/annie-matos.webp' }
] as const;

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onTrialClick }) => {
    const handleWhatsApp = () => {
        window.open('https://api.whatsapp.com/send?phone=5579988078887&text=Olá%2C%20quero%20conhecer%20o%20novo%20ERCMED%20para%20gestão%20de%20empresas%20de%20saúde.', '_blank', 'noopener,noreferrer');
    };

    const pillars = [
        {
            icon: WalletCards,
            title: 'Financeiro, faturamento e cobrança',
            description: 'Centralize contas a pagar, contas a receber, inadimplência, caixa, bancos, conciliação e cobrança em um fluxo único.'
        },
        {
            icon: ReceiptText,
            title: 'Faturamento e repasse com rastreabilidade',
            description: 'Transforme produção em faturamento, acompanhe convênios, glosas, contratos e regras de repasse com segurança operacional.'
        },
        {
            icon: BarChart3,
            title: 'BI, controladoria e visão executiva',
            description: 'Acompanhe DRE, EBITDA, margem, centros de resultado, metas e indicadores empresariais em tempo real.'
        }
    ];

    const workflow = [
        ['1', 'Registrar produção', 'O profissional informa a produção realizada no portal com login próprio e o sistema identifica o serviço automaticamente.'],
        ['2', 'Converter em receita', 'O ERCMED aplica tabela, convênio, contrato, pacote, valor e regras de faturamento sem depender de cálculos manuais.'],
        ['3', 'Controlar a operação', 'Financeiro, repasse, estoque, patrimônio, XML fiscal e obrigações gerenciais recebem os reflexos automaticamente.'],
        ['4', 'Tomar decisão', 'A diretoria acompanha indicadores, metas, centros de resultado, lucratividade e alertas executivos em uma única tela.']
    ];

    const modules = [
        'Dashboard executivo e indicadores de gestão',
        'Contas a pagar, contas a receber e cobrança',
        'Faturamento convênios, particular, guias e glosas',
        'Serviços, preços, contratos e tabelas comerciais',
        'Repasse médico e produção por profissional',
        'Compras, estoque, patrimônio e fornecedores',
        'Fiscal, XML, contabilidade e apoio tributário',
        'CRM, comercial, unidades, acessos e integrações'
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <header className="sticky top-0 z-50 shadow-sm">
                <div className="hidden bg-slate-950 text-white md:block">
                    <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 text-xs font-medium lg:px-8">
                        <div className="flex items-center gap-5">
                            <span className="flex items-center gap-1.5"><Headphones className="h-3.5 w-3.5 text-teal-300" /> Suporte especializado</span>
                            <span className="h-4 w-px bg-white/20" />
                            <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-teal-300" /> Segunda a sexta, das 8h às 18h</span>
                            <span className="h-4 w-px bg-white/20" />
                            <span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-teal-300" /> Atendimento via WhatsApp</span>
                        </div>
                        <div className="flex items-center gap-5">
                            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-teal-300" /> Privacidade e proteção de dados</span>
                            <span className="h-4 w-px bg-white/20" />
                            <span className="flex items-center gap-1.5"><Cloud className="h-3.5 w-3.5 text-teal-300" /> Plataforma em nuvem</span>
                        </div>
                    </div>
                </div>
                <nav className="border-b border-slate-200 bg-white/95 backdrop-blur">
                    <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                        <SystemLogo className="h-14" variant="dark" />
                        <div className="hidden h-full items-center gap-8 text-sm font-bold text-slate-700 xl:flex">
                            <div className="group relative flex h-full items-center">
                                <button className="flex h-full items-center gap-1.5 border-b-4 border-transparent pt-1 transition group-hover:border-teal-600 group-hover:text-teal-700">
                                    Soluções <ChevronDown className="h-4 w-4 transition group-hover:rotate-180" />
                                </button>
                                <div className="invisible absolute left-1/2 top-[calc(100%-1px)] w-[760px] -translate-x-1/2 translate-y-2 overflow-hidden rounded-b-3xl border border-slate-200 bg-white opacity-0 shadow-2xl shadow-slate-950/15 transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                                    <div className="grid grid-cols-[.9fr_1.15fr_.95fr]">
                                        <div className="space-y-2 p-7">
                                            <p className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-teal-700">Simplifique sua gestão</p>
                                            <a href="#solucoes" className="block rounded-xl bg-teal-50 px-4 py-3 text-slate-900 hover:bg-teal-100">Controle financeiro</a>
                                            <a href="#solucoes" className="block rounded-xl px-4 py-3 text-slate-700 hover:bg-slate-50">Faturamento e repasses</a>
                                            <a href="#recursos" className="block rounded-xl px-4 py-3 text-slate-700 hover:bg-slate-50">Indicadores executivos</a>
                                        </div>
                                        <div className="border-l border-slate-100 p-7">
                                            <p className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Principais recursos</p>
                                            <div className="space-y-4">
                                                {[
                                                    [CalendarDays, 'Agenda e atendimentos', 'Organize a rotina da clínica'],
                                                    [ReceiptText, 'Faturamento integrado', 'Produção, cobrança e repasses'],
                                                    [BarChart3, 'BI e relatórios', 'Decisões orientadas por dados'],
                                                    [ShieldCheck, 'Segurança e LGPD', 'Controle de acesso e rastreabilidade']
                                                ].map(([Icon, title, description]) => {
                                                    const MenuIcon = Icon as React.ElementType;
                                                    return <a key={title as string} href="#recursos" className="flex gap-3 rounded-xl p-2 hover:bg-slate-50"><span className="rounded-lg bg-teal-50 p-2"><MenuIcon className="h-4 w-4 text-teal-700" /></span><span><strong className="block text-slate-900">{title as string}</strong><small className="font-medium text-slate-500">{description as string}</small></span></a>;
                                                })}
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-br from-teal-50 to-cyan-100 p-7">
                                            <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">Em destaque</p>
                                            <div className="mt-4 overflow-hidden rounded-xl border border-white bg-white shadow-sm">
                                                <img src="/assets/dashboard-executivo-real.png" alt="Visão real do Dashboard ERCMed" className="aspect-video w-full object-cover object-left-top" />
                                            </div>
                                            <h3 className="mt-5 text-lg font-black text-slate-950">Gestão completa em uma única plataforma</h3>
                                            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">Financeiro, operação e indicadores conectados em tempo real.</p>
                                            <a href="#recursos" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-teal-700">Conhecer recursos <ArrowRight className="h-4 w-4" /></a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <a href="#recursos" className="transition hover:text-teal-700">Recursos</a>
                            <a href="#sobre" className="transition hover:text-teal-700">Sobre o ERCMed</a>
                            <a href="#planos" className="transition hover:text-teal-700">Planos</a>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={onTrialClick} className="hidden items-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-teal-700 md:flex">
                                Teste grátis
                            </button>
                            <button onClick={onLoginClick} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:border-teal-600 hover:text-teal-700">
                                <LogIn className="h-4 w-4" /> Acessar sistema
                            </button>
                        </div>
                    </div>
                </nav>
            </header>

            <main>
                <section id="inicio" className="relative overflow-hidden bg-white py-14 lg:py-20">
                    <div className="absolute -right-36 top-8 h-96 w-96 rounded-full bg-teal-200/40 blur-3xl" />
                    <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-100/50 blur-3xl" />
                    <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-teal-700">
                                <Building2 className="h-4 w-4" /> ERP completo para empresas da saúde
                            </div>
                            <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.55rem]">
                                Gestão inteligente para clínicas e empresas da saúde <span className="text-teal-600">crescerem com controle</span>
                            </h1>
                            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
                                Integre operação, faturamento, financeiro, profissionais, recursos e gestão fiscal em uma única plataforma, com mais clareza para decidir e crescer.
                            </p>
                            <div className="mt-7 grid max-w-xl grid-cols-2 gap-3 text-sm font-semibold text-slate-700">
                                {[
                                    ['Dashboard executivo', BarChart3],
                                    ['Financeiro integrado', Landmark],
                                    ['Gestão fiscal', ShieldCheck],
                                    ['Suporte especializado', Headphones]
                                ].map(([label, Icon]) => {
                                    const BenefitIcon = Icon as React.ElementType;
                                    return <div key={label as string} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3"><BenefitIcon className="h-5 w-5 text-teal-600" />{label as string}</div>;
                                })}
                            </div>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <button onClick={onTrialClick} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-4 font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700">
                                    Conhecer o sistema <ArrowRight className="h-5 w-5" />
                                </button>
                                <button onClick={handleWhatsApp} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-4 font-bold text-slate-800 transition hover:border-teal-300 hover:bg-teal-50">
                                    <CalendarDays className="h-5 w-5" /> Agendar demonstração
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-teal-200/60 to-cyan-100/20 blur-2xl" />
                            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/15">
                                <div className="flex items-center gap-1.5 border-b border-slate-100 px-2 pb-3">
                                    <span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                                    <span className="ml-3 text-xs font-semibold text-slate-400">Dashboard Executivo ERCMED</span>
                                </div>
                                <img src="/assets/dashboard-executivo-real.png" alt="Tela real do Dashboard Executivo do ERCMed" className="mt-3 aspect-[16/10] w-full rounded-2xl object-cover object-left-top" />
                            </div>
                        </div>
                    </div>
                    <div className="relative mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                            {[
                                ['15 dias', 'Teste completo para conhecer a plataforma', CalendarDays],
                                ['5 planos', 'Opções para diferentes portes de operação', Layers3],
                                ['Gestão integrada', 'Operação, financeiro e fiscal conectados', ShieldCheck],
                                ['Na nuvem', 'Acesso online com dados centralizados', Cloud]
                            ].map(([value, description, Icon], index) => {
                                const MetricIcon = Icon as React.ElementType;
                                return <div key={value as string} className={`flex items-center gap-4 p-6 ${index ? 'border-t border-slate-200 sm:border-l sm:border-t-0' : ''}`}><div className="rounded-xl bg-teal-100 p-3"><MetricIcon className="h-6 w-6 text-teal-700" /></div><div><p className="text-xl font-black text-slate-950">{value as string}</p><p className="mt-1 text-sm leading-snug text-slate-600">{description as string}</p></div></div>;
                            })}
                        </div>
                    </div>
                </section>

                <section id="clientes" className="border-b border-slate-200 bg-white py-14">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-700">Quem usa o ERCMed</p>
                            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Empresas que confiam no nosso sistema</h2>
                            <p className="mx-auto mt-3 max-w-2xl text-slate-600">Operações de saúde que utilizam o ERCMed para organizar sua gestão e crescer com mais controle.</p>
                        </div>
                        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
                            {customerCompanies.map(company => (
                                <article key={company.name} className="flex min-h-36 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:-translate-y-1 hover:border-teal-200 hover:bg-white hover:shadow-md">
                                    <img
                                        src={company.logo}
                                        alt={`Logotipo ${company.name}`}
                                        loading="lazy"
                                        className="h-24 w-full object-contain mix-blend-multiply sm:h-28"
                                    />
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="solucoes" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                    <div className="max-w-2xl">
                        <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-700">Posicionamento do produto</p>
                        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Um ERP vertical para operação, faturamento e crescimento.</h2>
                        <p className="mt-4 text-lg leading-relaxed text-slate-600">
                            O ERCMED agora foi reposicionado para empresas de saúde que precisam de gestão integrada, governança operacional e visão financeira clara.
                        </p>
                    </div>
                    <div className="mt-10 grid gap-6 md:grid-cols-3">
                        {pillars.map(({ icon: Icon, title, description }) => (
                            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                                <div className="inline-flex rounded-xl bg-teal-50 p-3">
                                    <Icon className="h-7 w-7 text-teal-700" />
                                </div>
                                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                                <p className="mt-3 leading-relaxed text-slate-600">{description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="recursos" className="bg-white py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
                            <div className="rounded-3xl bg-teal-950 p-8 text-white sm:p-10">
                                <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-300">Portal do profissional</p>
                                <h2 className="mt-3 text-3xl font-black sm:text-4xl">A produção é lançada na origem e faturada automaticamente.</h2>
                                <p className="mt-5 leading-relaxed text-teal-50/85">
                                    Cada profissional acessa seu portal, registra o atendimento realizado e o sistema busca o valor do serviço, aplica tabela, contrato e regra de repasse, enviando o lançamento para faturamento e financeiro.
                                </p>
                                <div className="mt-7 space-y-4">
                                    {[
                                        'Login individual por profissional',
                                        'Produção vinculada ao serviço e tabela correta',
                                        'Repasse automático conforme regras configuradas',
                                        'Integração com faturamento, financeiro e indicadores'
                                    ].map(item => (
                                        <div key={item} className="flex gap-3 text-sm font-medium text-teal-50">
                                            <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-300" /> {item}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-700">Fluxo principal</p>
                                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Da produção ao resultado empresarial.</h2>
                                <div className="mt-8 space-y-5">
                                    {workflow.map(([number, title, description]) => (
                                        <div key={number} className="flex gap-4">
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-teal-300">{number}</span>
                                            <div>
                                                <h3 className="font-bold text-slate-900">{title}</h3>
                                                <p className="mt-1 text-slate-600">{description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="sobre" className="border-y border-slate-200 bg-white py-20">
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[.7fr_1.3fr] lg:items-center lg:px-8">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-700">Sobre o ERCMed</p>
                            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                                Tecnologia e gestão trabalhando juntas pela saúde.
                            </h2>
                        </div>
                        <div className="space-y-4 text-lg leading-relaxed text-slate-600">
                            <p>
                                O <strong className="text-slate-900">ERCMed</strong> é uma plataforma completa de gestão para clínicas, consultórios e empresas da saúde. Em um único ambiente, integra atendimentos, prontuários, agenda, financeiro, faturamento, repasses, indicadores gerenciais e automação de processos.
                            </p>
                            <p>
                                Desenvolvido pela <strong className="text-slate-900">ERC – Sistemas, Gestão &amp; Contabilidade Estratégica</strong>, o sistema combina tecnologia e experiência em gestão aplicada à saúde para tornar a operação mais organizada, segura e eficiente.
                            </p>
                            <p>
                                Mais do que um software, o ERCMed apoia gestores e equipes na tomada de decisões, reduz tarefas manuais e oferece mais controle para que a empresa cresça de forma sustentável — sem perder o foco no cuidado com o paciente.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-700">Módulos do ERP</p>
                        <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Tudo que uma empresa de saúde precisa para operar com previsibilidade.</h2>
                        <p className="mt-5 text-lg leading-relaxed text-slate-600">
                            O sistema foi estruturado para clínicas, centros médicos, policlínicas, laboratórios, operações de home care e empresas de saúde que precisam controlar receita, custo, produção e escala.
                        </p>
                        <div className="mt-7 space-y-4">
                            {modules.map(item => (
                                <div key={item} className="flex gap-3 font-medium text-slate-700">
                                    <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600" /> {item}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 to-teal-50 p-8 shadow-sm sm:p-10">
                        <BrainCircuit className="h-10 w-10 text-teal-700" />
                        <h3 className="mt-6 text-2xl font-black">Gestão avançada e governança.</h3>
                        <p className="mt-4 leading-relaxed text-slate-600">
                            Permissões por perfil, rastreabilidade dos lançamentos, visão por unidade, centros de resultado, metas, BI e automação tornam a operação mais segura e a diretoria mais rápida para decidir.
                        </p>
                        <button onClick={handleWhatsApp} className="mt-7 inline-flex items-center gap-2 font-bold text-teal-700 hover:text-teal-800">
                            Conversar sobre minha operação <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </section>

                <section id="planos" className="border-y border-slate-200 bg-white py-20">
                    <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-3xl">
                                <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-700">Planos ERCMED</p>
                                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                                    Escolha o <span className="text-teal-600">plano ideal</span> para sua clínica
                                </h2>
                                <p className="mt-4 text-lg text-slate-600">Teste por 15 dias, sem cartão e sem fidelidade. Evolua o plano conforme sua operação crescer.</p>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
                                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Sem fidelidade</span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2"><MessageCircle className="h-4 w-4 text-violet-600" /> Suporte humanizado</span>
                            </div>
                        </div>

                        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
                            {publicPlans.map(plan => {
                                const Icon = plan.icon;
                                const recommended = 'recommended' in plan && plan.recommended;
                                return (
                                    <article key={plan.name} className={`relative flex min-h-[36rem] flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${recommended ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                                        {recommended && <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-b-xl bg-blue-600 px-5 py-1.5 text-xs font-black uppercase tracking-wide text-white">Recomendado</div>}
                                        <div className={`border-b border-slate-100 p-7 ${recommended ? 'bg-blue-50/70 pt-11' : 'bg-slate-50/70'}`}>
                                            <div className="inline-flex rounded-2xl bg-white p-3 shadow-sm"><Icon className={`h-7 w-7 ${recommended ? 'text-blue-600' : 'text-teal-600'}`} /></div>
                                            <h3 className="mt-5 text-2xl font-black">{plan.name}</h3>
                                            <p className="mt-1 text-sm font-semibold text-slate-500">{plan.subtitle}</p>
                                            <p className="mt-4 min-h-12 text-sm leading-relaxed text-slate-600">{plan.description}</p>
                                        </div>
                                        <div className="flex flex-1 flex-col p-7">
                                            {plan.price ? (
                                                <div><span className="text-sm text-slate-500">R$ </span><span className="text-4xl font-black tracking-tight">{plan.price}</span><span className="font-semibold text-slate-500"> /mês</span></div>
                                            ) : (
                                                <div className="text-2xl font-black">Plano sob consulta</div>
                                            )}
                                            <p className="mt-3 text-sm font-bold text-slate-700">{plan.limit}</p>
                                            {'trial' in plan && <p className="mt-1 text-xs text-slate-500">{plan.trial}</p>}
                                            <ul className="mt-7 flex-1 space-y-3">
                                                {plan.features.map(feature => (
                                                    <li key={feature} className="flex gap-2.5 text-sm leading-snug text-slate-700">
                                                        <CheckCircle2 className={`h-5 w-5 shrink-0 ${recommended ? 'text-blue-500' : 'text-teal-500'}`} /> {feature}
                                                    </li>
                                                ))}
                                            </ul>
                                            <button
                                                onClick={plan.name === 'Unlimited' ? handleWhatsApp : onTrialClick}
                                                className={`mt-7 w-full rounded-xl px-4 py-3.5 text-sm font-black transition ${recommended ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-300 bg-white text-slate-900 hover:border-teal-500 hover:text-teal-700'}`}
                                            >
                                                {plan.action}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-700">
                                        <tr>
                                            <th className="px-5 py-4 font-black">Comparação rápida</th>
                                            {publicPlans.map(plan => <th key={plan.name} className="px-4 py-4 text-center font-black">{plan.name}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        <tr><td className="px-5 py-4 font-semibold">Profissionais</td><td className="text-center">Até 3</td><td className="text-center">Até 10</td><td className="text-center">Até 20</td><td className="text-center">Até 20</td><td className="text-center">Ilimitados</td></tr>
                                        <tr><td className="px-5 py-4 font-semibold">Gestão financeira</td><td className="text-center">Básica</td><td className="text-center">Relatórios</td><td className="text-center">Completa</td><td className="text-center">Completa + automação</td><td className="text-center">Personalizada</td></tr>
                                        <tr><td className="px-5 py-4 font-semibold">Suporte</td><td className="text-center">E-mail</td><td className="text-center">E-mail</td><td className="text-center">Chat</td><td className="text-center">Prioritário</td><td className="text-center">Dedicado</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="mt-10 grid gap-4 md:grid-cols-3">
                            {[
                                ['Posso trocar de plano?', 'Sim. Você pode evoluir ou reduzir o plano conforme sua necessidade.'],
                                ['O teste precisa de cartão?', 'Não. Os 15 dias grátis não exigem cartão de crédito.'],
                                ['Posso cancelar quando quiser?', 'Sim. Não há fidelidade nem burocracia para cancelar.']
                            ].map(([question, answer]) => (
                                <details key={question} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <summary className="cursor-pointer font-bold text-slate-900">{question}</summary>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{answer}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="bg-slate-900 px-4 py-20 text-center text-white sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-3xl">
                        <p className="text-sm font-bold uppercase tracking-[0.16em] text-teal-300">Novo ERCMED</p>
                        <h2 className="mt-4 text-3xl font-black sm:text-5xl">Uma única plataforma para gerir, faturar, controlar e crescer.</h2>
                        <p className="mt-5 text-lg text-slate-300">
                            Saia de controles isolados e leve sua empresa de saúde para um ERP criado para o dia a dia financeiro, operacional e executivo.
                        </p>
                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <button onClick={onTrialClick} className="rounded-xl bg-teal-400 px-6 py-4 font-bold text-slate-950 hover:bg-teal-300">Conhecer o novo sistema</button>
                            <button onClick={handleWhatsApp} className="rounded-xl border border-white/20 px-6 py-4 font-bold hover:bg-white/10">Falar com a equipe</button>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-white/10 bg-slate-950 text-slate-300">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1.1fr] lg:px-8">
                    <div className="lg:pr-8">
                        <SystemLogo className="h-14" variant="light" />
                        <p className="mt-5 max-w-sm leading-relaxed text-slate-400">
                            ERP completo para empresas de saúde que desejam mais controle, eficiência e crescimento sustentável.
                        </p>
                    </div>

                    <div className="lg:border-l lg:border-white/10 lg:pl-8">
                        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-teal-300">Soluções</h3>
                        <nav className="mt-5 flex flex-col gap-3 text-sm">
                            <a href="#solucoes" className="transition hover:text-teal-300">Financeiro e faturamento</a>
                            <a href="#solucoes" className="transition hover:text-teal-300">BI e dashboards</a>
                            <a href="#recursos" className="transition hover:text-teal-300">Operação integrada</a>
                            <a href="#recursos" className="transition hover:text-teal-300">Relatórios executivos</a>
                        </nav>
                    </div>

                    <div className="lg:border-l lg:border-white/10 lg:pl-8">
                        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-teal-300">Empresa</h3>
                        <nav className="mt-5 flex flex-col gap-3 text-sm">
                            <a href="#sobre" className="transition hover:text-teal-300">Sobre o ERCMed</a>
                            <a href="#clientes" className="transition hover:text-teal-300">Quem usa</a>
                            <a href="#planos" className="transition hover:text-teal-300">Planos</a>
                            <button onClick={handleWhatsApp} className="text-left transition hover:text-teal-300">Fale com a equipe</button>
                        </nav>
                    </div>

                    <div className="lg:border-l lg:border-white/10 lg:pl-8">
                        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-teal-300">Fale conosco</h3>
                        <div className="mt-5 space-y-4 text-sm">
                            <button onClick={handleWhatsApp} className="flex items-center gap-3 transition hover:text-teal-300"><Phone className="h-4 w-4 text-teal-300" /> (79) 98807-8887</button>
                            <a href="mailto:elsoncontador.st@gmail.com" className="flex items-center gap-3 transition hover:text-teal-300"><Mail className="h-4 w-4 text-teal-300" /> elsoncontador.st@gmail.com</a>
                            <span className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" /> Aracaju - SE e Santaluz - BA</span>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10">
                    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-slate-400 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
                        <div className="flex items-center gap-3">
                            <LockKeyhole className="h-5 w-5 shrink-0 text-teal-300" />
                            <span>Sua empresa, seus dados, nossa responsabilidade. Ambiente seguro e em conformidade com a LGPD.</span>
                        </div>
                        <span className="shrink-0">© {new Date().getFullYear()} ERCMed. Todos os direitos reservados.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
