import React, { useState, useEffect } from 'react';
import { X, Gift, CheckCircle2, Crown, ArrowRight } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { AccountTier } from '../types/accountTiers';

export const WelcomeTrialModal: React.FC = () => {
    const { user, userTier, trialDaysRemaining } = useUser();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!user || !userTier) return;

        // Check if user has already seen the welcome modal
        const hasSeenWelcome = localStorage.getItem(`hasSeenWelcome_${user.uid}`);

        // Only show if:
        // 1. User hasn't seen it yet
        // 2. User is in the special 15-day trial period (UNLIMITED tier + has remaining days)
        if (!hasSeenWelcome && trialDaysRemaining !== undefined && trialDaysRemaining <= 15) {
            // Add a small delay for better UX
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [user, userTier, trialDaysRemaining]);

    const handleClose = () => {
        if (user) {
            localStorage.setItem(`hasSeenWelcome_${user.uid}`, 'true');
        }
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative animate-in zoom-in-95 duration-300">
                {/* Header with decorative background */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 shadow-lg ring-4 ring-white/10">
                            <Gift className="w-8 h-8 text-yellow-300" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Bem-vindo ao Easymed!</h2>
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-medium border border-white/10">
                            <Crown className="w-4 h-4 text-yellow-300" />
                            <span>Você ganhou um presente exclusivo</span>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="text-center mb-8">
                        <p className="text-slate-600 text-lg leading-relaxed">
                            Para você começar com o pé direito, liberamos
                            <span className="font-bold text-blue-700"> {trialDaysRemaining} dias de Acesso Ilimitado</span> para você testar todas as funcionalidades do sistema!
                        </p>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="mt-1 bg-blue-100 p-1.5 rounded-full">
                                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900">IA Consultora & EMR Avançado</h4>
                                <p className="text-sm text-slate-600">Teste nossa inteligência artificial e prontuários completos.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                            <div className="mt-1 bg-indigo-100 p-1.5 rounded-full">
                                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900">Gestão Completa</h4>
                                <p className="text-sm text-slate-600">Financeiro, Contratos, TISS e muito mais.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-8 text-sm text-yellow-800 flex gap-3">
                        <div className="shrink-0 mt-0.5">ℹ️</div>
                        <p>
                            Após o período de teste, você continua com acesso gratuito aos módulos de
                            <strong> Consultórios</strong>, <strong>Contratos</strong> e <strong>Faturamento</strong> (Plano Trial).
                        </p>
                    </div>

                    <button
                        onClick={handleClose}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group"
                    >
                        <span>Começar a Usar</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};
