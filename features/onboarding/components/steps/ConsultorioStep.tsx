import React, { useState } from 'react';
import { OnboardingStepId } from '../../types';
import { Building2, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { auth } from '../../../../services/firebase';
import { addClinic } from '../../../../services/clinicService';

interface ConsultorioStepProps {
    onComplete: () => void;
}

export const ConsultorioStep: React.FC<ConsultorioStepProps> = ({ onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;

        setLoading(true);
        try {
            // Create real data using the service
            // Cast to any to allow isTutorialData flag which isn't in the strict type but is valid for Firestore
            await addClinic({
                name: formData.name,
                phone: formData.phone,
                email: '',
                specialty: 'Geral',
                address: {
                    street: formData.address,
                    number: 'S/N',
                    neighborhood: 'Centro',
                    city: 'São Paulo',
                    state: 'SP',
                    zipCode: '00000-000',
                    complement: ''
                },
                cnpj: '',
                cnes: '',
                isTutorialData: true
            } as any);

            setSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 1500);
        } catch (error: any) {
            console.error("Error creating clinic:", error);
            // Check for specific service errors
            if (error.message && error.message.includes('CNPJ')) {
                alert(error.message);
            } else {
                alert("Erro ao criar consultório. Tente novamente.");
            }
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
                <h3 className="text-xl font-bold text-slate-800">Consultório Criado!</h3>
                <p className="text-slate-500">Primeira etapa concluída com sucesso.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <p className="text-sm text-blue-700">
                    <strong>Vamos começar!</strong> Cadastre seu primeiro local de atendimento.
                    Pode ser o nome da sua clínica, sala ou hospital onde atende.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Consultório *</label>
                    <input
                        type="text"
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="Ex: Clínica Central ou Sala 304"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                        <input
                            type="tel"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="(00) 00000-0000"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Endereço (Resumido)</label>
                        <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ex: Av. Paulista, 1000"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !formData.name}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Cadastrar Consultório
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
