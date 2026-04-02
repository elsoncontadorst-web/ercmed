import React, { useState } from 'react';
import { Table, FileText, ChevronDown, Info } from 'lucide-react';

// Tabelas Oficiais para Visualização
const TABLES_DATA = {
    I: {
        title: "Anexo I - Comércio",
        description: "Revendedores em geral, restaurantes, padarias e afins.",
        rows: [
            { range: "Até R$ 180.000,00", rate: "4.00%", deduction: 0 },
            { range: "R$ 180.000,01 a R$ 360.000,00", rate: "7.30%", deduction: 5940 },
            { range: "R$ 360.000,01 a R$ 720.000,00", rate: "9.50%", deduction: 13860 },
            { range: "R$ 720.000,01 a R$ 1.800.000,00", rate: "10.70%", deduction: 22500 },
            { range: "R$ 1.800.000,01 a R$ 3.600.000,00", rate: "14.30%", deduction: 87300 },
            { range: "R$ 3.600.000,01 a R$ 4.800.000,00", rate: "19.00%", deduction: 378000 },
        ]
    },
    II: {
        title: "Anexo II - Indústria",
        description: "Fábricas e empresas industriais.",
        rows: [
            { range: "Até R$ 180.000,00", rate: "4.50%", deduction: 0 },
            { range: "R$ 180.000,01 a R$ 360.000,00", rate: "7.80%", deduction: 5940 },
            { range: "R$ 360.000,01 a R$ 720.000,00", rate: "10.00%", deduction: 13860 },
            { range: "R$ 720.000,01 a R$ 1.800.000,00", rate: "11.20%", deduction: 22500 },
            { range: "R$ 1.800.000,01 a R$ 3.600.000,00", rate: "14.70%", deduction: 85500 },
            { range: "R$ 3.600.000,01 a R$ 4.800.000,00", rate: "30.00%", deduction: 720000 },
        ]
    },
    III: {
        title: "Anexo III - Serviços",
        description: "Instalação, reparos, manutenção, agências de viagens, etc. (Também usado para intelectuais com Fator R > 28%)",
        rows: [
            { range: "Até R$ 180.000,00", rate: "6.00%", deduction: 0 },
            { range: "R$ 180.000,01 a R$ 360.000,00", rate: "11.20%", deduction: 9360 },
            { range: "R$ 360.000,01 a R$ 720.000,00", rate: "13.50%", deduction: 17640 },
            { range: "R$ 720.000,01 a R$ 1.800.000,00", rate: "16.00%", deduction: 35640 },
            { range: "R$ 1.800.000,01 a R$ 3.600.000,00", rate: "21.00%", deduction: 125640 },
            { range: "R$ 3.600.000,01 a R$ 4.800.000,00", rate: "33.00%", deduction: 648000 },
        ]
    },
    IV: {
        title: "Anexo IV - Serviços",
        description: "Limpeza, vigilância, obras, construção civil, advocacia.",
        rows: [
            { range: "Até R$ 180.000,00", rate: "4.50%", deduction: 0 },
            { range: "R$ 180.000,01 a R$ 360.000,00", rate: "9.00%", deduction: 8100 },
            { range: "R$ 360.000,01 a R$ 720.000,00", rate: "10.20%", deduction: 12420 },
            { range: "R$ 720.000,01 a R$ 1.800.000,00", rate: "14.00%", deduction: 39780 },
            { range: "R$ 1.800.000,01 a R$ 3.600.000,00", rate: "22.00%", deduction: 183780 },
            { range: "R$ 3.600.000,01 a R$ 4.800.000,00", rate: "33.00%", deduction: 828000 },
        ]
    },
    V: {
        title: "Anexo V - Serviços Intelectuais",
        description: "Auditoria, jornalismo, tecnologia, engenharia (Com Fator R < 28%)",
        rows: [
            { range: "Até R$ 180.000,00", rate: "15.50%", deduction: 0 },
            { range: "R$ 180.000,01 a R$ 360.000,00", rate: "18.00%", deduction: 4500 },
            { range: "R$ 360.000,01 a R$ 720.000,00", rate: "19.50%", deduction: 9900 },
            { range: "R$ 720.000,01 a R$ 1.800.000,00", rate: "20.50%", deduction: 17100 },
            { range: "R$ 1.800.000,01 a R$ 3.600.000,00", rate: "23.00%", deduction: 62100 },
            { range: "R$ 3.600.000,01 a R$ 4.800.000,00", rate: "30.50%", deduction: 540000 },
        ]
    }
};

const AboutView: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<keyof typeof TABLES_DATA>('I');
  
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="p-6 md:p-12 h-full overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto">
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-brand-600" />
                        Tabelas Oficiais Simples Nacional (2025)
                    </h3>
                    
                    <div className="relative">
                        <select 
                            value={selectedTable}
                            onChange={(e) => setSelectedTable(e.target.value as any)}
                            className="appearance-none bg-gray-50 border border-gray-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium cursor-pointer"
                        >
                            <option value="I">Anexo I - Comércio</option>
                            <option value="II">Anexo II - Indústria</option>
                            <option value="III">Anexo III - Serviços</option>
                            <option value="IV">Anexo IV - Serviços</option>
                            <option value="V">Anexo V - Intelectuais</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
                
                <div className="space-y-6">
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 p-4 border-b border-gray-200">
                            <h4 className="font-bold text-slate-800 text-lg">{TABLES_DATA[selectedTable].title}</h4>
                            <p className="text-slate-500 text-sm mt-1">{TABLES_DATA[selectedTable].description}</p>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Faixa de Receita (12 meses)</th>
                                        <th className="px-6 py-3 font-semibold text-center">Alíquota Nominal</th>
                                        <th className="px-6 py-3 font-semibold text-right">Valor a Deduzir</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {TABLES_DATA[selectedTable].rows.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-700">{row.range}</td>
                                            <td className="px-6 py-4 text-center text-brand-600 font-bold">{row.rate}</td>
                                            <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(row.deduction)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3 text-sm text-blue-800">
                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold mb-1">Como calcular a alíquota efetiva?</p>
                            <p className="opacity-90 font-mono mb-2">
                                ((RBT12 x Alíquota Nominal) - Valor a Deduzir) / RBT12
                            </p>
                            <p className="opacity-75 text-xs">
                                * RBT12: Receita Bruta acumulada nos doze meses anteriores ao período de apuração.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default AboutView;