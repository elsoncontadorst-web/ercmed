import React, { useState } from 'react';
import { FileText, DollarSign, Loader2, CheckCircle2 } from 'lucide-react';
import { auth } from '../../../../services/firebase';
import { addReceipt } from '../../../../services/receiptsService';

interface ReceiptStepProps {
    onComplete: () => void;
}

export const ReceiptStep: React.FC<ReceiptStepProps> = ({ onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        patientName: '',
        serviceDescription: 'Consulta Médica',
        amount: '',
        date: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;

        setLoading(true);
        try {
            await addReceipt(auth.currentUser.uid, {
                patientName: formData.patientName,
                description: formData.serviceDescription,
                amount: parseFloat(formData.amount),
                issueDate: formData.date, // Service expects issueDate
                status: 'paid', // Default to paid for tutorial
                isTutorialData: true
            } as any);

            setSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 1500);
        } catch (error) {
            console.error("Error creating receipt:", error);
            alert("Erro ao gerar recibo.");
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
                <h3 className="text-xl font-bold text-slate-800">Recibo Gerado!</h3>
                <p className="text-slate-500">Documento pronto para impressão/envio.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <p className="text-sm text-blue-700">
                    <strong>Financeiro:</strong> Simule a emissão de um recibo para seu paciente.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Paciente</label>
                    <input
                        type="text"
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Nome do paciente"
                        value={formData.patientName}
                        onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="number"
                            required
                            className="w-full pl-9 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="0,00"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Serviço</label>
                    <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.serviceDescription}
                        onChange={e => setFormData({ ...formData, serviceDescription: e.target.value })}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !formData.patientName || !formData.amount}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Gerando...
                        </>
                    ) : (
                        <>
                            <FileText className="w-4 h-4" />
                            Emitir Recibo
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
