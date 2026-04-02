import React, { useState } from 'react';
import { Shield, Check, CreditCard, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { updateUserSubscription } from '../services/firebase';
import { User } from 'firebase/auth';

interface SubscriptionViewProps {
    user: User;
    onSubscriptionActive: () => void;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ user, onSubscriptionActive }) => {
    const [loading, setLoading] = useState(false);

    const handleSimulatePayment = async () => {
        setLoading(true);
        try {
            // Simula a ativação da assinatura no Firestore
            await updateUserSubscription(user.uid, {
                status: 'active',
                planType: 'monthly',
                lastPaymentDate: new Date()
            });

            // Notifica o componente pai que a assinatura está ativa
            onSubscriptionActive();
        } catch (error) {
            console.error("Erro ao ativar assinatura:", error);
            alert("Erro ao processar ativação. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const openStripeCheckout = () => {
        window.open('https://buy.stripe.com/dRmbIU8V2cLacly99P8g000', '_blank');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">

                {/* Lado Esquerdo - Benefícios */}
                <div className="bg-slate-900 p-8 md:w-2/5 text-white flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <Shield className="w-8 h-8 text-brand-400" />
                            <span className="font-bold text-xl tracking-tight">Painel Fiscal</span>
                        </div>

                        <h2 className="text-2xl font-bold mb-4">Desbloqueie todo o potencial</h2>
                        <p className="text-slate-400 mb-8">
                            Tenha acesso completo a todas as ferramentas de cálculo e planejamento tributário.
                        </p>

                        <ul className="space-y-4">
                            {[
                                "Simulador de Impostos (MEI, Simples, Presumido)",
                                "Cálculo Trabalhista Completo",
                                "Planejamento Previdenciário",
                                "Revisão de Empréstimos",
                                "Consultor IA Especializado",
                                "Emissão de Certidões"
                            ].map((item, index) => (
                                <li key={index} className="flex items-center gap-3">
                                    <div className="bg-brand-500/20 p-1 rounded-full">
                                        <Check className="w-4 h-4 text-brand-400" />
                                    </div>
                                    <span className="text-sm font-medium">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-800">
                        <p className="text-xs text-slate-500">
                            Ambiente seguro e criptografado. Seus dados estão protegidos.
                        </p>
                    </div>
                </div>

                {/* Lado Direito - Pagamento */}
                <div className="p-8 md:w-3/5 flex flex-col justify-center">
                    <div className="text-center mb-8">
                        <div className="bg-brand-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-brand-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800">Acesso Restrito</h3>
                        <p className="text-slate-600 mt-2">
                            Para continuar, escolha um plano e realize o pagamento.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="border-2 border-brand-500 bg-brand-50/30 rounded-xl p-4 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                RECOMENDADO
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-slate-800">Plano Mensal</span>
                                <span className="text-2xl font-bold text-brand-600">R$ 97,00<span className="text-sm text-slate-500 font-normal">/mês</span></span>
                            </div>
                            <p className="text-sm text-slate-600 mb-4">Acesso total a todas as funcionalidades.</p>

                            <button
                                onClick={openStripeCheckout}
                                className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
                            >
                                <CreditCard className="w-5 h-5" />
                                Assinar Agora
                            </button>
                        </div>

                        <div className="text-center">
                            <p className="text-xs text-slate-400 mb-4">
                                Ao clicar em assinar, você será redirecionado para o pagamento seguro via Stripe.
                            </p>
                        </div>

                        {/* ÁREA DE SIMULAÇÃO (ADMIN/TESTE) */}
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <p className="text-xs font-bold text-slate-400 uppercase text-center mb-3">
                                Área de Teste (Simulação)
                            </p>
                            <button
                                onClick={handleSimulatePayment}
                                disabled={loading}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-slate-200"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                Simular Pagamento Aprovado
                            </button>
                            <p className="text-[10px] text-slate-400 text-center mt-2">
                                Use este botão para liberar o acesso imediatamente sem pagar (apenas para teste).
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionView;
