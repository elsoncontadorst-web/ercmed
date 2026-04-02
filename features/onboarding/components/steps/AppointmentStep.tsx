import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../../../../services/firebase';
import { addAppointment } from '../../../../services/healthService';
import { collection, serverTimestamp, getDocs, query, limit, orderBy } from 'firebase/firestore';

interface AppointmentStepProps {
    onComplete: () => void;
}

export const AppointmentStep: React.FC<AppointmentStepProps> = ({ onComplete }) => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [success, setSuccess] = useState(false);
    const [patients, setPatients] = useState<any[]>([]);
    const [clinics, setClinics] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        patientId: '',
        patientName: '', // Store name for easier display/logic
        clinicId: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        specialty: 'Clínica Geral'
    });

    // Load needed data (patients and clinics created in previous steps)
    useEffect(() => {
        const fetchData = async () => {
            if (!auth.currentUser) return;
            try {
                // Fetch recent patients
                const patentsQuery = query(collection(db, `users/${auth.currentUser.uid}/patients`), orderBy('createdAt', 'desc'), limit(5));
                const patentSnaps = await getDocs(patentsQuery);
                const fetchedPatients = patentSnaps.docs.map(d => ({ id: d.id, ...d.data() } as any));
                setPatients(fetchedPatients);

                // Fetch clinics
                const clinicsQuery = query(collection(db, `users/${auth.currentUser.uid}/clinics`), orderBy('createdAt', 'desc'), limit(5));
                const clinicSnaps = await getDocs(clinicsQuery);
                const fetchedClinics = clinicSnaps.docs.map(d => ({ id: d.id, ...d.data() }));
                setClinics(fetchedClinics);

                // Auto-select if available
                if (fetchedPatients.length > 0) {
                    setFormData(prev => ({
                        ...prev,
                        patientId: fetchedPatients[0].id,
                        patientName: fetchedPatients[0].name
                    }));
                }
                if (fetchedClinics.length > 0) {
                    setFormData(prev => ({ ...prev, clinicId: fetchedClinics[0].id }));
                }

            } catch (e) {
                console.error("Error fetching dependencies for appointment:", e);
            } finally {
                setFetching(false);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;

        setLoading(true);
        try {
            // Find selected patient name if changed
            const selectedPatient = patients.find(p => p.id === formData.patientId);

            await addAppointment(auth.currentUser.uid, {
                patientId: formData.patientId,
                patientName: selectedPatient?.name || formData.patientName,
                clinicId: formData.clinicId,
                date: formData.date,
                time: formData.time,
                specialty: formData.specialty,
                status: 'scheduled',
                professionalId: auth.currentUser.uid,
                professionalName: auth.currentUser.displayName || 'Profissional', // Required by type
                isTutorialData: true
            } as any);

            setSuccess(true);
            setTimeout(() => {
                onComplete();
            }, 1500);
        } catch (error) {
            console.error("Error creating appointment:", error);
            alert("Erro ao agendar consulta.");
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
                <h3 className="text-xl font-bold text-slate-800">Consulta Agendada!</h3>
                <p className="text-slate-500">Tudo pronto para o atendimento.</p>
            </div>
        );
    }

    if (fetching) {
        return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
    }

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <p className="text-sm text-blue-700">
                    <strong>Agendamento:</strong> Crie um agendamento para o paciente que você acabou de cadastrar.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Paciente *</label>
                    <select
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        value={formData.patientId}
                        onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                    >
                        <option value="">Selecione um paciente</option>
                        {patients.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                required
                                className="w-full pl-9 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Hora</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="time"
                                required
                                className="w-full pl-9 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.time}
                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Especialidade</label>
                    <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.specialty}
                        onChange={e => setFormData({ ...formData, specialty: e.target.value })}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !formData.patientId}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Agendando...
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-4 h-4" />
                            Confirmar Agendamento
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};
