import { ActivityCategory, MonthlyRecord, SimulationConfig, AnnualResult, TaxScenario } from '../types';

// --- DADOS OFICIAIS SIMPLES NACIONAL 2025 ---
export const ANEXO_I = [ // Comércio
    { limit: 180000, rate: 0.04, deduction: 0 },
    { limit: 360000, rate: 0.073, deduction: 5940 },
    { limit: 720000, rate: 0.095, deduction: 13860 },
    { limit: 1800000, rate: 0.107, deduction: 22500 },
    { limit: 3600000, rate: 0.143, deduction: 87300 },
    { limit: 4800000, rate: 0.190, deduction: 378000 },
];

export const ANEXO_II = [ // Indústria
    { limit: 180000, rate: 0.045, deduction: 0 },
    { limit: 360000, rate: 0.078, deduction: 5940 },
    { limit: 720000, rate: 0.100, deduction: 13860 },
    { limit: 1800000, rate: 0.112, deduction: 22500 },
    { limit: 3600000, rate: 0.147, deduction: 85500 },
    { limit: 4800000, rate: 0.300, deduction: 720000 },
];

export const ANEXO_III = [ // Serviços Gerais
    { limit: 180000, rate: 0.06, deduction: 0 },
    { limit: 360000, rate: 0.112, deduction: 9360 },
    { limit: 720000, rate: 0.135, deduction: 17640 },
    { limit: 1800000, rate: 0.160, deduction: 35640 },
    { limit: 3600000, rate: 0.210, deduction: 125640 },
    { limit: 4800000, rate: 0.330, deduction: 648000 },
];

export const ANEXO_IV = [ // Serviços Advocacia, Limpeza, Obras
    { limit: 180000, rate: 0.045, deduction: 0 },
    { limit: 360000, rate: 0.090, deduction: 8100 },
    { limit: 720000, rate: 0.102, deduction: 12420 },
    { limit: 1800000, rate: 0.140, deduction: 39780 },
    { limit: 3600000, rate: 0.220, deduction: 183780 },
    { limit: 4800000, rate: 0.330, deduction: 828000 },
];

export const ANEXO_V = [ // Serviços Intelectuais / Tecnologia
    { limit: 180000, rate: 0.155, deduction: 0 },
    { limit: 360000, rate: 0.180, deduction: 4500 },
    { limit: 720000, rate: 0.195, deduction: 9900 },
    { limit: 1800000, rate: 0.205, deduction: 17100 },
    { limit: 3600000, rate: 0.230, deduction: 62100 },
    { limit: 4800000, rate: 0.305, deduction: 540000 },
];

