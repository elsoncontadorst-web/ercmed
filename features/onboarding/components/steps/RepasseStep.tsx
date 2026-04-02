import React, { useState } from 'react';
import { Calculator, Play, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../../../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface RepasseStepProps {
    onComplete: () => void;
}

export const RepasseStep: React.FC<RepasseStepProps> = ({ onComplete }) => {
    const [success, setSuccess] = useState(false);
    const [simulation, setSimulation] = useState({
        amount: 500,
        split: 70
    });

    const medicalPart = (simulation.amount * simulation.split) / 100;
    const clinicPart = simulation.amount - medicalPart;

    const handleFinish = async () => {
        if (!auth.currentUser) return;

        // Just save a flag or a dummy calculation record
        try {
            await setDoc(doc(db, `users/${auth.currentUser.uid}/onboarding/repasse_demo`), {
                demoAmount: simulation.amount,
                demoSplit: simulation.split,
                completedAt: serverTimestamp(),
                isTutorialData: true
            });

            setSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 1500);
        } catch (e) {
            console.error(e);
            onComplete(); // Proced anyway
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Cálculo Entendido!</h3>
                <p className="text-slate-500">O sistema fará isso automaticamente para você.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-700">
                    <strong>Cálculo Automático:</strong> Veja como o sistema divide os valores automaticamente. Ajuste os valores abaixo para simular.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Valor da Consulta</label>
                    <div className="text-2xl font-bold text-slate-800">R$ {simulation.amount}</div>
                    <input
                        type="range" min="100" max="2000" step="50"
                        value={simulation.amount}
                        onChange={e => setSimulation({ ...simulation, amount: Number(e.target.value) })}
                        className="w-full mt-2 accent-blue-600"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Repasse Médico (%)</label>
                    <div className="text-2xl font-bold text-slate-800">{simulation.split}%</div>
                    <input
                        type="range" min="30" max="90" step="5"
                        value={simulation.split}
                        onChange={e => setSimulation({ ...simulation, split: Number(e.target.value) })}
                        className="w-full mt-2 accent-blue-600"
                    />
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-slate-600">Médico recebe:</span>
                    <span className="font-bold text-green-600 text-lg">R$ {medicalPart.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Clínica recebe:</span>
                    <span className="font-bold text-blue-600 text-lg">R$ {clinicPart.toFixed(2)}</span>
                </div>
            </div>

            <button
                onClick={handleFinish}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
                <Play className="w-4 h-4" />
                Entendi, Avançar
            </button>
        </div>
    );
};
