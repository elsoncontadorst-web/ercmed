import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, DollarSign, TrendingUp, ChevronLeft, ChevronRight, Settings, User, Phone } from 'lucide-react';
import { AppView } from '../types';
import { auth } from '../services/firebase';
import { getAllAppointments, getAppointments } from '../services/healthService';
import { Appointment } from '../types/health';
import { getTransactions } from '../services/userDataService';
import { getAllBillingRecords, processBilling, getProfessionalConfig } from '../services/repasseService';
import { updateAppointment } from '../services/healthService';
import { addTransaction } from '../services/userDataService';
import { CheckCircle2, X } from 'lucide-react';
import { WelcomeTrialModal } from './WelcomeTrialModal';

interface DashboardViewProps {
    setView?: (view: AppView) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ setView }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [financialData, setFinancialData] = useState({
        revenue: 0,
        expenses: 0,
        billing: 0,
        balance: 0
    });

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [confirmData, setConfirmData] = useState({
        wasPerformed: true,
        wasPaid: false,
        amount: '',
        paymentMethod: 'private'
    });
    const [processing, setProcessing] = useState(false);

    // Load data from Firebase
    useEffect(() => {
        const loadData = async () => {
            const user = auth.currentUser;
            if (!user) return;

            try {
                // Load Appointments
                const adminStatus = user.email === 'elsoncontador.st@gmail.com';
                const appointmentsData = adminStatus
                    ? await getAllAppointments()
                    : await getAppointments(user.uid);

                setAppointments(appointmentsData || []);

                // Load Financial Data
                const transactions = await getTransactions(user.uid);
                const income = transactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);
                const expenses = transactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);

                // Load Billing Data
                const billingRecords = await getAllBillingRecords(user.uid);
                const billing = billingRecords.reduce((sum, b) => sum + b.grossAmount, 0);

                setFinancialData({
                    revenue: income,
                    expenses: expenses,
                    billing: billing,
                    balance: income - expenses
                });
            } catch (error) {
                console.error("Error loading dashboard data", error);
            }
        };

        loadData();
    }, []);

    // Calendar logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
        setCurrentDate(newDate);
    };

    const getAppointmentsForDate = (day: number): Appointment[] => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return appointments.filter(apt => apt.date === dateStr && apt.status !== 'cancelled');
    };

    const handleDateClick = (day: number) => {
        const date = new Date(year, month, day);
        setSelectedDate(date);
    };

    const renderCalendarGrid = () => {
        const days = [];
        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-20 bg-gray-50/50"></div>);
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayAppointments = getAppointmentsForDate(day);
            const hasAppointments = dayAppointments.length > 0;
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

            days.push(
                <div
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`h-20 border p-2 relative transition-all cursor-pointer hover:bg-teal-50
                        ${isToday ? 'bg-teal-100 border-teal-400' : 'bg-white border-gray-200'}
                        ${hasAppointments ? 'hover:border-teal-300' : ''}
                    `}
                >
                    <div className="flex justify-between items-start">
                        <span className={`text-sm font-medium ${isToday ? 'text-teal-700 font-bold' : 'text-slate-700'}`}>
                            {day}
                        </span>
                        {hasAppointments && (
                            <span className="flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-teal-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
                            </span>
                        )}
                    </div>

                    {/* Mini Indicators */}
                    <div className="mt-1 space-y-0.5">
                        {dayAppointments.slice(0, 2).map((apt, idx) => (
                            <div key={idx} className="text-[9px] px-1 py-0.5 rounded bg-teal-100 text-teal-700 truncate border border-teal-200">
                                {apt.time} - {apt.patientName}
                            </div>
                        ))}
                        {dayAppointments.length > 2 && (
                            <div className="text-[9px] text-slate-400 pl-1">
                                +{dayAppointments.length - 2} mais
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return days;
    };

    const selectedAppointments = selectedDate ? getAppointmentsForDate(selectedDate.getDate()) : [];

    // Get upcoming appointments (ONLY today)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const upcomingToday = appointments
        .filter(apt => {
            return apt.date === todayStr && apt.status === 'scheduled';
        })
        .sort((a, b) => a.time.localeCompare(b.time));

    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const handleConfirmClick = (apt: Appointment) => {
        setSelectedAppointment(apt);
        setConfirmData({
            wasPerformed: true,
            wasPaid: false,
            amount: '',
            paymentMethod: 'private'
        });
        setShowConfirmModal(true);
    };

    const handleConfirmSave = async () => {
        if (!selectedAppointment || !auth.currentUser) return;
        setProcessing(true);

        try {
            // 1. Update Appointment Status
            await updateAppointment(auth.currentUser.uid, selectedAppointment.id, {
                status: 'completed',
                updatedAt: new Date()
            });

            // 2. If Paid, Process Billing
            if (confirmData.wasPaid && confirmData.amount) {
                const amount = parseFloat(confirmData.amount);

                // Get professional config for calculations
                let taxRate = 0;
                let splitPercentage = 70; // Default

                if (selectedAppointment.professionalId) {
                    const profConfig = await getProfessionalConfig(selectedAppointment.professionalId);
                    if (profConfig) {
                        taxRate = profConfig.repasseConfig.taxRate;
                        splitPercentage = profConfig.repasseConfig.splitPercentage;
                    }
                }

                const taxAmount = (amount * taxRate) / 100;
                const netAfterTaxes = amount - taxAmount;
                const repasseAmount = (netAfterTaxes * splitPercentage) / 100;
                const clinicAmount = netAfterTaxes - repasseAmount;

                // Create Billing Record
                await processBilling({
                    professionalId: selectedAppointment.professionalId || 'unknown',
                    professionalName: selectedAppointment.professionalName,
                    patientName: selectedAppointment.patientName,
                    consultationDate: selectedAppointment.date,
                    grossAmount: amount,
                    taxPercentage: taxRate,
                    repassePercentage: splitPercentage,
                    taxAmount,
                    repasseAmount,
                    clinicAmount,
                    paymentMethod: confirmData.paymentMethod as any,
                    paymentStatus: 'received',
                    notes: 'Gerado via Dashboard'
                });

                // Add to Financial Control (Cash Flow)
                await addTransaction(auth.currentUser.uid, {
                    date: new Date().toISOString().split('T')[0],
                    description: `Consulta - ${selectedAppointment.patientName} (${selectedAppointment.professionalName})`,
                    category: 'Faturamento Médico',
                    amount: amount,
                    type: 'income',
                    status: 'paid'
                });
            }

            // Refresh Data
            // Refresh Data
            const adminStatus = auth.currentUser.email === 'elsoncontador.st@gmail.com';
            const appointmentsData = adminStatus
                ? await getAllAppointments()
                : await getAppointments(auth.currentUser.uid);
            setAppointments(appointmentsData || []);

            // Close Modal
            setShowConfirmModal(false);
            setSelectedAppointment(null);

        } catch (error) {
            console.error("Error confirming appointment:", error);
            alert("Erro ao confirmar consulta. Tente novamente.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
            <WelcomeTrialModal />
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-teal-600" />
                            Dashboard Geral
                        </h2>
                        <p className="text-sm text-slate-500">Visão geral da sua clínica</p>
                    </div>
                    {auth.currentUser?.email === 'elsoncontador.st@gmail.com' && setView && (
                        <button
                            onClick={() => setView(AppView.MANAGER_DASHBOARD)}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                        >
                            <Settings className="w-4 h-4" />
                            Painel do Gestor
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Financial Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Caixa</span>
                        </div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">Receita Realizada</h3>
                        <p className="text-2xl font-bold text-slate-800">{formatMoney(financialData.revenue)}</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <DollarSign className="w-5 h-5 text-red-600" />
                            </div>
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">Caixa</span>
                        </div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">Despesas Pagas</h3>
                        <p className="text-2xl font-bold text-slate-800">{formatMoney(financialData.expenses)}</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                            </div>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Produção</span>
                        </div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">Faturamento Médico</h3>
                        <p className="text-2xl font-bold text-slate-800">{formatMoney(financialData.billing)}</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-teal-100 rounded-lg">
                                <DollarSign className="w-5 h-5 text-teal-600" />
                            </div>
                            <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-full">Saldo</span>
                        </div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">Saldo Atual</h3>
                        <p className="text-2xl font-bold text-slate-800">{formatMoney(financialData.balance)}</p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Pending Appointments */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-teal-50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-teal-600" />
                                Próximas Consultas
                            </h3>
                            <p className="text-sm text-slate-500">Hoje, {upcomingToday.length} agendadas</p>
                        </div>
                        <div className="p-4 max-h-[500px] overflow-y-auto">
                            {upcomingToday.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-200" />
                                    <p>Nenhuma consulta para hoje</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingToday.map((apt) => (
                                        <div key={apt.id} className="border border-gray-100 rounded-lg p-3 hover:bg-teal-50 transition-colors cursor-pointer">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                                                        <User className="w-4 h-4 text-teal-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-700 text-sm">{apt.patientName}</h4>
                                                        <p className="text-xs text-slate-500">{apt.specialty}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-slate-600">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(apt.date).toLocaleDateString('pt-BR')}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {apt.time}
                                                </div>
                                            </div>
                                            {apt.patientPhone && (
                                                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                                                    <Phone className="w-3 h-3" />
                                                    {apt.patientPhone}
                                                </div>
                                            )}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleConfirmClick(apt);
                                                }}
                                                className="mt-3 w-full py-1.5 bg-teal-50 text-teal-700 text-xs font-medium rounded hover:bg-teal-100 transition-colors flex items-center justify-center gap-1"
                                            >
                                                <CheckCircle2 className="w-3 h-3" />
                                                Confirmar Realização
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Calendar */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4">
                                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                    <ChevronLeft className="w-5 h-5 text-slate-500" />
                                </button>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 capitalize">
                                        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <p className="text-sm text-slate-500">Agenda de Consultas</p>
                                </div>
                                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                    <ChevronRight className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="p-4">
                            <div className="grid grid-cols-7 gap-px mb-2">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                    <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase py-2">
                                        {d}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                                {renderCalendarGrid()}
                            </div>
                        </div>

                        {/* Selected Date Details */}
                        {selectedDate && selectedAppointments.length > 0 && (
                            <div className="p-4 border-t border-gray-200 bg-teal-50">
                                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-teal-600" />
                                    {selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                                </h4>
                                <div className="space-y-2">
                                    {selectedAppointments.map((apt) => (
                                        <div key={apt.id} className="bg-white border border-teal-200 rounded-lg p-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h5 className="font-bold text-slate-700">{apt.patientName}</h5>
                                                    <p className="text-sm text-slate-500">{apt.specialty}</p>
                                                </div>
                                                <span className="text-sm font-bold text-teal-600">{apt.time}</span>
                                            </div>
                                            {apt.notes && (
                                                <p className="text-xs text-slate-600 mt-2">{apt.notes}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && selectedAppointment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-teal-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                                Confirmar Consulta
                            </h3>
                            <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="text-sm text-slate-500">Paciente</p>
                                <p className="font-bold text-slate-800">{selectedAppointment.patientName}</p>
                                <p className="text-xs text-slate-500 mt-1">{selectedAppointment.specialty} - {selectedAppointment.professionalName}</p>
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={confirmData.wasPerformed}
                                        onChange={(e) => setConfirmData({ ...confirmData, wasPerformed: e.target.checked })}
                                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Consulta foi realizada?</span>
                                </label>

                                {confirmData.wasPerformed && (
                                    <div className="pl-4 border-l-2 border-teal-100 space-y-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={confirmData.wasPaid}
                                                onChange={(e) => setConfirmData({ ...confirmData, wasPaid: e.target.checked })}
                                                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700">Pagamento recebido?</span>
                                        </label>

                                        {confirmData.wasPaid && (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Valor Recebido (R$)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={confirmData.amount}
                                                        onChange={(e) => setConfirmData({ ...confirmData, amount: e.target.value })}
                                                        placeholder="0,00"
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 mb-1">Forma de Pagamento</label>
                                                    <select
                                                        value={confirmData.paymentMethod}
                                                        onChange={(e) => setConfirmData({ ...confirmData, paymentMethod: e.target.value })}
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                    >
                                                        <option value="private">Particular (Dinheiro/Pix)</option>
                                                        <option value="card">Cartão</option>
                                                        <option value="insurance">Convênio</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-2 border border-gray-300 rounded-lg text-slate-600 hover:bg-gray-50 text-sm font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmSave}
                                    disabled={processing || (confirmData.wasPaid && !confirmData.amount)}
                                    className="flex-1 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                                >
                                    {processing ? 'Salvando...' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardView;
