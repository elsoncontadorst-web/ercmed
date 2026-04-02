import React, { useState, useEffect } from 'react';
import { Calculator, Info, TrendingUp, ArrowRight, Percent, DollarSign, Scale } from 'lucide-react';
import { useCloudSync } from '../hooks/useCloudSync';
import { CloudSyncIndicator } from './CloudSyncIndicator';

const IvaSimulator: React.FC = () => {
    // --- STATE ---
    const [saleValue, setSaleValue] = useState<number>(1000);
    const [inputValues, setInputValues] = useState<number>(500);

    // Alíquotas Padrão (Estimativa)
    // CBS: 8.8%
    // IBS: 17.7%
    const [cbsRate, setCbsRate] = useState<number>(8.8);
    const [ibsRate, setIbsRate] = useState<number>(17.7);

    const [cbsCreditRate, setCbsCreditRate] = useState<number>(8.8);
    const [ibsCreditRate, setIbsCreditRate] = useState<number>(17.7);

    // Results
    const [cbsResult, setCbsResult] = useState<any>(null);
    const [ibsResult, setIbsResult] = useState<any>(null);
    const [totalResult, setTotalResult] = useState<any>(null);

    // --- CLOUD SYNC ---
    const { isSyncing, lastSync } = useCloudSync(
        'iva_calc',
        { saleValue, inputValues, cbsRate, ibsRate, cbsCreditRate, ibsCreditRate },
        (data) => {
            if (data.saleValue !== undefined) setSaleValue(data.saleValue);
            if (data.inputValues !== undefined) setInputValues(data.inputValues);
            if (data.cbsRate !== undefined) setCbsRate(data.cbsRate);
            if (data.ibsRate !== undefined) setIbsRate(data.ibsRate);
            if (data.cbsCreditRate !== undefined) setCbsCreditRate(data.cbsCreditRate);
            if (data.ibsCreditRate !== undefined) setIbsCreditRate(data.ibsCreditRate);
        }
    );

    // --- CALCULATIONS ---
    useEffect(() => {
        calculateIva();
    }, [saleValue, inputValues, cbsRate, ibsRate, cbsCreditRate, ibsCreditRate]);

    const calculateIva = () => {
        // CBS
        const cbsDebit = saleValue * (cbsRate / 100);
        const cbsCredit = inputValues * (cbsCreditRate / 100);
        const cbsPayable = Math.max(0, cbsDebit - cbsCredit);
        const cbsEffectiveRate = saleValue > 0 ? (cbsPayable / saleValue) * 100 : 0;

        setCbsResult({
            debit: cbsDebit,
            credit: cbsCredit,
            payable: cbsPayable,
            effectiveRate: cbsEffectiveRate
        });

        // IBS
        const ibsDebit = saleValue * (ibsRate / 100);
        const ibsCredit = inputValues * (ibsCreditRate / 100);
        const ibsPayable = Math.max(0, ibsDebit - ibsCredit);
        const ibsEffectiveRate = saleValue > 0 ? (ibsPayable / saleValue) * 100 : 0;

        setIbsResult({
            debit: ibsDebit,
            credit: ibsCredit,
            payable: ibsPayable,
            effectiveRate: ibsEffectiveRate
        });

        // Total
        const totalPayable = cbsPayable + ibsPayable;
        const totalEffectiveRate = saleValue > 0 ? (totalPayable / saleValue) * 100 : 0;

        setTotalResult({
            payable: totalPayable,
            effectiveRate: totalEffectiveRate
        });
    };

    const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatPercent = (val: number) => val.toFixed(2) + '%';

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-start">
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex gap-3 text-sm text-indigo-800 flex-1 mr-4">
                    <Info className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="font-bold mb-1">Simulador IVA Dual - Reforma Tributária</p>
                        <ul className="list-disc list-inside space-y-1 opacity-90 text-xs">
                            <li>Simulação do novo regime tributário (CBS + IBS).</li>
                            <li>Princípio da não-cumulatividade plena (Débito - Crédito).</li>
                            <li>Alíquotas estimadas: CBS (8,8%) e IBS (17,7%).</li>
                        </ul>
                    </div>
                </div>
                <CloudSyncIndicator isSyncing={isSyncing} lastSync={lastSync} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* INPUTS */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-6">
                            <Scale className="w-5 h-5 text-brand-600" />
                            Dados da Operação
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Valor da Venda (Base de Cálculo)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                                    <input
                                        type="number"
                                        value={saleValue}
                                        onChange={(e) => setSaleValue(Number(e.target.value))}
                                        className="w-full pl-8 p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Valor de Insumos com Crédito</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                                    <input
                                        type="number"
                                        value={inputValues}
                                        onChange={(e) => setInputValues(Number(e.target.value))}
                                        className="w-full pl-8 p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Alíquotas de Saída</label>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">CBS (%)</label>
                                            <input
                                                type="number"
                                                value={cbsRate}
                                                onChange={(e) => setCbsRate(Number(e.target.value))}
                                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">IBS (%)</label>
                                            <input
                                                type="number"
                                                value={ibsRate}
                                                onChange={(e) => setIbsRate(Number(e.target.value))}
                                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Alíquotas de Crédito</label>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">CBS (%)</label>
                                            <input
                                                type="number"
                                                value={cbsCreditRate}
                                                onChange={(e) => setCbsCreditRate(Number(e.target.value))}
                                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">IBS (%)</label>
                                            <input
                                                type="number"
                                                value={ibsCreditRate}
                                                onChange={(e) => setIbsCreditRate(Number(e.target.value))}
                                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RESULTS */}
                <div className="space-y-6">
                    {/* Total Card */}
                    {totalResult && (
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-24 bg-indigo-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -mr-10 -mt-10"></div>
                            <h3 className="text-indigo-200 font-medium mb-1 uppercase tracking-wide text-xs">IVA Dual Total a Recolher</h3>
                            <div className="text-4xl font-bold mb-4 tracking-tight">
                                {formatMoney(totalResult.payable)}
                            </div>
                            <div className="flex items-center gap-2 text-sm bg-white/10 w-fit px-3 py-1 rounded-full">
                                <span className="text-indigo-200">Alíquota Efetiva:</span>
                                <span className="font-bold text-white">{formatPercent(totalResult.effectiveRate)}</span>
                            </div>
                        </div>
                    )}

                    {/* CBS Detail */}
                    {cbsResult && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-blue-50 p-3 border-b border-blue-100 flex justify-between items-center">
                                <h3 className="font-bold text-blue-800 text-sm">CBS (Federal)</h3>
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">8,8%</span>
                            </div>
                            <div className="p-4 space-y-2 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Débito (Venda)</span>
                                    <span className="font-medium text-slate-800">{formatMoney(cbsResult.debit)}</span>
                                </div>
                                <div className="flex justify-between text-green-600">
                                    <span>Crédito (Insumos)</span>
                                    <span className="font-medium">- {formatMoney(cbsResult.credit)}</span>
                                </div>
                                <div className="h-px bg-gray-100 my-1"></div>
                                <div className="flex justify-between font-bold text-blue-700">
                                    <span>A Recolher</span>
                                    <span>{formatMoney(cbsResult.payable)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* IBS Detail */}
                    {ibsResult && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-purple-50 p-3 border-b border-purple-100 flex justify-between items-center">
                                <h3 className="font-bold text-purple-800 text-sm">IBS (Estadual/Municipal)</h3>
                                <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded">17,7%</span>
                            </div>
                            <div className="p-4 space-y-2 text-sm">
                                <div className="flex justify-between text-slate-600">
                                    <span>Débito (Venda)</span>
                                    <span className="font-medium text-slate-800">{formatMoney(ibsResult.debit)}</span>
                                </div>
                                <div className="flex justify-between text-green-600">
                                    <span>Crédito (Insumos)</span>
                                    <span className="font-medium">- {formatMoney(ibsResult.credit)}</span>
                                </div>
                                <div className="h-px bg-gray-100 my-1"></div>
                                <div className="flex justify-between font-bold text-purple-700">
                                    <span>A Recolher</span>
                                    <span>{formatMoney(ibsResult.payable)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IvaSimulator;
