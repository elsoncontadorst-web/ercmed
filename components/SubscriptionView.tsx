import React from 'react';
import { Shield, Check, CreditCard, Lock } from 'lucide-react';
import { User } from 'firebase/auth';
import { AccountTier } from '../types/accountTiers';
import { openMercadoPagoCheckout } from '../services/mercadoPagoCheckoutService';

interface SubscriptionViewProps {
    user: User;
    onSubscriptionActive: () => void;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
            <div className="bg-slate-900 p-8 md:w-2/5 text-white flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-6">
                        <Shield className="w-8 h-8 text-brand-400" />
                        <span className="font-bold text-xl tracking-tight">ERCMed</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Desbloqueie a gestão da sua clínica</h2>
                    <p className="text-slate-400 mb-8">Organize atendimento, prontuário, agenda e finanças em uma única plataforma.</p>
                    <ul className="space-y-4">
                        {[
                            'Prontuário eletrônico e anamnese mista',
                            'Agenda e gestão de pacientes',
                            'Financeiro, repasses e relatórios',
                            'Apoio contábil especializado em saúde',
                        ].map((item) => (
                            <li key={item} className="flex items-center gap-3">
                                <div className="bg-brand-500/20 p-1 rounded-full"><Check className="w-4 h-4 text-brand-400" /></div>
                                <span className="text-sm font-medium">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="mt-8 pt-8 border-t border-slate-800 text-xs text-slate-500">Pagamento processado em ambiente seguro do Mercado Pago.</p>
            </div>

            <div className="p-8 md:w-3/5 flex flex-col justify-center">
                <div className="text-center mb-8">
                    <div className="bg-brand-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Lock className="w-8 h-8 text-brand-600" /></div>
                    <h3 className="text-2xl font-bold text-slate-800">Escolha seu plano</h3>
                    <p className="text-slate-600 mt-2">Você será redirecionado para o checkout seguro do Mercado Pago.</p>
                </div>
                <div className="border-2 border-brand-500 bg-brand-50/30 rounded-xl p-4 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">RECOMENDADO</div>
                    <div className="flex justify-between items-center mb-2"><span className="font-bold text-slate-800">Plano Professional</span><span className="text-2xl font-bold text-brand-600">R$ 119,00<span className="text-sm text-slate-500 font-normal">/mês</span></span></div>
                    <p className="text-sm text-slate-600 mb-4">Gestão clínica e financeira para uma operação profissional.</p>
                    <button onClick={() => openMercadoPagoCheckout(AccountTier.SILVER)} className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20">
                        <CreditCard className="w-5 h-5" /> Assinar com Mercado Pago
                    </button>
                </div>
            </div>
        </div>
    </div>
);

export default SubscriptionView;
