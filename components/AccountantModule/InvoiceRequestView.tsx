import React, { useState, useEffect } from 'react';
import { Send, DollarSign, User, FileText, Calendar, AlertCircle } from 'lucide-react';
import { InvoiceRequestFormData } from '../../types/accountant';
import { createInvoiceRequest, getInvoiceRequests } from '../../services/accountantService';
import { InvoiceRequest } from '../../types/accountant';

const InvoiceRequestView: React.FC = () => {
    const [requests, setRequests] = useState<InvoiceRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState<InvoiceRequestFormData>({
        value: 0,
        description: '',
        recipient: {
            name: '',
            document: '',
            type: 'PF'
        },
        issueDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const data = await getInvoiceRequests();
            setRequests(data);
        } catch (error) {
            console.error('Error loading requests:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await createInvoiceRequest(formData);
            if (result) {
                alert('Solicitação enviada com sucesso!');
                setShowForm(false);
                resetForm();
                await loadRequests();
            } else {
                alert('Erro ao enviar solicitação. Tente novamente.');
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Erro ao enviar solicitação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            value: 0,
            description: '',
            recipient: {
                name: '',
                document: '',
                type: 'PF'
            },
            issueDate: new Date().toISOString().split('T')[0],
            notes: ''
        });
    };

    const getStatusBadge = (status: InvoiceRequest['status']) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            processing: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };

        const labels = {
            pending: 'Pendente',
            processing: 'Em Processamento',
            completed: 'Concluída',
            rejected: 'Rejeitada'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
                {labels[status]}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Solicitações de Nota Fiscal</h2>
                    <p className="text-sm text-slate-500">Solicite a emissão de notas fiscais</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2"
                >
                    <Send className="w-4 h-4" />
                    Nova Solicitação
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-slate-700">Descrição do Serviço *</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                rows={3}
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700">Valor (R$) *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700">Data de Emissão *</label>
                            <input
                                type="date"
                                value={formData.issueDate}
                                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                required
                            />
                        </div>

                        <div className="col-span-2 border-t pt-4">
                            <h3 className="font-semibold text-slate-800 mb-3">Tomador do Serviço</h3>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700">Nome/Razão Social *</label>
                            <input
                                type="text"
                                value={formData.recipient.name}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    recipient: { ...formData.recipient, name: e.target.value }
                                })}
                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700">CPF/CNPJ *</label>
                            <input
                                type="text"
                                value={formData.recipient.document}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    recipient: { ...formData.recipient, document: e.target.value }
                                })}
                                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700">Tipo *</label>
                            <select
                                value={formData.recipient.type}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    recipient: { ...formData.recipient, type: e.target.value as 'PF' | 'PJ' }
                                })}
                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                            >
                                <option value="PF">Pessoa Física</option>
                                <option value="PJ">Pessoa Jurídica</option>
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="text-sm font-medium text-slate-700">Observações</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(false);
                                resetForm();
                            }}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            {loading ? 'Enviando...' : 'Enviar Solicitação'}
                        </button>
                    </div>
                </form>
            )}

            {/* Requests List */}
            <div className="space-y-3">
                {requests.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">Nenhuma solicitação encontrada.</p>
                    </div>
                ) : (
                    requests.map(request => (
                        <div key={request.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-slate-800">{request.description}</h3>
                                        {getStatusBadge(request.status)}
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        Solicitado em {new Date(request.createdAt.seconds * 1000).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-brand-600">
                                        R$ {request.value.toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <User className="w-4 h-4" />
                                    <span>{request.recipient.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <FileText className="w-4 h-4" />
                                    <span>{request.recipient.document}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>Emissão: {new Date(request.issueDate).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>

                            {request.notes && (
                                <div className="mt-3 p-2 bg-slate-50 rounded text-sm text-slate-600">
                                    <strong>Observações:</strong> {request.notes}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default InvoiceRequestView;
