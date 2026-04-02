import React, { useState } from 'react';
import { FileBadge, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ContractStepProps {
    onComplete: () => void;
}

export const ContractStep: React.FC<ContractStepProps> = ({ onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        contractorName: '',
        role: 'Médico',
        startDate: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;

        setLoading(true);
        try {
            await addDoc(collection(db, `users/${auth.currentUser.uid}/contracts`), {
                name: formData.contractorName,
                role: formData.role,
                startDate: formData.startDate,
                status: 'active',
                createdAt: serverTimestamp(),
                isTutorialData: true
            });

            setSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 1500);
        } catch (error) {
            console.error("Error creating contract:", error);
            alert("Erro ao criar contrato.");
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
                <h3 className="text-xl font-bold text-slate-800">Contrato Registrado!</h3>
                <p className="text-slate-500">Gestão de prestadores iniciada.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <p className="text-sm text-blue-700">
                    <strong>Gestão de Equipe:</strong> Cadastre prestadores de serviço e organize os contratos da sua clínica.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Profissional</label>
                    <input
                        type="text"
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Dr. Exemplo da Silva"
                        value={formData.contractorName}
                        onChange={e => setFormData({ ...formData, contractorName: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                        <select
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option>Médico</option>
                            <option>Enfermeiro</option>
                            <option>Fisioterapeuta</option>
                            <option>Recepcionista</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data de Início</label>
                        <input
                            type="date"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.startDate}
                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !formData.contractorName}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <FileBadge className="w-4 h-4" />
                            Registrar Contrato
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
