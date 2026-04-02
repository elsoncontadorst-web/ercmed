import React from 'react';
import { BookOpen, Calculator, Shield, Tag, CalendarClock, Banknote, Scale, TrendingUp, Sun, Gift, FileX, FileText, Activity, DollarSign, Clock, Building2, MessageSquare } from 'lucide-react';

const HowToUseView: React.FC = () => {
    const sections = [
        {
            title: 'Gestão de Saúde',
            icon: Activity,
            color: 'text-teal-600',
            bg: 'bg-teal-100',
            steps: [
                'Dashboard Geral: Visão unificada de próximas consultas e resumo financeiro.',
                'Consultório (PEP): Histórico clínico completo, evoluções e prescrições.',
                'Agendamento Online: Configure seus horários e receba agendamentos.',
                'Clínica e Prontuários: Gestão completa de pacientes e documentos médicos.',
                'Recibos: Emissão rápida de recibos para pacientes.'
            ]
        },
        {
            title: 'Gestão de Repasse',
            icon: DollarSign,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100',
            steps: [
                'Dashboard Financeiro: Acompanhe faturamento total e repasses pendentes.',
                'Faturamento: Gerencie notas fiscais e status de pagamentos.',
                'Cálculo de Repasse: Calcule automaticamente os valores a repassar para profissionais.',
                'Fluxo de Caixa e DRE: Acompanhe receitas, despesas e resultados detalhados.',
                'Configurações: Defina taxas, impostos e dados da clínica.'
            ]
        },
        {
            title: 'Contratos e Profissionais',
            icon: FileText,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
            steps: [
                'Gestão de Contratos: Cadastre e gerencie contratos de prestação de serviço.',
                'Cadastro de Profissionais: Mantenha os dados da equipe atualizados.',
                'Controle de Vigência: Acompanhe prazos e renovações.'
            ]
        },

        {
            title: 'Consultor IA',
            icon: MessageSquare,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
            steps: [
                'Tire Dúvidas: Pergunte sobre legislação, códigos TUSS ou uso do sistema.',
                'Assistência Inteligente: Obtenha sugestões baseadas em dados.',
                'Disponível 24/7: Suporte imediato para questões do dia a dia.'
            ]
        },
        {
            title: 'Painel Fiscal Inteligente',
            icon: Calculator,
            color: 'text-indigo-600',
            bg: 'bg-indigo-100',
            steps: [
                'Compare regimes tributários (Simples Nacional, Lucro Presumido).',
                'Simule cenários fiscais para sua empresa.',
                'Analise a viabilidade de diferentes enquadramentos.'
            ]
        },
        // {
        //     title: 'Cálculos Trabalhistas',
        //     icon: Shield,
        //     color: 'text-orange-600',
        //     bg: 'bg-orange-100',
        //     steps: [
        //         'Cálculo PREV: Simulação de aposentadoria e contribuições.',
        //         'Férias, 13º Salário e Rescisão: Cálculos exatos de verbas trabalhistas.',
        //         'Seguro Desemprego: Estimativa de parcelas e valores.'
        //     ]
        // },
        {
            title: 'Funcionalidades Futuras (Em Breve)',
            icon: Clock,
            color: 'text-slate-600',
            bg: 'bg-slate-100',
            steps: [
                'Assinatura Eletrônica Avançada.',
                'Gestão de Estoque (Medicamentos e Cosméticos).',
                'Integração com Glic e Emissão de Laudos.'
            ]
        }
    ];

    return (
        <div className="h-full overflow-y-auto p-6 animate-fade-in">
            <div className="max-w-6xl mx-auto space-y-8 pb-24 md:pb-6">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                <BookOpen className="w-8 h-8 text-brand-400" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">Como Usar</h1>
                                <p className="text-slate-300 mt-1">Guia rápido para aproveitar todos os recursos do aplicativo</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sections.map((section, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2.5 rounded-lg ${section.bg}`}>
                                        <section.icon className={`w-6 h-6 ${section.color}`} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">{section.title}</h3>
                                </div>

                                <ul className="space-y-3">
                                    {section.steps.map((step, stepIndex) => (
                                        <li key={stepIndex} className="flex items-start gap-3 text-sm text-slate-600">
                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold mt-0.5">
                                                {stepIndex + 1}
                                            </span>
                                            <span className="leading-relaxed">{step}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HowToUseView;