export const TABLES_DISPLAY_DATA = {
    I: {
        title: "Anexo I - Comércio",
        description: "Revendedores em geral, restaurantes, padarias e afins.",
        rows: [
            { range: "Até R$ 180.000,00", limit: 180000, rate: "4.00%", deduction: 0 },
            { range: "R$ 180.000,01 a R$ 360.000,00", limit: 360000, rate: "7.30%", deduction: 5940 },
            { range: "R$ 360.000,01 a R$ 720.000,00", limit: 720000, rate: "9.50%", deduction: 13860 },
            { range: "R$ 720.000,01 a R$ 1.800.000,00", limit: 1800000, rate: "10.70%", deduction: 22500 },
            { range: "R$ 1.800.000,01 a R$ 3.600.000,00", limit: 3600000, rate: "14.30%", deduction: 87300 },
            { range: "R$ 3.600.000,01 a R$ 4.800.000,00", limit: 4800000, rate: "19.00%", deduction: 378000 },
        ]
    },
    II: {
        title: "Anexo II - Indústria",
        description: "Fábricas e empresas industriais.",
        rows: [
            { range: "Até R$ 180.000,00", limit: 180000, rate: "4.50%", deduction: 0 },
            { range: "R$ 180.000,01 a R$ 360.000,00", limit: 360000, rate: "7.80%", deduction: 5940 },
            { range: "R$ 360.000,01 a R$ 720.000,00", limit: 720000, rate: "10.00%", deduction: 13860 },
            { range: "R$ 720.000,01 a R$ 1.800.000,00", limit: 1800000, rate: "11.20%", deduction: 22500 },
            { range: "R$ 1.800.000,01 a R$ 3.600.000,00", limit: 3600000, rate: "14.70%", deduction: 85500 },
            { range: "R$ 3.600.000,01 a R$ 4.800.000,00", limit: 4800000, rate: "30.00%", deduction: 720000 },
        ]
    },
    III: {
        title: "Anexo III - Serviços",
        description: "Instalação, reparos, manutenção (ou Intelectuais com Fator R > 28%)",
        rows: [
            { range: "Até R$ 180.000,00", limit: 180000, rate: "6.00%", deduction: 0 },
            { range: "R$ 180.000,01 a R$ 360.000,00", limit: 360000, rate: "11.20%", deduction: 9360 },
            { range: "R$ 360.000,01 a R$ 720.000,00", limit: 720000, rate: "13.50%", deduction: 17640 },
            { range: "R$ 720.000,01 a R$ 1.800.000,00", limit: 1800000, rate: "16.00%", deduction: 35640 },
            { range: "R$ 1.800.000,01 a R$ 3.600.000,00", limit: 3600000, rate: "21.00%", deduction: 125640 },
            { range: "R$ 3.600.000,01 a R$ 4.800.000,00", limit: 4800000, rate: "33.00%", deduction: 648000 },
        ]
    },
    IV: {
        title: "Anexo IV - Serviços",
        description: "Limpeza, vigilância, obras, construção civil, advocacia.",
        rows: [
            { range: "Até R$ 180.000,00", limit: 180000, rate: "4.50%", deduction: 0 },
            { range: "R$ 180.000,01 a R$ 360.000,00", limit: 360000, rate: "9.00%", deduction: 8100 },
            { range: "R$ 360.000,01 a R$ 720.000,00", limit: 720000, rate: "10.20%", deduction: 12420 },
            { range: "R$ 720.000,01 a R$ 1.800.000,00", limit: 1800000, rate: "14.00%", deduction: 39780 },
            { range: "R$ 1.800.000,01 a R$ 3.600.000,00", limit: 3600000, rate: "22.00%", deduction: 183780 },
            { range: "R$ 3.600.000,01 a R$ 4.800.000,00", limit: 4800000, rate: "33.00%", deduction: 828000 },
        ]
    },
    V: {
        title: "Anexo V - Serviços Intelectuais",
        description: "Auditoria, jornalismo, tecnologia, engenharia (Com Fator R < 28%)",
        rows: [
            { range: "Até R$ 180.000,00", limit: 180000, rate: "15.50%", deduction: 0 },
            { range: "R$ 180.000,01 a R$ 360.000,00", limit: 360000, rate: "18.00%", deduction: 4500 },
            { range: "R$ 360.000,01 a R$ 720.000,00", limit: 720000, rate: "19.50%", deduction: 9900 },
            { range: "R$ 720.000,01 a R$ 1.800.000,00", limit: 1800000, rate: "20.50%", deduction: 17100 },
            { range: "R$ 1.800.000,01 a R$ 3.600.000,00", limit: 3600000, rate: "23.00%", deduction: 62100 },
            { range: "R$ 3.600.000,01 a R$ 4.800.000,00", limit: 4800000, rate: "30.50%", deduction: 540000 },
        ]
    }
};

