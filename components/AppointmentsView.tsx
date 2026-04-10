import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, Clock, User, Search, Filter, X, Check, Edit2, Trash2, Save, RefreshCw, XCircle, Stethoscope } from 'lucide-react';
import { auth } from '../services/firebase';
import { subscribeToAllAppointments, subscribeToPatients, addAppointment, updateAppointment, deleteAppointment, addPatient } from '../services/healthService';
import { getAllProfessionals, getProfessionalsByOwner } from '../services/repasseService';
import { getClinicHours } from '../services/clinicHoursService';
import { Appointment, Patient, ClinicHours } from '../types/health';
import { Professional } from '../types/finance';
import Pagination from './Pagination';
import { requestNotificationPermission, notifyNewAppointment, notifyAppointmentStatusChange } from '../services/notificationService';
import { NotificationContainer } from './NotificationToast';
import { Notification, createNotification } from '../services/notificationService';

const AppointmentsView: React.FC = () => {
    const { user, userProfile, isAdminMaster } = useUser();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showQuickPatientModal, setShowQuickPatientModal] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled'>('all');
    const [professionalFilter, setProfessionalFilter] = useState<string>('all');
    const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const itemsPerPage = 5;
    const previousAppointmentsRef = useRef<Appointment[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        patientId: '',
        patientName: '',
        professionalId: '',
        professionalName: '',
        specialty: '',
        date: '',
        time: '',
        status: 'scheduled' as Appointment['status'],
        notes: '',
        location: ''
    });

    // Quick Patient Registration State
    const [quickPatientData, setQuickPatientData] = useState({
        name: '',
        phone: '',
        birthdate: '',
        cpf: ''
    });

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);

        // Request notification permission
        // requestNotificationPermission();

        // Subscribe to appointments with real-time updates
        const unsubscribeAppointments = subscribeToAllAppointments((appts) => {
            // Detect new appointments
            if (previousAppointmentsRef.current.length > 0) {
                const newAppointments = appts.filter(
                    apt => !previousAppointmentsRef.current.some(prev => prev.id === apt.id)
                );

                newAppointments.forEach(apt => {
                    // notifyNewAppointment(apt);
                    addNotification('info', 'Novo Agendamento',
                        `${apt.patientName} - ${apt.professionalName}\n${new Date(apt.date).toLocaleDateString('pt-BR')} às ${apt.time}`);
                });

                // Detect status changes
                appts.forEach(apt => {
                    const prev = previousAppointmentsRef.current.find(p => p.id === apt.id);
                    if (prev && prev.status !== apt.status) {
                        // notifyAppointmentStatusChange(apt, prev.status);
                        addNotification('success', 'Status Atualizado',
                            `${apt.patientName}: ${prev.status} → ${apt.status}`);
                    }
                });
            }

            previousAppointmentsRef.current = appts;
            setAppointments(appts);
            setLoading(false);
        });

        // Subscribe to patients
        const unsubscribePatients = subscribeToPatients((pts) => {
            setPatients(pts);
        });

        // Load professionals (one-time) - from the clinic manager (owner)
        // This ensures team members see all professionals of the clinic, not just themselves
        const loadProfessionals = async () => {
            if (!user) return;
            try {
                const isClinicManager = userProfile?.isClinicManager === true;
                
                // SECURITY: Only Master Admin can bypass the managerId filter
                // If isAdminMaster is true, we pass undefined to see everyone
                // If not, we try to find the managerId for the current user
                let effectiveManagerId: string | undefined = undefined;
                
                if (!isAdminMaster) {
                    const { getManagerIdForUser } = await import('../services/accessControlService');
                    const managerId = await getManagerIdForUser(user.uid);
                    effectiveManagerId = managerId || user.uid;
                }


                const pros = await getAllProfessionals(effectiveManagerId);
                setProfessionals(pros);
            } catch (error) {
                console.error('Error loading professionals:', error);
            }
        };

        loadProfessionals();

        // Cleanup listeners on unmount
        return () => {
            unsubscribeAppointments();
            unsubscribePatients();
        };
    }, []);

    useEffect(() => {
        if (formData.professionalId && formData.date) {
            generateAvailableSlots();
        }
    }, [formData.professionalId, formData.date]);

    const addNotification = (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => {
        const notification = createNotification(type, title, message, 5000);
        setNotifications(prev => [...prev, notification]);
    };

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleProfessionalSelect = (professionalId: string) => {
        const professional = professionals.find(p => p.id === professionalId);
        if (professional) {
            setFormData({
                ...formData,
                professionalId: professional.id,
                professionalName: professional.name,
                specialty: professional.specialty
            });
        }
    };

    const generateAvailableSlots = async () => {
        const user = auth.currentUser;
        if (!user || !formData.professionalId || !formData.date) return;

        try {
            // Get clinic hours
            const clinicHours = await getClinicHours(user.uid);

            // Get day of week
            const date = new Date(formData.date + 'T00:00:00');
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = dayNames[date.getDay()] as keyof typeof clinicHours.schedule;
            const daySchedule = clinicHours.schedule[dayName];

            if (!daySchedule.isOpen) {
                setAvailableSlots([]);
                return;
            }

            // Generate time slots (30 min intervals)
            const slots: string[] = [];
            const addSlots = (start: string, end: string) => {
                const [startHour, startMin] = start.split(':').map(Number);
                const [endHour, endMin] = end.split(':').map(Number);

                let currentHour = startHour;
                let currentMin = startMin;

                while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
                    slots.push(`${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`);
                    currentMin += 30;
                    if (currentMin >= 60) {
                        currentMin = 0;
                        currentHour++;
                    }
                }
            };

            // Add morning slots
            if (daySchedule.morningShift) {
                addSlots(daySchedule.morningShift.start, daySchedule.morningShift.end);
            }

            // Add afternoon slots
            if (daySchedule.afternoonShift) {
                addSlots(daySchedule.afternoonShift.start, daySchedule.afternoonShift.end);
            }

            // Filter out already booked slots
            const bookedSlots = appointments
                .filter(apt =>
                    apt.professionalId === formData.professionalId &&
                    apt.date === formData.date &&
                    apt.status !== 'cancelled'
                )
                .map(apt => apt.time);

            const availableSlots = slots.filter(slot => !bookedSlots.includes(slot));
            setAvailableSlots(availableSlots);
        } catch (error) {
            console.error('Error generating slots:', error);
            setAvailableSlots([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) {
                addNotification('error', 'Erro', 'Usuário não autenticado.');
                setLoading(false);
                return;
            }

            // Validate required fields
            if (!formData.patientName || formData.patientName.trim() === '') {
                addNotification('error', 'Erro', 'Nome do paciente é obrigatório.');
                setLoading(false);
                return;
            }

            if (!formData.professionalId) {
                addNotification('error', 'Erro', 'Selecione um profissional.');
                setLoading(false);
                return;
            }

            if (!formData.date) {
                addNotification('error', 'Erro', 'Selecione uma data.');
                setLoading(false);
                return;
            }

            if (!formData.time) {
                addNotification('error', 'Erro', 'Selecione um horário.');
                setLoading(false);
                return;
            }

            // Get the professional's userId for storing the appointment
            const selectedProfessional = professionals.find(p => p.id === formData.professionalId);
            const appointmentUserId = selectedProfessional?.userId || user.uid;

            console.log('Saving appointment:', {
                appointmentUserId,
                professionalId: formData.professionalId,
                patientName: formData.patientName,
                date: formData.date,
                time: formData.time
            });

            const appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> = {
                userId: appointmentUserId, // Use professional's userId
                patientId: formData.patientId || undefined,
                patientName: formData.patientName,
                professionalId: formData.professionalId, // Use selected professional
                professionalName: formData.professionalName,
                specialty: formData.specialty,
                date: formData.date,
                time: formData.time,
                status: formData.status,
                notes: formData.notes || undefined,
                location: formData.location || undefined
            };

            let result;
            if (editingAppointment) {
                result = await updateAppointment(appointmentUserId, editingAppointment.id, appointmentData);
            } else {
                result = await addAppointment(appointmentUserId, appointmentData);
            }

            if (result === null || result === false) {
                throw new Error('Falha ao salvar no banco de dados');
            }

            setShowModal(false);
            resetForm();
            addNotification('success', 'Sucesso', editingAppointment ? 'Consulta atualizada!' : 'Consulta agendada!');
        } catch (error: any) {
            console.error("Error saving appointment:", error);
            const errorMessage = error?.message || 'Não foi possível salvar a consulta.';
            addNotification('error', 'Erro', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (appointment: Appointment) => {
        if (!confirm('Tem certeza que deseja excluir esta consulta?')) return;

        try {
            await deleteAppointment(appointment.userId, appointment.id);
            addNotification('success', 'Sucesso', 'Consulta excluída!');
        } catch (error) {
            console.error("Error deleting appointment", error);
            addNotification('error', 'Erro', 'Não foi possível excluir a consulta.');
        }
    };

    const handleQuickPatientSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) return;

            const patientData = {
                name: quickPatientData.name,
                birthdate: quickPatientData.birthdate,
                phone: quickPatientData.phone,
                cpf: quickPatientData.cpf,
                professionalId: user.uid,
                active: true,
                isMinor: false
            };

            const newPatientId = await addPatient(patientData);

            // Patients will be updated via listener automatically

            // Auto-select the new patient
            // Wait a bit for the listener to update, then find the patient
            setTimeout(() => {
                const newPatient = patients.find(p => p.id === newPatientId);
                if (newPatient) {
                    setFormData({ ...formData, patientId: newPatient.id, patientName: newPatient.name });
                }
            }, 500);

            // Close modal and reset form
            setShowQuickPatientModal(false);
            setQuickPatientData({ name: '', phone: '', birthdate: '', cpf: '' });
            addNotification('success', 'Sucesso', 'Paciente cadastrado!');
        } catch (error) {
            console.error("Error saving quick patient", error);
            addNotification('error', 'Erro', 'Não foi possível cadastrar o paciente.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            patientId: '',
            patientName: '',
            professionalId: '',
            professionalName: '',
            specialty: '',
            date: '',
            time: '',
            status: 'scheduled',
            notes: '',
            location: ''
        });
        setEditingAppointment(null);
    };

    const handleEdit = (appointment: Appointment) => {
        setEditingAppointment(appointment);
        setFormData({
            patientId: appointment.patientId || '',
            patientName: appointment.patientName || '',
            professionalId: appointment.professionalId || '',
            professionalName: appointment.professionalName,
            specialty: appointment.specialty,
            date: appointment.date,
            time: appointment.time,
            status: appointment.status,
            notes: appointment.notes || '',
            location: appointment.location || ''
        });
        setShowModal(true);
    };

    const handlePatientSelect = (patientId: string) => {
        const patient = patients.find(p => p.id === patientId);
        if (patient) {
            setFormData({
                ...formData,
                patientId: patient.id,
                patientName: patient.name
            });
        } else if (patientId === '') {
            setFormData({
                ...formData,
                patientId: '',
                patientName: ''
            });
        }
    };

    // Get unique professionals and specialties for filters
    const uniqueProfessionals = Array.from(new Set(appointments.map(a => a.professionalName))).sort();
    const uniqueSpecialties = Array.from(new Set(appointments.map(a => a.specialty))).sort();

    // Updated filter logic with all filters
    const filteredAppointments = appointments.filter(app => {
        const matchesSearch =
            app.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.professionalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.specialty.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
        const matchesProfessional = professionalFilter === 'all' || app.professionalName === professionalFilter;
        const matchesSpecialty = specialtyFilter === 'all' || app.specialty === specialtyFilter;

        return matchesSearch && matchesStatus && matchesProfessional && matchesSpecialty;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, professionalFilter, specialtyFilter]);

    const clearFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setProfessionalFilter('all');
        setSpecialtyFilter('all');
        setCurrentPage(1);
    };

    const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || professionalFilter !== 'all' || specialtyFilter !== 'all';

    const getStatusBadge = (status: Appointment['status']) => {
        const statusMap = {
            scheduled: { label: 'Agendada', className: 'bg-blue-100 text-blue-700' },
            confirmed: { label: 'Confirmada', className: 'bg-green-100 text-green-700' },
            completed: { label: 'Realizada', className: 'bg-gray-100 text-gray-700' },
            cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-700' }
        };
        const info = statusMap[status];
        return <span className={`px-3 py-1 rounded-full text-xs font-bold ${info.className}`}>{info.label}</span>;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-brand-600" />
                        Agendamento de Consultas
                    </h1>
                    <p className="text-slate-500">Gerencie agendamentos e histórico de consultas</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            resetForm();
                            setShowModal(true);
                        }}
                        className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Consulta
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-wrap gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por paciente, profissional ou especialidade..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white"
                        >
                            <option value="all">Todos os Status</option>
                            <option value="scheduled">Agendadas</option>
                            <option value="confirmed">Confirmadas</option>
                            <option value="completed">Realizadas</option>
                            <option value="cancelled">Canceladas</option>
                        </select>
                    </div>

                    {/* Professional Filter */}
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500" />
                        <select
                            value={professionalFilter}
                            onChange={(e) => setProfessionalFilter(e.target.value)}
                            className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white"
                        >
                            <option value="all">Todos Profissionais</option>
                            {uniqueProfessionals.map(prof => (
                                <option key={prof} value={prof}>{prof}</option>
                            ))}
                        </select>
                    </div>

                    {/* Specialty Filter */}
                    <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-slate-500" />
                        <select
                            value={specialtyFilter}
                            onChange={(e) => setSpecialtyFilter(e.target.value)}
                            className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white"
                        >
                            <option value="all">Todas Especialidades</option>
                            {uniqueSpecialties.map(spec => (
                                <option key={spec} value={spec}>{spec}</option>
                            ))}
                        </select>
                    </div>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-2 transition-colors text-sm"
                        >
                            <XCircle className="w-4 h-4" />
                            Limpar Filtros
                        </button>
                    )}

                    {/* Clear Filters Button */}
                    {(professionalFilter !== 'all' || specialtyFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
                        <button
                            onClick={() => {
                                setProfessionalFilter('all');
                                setSpecialtyFilter('all');
                                setStatusFilter('all');
                                setSearchQuery('');
                            }}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                        >
                            <X className="w-4 h-4" />
                            Limpar Filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Appointments List */}
            {loading ? (
                <div className="text-center py-10">Carregando...</div>
            ) : filteredAppointments.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhuma consulta encontrada.</p>
                    <button onClick={() => setShowModal(true)} className="text-brand-600 font-medium mt-2 hover:underline">
                        Agendar agora
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid gap-4">
                        {paginatedAppointments.map(app => (
                            <div key={app.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="p-3 bg-brand-50 text-brand-600 rounded-lg">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-800">{app.professionalName}</h3>
                                                <p className="text-sm text-slate-500">{app.specialty}</p>
                                                {app.patientName && (
                                                    <p className="text-sm text-slate-600 mt-1">Paciente: {app.patientName}</p>
                                                )}
                                            </div>
                                            {getStatusBadge(app.status)}
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(app.date).toLocaleDateString('pt-BR')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {app.time}
                                            </span>
                                        </div>
                                        {app.notes && (
                                            <p className="text-sm text-slate-500 mt-2 italic">{app.notes}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(app)}
                                        className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(app)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredAppointments.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingAppointment ? 'Editar Consulta' : 'Nova Consulta'}
                            </h2>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-500 hover:text-slate-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Patient Selection */}
                            <div>
                                <label className="text-sm font-medium text-slate-700">Paciente</label>
                                <div className="flex gap-2 mt-1">
                                    <select
                                        value={formData.patientId}
                                        onChange={(e) => handlePatientSelect(e.target.value)}
                                        className="flex-1 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                        <option value="">Selecione um paciente...</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowQuickPatientModal(true)}
                                        className="px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 whitespace-nowrap text-sm font-medium"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Novo Paciente
                                    </button>
                                </div>
                                {!formData.patientId && (
                                    <p className="text-xs text-slate-500 mt-1">Ou preencha manualmente abaixo</p>
                                )}
                            </div>

                            {!formData.patientId && (
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Nome do Paciente *</label>
                                    <input
                                        type="text"
                                        value={formData.patientName}
                                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        required
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Profissional *</label>
                                    <select
                                        value={formData.professionalId}
                                        onChange={(e) => handleProfessionalSelect(e.target.value)}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        required
                                    >
                                        <option value="">Selecione um profissional</option>
                                        {professionals.map(prof => (
                                            <option key={prof.id} value={prof.id}>
                                                {prof.name} - {prof.specialty}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">Especialidade *</label>
                                    <input
                                        type="text"
                                        value={formData.specialty}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500 bg-gray-50"
                                        readOnly
                                        placeholder="Selecione um profissional"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">Data *</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">Horário *</label>
                                    {availableSlots.length > 0 ? (
                                        <select
                                            value={formData.time}
                                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                            required
                                        >
                                            <option value="">Selecione um horário</option>
                                            {availableSlots.map(slot => (
                                                <option key={slot} value={slot}>{slot}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="time"
                                            value={formData.time}
                                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                            required
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Appointment['status'] })}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                        <option value="scheduled">Agendada</option>
                                        <option value="confirmed">Confirmada</option>
                                        <option value="completed">Realizada</option>
                                        <option value="cancelled">Cancelada</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-700">Local</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="Ex: Consultório 2"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700">Observações</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-brand-600 text-white py-3 rounded-lg hover:bg-brand-700 font-medium"
                            >
                                {loading ? 'Salvando...' : editingAppointment ? 'Atualizar Consulta' : 'Agendar Consulta'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Patient Registration Modal */}
            {showQuickPatientModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-slate-800">Novo Paciente</h2>
                            <button onClick={() => setShowQuickPatientModal(false)} className="text-slate-500 hover:text-slate-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleQuickPatientSave} className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Nome Completo *</label>
                                <input
                                    type="text"
                                    value={quickPatientData.name}
                                    onChange={(e) => setQuickPatientData({ ...quickPatientData, name: e.target.value })}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700">CPF</label>
                                <input
                                    type="text"
                                    value={quickPatientData.cpf}
                                    onChange={(e) => setQuickPatientData({ ...quickPatientData, cpf: e.target.value })}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="000.000.000-00"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700">Telefone</label>
                                <input
                                    type="tel"
                                    value={quickPatientData.phone}
                                    onChange={(e) => setQuickPatientData({ ...quickPatientData, phone: e.target.value })}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700">Data de Nascimento</label>
                                <input
                                    type="date"
                                    value={quickPatientData.birthdate}
                                    onChange={(e) => setQuickPatientData({ ...quickPatientData, birthdate: e.target.value })}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-teal-600 text-white py-3 rounded-lg hover:bg-teal-700 font-medium flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {loading ? 'Salvando...' : 'Cadastrar Paciente'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Notification Container */}
            <NotificationContainer notifications={notifications} onDismiss={removeNotification} />
        </div>
    );
};

export default AppointmentsView;
