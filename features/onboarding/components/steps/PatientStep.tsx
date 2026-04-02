import React, { useState } from 'react';
import { User, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { auth } from '../../../../services/firebase';
import { addPatient } from '../../../../services/healthService';

interface PatientStepProps {
    onComplete: () => void;
}

export const PatientStep: React.FC<PatientStepProps> = ({ onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        birthDate: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;

        setLoading(true);
        try {
            // Create real data using the service
            await addPatient({
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                birthdate: formData.birthDate, // Service uses 'birthdate' (lowercase d)
                isMinor: false,
                active: true,
                isTutorialData: true
            } as any);

            setSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 1500);
        } catch (error) {
            console.error("Error creating patient:", error);
            alert("Erro ao cadastrar paciente.");
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
                <h3 className="text-xl font-bold text-slate-800">Paciente Cadastrado!</h3>
                <p className="text-slate-500">Agora você já pode agendar consultas.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <p className="text-sm text-blue-700">
                    <strong>Cadastro Rápido:</strong> Adicione os dados básicos de um paciente real ou fictício para testar.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Paciente *</label>
                    <input
                        type="text"
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Nome completo"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Celular / WhatsApp</label>
                        <input
                            type="tel"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="(00) 90000-0000"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data de Nascimento</label>
                        <input
                            type="date"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.birthDate}
                            onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !formData.name}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Salvar Paciente
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