export const calculateAnnualTax = (config: SimulationConfig): AnnualResult => {
    const totalRevenue = config.months.reduce((sum, m) => sum + m.revenue, 0);
    const totalExpenses = config.months.reduce((sum, m) => sum + m.expenses, 0);
    const totalPayroll = config.months.reduce((sum, m) => sum + m.payroll, 0);

    // Fator R: Folha / Receita
    const fatorR = totalRevenue > 0 ? totalPayroll / totalRevenue : 0;

    // 1. MEI
    const isMeiAllowed = totalRevenue <= 81000 &&
        config.activity !== 'ADVOCACIA' &&
        config.activity !== 'SERVICOS_FATOR_R';
    const meiTax = 75 * 12;

    // 2. Simples Nacional (Cálculo Oficial)
    let simplesTax = 0;
    let anexoInfo = '';
    let effectiveRateSimples = 0;
    let currentAnexoName = '';

    const getSimplesTable = (activity: ActivityCategory, currentFatorR: number) => {
        switch (activity) {
            case 'COMERCIO': return { table: ANEXO_I, name: 'I' };
            case 'INDUSTRIA': return { table: ANEXO_II, name: 'II' };
            case 'ADVOCACIA': return { table: ANEXO_IV, name: 'IV' };
            case 'SERVICOS_GERAL': return { table: ANEXO_III, name: 'III' };
            case 'SERVICOS_FATOR_R':
                return currentFatorR >= 0.28
                    ? { table: ANEXO_III, name: 'III' }
                    : { table: ANEXO_V, name: 'V' };
            default: return { table: ANEXO_III, name: 'III' };
        }
    };

    const { table: currentTable, name: tableName } = getSimplesTable(config.activity, fatorR);
    currentAnexoName = tableName;

    const rbt12 = totalRevenue;

    if (rbt12 > 0) {
        const bracket = currentTable.find(b => rbt12 <= b.limit) || currentTable[currentTable.length - 1];
        const nominalTaxAmount = (rbt12 * bracket.rate) - bracket.deduction;
        simplesTax = nominalTaxAmount;
        effectiveRateSimples = nominalTaxAmount / rbt12;
    }

    if (currentAnexoName === 'IV') {
        const inssPatronalAnexoIV = totalPayroll * 0.22;
        simplesTax += inssPatronalAnexoIV;
        anexoInfo = `Anexo IV (DAS + INSS Patronal)`;
    } else {
        anexoInfo = `Anexo ${currentAnexoName}`;
        if (config.activity === 'SERVICOS_FATOR_R') {
            anexoInfo += ` (Fator R: ${(fatorR * 100).toFixed(1)}%)`;
        }
    }

    // 3. Lucro Presumido
    let ratePresumido = 0;
    let issIcms = 0;

    if (config.activity === 'COMERCIO' || config.activity === 'INDUSTRIA') {
        ratePresumido = 0.0593;
        issIcms = totalRevenue * 0.18;
    } else {
        ratePresumido = 0.1133;
        issIcms = totalRevenue * 0.05;
    }

    const inssPatronal = totalPayroll * 0.27;
    const totalPresumido = (totalRevenue * ratePresumido) + issIcms + inssPatronal;

    const notesSimples = [anexoInfo];
    if (config.activity === 'SERVICOS_FATOR_R' && fatorR < 0.28) {
        notesSimples.push('Fator R < 28% sujeita ao Anexo V (mais caro). Aumentar Pró-labore pode compensar.');
    }
    if (effectiveRateSimples < 0) effectiveRateSimples = 0;

    return {
        totalRevenue,
        totalExpenses,
        totalPayroll,
        globalFatorR: fatorR,
        scenarios: {
            mei: {
                name: 'MEI',
                totalTax: meiTax,
                effectiveRate: totalRevenue > 0 ? (meiTax / totalRevenue) * 100 : 0,
                netProfit: totalRevenue - totalExpenses - totalPayroll - meiTax,
                isViable: isMeiAllowed && totalRevenue > 0,
                notes: ['DAS fixo mensal', 'Limite anual de R$ 81k']
            },
            simples: {
                name: 'Simples Nacional',
                totalTax: simplesTax,
                effectiveRate: effectiveRateSimples * 100,
                netProfit: totalRevenue - totalExpenses - totalPayroll - simplesTax,
                isViable: totalRevenue <= 4800000 && totalRevenue > 0,
                notes: notesSimples,
                anexo: currentAnexoName
            },
            presumido: {
                name: 'Lucro Presumido',
                totalTax: totalPresumido,
                effectiveRate: totalRevenue > 0 ? (totalPresumido / totalRevenue) * 100 : 0,
                netProfit: totalRevenue - totalExpenses - totalPayroll - totalPresumido,
                isViable: totalRevenue > 0,
                notes: ['Inclui INSS Patronal (20% + RAT)', config.activity.includes('SERVICOS') ? 'ISS 5% estimado' : 'ICMS 18% estimado']
            }
        }
    };
};
