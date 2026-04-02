import React, { useState, useEffect } from 'react';
import { Pill, Plus, Search, Filter, AlertCircle, X, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { auth } from '../services/firebase';
import { getMedications, addMedication, updateMedication, deleteMedication } from '../services/healthService';
import { Medication } from '../types/health';

const MedicationsView: React.FC = () => {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMedication, setEditingMedication] = useState<Medication | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        dosage: '',
        frequency: '',
        startDate: '',
        endDate: '',
        prescribedBy: '',
        notes: '',
        active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const user = auth.currentUser;
        if (!user) return;
        setLoading(true);
        try {
            const data = await getMedications(user.uid);
            setMedications(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            const medicationData: Omit<Medication, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
                name: formData.name,
                dosage: formData.dosage,
                frequency: formData.frequency,
                startDate: formData.startDate,
                endDate: formData.endDate || undefined,
                prescribedBy: formData.prescribedBy,
                notes: formData.notes || undefined,
                active: formData.active
            };

            if (editingMedication) {
                await updateMedication(user.uid, editingMedication.id, medicationData);
            } else {
                await addMedication(user.uid, medicationData);
            }

            setShowModal(false);
            resetForm();
            loadData();
        } catch (error) {
            console.error("Error saving medication", error);
            alert('Erro ao salvar medicamento.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este medicamento?')) return;
        const user = auth.currentUser;
        if (!user) return;

        try {
            await deleteMedication(user.uid, id);
            loadData();
        } catch (error) {
            console.error("Error deleting medication", error);
        }
    };

    const handleEdit = (med: Medication) => {
        setEditingMedication(med);
        setFormData({
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            startDate: med.startDate,
            endDate: med.endDate || '',
            prescribedBy: med.prescribedBy,
            notes: med.notes || '',
            active: med.active
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            dosage: '',
            frequency: '',
            startDate: '',
            endDate: '',
            prescribedBy: '',
            notes: '',
            active: true
        });
        setEditingMedication(null);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Pill className="w-6 h-6 text-brand-600" />
                        Medicamentos
                    </h1>
                    <p className="text-slate-500">Controle de receitas e horários</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Novo Medicamento
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10">Carregando...</div>
            ) : medications.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <Pill className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum medicamento cadastrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {medications.map(med => (
                        <div key={med.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 relative group">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(med)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(med.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                    <Pill className="w-6 h-6" />
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${med.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {med.active ? 'ATIVO' : 'INATIVO'}
                                </span>
                            </div>
                            <h3 className="font-bold text-lg text-slate-800">{med.name}</h3>
                            <p className="text-slate-500 text-sm mb-4">{med.dosage}</p>

                            <div className="space-y-2 text-sm text-slate-600 bg-gray-50 p-3 rounded-lg">
                                <div className="flex justify-between">
                                    <span>Frequência:</span>
                                    <span className="font-medium">{med.frequency}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Prescrito por:</span>
                                    <span className="font-medium">{med.prescribedBy}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Início:</span>
                                    <span className="font-medium">{new Date(med.startDate).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingMedication ? 'Editar Medicamento' : 'Novo Medicamento'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Nome do Medicamento *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Dosagem *</label>
                                    <input
                                        type="text"
                                        value={formData.dosage}
                                        onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                                        placeholder="Ex: 500mg"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Frequência *</label>
                                    <input
                                        type="text"
                                        value={formData.frequency}
                                        onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                                        placeholder="Ex: 8/8h"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Data Início *</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Data Fim</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700">Prescrito por *</label>
                                <input
                                    type="text"
                                    value={formData.prescribedBy}
                                    onChange={e => setFormData({ ...formData, prescribedBy: e.target.value })}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700">Observações</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="active"
                                    checked={formData.active}
                                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                                />
                                <label htmlFor="active" className="text-sm font-medium text-slate-700">Medicamento em uso (Ativo)</label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-brand-600 text-white py-3 rounded-lg hover:bg-brand-700 font-medium"
                            >
                                {loading ? 'Salvando...' : editingMedication ? 'Atualizar Medicamento' : 'Salvar Medicamento'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicationsView;
