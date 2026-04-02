import React, { useEffect, useState } from 'react';
import {
    CheckCircle2,
    Circle,
    ChevronDown,
    ChevronRight,
    X,
    Lock,
    PlayCircle,
    SkipForward,
    Trophy
} from 'lucide-react';
import confetti from 'canvas-confetti'; // We might need to install this or simulate it if not available

import { useTutorialFlow } from './hooks/useTutorialFlow';
import { OnboardingStepId, OnboardingStepStatus } from './types';

// Step Components
import { ConsultorioStep } from './components/steps/ConsultorioStep';
import { PatientStep } from './components/steps/PatientStep';
import { AppointmentStep } from './components/steps/AppointmentStep';
import { ReceiptStep } from './components/steps/ReceiptStep';
import { ContractStep } from './components/steps/ContractStep';
import { RepasseStep } from './components/steps/RepasseStep';
import { ClinicStep } from './components/steps/ClinicStep';

export const OnboardingChecklist: React.FC = () => {
    const {
        steps,
        currentStepId,
        progressPercentage,
        isOpen,
        isCompleted,
        completeStep,
        skipStep,
        toggleOpen
    } = useTutorialFlow();

    const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

    // Auto-expand current step when it changes
    useEffect(() => {
        if (currentStepId && !isCompleted) {
            setExpandedStepId(currentStepId);
        }
    }, [currentStepId, isCompleted]);

    // Celebration effect
    useEffect(() => {
        if (isCompleted && isOpen) {
            // Trigger confetti
            if (typeof window !== 'undefined') {
                // Simple confetti simulation if library not present, 
                // but ideally 'canvas-confetti' should be added to package.json
                // For now, assuming standard JS confetti or just UI animation
                import('canvas-confetti').then(confetti => {
                    confetti.default({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                }).catch(() => console.log("Confetti not installed"));
            }
        }
    }, [isCompleted, isOpen]);

    if (!isOpen) {
        // Minimized floating button if not completed
        if (!isCompleted) {
            return (
                <button
                    onClick={toggleOpen}
                    className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all z-50 flex items-center gap-2 animate-bounce-subtle"
                >
                    <PlayCircle className="w-6 h-6" />
                    <span className="font-medium pr-2">Tutorial ({progressPercentage}%)</span>
                </button>
            );
        }
        return null;
    }

    const renderStepContent = (stepId: OnboardingStepId) => {
        switch (stepId) {
            case OnboardingStepId.CONSULTORIOS:
                return <ConsultorioStep onComplete={() => completeStep(stepId)} />;
            case OnboardingStepId.PACIENTES:
                return <PatientStep onComplete={() => completeStep(stepId)} />;
            case OnboardingStepId.AGENDAMENTO:
                return <AppointmentStep onComplete={() => completeStep(stepId)} />;
            case OnboardingStepId.RECIBOS:
                return <ReceiptStep onComplete={() => completeStep(stepId)} />;
            case OnboardingStepId.CONTRATOS:
                return <ContractStep onComplete={() => completeStep(stepId)} />;
            case OnboardingStepId.REPASSE:
                return <RepasseStep onComplete={() => completeStep(stepId)} />;
            case OnboardingStepId.CLINICA:
                return <ClinicStep onComplete={() => completeStep(stepId)} />;
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shrink-0 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Trophy className="w-32 h-32" />
                    </div>

                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                {isCompleted ? 'Parabéns!' : 'Bem-vindo ao Easymed'}
                            </h2>
                            <p className="text-blue-100 mt-1 max-w-md">
                                {isCompleted
                                    ? 'Você configurou o essencial e está pronto para usar!'
                                    : 'Configure sua conta em poucos minutos com nosso guia interativo.'}
                            </p>
                        </div>
                        <button
                            onClick={toggleOpen}
                            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative z-10 mt-6">
                        <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-blue-100 mb-2">
                            <span>Progresso</span>
                            <span>{progressPercentage}%</span>
                        </div>
                        <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-500 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-2 bg-gray-50">
                    <div className="space-y-2 p-2">
                        {steps.map((step, index) => {
                            const isExpanded = expandedStepId === step.id;
                            const isLocked = step.status === OnboardingStepStatus.LOCKED;
                            const isCompletedStep = step.status === OnboardingStepStatus.COMPLETED;
                            const isSkipped = step.status === OnboardingStepStatus.SKIPPED;

                            return (
                                <div
                                    key={step.id}
                                    className={`
                                        bg-white rounded-xl border transition-all duration-300 overflow-hidden
                                        ${isExpanded ? 'ring-2 ring-blue-500 shadow-lg scale-[1.01] my-4' : 'hover:bg-gray-50 border-gray-200'}
                                        ${isLocked ? 'opacity-60 grayscale' : ''}
                                    `}
                                >
                                    {/* Step Header */}
                                    <div
                                        onClick={() => !isLocked && setExpandedStepId(isExpanded ? null : step.id)}
                                        className={`
                                            p-4 flex items-center justify-between cursor-pointer
                                            ${isLocked ? 'cursor-not-allowed' : ''}
                                        `}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Icon Indicator */}
                                            <div className="shrink-0">
                                                {isCompletedStep ? (
                                                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </div>
                                                ) : isSkipped ? (
                                                    <div className="w-8 h-8 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                                                        <SkipForward className="w-5 h-5" />
                                                    </div>
                                                ) : isLocked ? (
                                                    <div className="w-8 h-8 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                                                        <Lock className="w-4 h-4" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center ring-2 ring-blue-50 ring-offset-2">
                                                        <span className="font-bold text-sm">{index + 1}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <h4 className={`font-semibold ${isCompletedStep ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                                    {step.title}
                                                </h4>
                                                {!isExpanded && (
                                                    <p className="text-xs text-slate-500 line-clamp-1">{step.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {step.isOptional && !isCompletedStep && !isSkipped && !isLocked && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        skipStep(step.id);
                                                    }}
                                                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                                                >
                                                    Pular
                                                </button>
                                            )}
                                            {isLocked ? (
                                                <Lock className="w-4 h-4 text-gray-300" />
                                            ) : isExpanded ? (
                                                <ChevronDown className="w-5 h-5 text-gray-400" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Step Content (Expanded) */}
                                    {isExpanded && (
                                        <div className="px-4 pb-6 pt-2 border-t border-gray-100 animate-in slide-in-from-top-2">
                                            {renderStepContent(step.id)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer only if completed */}
                {isCompleted && (
                    <div className="p-6 bg-white border-t border-gray-100 text-center">
                        <button
                            onClick={toggleOpen}
                            className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                        >
                            Começar a usar o Easymed
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
