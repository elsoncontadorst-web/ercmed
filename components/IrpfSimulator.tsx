import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Heart, GraduationCap, Users, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { useCloudSync } from '../hooks/useCloudSync';
import { CloudSyncIndicator } from './CloudSyncIndicator';

const IrpfSimulator: React.FC = () => {
    // --- STATE ---
    // Monthly Inputs
    const [monthlyGrossIncome, setMonthlyGrossIncome] = useState<number | string>(0);
    const [dependentsCount, setDependentsCount] = useState<number | string>(0);
    const [alimony, setAlimony] = useState<number | string>(0);

    // Annual Inputs
    const [annualHealthExpenses, setAnnualHealthExpenses] = useState<number | string>(0);
    const [annualEducationExpenses, setAnnualEducationExpenses] = useState<number | string>(0);

    // High Income Inputs
    const [totalAnnualIncome, setTotalAnnualIncome] = useState<number | string>(0); // Tributável + Isento
    const [monthlyDividends, setMonthlyDividends] = useState<number | string>(0);

    // Results
    const [monthlyResult, setMonthlyResult] = useState<any>(null);
    const [annualResult, setAnnualResult] = useState<any>(null);
    const [highIncomeResult, setHighIncomeResult] = useState<any>(null);

    // --- CLOUD SYNC ---
    const { isSyncing, lastSync } = useCloudSync(
        'irpf_calc',
        {
            monthlyGrossIncome, dependentsCount, alimony,
            annualHealthExpenses, annualEducationExpenses,
            totalAnnualIncome, monthlyDividends
        },
        (data) => {
            if (data.monthlyGrossIncome !== undefined) setMonthlyGrossIncome(data.monthlyGrossIncome);
            if (data.dependentsCount !== undefined) setDependentsCount(data.dependentsCount);
            if (data.alimony !== undefined) setAlimony(data.alimony);
            if (data.annualHealthExpenses !== undefined) setAnnualHealthExpenses(data.annualHealthExpenses);
            if (data.annualEducationExpenses !== undefined) setAnnualEducationExpenses(data.annualEducationExpenses);
            if (data.totalAnnualIncome !== undefined) setTotalAnnualIncome(data.totalAnnualIncome);
            if (data.monthlyDividends !== undefined) setMonthlyDividends(data.monthlyDividends);
        }
    );

    // --- CONSTANTS 2026 (Simulated) ---
    const DEDUCTION_PER_DEPENDENT = 189.59;
    const EXEMPTION_LIMIT = 5000.00;
    const SCALED_DISCOUNT_LIMIT = 7350.00;

    // Annual Limits
    const ANNUAL_EDUCATION_LIMIT = 3561.50;
    const ANNUAL_DEPENDENT_LIMIT = 2275.08;

    // High Income
    const HIGH_INCOME_THRESHOLD = 600000.00;
    const DIVIDEND_THRESHOLD = 50000.00;

    // --- CALCULATIONS ---

    // Função para calcular INSS progressivo
    const calculateInss = (salary: number): number => {
        if (salary <= 0) return 0;

        // Tabela INSS 2025
        const bracket1 = 1412.00;
        const bracket2 = 2666.68;
        const bracket3 = 4000.03;
        const bracket4 = 7786.02;

        let inss = 0;

        if (salary <= bracket1) {
            inss = salary * 0.075;
        } else if (salary <= bracket2) {
            inss = (bracket1 * 0.075) + ((salary - bracket1) * 0.09);
        } else if (salary <= bracket3) {
            inss = (bracket1 * 0.075) + ((bracket2 - bracket1) * 0.09) + ((salary - bracket2) * 0.12);
        } else if (salary <= bracket4) {
            inss = (bracket1 * 0.075) + ((bracket2 - bracket1) * 0.09) + ((bracket3 - bracket2) * 0.12) + ((salary - bracket3) * 0.14);
        } else {
            // Teto do INSS
            inss = (bracket1 * 0.075) + ((bracket2 - bracket1) * 0.09) + ((bracket3 - bracket2) * 0.12) + ((bracket4 - bracket3) * 0.14);
        }

        return inss;
    };

    const calculateMonthly = () => {
        const gross = Number(monthlyGrossIncome);
        const inss = calculateInss(gross);
        const deps = Number(dependentsCount);
        const pens = Number(alimony);

        const deductions = inss + (deps * DEDUCTION_PER_DEPENDENT) + pens;
        const baseCalculation = gross - deductions;

        let irrf = 0;
        let effectiveRate = 0;
        let method = '';

        if (gross <= EXEMPTION_LIMIT) {
            irrf = 0;
            method = 'Isento (Até R$ 5.000,00)';
        } else if (gross <= SCALED_DISCOUNT_LIMIT) {
            // Simulação de Desconto Escalado
            // Faixa de transição: R$ 5.000,01 a R$ 7.350,00
            // Desconto varia de R$ 500,00 (em 5k) a R$ 0,00 (em 7.35k)

            // 1. Calcula imposto pela tabela normal (simulada 2025/2026)
            // Tabela Progressiva (Baseada em 2024/2025 para fins de cálculo base)
            let baseTax = 0;
            if (baseCalculation <= 2259.20) baseTax = 0;
            else if (baseCalculation <= 2826.65) baseTax = (baseCalculation * 0.075) - 169.44;
            else if (baseCalculation <= 3751.05) baseTax = (baseCalculation * 0.15) - 381.44;
            else if (baseCalculation <= 4664.68) baseTax = (baseCalculation * 0.225) - 662.77;
            else baseTax = (baseCalculation * 0.275) - 896.00;

            // 2. Calcula o desconto extra
            // Interpolação linear: 
            // x = gross
            // x0 = 5000, y0 = 500
            // x1 = 7350, y1 = 0
            const x = gross;
            const x0 = 5000;
            const x1 = 7350;
            const y0 = 500;
            const y1 = 0;

            const discount = y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
            const finalDiscount = Math.max(0, discount); // Não pode ser negativo

            irrf = Math.max(0, baseTax - finalDiscount);
            method = `Desconto Escalado (Redução de ${formatMoney(finalDiscount)})`;

        } else {
            // Tabela Padrão (> 7.350,00)
            if (baseCalculation <= 2259.20) irrf = 0;
            else if (baseCalculation <= 2826.65) irrf = (baseCalculation * 0.075) - 169.44;
            else if (baseCalculation <= 3751.05) irrf = (baseCalculation * 0.15) - 381.44;
            else if (baseCalculation <= 4664.68) irrf = (baseCalculation * 0.225) - 662.77;
            else irrf = (baseCalculation * 0.275) - 896.00;

            method = 'Tabela Progressiva Padrão';
        }

        if (gross > 0) effectiveRate = irrf / gross;

        setMonthlyResult({
            baseCalculation,
            irrf,
            effectiveRate,
            method,
            deductions,
            inss
        });
    };

    const calculateAnnual = () => {
        if (!monthlyResult) return;

        const annualGross = Number(monthlyGrossIncome) * 12 + Number(monthlyGrossIncome); // 13º Salário (Simplificado)
        // Nota: 13º tem tributação exclusiva, mas para estimativa de ajuste anual simplificado, somamos tudo na base anual
        // Ajuste: Vamos usar 12 meses para a base de cálculo do ajuste anual padrão (modelo declaração)

        const annualGrossStandard = Number(monthlyGrossIncome) * 12;
        const annualInss = calculateInss(Number(monthlyGrossIncome)) * 12;

        // Deduções Anuais
        const health = Number(annualHealthExpenses); // Sem limite

        // Educação (Com limite)
        // Assumindo que o valor inserido é o total gasto. O sistema aplica o teto por pessoa.
        // Como não sabemos quantas pessoas, vamos assumir que o gasto é para o titular + dependentes declarados.
        // Simplificação: Aplicar o teto global baseado em (1 titular + N dependentes) * Teto
        // Ou, conforme pedido: "Teto anual de R$ 3.561,50 por pessoa".
        // Vamos assumir que o usuário digita o valor total e nós limitamos a (1 + deps) * Teto.
        const educationLimit = (1 + Number(dependentsCount)) * ANNUAL_EDUCATION_LIMIT;
        const educationDeductible = Math.min(Number(annualEducationExpenses), educationLimit);

        // Dependentes (Com limite anual)
        const dependentsDeductible = Number(dependentsCount) * ANNUAL_DEPENDENT_LIMIT;

        const annualTaxableBase = annualGrossStandard - annualInss - health - educationDeductible - dependentsDeductible;

        // Cálculo do Imposto Devido Anual (Tabela Anual - Mensal x 12 aprox)
        // Tabela Anual Simplificada (Base Mensal * 12)
        let annualTaxDue = 0;

        // Faixas Anuais (Baseadas na mensal * 12)
        const F1 = 2259.20 * 12;
        const F2 = 2826.65 * 12;
        const F3 = 3751.05 * 12;
        const F4 = 4664.68 * 12;

        const D1 = 169.44 * 12;
        const D2 = 381.44 * 12;
        const D3 = 662.77 * 12;
        const D4 = 896.00 * 12;

        if (annualTaxableBase <= F1) annualTaxDue = 0;
        else if (annualTaxableBase <= F2) annualTaxDue = (annualTaxableBase * 0.075) - D1;
        else if (annualTaxableBase <= F3) annualTaxDue = (annualTaxableBase * 0.15) - D2;
        else if (annualTaxableBase <= F4) annualTaxDue = (annualTaxableBase * 0.225) - D3;
        else annualTaxDue = (annualTaxableBase * 0.275) - D4;

        annualTaxDue = Math.max(0, annualTaxDue);

        // Imposto Retido (Estimado: Mensal * 12)
        const totalWithheld = monthlyResult.irrf * 12;

        const balance = annualTaxDue - totalWithheld; // > 0 Pagar, < 0 Restituir

        setAnnualResult({
            annualGross: annualGrossStandard,
            annualTaxableBase,
            annualTaxDue,
            totalWithheld,
            balance,
            deductions: {
                health,
                education: educationDeductible,
                dependents: dependentsDeductible,
                inss: annualInss
            }
        });
    };

    const calculateHighIncome = () => {
        const totalIncome = Number(totalAnnualIncome);
        const dividends = Number(monthlyDividends);

        // 1. IRPFM (Imposto de Renda Pessoa Física Mínimo)
        let irpfmValue = 0;
        let irpfmRate = 0;

        if (totalIncome > HIGH_INCOME_THRESHOLD) {
            // Simulação: 5% até 1.2M, 10% acima
            const TIER_1_LIMIT = 1200000.00;

            if (totalIncome <= TIER_1_LIMIT) {
                irpfmValue = totalIncome * 0.05;
                irpfmRate = 5;
            } else {
                const tier1Tax = TIER_1_LIMIT * 0.05;
                const tier2Tax = (totalIncome - TIER_1_LIMIT) * 0.10;
                irpfmValue = tier1Tax + tier2Tax;
                irpfmRate = (irpfmValue / totalIncome) * 100;
            }
        }

        // 2. Dividendos
        let dividendTax = 0;
        if (dividends > DIVIDEND_THRESHOLD) {
            dividendTax = dividends * 0.10;
        }

        setHighIncomeResult({
            irpfmValue,
            irpfmRate,
            dividendTax,
            isHighIncome: totalIncome > HIGH_INCOME_THRESHOLD,
            hasHighDividends: dividends > DIVIDEND_THRESHOLD
        });
    };

    useEffect(() => {
        calculateMonthly();
    }, [monthlyGrossIncome, dependentsCount, alimony]);

    useEffect(() => {
        calculateAnnual();
    }, [monthlyResult, annualHealthExpenses, annualEducationExpenses]);

    useEffect(() => {
        calculateHighIncome();
    }, [totalAnnualIncome, monthlyDividends]);

    const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-start">
                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex gap-3 text-sm text-yellow-800 flex-1 mr-4">
                    <Info className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="font-bold mb-1">Regras Ano-Calendário 2026 (Simulação)</p>
                        <ul className="list-disc list-inside space-y-1 opacity-90 text-xs">
                            <li>Isenção mensal até <strong>R$ 5.000,00</strong>.</li>
                            <li>Desconto escalado para rendas entre R$ 5.000,01 e R$ 7.350,00.</li>
                            <li>Dedução de Educação limitada a R$ 3.561,50/ano por pessoa.</li>
                            <li>Tributação Mínima para Alta Renda (acima de R$ 600k/ano).</li>
                        </ul>
                    </div>
                </div>
                <CloudSyncIndicator isSyncing={isSyncing} lastSync={lastSync} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* INPUTS */}
                <div className="space-y-6">
                    {/* 1. Rendimentos e Deduções Mensais */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
                            <DollarSign className="w-5 h-5 text-brand-600" />
                            Rendimentos Mensais
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Rendimento Bruto Mensal</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                                    <input
                                        type="number"
                                        value={monthlyGrossIncome}
                                        onChange={(e) => setMonthlyGrossIncome(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full pl-8 p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">INSS Mensal (Calculado)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                                        <input
                                            type="text"
                                            value={monthlyResult?.inss ? formatMoney(monthlyResult.inss) : 'R$ 0,00'}
                                            readOnly
                                            className="w-full pl-8 p-2.5 bg-gray-100 border border-gray-200 rounded-lg outline-none text-slate-600 cursor-not-allowed"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">Calculado automaticamente (progressivo)</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Pensão Alim.</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                                        <input
                                            type="number"
                                            value={alimony}
                                            onChange={(e) => setAlimony(e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-full pl-8 p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Número de Dependentes</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="number"
                                        min="0"
                                        value={dependentsCount}
                                        onChange={(e) => setDependentsCount(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Deduções Anuais */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
                            <Heart className="w-5 h-5 text-red-500" />
                            Deduções Anuais (Estimativa)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Saúde (Total)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                                    <input
                                        type="number"
                                        value={annualHealthExpenses}
                                        onChange={(e) => setAnnualHealthExpenses(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full pl-8 p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Sem limite de dedução.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Educação (Total)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                                    <input
                                        type="number"
                                        value={annualEducationExpenses}
                                        onChange={(e) => setAnnualEducationExpenses(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full pl-8 p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Limite: R$ 3.561,50 / pessoa.</p>
                            </div>
                        </div>
                    </div>

                    {/* 3. Alta Renda */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                            Alta Renda (Opcional)
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Renda Anual Total (Tributável + Isenta)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                                    <input
                                        type="number"
                                        value={totalAnnualIncome}
                                        onChange={(e) => setTotalAnnualIncome(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full pl-8 p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Para cálculo do IRPFM (&gt; R$ 600k/ano).</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Dividendos Mensais (Média)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                                    <input
                                        type="number"
                                        value={monthlyDividends}
                                        onChange={(e) => setMonthlyDividends(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full pl-8 p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Taxação de 10% se &gt; R$ 50k/mês.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RESULTS */}
                <div className="space-y-6">

                    {/* Monthly Result */}
                    {monthlyResult && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
                                <h3 className="font-bold text-blue-800">Retenção Mensal (IRRF)</h3>
                                <span className="text-xs text-blue-600 font-medium px-2 py-1 bg-white rounded-full">Simulação</span>
                            </div>
                            <div className="p-6 space-y-3 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Base de Cálculo</span>
                                    <span>{formatMoney(monthlyResult.baseCalculation)}</span>
                                </div>
                                <div className="flex justify-between text-slate-600 text-xs italic">
                                    <span>Deduções Totais</span>
                                    <span>- {formatMoney(monthlyResult.deductions)}</span>
                                </div>
                                <div className="h-px bg-gray-100 my-2"></div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-700">IRRF a Pagar</span>
                                    <span className="font-bold text-xl text-blue-600">{formatMoney(monthlyResult.irrf)}</span>
                                </div>
                                <div className="mt-2 bg-blue-50 p-2 rounded text-xs text-blue-700 text-center">
                                    {monthlyResult.method}
                                </div>
                                {monthlyResult.effectiveRate > 0 && (
                                    <p className="text-center text-xs text-slate-400">
                                        Alíquota Efetiva: {(monthlyResult.effectiveRate * 100).toFixed(2)}%
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Annual Result */}
                    {annualResult && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-green-50 p-4 border-b border-green-100 flex justify-between items-center">
                                <h3 className="font-bold text-green-800">Ajuste Anual (Estimativa)</h3>
                                <span className="text-xs text-green-700 font-medium px-2 py-1 bg-white rounded-full">Declaração</span>
                            </div>
                            <div className="p-6 space-y-3 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Renda Bruta Anual</span>
                                    <span>{formatMoney(annualResult.annualGross)}</span>
                                </div>
                                <div className="space-y-1 bg-gray-50 p-3 rounded border border-gray-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Deduções Utilizadas</p>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Saúde</span>
                                        <span>{formatMoney(annualResult.deductions.health)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Educação</span>
                                        <span>{formatMoney(annualResult.deductions.education)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Dependentes</span>
                                        <span>{formatMoney(annualResult.deductions.dependents)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>INSS Oficial</span>
                                        <span>{formatMoney(annualResult.deductions.inss)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between text-slate-700 font-medium pt-2">
                                    <span>Imposto Devido (Ano)</span>
                                    <span>{formatMoney(annualResult.annualTaxDue)}</span>
                                </div>
                                <div className="flex justify-between text-slate-500 text-xs">
                                    <span>(-) Já Retido na Fonte</span>
                                    <span>- {formatMoney(annualResult.totalWithheld)}</span>
                                </div>

                                <div className="h-px bg-gray-100 my-2"></div>

                                <div className={`flex justify-between items-center p-3 rounded-lg ${annualResult.balance > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                    <span className="font-bold">
                                        {annualResult.balance > 0 ? 'IMPOSTO A PAGAR' : 'A RESTITUIR'}
                                    </span>
                                    <span className="font-bold text-lg">
                                        {formatMoney(Math.abs(annualResult.balance))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* High Income Result */}
                    {highIncomeResult && (highIncomeResult.isHighIncome || highIncomeResult.hasHighDividends) && (
                        <div className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden">
                            <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-center">
                                <h3 className="font-bold text-purple-800">Alta Renda</h3>
                                <AlertTriangle className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="p-6 space-y-4 text-sm">
                                {highIncomeResult.isHighIncome && (
                                    <div>
                                        <p className="font-bold text-slate-700 mb-1">Tributação Mínima (IRPFM)</p>
                                        <div className="flex justify-between text-slate-600">
                                            <span>Alíquota Mínima</span>
                                            <span>{highIncomeResult.irpfmRate.toFixed(2)}%</span>
                                        </div>
                                        <div className="flex justify-between text-purple-700 font-bold">
                                            <span>Valor Mínimo Devido</span>
                                            <span>{formatMoney(highIncomeResult.irpfmValue)}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Se o imposto pago for menor que este valor, paga-se a diferença.
                                        </p>
                                    </div>
                                )}

                                {highIncomeResult.hasHighDividends && (
                                    <div className="pt-3 border-t border-gray-100">
                                        <p className="font-bold text-slate-700 mb-1">Tributação de Dividendos</p>
                                        <div className="flex justify-between text-slate-600">
                                            <span>Retenção (10%)</span>
                                            <span className="text-red-600">{formatMoney(highIncomeResult.dividendTax)}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Incide sobre o excedente de R$ 50k/mês.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default IrpfSimulator;
