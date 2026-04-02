import React, { useState } from 'react';
import { Building, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../../../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface ClinicStepProps {
    onComplete: () => void;
}

export const ClinicStep: React.FC<ClinicStepProps> = ({ onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [clinicName, setClinicName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;
        setLoading(true);

        try {
            await setDoc(doc(db, `users/${auth.currentUser.uid}/onboarding/clinic_profile`), {
                displayName: clinicName,
                updatedAt: serverTimestamp(),
                isTutorialData: true
            }, { merge: true });

            setSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 1500);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Tutorial Concluído!</h3>
                <p className="text-slate-500">Parabéns, você configurou o básico da sua clínica.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <p className="text-sm text-blue-700">
                    <strong>Identidade:</strong> Para finalizar, como você gostaria de chamar sua clínica ou espaço no sistema?
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome Fantasia da Clínica</label>
                    <input
                        type="text"
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Minha Clínica"
                        value={clinicName}
                        onChange={e => setClinicName(e.target.value)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !clinicName}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Finalizando...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Salvar e Concluir
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
